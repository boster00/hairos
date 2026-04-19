import Link from "next/link";

const PLANS = [
  {
    name: "Starter",
    price: 49,
    blurb: "Solo stylists getting organized online booking and reminders.",
    features: ["Online booking page", "Email reminders", "Client list", "1 calendar sync"],
  },
  {
    name: "Pro",
    price: 89,
    blurb: "Growing salons with a small team and steady rebooks.",
    features: ["Everything in Starter", "Multi-staff scheduling", "SMS add-on ready", "Priority support"],
    featured: true,
  },
  {
    name: "Studio",
    price: 149,
    blurb: "Busy studios that live by the calendar.",
    features: ["Everything in Pro", "Higher booking volume", "Team onboarding", "Dedicated success check-in"],
  },
];

export default function HairOsPublicPricing() {
  return (
    <section className="bg-base-200 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-12 sm:py-20">
        <div className="text-center mb-10 sm:mb-14">
          <p className="text-primary font-semibold text-sm uppercase tracking-wide mb-2">HairOS pricing</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Simple plans for salon owners</h1>
          <p className="mt-3 text-base-content/70 max-w-2xl mx-auto text-sm sm:text-base">
            Pick a plan that matches your chair count. Upgrade or downgrade anytime.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`card bg-base-100 card-border shadow-sm relative ${plan.featured ? "ring-2 ring-primary md:-translate-y-1" : ""}`}
            >
              {plan.featured ? (
                <div className="absolute top-3 right-3">
                  <span className="badge badge-primary badge-sm">Popular</span>
                </div>
              ) : null}
              <div className="card-body">
                <h2 className="card-title text-xl">{plan.name}</h2>
                <p className="text-sm text-base-content/70 min-h-[3rem]">{plan.blurb}</p>
                <div className="mt-2">
                  <span className="text-4xl font-extrabold">${plan.price}</span>
                  <span className="text-base-content/60 font-medium"> / month</span>
                </div>
                <ul className="mt-4 space-y-2 text-sm flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="text-primary font-bold">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="card-actions mt-6">
                  <Link href="/signin" className="btn btn-primary btn-lg w-full">
                    Get Started
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-base-content/50 mt-10">
          Taxes may apply. Secure checkout when billing is enabled in your region.
        </p>
      </div>
    </section>
  );
}
