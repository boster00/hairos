import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-xl text-center space-y-6">
        <h1 className="text-3xl font-bold">Your app template</h1>
        <p className="text-base-content/80">
          This is a neutral landing page. Replace copy, branding, and routes for your product. Sign in to reach the
          authenticated app shell.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/signin" className="btn btn-primary">
            Sign in
          </Link>
          <Link href="/pricing" className="btn btn-outline">
            Pricing
          </Link>
        </div>
      </div>
    </main>
  );
}
