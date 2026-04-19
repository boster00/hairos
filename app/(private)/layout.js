import { redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
import config from "@/config";

// Auth gate for all /app/(private) routes. App chrome (sidebar, meters) lives in (shell)/layout.js;
// fullscreen routes (e.g. article preview) use (fullscreen)/layout.js instead.
export default async function LayoutPrivate({ children }) {
  if (process.env.CJGEO_DEV_FAKE_AUTH === "1") {
    return children;
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(config.auth.loginUrl);
  }

  return children;
}
