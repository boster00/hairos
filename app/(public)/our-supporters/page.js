import Link from "next/link";
import { getSEOTags } from "@/libs/seo";
import config from "@/config";

export const metadata = getSEOTags({
  title: `Our supporters | ${config.appName}`,
  description:
    "Thank you to everyone who has shared feedback and helped spread the word about CJGEO.",
  canonicalUrlRelative: "/our-supporters",
});

const SUPPORTERS = [
  {
    name: "J. Richard Kirkham",
    href: "https://busybusinesspromotions.com/seoarticles/seoandsalesvideoanalysis.php",
    blurb:
      "J. Richard Kirkham helps websites perform better for both search and visitors—working at the intersection of SEO and how pages persuade. He reviews site messaging and structure so traffic is more likely to turn into action, not just higher rankings without follow-through.",
  },
];

export default function OurSupportersPage() {
  return (
    <main className="max-w-2xl mx-auto">
      <div className="p-6 md:p-8">
        <Link href="/" className="btn btn-ghost btn-sm gap-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path
              fillRule="evenodd"
              d="M15 10a.75.75 0 01-.75.75H7.612l2.158 1.96a.75.75 0 11-1.04 1.08l-3.5-3.25a.75.75 0 010-1.08l3.5-3.25a.75.75 0 111.04 1.08L7.612 9.25h6.638A.75.75 0 0115 10z"
              clipRule="evenodd"
            />
          </svg>
          Back
        </Link>

        <h1 className="text-3xl font-extrabold mt-4 mb-4">Our supporters</h1>

        <div className="prose prose-sm max-w-none text-base-content/90 space-y-6">
          <p>
            We are grateful to the people listed here for offering thoughtful
            product feedback and for helping others discover {config.appName}.
            Their time and energy make the product and the community stronger.
          </p>
        </div>

        <ul className="mt-8 space-y-6 list-none p-0">
          {SUPPORTERS.map((person) => (
            <li
              key={person.href}
              className="rounded-xl border border-base-300 bg-base-100 p-5 shadow-sm"
            >
              <a
                href={person.href}
                target="_blank"
                rel="noopener noreferrer"
                className="link link-primary font-semibold text-lg"
              >
                {person.name}
              </a>
              <p className="text-base-content/80 mt-2 text-sm leading-relaxed">
                {person.blurb}
              </p>
            </li>
          ))}
        </ul>

        <p className="mt-10 text-sm text-base-content/70">
          <Link href="/#demo-pages" className="link link-primary">
            Pages built with CJGEO
          </Link>
        </p>
      </div>
    </main>
  );
}
