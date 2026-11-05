// The Rare Society settings. Change prices and checkout links here.
window.RS_CONFIG = {
  // Same Supabase project as rarefeature.com (Supabase → Project Settings → API). The key is public by design.
  supabase: { url: "https://hjvezrxvrshdlprnalin.supabase.co", anonKey: "sb_publishable_KHYN133iCCSZ8buwdY2FiA_Yoxgr7Ys" },

  // Stripe payment links (Stripe → Payment links → Copy link). While a link is empty, its button
  // collects a waitlist sign-up instead of taking payment.
  offers: {
    membership: { price: 49, checkout: "https://buy.stripe.com/eVq7sL9b36GD4Z3cEU0RG04" },                        // $49/month subscription
    course: { price: 297, checkout: "https://buy.stripe.com/fZufZh72V5CzcrvdIY0RG05", plan: { label: "", checkout: "" } }, // one-time; plan e.g. "or 3 payments of $109"
  },

  // Founding-member pricing note shown on the sales page. Set on: false to hide it.
  founding: { on: true, text: "It goes up when the next group opens — and you keep the price you joined at." },

  // Stripe customer portal login link, for members to update their card and see invoices.
  billingPortal: "https://billing.stripe.com/p/login/cNi14n86Z5Cz2QVbAQ0RG00",

  email: "cyrus@rareft.com",
  mainSite: "https://rarefeature.com",
};
