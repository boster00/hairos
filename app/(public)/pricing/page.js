import { getSEOTags } from "@/libs/seo";
import config from "@/config";
import HairOsPublicPricing from "@/components/hairos/HairOsPublicPricing";

export const metadata = getSEOTags({
  title: `Pricing | ${config.appName}`,
  canonicalUrlRelative: "/pricing",
});

export default function PricingPage() {
  return <HairOsPublicPricing />;
}
