// Shared by every Rare Society page: helpers, the Supabase data layer, and a `?demo` sample mode.
(() => {
  const CFG = window.RS_CONFIG || {};
  const DEMO = new URLSearchParams(location.search).has("demo");
  const configured = !!(CFG.supabase && CFG.supabase.url && CFG.supabase.anonKey && window.supabase);
  const sb = configured && !DEMO ? window.supabase.createClient(CFG.supabase.url, CFG.supabase.anonKey) : null;
  const WAITLIST = "The Rare Society";

  // ---------- helpers ----------
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const safeUrl = (u) => (/^https?:\/\//i.test(u || "") ? u : "");
  const fmtDate = (v, opts = { month: "long", day: "numeric", year: "numeric" }) => (v ? new Date(v).toLocaleDateString("en-US", opts) : "");
  const fmtDateTime = (v) => (v ? new Date(v).toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }) : "");
  // Lesson notes: plain text with blank-line paragraphs and clickable links.
  const notes = (text) => esc(text || "").split(/\n{2,}/).map((para) =>
    `<p>${para.replace(/\n/g, "<br>").replace(/https?:\/\/[^\s<]+/g, (u) => `<a href="${u}" target="_blank" rel="noopener">${u}</a>`)}</p>`).join("");
  const href = (path) => (DEMO ? `${path}${path.includes("?") ? "&" : "?"}demo` : path);

  // Turns a YouTube / Vimeo / Loom / .mp4 link into a player.
  function player(url) {
    const u = safeUrl(url);
    if (!u) return "";
    let m;
    const frame = (src) => `<iframe src="${esc(src)}" title="Lesson video" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen loading="lazy"></iframe>`;
    if ((m = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/))) return frame(`https://www.youtube-nocookie.com/embed/${m[1]}?rel=0&modestbranding=1`);
    if ((m = u.match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/([\da-f]+))?/))) {
      const h = m[2] || new URL(u).searchParams.get("h");
      return frame(`https://player.vimeo.com/video/${m[1]}?dnt=1${h ? `&h=${h}` : ""}`);
    }
    if ((m = u.match(/loom\.com\/(?:share|embed)\/([\da-f]+)/))) return frame(`https://www.loom.com/embed/${m[1]}`);
    if (/\.(mp4|webm|mov)(\?|$)/i.test(u)) return `<video src="${esc(u)}" controls playsinline preload="metadata"></video>`;
    return `<a class="player__link" href="${esc(u)}" target="_blank" rel="noopener">Open the lesson video ↗</a>`;
  }

  let toastTimer;
  const toast = (msg, isError) => {
    let el = document.getElementById("toast");
    if (!el) { el = document.createElement("div"); el.id = "toast"; el.setAttribute("role", "status"); document.body.append(el); }
    el.textContent = msg;
    el.className = `toast is-on${isError ? " toast--error" : ""}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("is-on"), 3600);
  };

  // Curriculum preview shown on the sales page until real modules are published in admin.
  const DRAFT = [
    ["Find your lane", "Pick your niche, your audience, and the one thing you want to be known for."],
    ["A profile that converts", "A bio, highlights, and links that turn profile visitors into followers."],
    ["Content that stops the scroll", "Hooks, formats, and simple scripts that keep people watching to the end."],
    ["Film it with your phone", "Light, sound, framing, and quick edits — no expensive gear."],
    ["Your posting system", "Content pillars, batching, and a calendar you can actually keep."],
    ["Grow and engage", "How reach really works, and how to turn viewers into a community."],
    ["Turn attention into income", "Offers, DMs, leads, and getting ready for brand deals."],
    ["Measure and scale", "Read your numbers each month and double down on what works."],
  ];

  // ---------- Supabase ----------
  const ok = ({ data, error }) => { if (error) throw error; return data; };
  const live = sb && {
    async session() { return ok(await sb.auth.getSession()).session; },
    async sendLink(email) {
      ok(await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: new URL("/learn", location.href).href } }));
    },
    async signOut() { await sb.auth.signOut(); },
    async me() { return ok(await sb.rpc("society_me")); },
    async outline() { return ok(await sb.rpc("society_outline")) || []; },
    async course() {
      const modules = ok(await sb.from("society_modules").select("*").order("position").order("created_at"));
      const lessons = ok(await sb.from("society_lessons").select("*").order("position").order("created_at"));
      return modules.map((m) => ({ ...m, lessons: lessons.filter((l) => l.module_id === m.id) }));
    },
    async progress() { return ok(await sb.from("society_progress").select("lesson_id, completed_at")).map((r) => r.lesson_id); },
    async setDone(userId, lessonId, done) {
      if (done) ok(await sb.from("society_progress").upsert({ user_id: userId, lesson_id: lessonId }, { onConflict: "user_id,lesson_id", ignoreDuplicates: true }));
      else ok(await sb.from("society_progress").delete().eq("user_id", userId).eq("lesson_id", lessonId));
    },
    async settings() { return Object.fromEntries(ok(await sb.from("society_settings").select("key, value")).map((r) => [r.key, r.value])); },
    async requestCancel(message) { ok(await sb.rpc("society_request_cancel", { p_message: message || null })); },
    async joinWaitlist(f) {
      // Plain insert (no return) because visitors can add a lead but not read leads back.
      ok(await sb.from("leads").insert({ name: f.name, email: f.email, type: f.type || null, interest: WAITLIST, message: f.message || null }));
    },
    // admin
    async saveModule(row) { return ok(await sb.from("society_modules").upsert(row).select().single()); },
    async deleteModule(id) { ok(await sb.from("society_modules").delete().eq("id", id)); },
    async saveLesson(row) { return ok(await sb.from("society_lessons").upsert(row).select().single()); },
    async deleteLesson(id) { ok(await sb.from("society_lessons").delete().eq("id", id)); },
    async saveSettings(obj) {
      const now = new Date().toISOString();
      ok(await sb.from("society_settings").upsert(Object.entries(obj).map(([key, value]) => ({ key, value: value || null, updated_at: now }))));
    },
    async members() { return ok(await sb.from("society_members").select("*").order("joined_at", { ascending: false })); },
    async saveMember(row) { return ok(await sb.from("society_members").upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: "email" }).select().single()); },
    async waitlist() { return ok(await sb.from("leads").select("*").eq("interest", WAITLIST).order("created_at", { ascending: false })); },
  };

  // ---------- Demo (sample data, nothing saved) ----------
  const uid = () => Math.random().toString(36).slice(2, 10);
  const demoDB = (() => {
    const modules = DRAFT.map(([title, summary], i) => ({ id: `m${i}`, position: i + 1, title, summary, published: true }));
    const lessons = [];
    modules.forEach((m, i) => {
      [["Start here", 6], ["The core idea", 12], ["Do it with me", 15]].forEach(([t, d], j) => lessons.push({
        id: `l${i}-${j}`, module_id: m.id, position: j + 1, title: j === 0 ? `${m.title}: ${t.toLowerCase()}` : t, duration_min: d, published: true,
        body: "This is sample lesson text. Your real notes for each lesson appear here, under the video.\n\nAdd links, steps, and anything members should take away. Links like https://rarefeature.com become clickable.",
        video_url: "", resource_url: j === 2 ? "https://rarefeature.com" : "",
      }));
    });
    const inAWeek = new Date(Date.now() + 6 * 864e5); inAWeek.setHours(18, 0, 0, 0);
    return {
      modules, lessons, done: new Set(["l0-0", "l0-1", "l0-2", "l1-0"]),
      settings: { qa_next_at: inAWeek.toISOString(), qa_link: "https://rarefeature.com", qa_note: "Bring your account and your questions. We’ll review a few pages live.", community_name: "The Rare Society group", community_link: "https://rarefeature.com", welcome_note: "" },
      members: [
        { id: "a", email: "jordan@example.com", name: "Jordan Lee", course_owned: false, membership_status: "active", price_cents: 4900, joined_at: new Date(Date.now() - 20 * 864e5).toISOString(), current_period_end: new Date(Date.now() + 10 * 864e5).toISOString() },
        { id: "b", email: "sam@example.com", name: "Sam Rivera", course_owned: true, membership_status: "none", price_cents: null, joined_at: new Date(Date.now() - 4 * 864e5).toISOString() },
      ],
      waitlist: [{ id: "w", name: "Taylor Brooks", email: "taylor@example.com", type: "Content creator", created_at: new Date().toISOString() }],
    };
  })();
  const demo = {
    async session() { return { user: { id: "demo", email: "you@example.com" } }; },
    async sendLink() {},
    async signOut() {},
    async me() {
      return { email: "you@example.com", admin: true, course: true, community: true,
        member: { name: "Demo Member", email: "you@example.com", course_owned: false, membership_status: "active", price_cents: 4900, joined_at: new Date(Date.now() - 30 * 864e5).toISOString(), current_period_end: new Date(Date.now() + 12 * 864e5).toISOString() } };
    },
    async outline() { return demoDB.modules.map((m) => ({ title: m.title, summary: m.summary, lessons: demoDB.lessons.filter((l) => l.module_id === m.id).map((l) => ({ title: l.title, duration_min: l.duration_min })) })); },
    async course() { return demoDB.modules.slice().sort((a, b) => a.position - b.position).map((m) => ({ ...m, lessons: demoDB.lessons.filter((l) => l.module_id === m.id).sort((a, b) => a.position - b.position) })); },
    async progress() { return [...demoDB.done]; },
    async setDone(_u, id, done) { if (done) demoDB.done.add(id); else demoDB.done.delete(id); },
    async settings() { return { ...demoDB.settings }; },
    async requestCancel() {},
    async joinWaitlist() {},
    async saveModule(row) { const r = { ...row, id: row.id || uid() }; const i = demoDB.modules.findIndex((m) => m.id === r.id); i >= 0 ? (demoDB.modules[i] = { ...demoDB.modules[i], ...r }) : demoDB.modules.push(r); return r; },
    async deleteModule(id) { demoDB.modules = demoDB.modules.filter((m) => m.id !== id); demoDB.lessons = demoDB.lessons.filter((l) => l.module_id !== id); },
    async saveLesson(row) { const r = { ...row, id: row.id || uid() }; const i = demoDB.lessons.findIndex((l) => l.id === r.id); i >= 0 ? (demoDB.lessons[i] = { ...demoDB.lessons[i], ...r }) : demoDB.lessons.push(r); return r; },
    async deleteLesson(id) { demoDB.lessons = demoDB.lessons.filter((l) => l.id !== id); },
    async saveSettings(obj) { Object.assign(demoDB.settings, obj); },
    async members() { return demoDB.members.slice(); },
    async saveMember(row) { const i = demoDB.members.findIndex((m) => m.email === row.email); const r = { joined_at: new Date().toISOString(), ...(i >= 0 ? demoDB.members[i] : { id: uid() }), ...row }; i >= 0 ? (demoDB.members[i] = r) : demoDB.members.unshift(r); return r; },
    async waitlist() { return demoDB.waitlist.slice(); },
  };

  // Mobile menu + footer year, on every page.
  document.addEventListener("DOMContentLoaded", () => {
    const y = document.getElementById("year");
    if (y) y.textContent = new Date().getFullYear();
    const toggle = document.querySelector(".nav__toggle");
    const menu = document.getElementById("mobile-menu");
    if (toggle && menu) {
      const set = (open) => { toggle.setAttribute("aria-expanded", String(open)); menu.hidden = !open; document.querySelector(".nav").classList.toggle("is-open", open); };
      toggle.addEventListener("click", () => set(menu.hidden));
      menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => set(false)));
    }
    if (DEMO) document.querySelectorAll("[data-demo-link]").forEach((a) => { a.href = href(a.getAttribute("href")); });
  });

  window.RS = { CFG, DEMO, configured: !!sb || DEMO, api: DEMO ? demo : live, esc, safeUrl, fmtDate, fmtDateTime, notes, player, toast, href, DRAFT };
})();
