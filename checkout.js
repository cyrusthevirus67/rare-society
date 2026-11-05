// On-site checkout: order summary + Stripe Embedded Checkout.
// Falls back to the Stripe payment link if the checkout function isn't set up yet.
(() => {
  const CFG = window.RS_CONFIG || {};
  const o = CFG.offers || {};
  const ITEMS = {
    membership: {
      item: "society-membership", name: "The Rare Society", price: `$${o.membership.price}`, per: "/month",
      desc: "The full course, a live Q&A every month, and the private member community.",
      list: ["The full course — every lesson", "Every new lesson as it’s added", "A live Q&A call every month", "The private member community"],
      terms: "Cancel anytime. You keep access until the end of the month you paid for.", link: o.membership.checkout,
    },
    course: {
      item: "society-course", name: "The course", price: `$${o.course.price}`, per: " one-time",
      desc: "The full recorded course, yours to keep.",
      list: ["The full recorded course", "Lifetime access", "Watch at your own pace"],
      terms: "One payment, lifetime access. Doesn’t include the live Q&A or the community.", link: o.course.checkout,
    },
  };

  const plan = new URLSearchParams(location.search).get("plan");
  const it = ITEMS[plan];
  if (!it) { location.replace("/#pricing"); return; }

  const $ = (id) => document.getElementById(id);
  document.title = `Checkout: ${it.name} — The Rare Society`;
  $("co-title").textContent = it.name;
  $("co-price").innerHTML = `<b>${it.price}</b>${it.per}`;
  $("co-desc").textContent = it.desc;
  $("co-list").innerHTML = it.list.map((t) => `<li>${t.replace(/&/g, "&amp;")}</li>`).join("");
  $("co-terms").textContent = it.terms;

  const box = $("checkout");
  const fallback = () => {
    box.innerHTML = it.link
      ? `<div class="co__fallback"><p>Continue to our secure Stripe checkout to finish joining.</p><a class="btn btn--red btn--block" href="${it.link}">Continue to secure payment →</a></div>`
      : `<div class="co__fallback"><p>Checkout isn’t open yet. Email <a href="mailto:${CFG.email}">${CFG.email}</a>.</p></div>`;
  };

  (async () => {
    try {
      const sb = CFG.supabase || {};
      if (!window.Stripe || !CFG.stripeKey || !sb.url) throw new Error("not ready");
      const res = await fetch(`${sb.url}/functions/v1/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: sb.anonKey },
        body: JSON.stringify({ item: it.item }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.clientSecret) throw new Error(data.error || "checkout unavailable");
      const checkout = await window.Stripe(CFG.stripeKey).initEmbeddedCheckout({ fetchClientSecret: async () => data.clientSecret });
      box.innerHTML = "";
      box.classList.add("is-live");
      checkout.mount(box);
    } catch (err) {
      console.warn("Embedded checkout unavailable:", err.message);
      fallback();
    }
  })();
})();
