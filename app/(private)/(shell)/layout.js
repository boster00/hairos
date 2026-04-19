import { redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
import config from "@/config";
import DashboardContainer from "@/components/ui/Layout/DashboardContainer";

export default async function ShellLayout({ children }) {
  const fakeAuth = process.env.CJGEO_DEV_FAKE_AUTH === "1";
  const supabase = await createClient();

  const {
    data: { user: sessionUser },
  } = await supabase.auth.getUser();

  const user =
    sessionUser ||
    (fakeAuth
      ? {
          id: "00000000-0000-0000-0000-000000000001",
          email: "dev-fake-auth@local.invalid",
          user_metadata: { name: "Dev (fake auth)" },
        }
      : null);

  if (!user) {
    redirect(config.auth.loginUrl);
  }

  const adminEmails = [
    ...(process.env.ADMIN_EMAIL ? [process.env.ADMIN_EMAIL.trim().toLowerCase()] : []),
    ...(process.env.ADMIN_EMAILS
      ? process.env.ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)
      : []),
  ];
  const isAdmin = adminEmails.includes((user.email || "").toLowerCase());

  const allSidebarItems = [
    { name: "Dashboard", href: "/dashboard", iconName: "LayoutDashboard" },
    { name: "Calendar", href: "/calendar", iconName: "CalendarDays" },
    { name: "Clients", href: "/clients", iconName: "Users" },
    { name: "Staff", href: "/staff", iconName: "UserCheck" },
    { name: "Services", href: "/services", iconName: "Scissors" },
    { name: "Social Media", href: "/marketing/social", iconName: "Share2" },
    { name: "Newsletter", href: "/marketing/newsletter", iconName: "Mail" },
    { name: "Settings", href: "/settings", iconName: "Settings" },
    { name: "Billing", href: "/billing", iconName: "CreditCard" },
    { name: "Admin", href: "/admin", iconName: "ShieldCheck", adminOnly: true },
  ];

  const showDevItemsEnv = process.env.SHOW_DEV_SIDEBAR_ITEMS;
  const rawNodeEnv = process.env.NODE_ENV;

  const shouldShowDevItems =
    (showDevItemsEnv === "true" && rawNodeEnv === "development") || fakeAuth;

  const sidebarItems = allSidebarItems.filter((item) => {
    if (item.devOnly) return shouldShowDevItems;
    if (item.adminOnly) return isAdmin;
    return true;
  });

  return (
    <DashboardContainer navigationItems={sidebarItems} user={user}>
      {children}
    </DashboardContainer>
  );
}
