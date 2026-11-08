// Sales page: prices, buy buttons, curriculum, and the waitlist (shown until checkout links are set).
(() => {
  const { CFG, api, configured, esc, toast } = window.RS;
  const offers = CFG.offers || {};

  // Prices from config.
  document.querySelectorAll("[data-price]").forEach((el) => {
    const o = offers[el.dataset.price];
    if (o && o.price) el.textContent = o.price;
  });

  // Founding-member note.
  if (CFG.founding && CFG.founding.on) {
    document.querySelectorAll("[data-founding]").forEach((el) => { el.hidden = false; });
    document.querySelectorAll("[data-founding-text]").forEach((el) => { el.textContent = CFG.founding.text; });
  }

  // Buy buttons go to Stripe when a link is set; otherwise to the waitlist.
  const soon = !!CFG.comingSoon;
  const link = soon ? {} : {
    membership: offers.membership && offers.membership.checkout,
    course: offers.course && offers.course.checkout,
    "course-plan": offers.course && offers.course.plan && offers.course.plan.checkout,
  };
  const open = !!link.membership;
  document.querySelectorAll("[data-buy]").forEach((el) => {
    const kind = el.dataset.buy;
    if (kind === "course-plan") {
      if (soon) return;
      const plan = offers.course && offers.course.plan;
      if (plan && plan.label && plan.checkout) { el.hidden = false; el.textContent = plan.label; el.href = plan.checkout; }
      return;
    }
    if (link[kind]) { el.href = `/checkout?plan=${kind}`; return; }
    el.href = "#waitlist";
    el.addEventListener("click", () => {
      const want = document.querySelector("#waitlist-form select");
      if (want) want.value = kind === "course" ? "Course only" : "Membership ($49/mo)";
    });
  });
  if (!open) {
    document.getElementById("waitlist-form").hidden = false;
    document.getElementById("cta-buy").hidden = true;
    document.getElementById("cta-sub").textContent = "The Rare Society opens soon. Founding members get in first, at the founding price — join the list and we’ll email you the moment doors open.";
  }
  const plan = offers.course && offers.course.plan;
  if (plan && plan.label && plan.checkout) document.querySelector("[data-plan-label]").textContent = `Yours to keep · ${plan.label}`;

  // Curriculum: published modules from the database, or the planned outline until lessons are added.
  const curr = document.getElementById("curr");
  const render = (mods, live) => {
    curr.innerHTML = mods.map((m, i) => {
      const lessons = m.lessons || [];
      const mins = lessons.reduce((t, l) => t + (l.duration_min || 0), 0);
      const count = live && lessons.length ? `${lessons.length} lesson${lessons.length === 1 ? "" : "s"}${mins ? ` · ${mins} min` : ""}` : "";
      return `<details${live && i === 0 ? " open" : ""}>
        <summary><span class="curr__t">${esc(m.title)}${m.summary ? `<small>${esc(m.summary)}</small>` : ""}</span><span class="curr__count">${count}</span></summary>
        ${live && lessons.length ? `<ol>${lessons.map((l) => `<li>${esc(l.title)}<span>${l.duration_min ? `${l.duration_min} min` : ""}</span></li>`).join("")}</ol>` : ""}
      </details>`;
    }).join("");
  };
  render(window.RS.DRAFT.map(([title, summary]) => ({ title, summary })), false);
  if (configured) api.outline().then((mods) => { if (mods && mods.length) render(mods, true); }).catch(() => {});

  // Waitlist sign-up (saved with the website's leads, so you're emailed about each one).
  const form = document.getElementById("waitlist-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = form.querySelector(".msg");
    const name = form.elements.name.value.trim(), email = form.elements.email.value.trim();
    msg.className = "msg";
    if (!name || !email || !form.elements.email.checkValidity()) { msg.textContent = "Please add your name and a valid email."; msg.classList.add("is-error"); return; }
    const btn = form.querySelector("button");
    btn.disabled = true; msg.textContent = "Saving…";
    try {
      if (!configured) throw new Error("not configured");
      await api.joinWaitlist({ name, email, message: `Waitlist — ${form.elements.want.value}` });
      form.reset();
      msg.textContent = "You’re on the list. We’ll email you when doors open.";
      msg.classList.add("is-ok");
    } catch {
      msg.textContent = `Something went wrong. Email ${CFG.email} and we’ll add you.`;
      msg.classList.add("is-error");
    } finally { btn.disabled = false; }
  });

  // Nav background + scroll reveal.
  const nav = document.querySelector(".nav");
  const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 40);
  onScroll(); window.addEventListener("scroll", onScroll, { passive: true });
  const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } }), { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach((el, i) => { el.style.transitionDelay = `${(i % 3) * 80}ms`; io.observe(el); });
  // Mobile buy bar: shown after the hero, hidden while the pricing or closing section is on screen.
  const bar = document.getElementById("buybar");
  if (bar) {
    const seen = new Map();
    const watch = [document.querySelector(".shero"), document.getElementById("pricing"), document.getElementById("waitlist")].filter(Boolean);
    const upd = () => bar.classList.toggle("is-on", ![...seen.values()].some(Boolean));
    const obs = new IntersectionObserver((es) => { es.forEach((e) => seen.set(e.target, e.isIntersecting)); upd(); });
    watch.forEach((el) => { seen.set(el, true); obs.observe(el); });
  }
  if (window.RS.DEMO) toast("Preview mode — sample data");
})();
