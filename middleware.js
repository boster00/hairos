import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

async function updateSession(request) {
  // Skip auth refresh for API routes that don't need authentication
  const { pathname } = request.nextUrl;
  
  // Skip static files and favicon early (should be excluded by matcher, but double-check)
  if (pathname === '/favicon.ico' || 
      pathname.startsWith('/icon') || 
      pathname.startsWith('/apple-icon') ||
      pathname.startsWith('/opengraph-image') ||
      pathname.startsWith('/twitter-image')) {
    return NextResponse.next({
      request,
    });
  }
  
  const skipAuthRoutes = ['/api/webhook', '/api/lead', '/api/healthz'];
  
  if (skipAuthRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next({
      request,
    });
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // refreshing the auth token
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // HairOS: logged-in users without a salon go to onboarding before using the shell app
  const hairShellPrefixes = [
    "/dashboard",
    "/calendar",
    "/clients",
    "/staff",
    "/services",
    "/marketing",
    "/settings",
    "/billing",
    "/admin",
    "/campaigns",
  ];
  const needsSalon =
    pathname !== "/onboarding" &&
    !pathname.startsWith("/api") &&
    !pathname.startsWith("/_next") &&
    hairShellPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (user && needsSalon) {
    const { data: salons } = await supabase.from("salons").select("id").eq("owner_id", user.id).limit(1);
    if (!salons?.length) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export async function middleware(request) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
