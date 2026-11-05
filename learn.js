// Members area: course player, progress, live Q&A + community, and account.
(() => {
  const { api, configured, DEMO, CFG, esc, safeUrl, fmtDate, fmtDateTime, notes, player, toast, href } = window.RS;
  const stage = document.getElementById("stage");
  const side = document.getElementById("side");
  const scrim = document.getElementById("scrim");
  const ARROW = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4"/></svg>';
  const S = { session: null, me: null, modules: [], lessons: [], done: new Set(), settings: {} };
  const show = (html) => { stage.innerHTML = `<div class="stage__inner">${html}</div>`; window.scrollTo(0, 0); };

  if (DEMO) document.getElementById("demo-bar").hidden = false;

  // ---------- data ----------
  async function load() {
    const course = await api.course();
    S.modules = course.filter((m) => m.published || S.me.admin);
    S.lessons = S.modules.flatMap((m) => m.lessons.filter((l) => l.published || S.me.admin).map((l) => ({ ...l, module: m })));
    S.done = new Set(await api.progress());
    S.settings = S.me.community ? await api.settings().catch(() => ({})) : {};
  }
  const pct = () => (S.lessons.length ? Math.round((S.lessons.filter((l) => S.done.has(l.id)).length / S.lessons.length) * 100) : 0);
  const nextUp = () => S.lessons.find((l) => !S.done.has(l.id)) || S.lessons[0];
  const firstName = () => ((S.me.member && S.me.member.name) || "").split(" ")[0];

  // ---------- sidebar ----------
  function renderSide(activeId) {
    const doneCount = S.lessons.filter((l) => S.done.has(l.id)).length;
    side.innerHTML = `
      <div class="side__prog"><p><span>Your progress</span><b>${doneCount} of ${S.lessons.length} lessons</b></p><div class="bar"><i style="width:${pct()}%"></i></div></div>
      ${S.modules.map((m, i) => {
        const ls = S.lessons.filter((l) => l.module_id === m.id);
        const open = !activeId ? i === 0 : ls.some((l) => l.id === activeId);
        return `<details class="side__mod"${open ? " open" : ""}>
          <summary><span><i>${String(i + 1).padStart(2, "0")}</i>${esc(m.title)}${m.published ? "" : '<span class="draft">Draft</span>'}</span><small>${ls.filter((l) => S.done.has(l.id)).length}/${ls.length}</small></summary>
          <ol>${ls.map((l) => `<li><a href="#lesson/${esc(l.id)}"${l.id === activeId ? ' aria-current="page"' : ""}><span class="dot${S.done.has(l.id) ? " is-done" : ""}" aria-label="${S.done.has(l.id) ? "Completed" : "Not completed"}"></span><span>${esc(l.title)}${l.published ? "" : '<span class="draft">Draft</span>'}</span><small>${l.duration_min ? `${l.duration_min}m` : ""}</small></a></li>`).join("") || '<li style="padding:8px 10px;color:var(--muted);font-size:.85rem">Lessons coming soon</li>'}</ol>
        </details>`;
      }).join("") || '<p style="color:var(--muted);padding:8px">Lessons are on the way.</p>'}`;
  }
  const setDrawer = (open) => {
    side.classList.toggle("is-open", open);
    scrim.classList.toggle("is-on", open);
    document.getElementById("lessons-btn").setAttribute("aria-expanded", String(open));
  };
  document.getElementById("lessons-btn").addEventListener("click", () => setDrawer(!side.classList.contains("is-open")));
  scrim.addEventListener("click", () => setDrawer(false));

  // ---------- views ----------
  function viewHome() {
    const next = nextUp();
    const p = pct();
    const st = S.settings;
    const qaWhen = st.qa_next_at && new Date(st.qa_next_at) > new Date(Date.now() - 3 * 3600e3) ? fmtDateTime(st.qa_next_at) : "";
    const upgrade = `<p>Live Q&amp;A and the community come with the membership.</p><a class="btn btn--red btn--sm" href="${CFG.offers.membership.checkout ? "/checkout?plan=membership" : "/#pricing"}">Upgrade for $${esc(CFG.offers.membership.price)}/mo</a>`;
    show(`
      <p class="kicker">The Rare Society</p>
      <h1>${firstName() ? `Welcome back, ${esc(firstName())}.` : "Welcome back."}</h1>
      ${st.welcome_note ? `<p class="stage__lede">${esc(st.welcome_note)}</p>` : `<p class="stage__lede">Work through the lessons in order and put each one to work on your own account.</p>`}
      <div class="cards">
        <section class="card card--hot card--wide continue">
          <div>
            <p class="card__k">${p === 0 ? "Start here" : p === 100 ? "Course complete" : "Continue where you left off"}</p>
            <h2>${next ? esc(next.title) : "Lessons are on the way"}</h2>
            ${next ? `<p>${esc(next.module.title)}${next.duration_min ? ` · ${next.duration_min} min` : ""}</p>` : "<p>We’re finishing the first lessons. Check back soon.</p>"}
          </div>
          ${next ? `<a class="btn btn--red" href="#lesson/${esc(next.id)}">${p === 0 ? "Start the course" : p === 100 ? "Watch again" : "Continue"} ${ARROW}</a>` : ""}
          <div class="bar" aria-label="${p}% complete"><i style="width:${p}%"></i></div>
        </section>
        <section class="card">
          <p class="card__k">Monthly live Q&amp;A</p>
          ${S.me.community ? `
            <h2>${qaWhen ? esc(qaWhen) : "Next date coming soon"}</h2>
            <p>${esc(st.qa_note || "Bring your questions — we’ll answer them live and review members’ accounts.")}</p>
            ${qaWhen && safeUrl(st.qa_link) ? `<a class="btn btn--line btn--sm" href="${esc(st.qa_link)}" target="_blank" rel="noopener">Join the live call ↗</a>` : ""}` : `<h2>Members only</h2>${upgrade}`}
        </section>
        <section class="card">
          <p class="card__k">Community</p>
          ${S.me.community ? `
            <h2>${esc(st.community_name || "The members group")}</h2>
            <p>Share wins, ask for feedback, and keep each other consistent.</p>
            ${safeUrl(st.community_link) ? `<a class="btn btn--line btn--sm" href="${esc(st.community_link)}" target="_blank" rel="noopener">Open the community ↗</a>` : "<p>The invite link will appear here soon.</p>"}` : `<h2>Members only</h2>${upgrade}`}
        </section>
      </div>`);
    renderSide(null);
  }

  function viewLesson(id) {
    const i = S.lessons.findIndex((l) => l.id === id);
    if (i < 0) return viewHome();
    const l = S.lessons[i], prev = S.lessons[i - 1], next = S.lessons[i + 1];
    const done = S.done.has(l.id);
    const video = player(l.video_url);
    show(`
      <p class="kicker">${esc(l.module.title)}</p>
      <h1>${esc(l.title)}${l.published ? "" : '<span class="draft">Draft</span>'}</h1>
      <div class="player">${video || '<p class="player__empty">The video for this lesson is coming soon.</p>'}</div>
      <div class="lesson__bar">
        <p class="lesson__meta">Lesson ${i + 1} of ${S.lessons.length}${l.duration_min ? ` · ${l.duration_min} min` : ""}</p>
        <button class="btn btn--sm ${done ? "btn--done btn--line" : "btn--red"}" id="done-btn">${done ? "✓ Completed" : "Mark as complete"}</button>
      </div>
      ${l.body ? `<div class="notes">${notes(l.body)}</div>` : ""}
      ${safeUrl(l.resource_url) ? `<p class="lesson__res"><a class="btn btn--line btn--sm" href="${esc(l.resource_url)}" target="_blank" rel="noopener">Open the lesson resource ↗</a></p>` : ""}
      <nav class="lesson__nav" aria-label="Lessons">
        ${prev ? `<a href="#lesson/${esc(prev.id)}"><small>← Previous</small><b>${esc(prev.title)}</b></a>` : "<span></span>"}
        ${next ? `<a href="#lesson/${esc(next.id)}"><small>Next →</small><b>${esc(next.title)}</b></a>` : `<a href="#home"><small>Finished</small><b>Back to home</b></a>`}
      </nav>`);
    renderSide(l.id);
    document.getElementById("done-btn").addEventListener("click", async (e) => {
      const btn = e.currentTarget;
      const nowDone = !S.done.has(l.id);
      btn.disabled = true;
      try {
        await api.setDone(S.session.user.id, l.id, nowDone);
        nowDone ? S.done.add(l.id) : S.done.delete(l.id);
        if (nowDone && next) { toast("Nice — on to the next one."); location.hash = `#lesson/${next.id}`; }
        else viewLesson(l.id);
      } catch { toast("Couldn’t save that. Try again.", true); btn.disabled = false; }
    });
  }

  function viewAccount() {
    const m = S.me.member || {};
    const status = m.membership_status || "none";
    const pill = { active: ["Active", "ok"], past_due: ["Payment issue", "warn"], cancel_requested: ["Cancelling", "warn"], cancelled: ["Ended", "off"], none: ["No membership", "off"] }[status] || [status, "off"];
    const canCancel = ["active", "past_due"].includes(status);
    show(`
      <p class="kicker">Account</p>
      <h1>Your account</h1>
      <div class="cards">
        <section class="card card--wide">
          <p class="card__k">Your access</p>
          <dl class="kv">
            <div><dt>Email</dt><dd>${esc(S.me.email)}</dd></div>
            <div><dt>Membership</dt><dd><span class="pill pill--${pill[1]}">${esc(pill[0])}</span></dd></div>
            ${m.price_cents ? `<div><dt>Your price</dt><dd>$${esc(Math.round(m.price_cents / 100))}/month</dd></div>` : ""}
            ${m.current_period_end && status !== "none" ? `<div><dt>${status === "cancel_requested" || status === "cancelled" ? "Access until" : "Renews"}</dt><dd>${esc(fmtDate(m.current_period_end))}</dd></div>` : ""}
            <div><dt>Course</dt><dd>${m.course_owned ? "Owned — yours to keep" : S.me.course ? "Included with membership" : "No access"}</dd></div>
            ${m.joined_at ? `<div><dt>Member since</dt><dd>${esc(fmtDate(m.joined_at))}</dd></div>` : ""}
          </dl>
          <div class="card__row">
            ${safeUrl(CFG.billingPortal) ? `<a class="btn btn--line btn--sm" href="${esc(CFG.billingPortal)}" target="_blank" rel="noopener">Update card &amp; invoices ↗</a>` : ""}
            <a class="btn btn--line btn--sm" href="mailto:${esc(CFG.email)}">Email us</a>
            ${S.me.admin ? `<a class="btn btn--line btn--sm" href="${esc(href("/admin"))}">Admin</a>` : ""}
            <button type="button" class="btn btn--ghost btn--sm" data-signout>Sign out</button>
          </div>
          ${status === "past_due" ? "<p>Your last payment didn’t go through. Update your card to keep your access.</p>" : ""}
          ${status === "cancel_requested" ? "<p>We’ve got your cancellation request. Your membership won’t renew, and you keep access until the date above.</p>" : ""}
        </section>
        ${canCancel ? `
        <section class="card card--wide">
          <p class="card__k">Cancel membership</p>
          <p>You can cancel anytime. Your membership won’t renew and you keep access until the end of the month you’ve paid for.${m.course_owned ? " You keep the course either way." : ""}</p>
          <form id="cancel-form" class="card__row" style="flex-direction:column;align-items:stretch;gap:12px" novalidate>
            <label class="field">Anything we could do better? <small>(optional)</small><textarea name="reason" rows="3" maxlength="2000"></textarea></label>
            <button class="btn btn--line btn--sm" style="align-self:flex-start">Cancel my membership</button>
          </form>
        </section>` : ""}
        ${!S.me.community ? `<section class="card card--wide card--hot"><p class="card__k">Upgrade</p><h2>Join the Society</h2><p>Add the monthly live Q&amp;A and the private community for $${esc(CFG.offers.membership.price)}/month.</p><a class="btn btn--red btn--sm" href="${CFG.offers.membership.checkout ? "/checkout?plan=membership" : "/#pricing"}">Join the Society</a></section>` : ""}
      </div>`);
    renderSide(null);
    stage.querySelector("[data-signout]").addEventListener("click", signOut);
    const form = document.getElementById("cancel-form");
    if (form) form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!confirm("Cancel your Rare Society membership? It won’t renew, and you keep access until the end of your paid month.")) return;
      const btn = form.querySelector("button");
      btn.disabled = true;
      try {
        await api.requestCancel(form.elements.reason.value.trim());
        S.me = await api.me();
        if (DEMO) S.me.member.membership_status = "cancel_requested";
        toast("Cancellation requested. We’ll confirm by email.");
        viewAccount();
      } catch { toast("Couldn’t send that. Email us and we’ll cancel it for you.", true); btn.disabled = false; }
    });
  }

  function viewNoAccess() {
    side.hidden = true;
    document.getElementById("grid").classList.add("app__grid--solo");
    document.getElementById("lessons-btn").hidden = true;
    const o = CFG.offers;
    show(`
      <p class="kicker">Signed in as ${esc(S.me.email)}</p>
      <h1>No active membership</h1>
      <p class="stage__lede">This email doesn’t have access to the course yet. If you paid with a different email, sign out and sign in with that one — or email <a href="mailto:${esc(CFG.email)}" style="color:#fff">${esc(CFG.email)}</a> and we’ll sort it out.</p>
      <div class="cards">
        <section class="card card--hot"><p class="card__k">Membership</p><h2>The Rare Society</h2><p>The course, monthly live Q&amp;A, and the community. $${esc(o.membership.price)}/month.</p><a class="btn btn--red btn--sm" href="${o.membership.checkout ? "/checkout?plan=membership" : "/#pricing"}">Join now</a></section>
        <section class="card"><p class="card__k">Course only</p><h2>The course</h2><p>The full recorded course, yours to keep. $${esc(o.course.price)} one-time.</p><a class="btn btn--line btn--sm" href="${o.course.checkout ? "/checkout?plan=course" : "/#pricing"}">Buy the course</a></section>
      </div>`);
  }

  function route() {
    setDrawer(false);
    const h = location.hash.slice(1);
    document.querySelectorAll("[data-route]").forEach((a) => a.toggleAttribute("aria-current", a.dataset.route === (h.startsWith("lesson/") ? "" : h || "home")));
    if (h.startsWith("lesson/")) viewLesson(decodeURIComponent(h.slice(7)));
    else if (h === "account") viewAccount();
    else viewHome();
  }

  // ---------- start ----------
  async function signOut() {
    await api.signOut().catch(() => {});
    location.href = DEMO ? href("/") : "/login";
  }
  document.getElementById("signout").addEventListener("click", signOut);

  (async () => {
    if (!configured) { show(`<h1>Sign-in unavailable</h1><p class="stage__lede">Please email <a href="mailto:${esc(CFG.email)}" style="color:#fff">${esc(CFG.email)}</a>.</p>`); return; }
    try {
      S.session = await api.session();
      if (!S.session) { location.replace("/login"); return; }
      // Remove the sign-in token from the address bar after a magic-link sign-in.
      if (/access_token|type=magiclink/.test(location.hash)) history.replaceState(null, "", location.pathname + location.search);
      S.me = await api.me();
      document.getElementById("admin-link").hidden = !S.me.admin;
      if (!S.me.course) { viewNoAccess(); return; }
      side.hidden = false;
      await load();
      window.addEventListener("hashchange", route);
      route();
    } catch (err) {
      console.error(err);
      show(`<h1>Something went wrong</h1><p class="stage__lede">We couldn’t load your course. Refresh the page, or email <a href="mailto:${esc(CFG.email)}" style="color:#fff">${esc(CFG.email)}</a>.</p>`);
    }
  })();
})();
