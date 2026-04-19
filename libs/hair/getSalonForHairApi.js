import { readSalon } from "@/libs/salon";
import { getDemoSalon, isDemoHairContext } from "@/libs/hairos/demoStore";

/**
 * Resolves the current user's salon for HairOS APIs.
 * In HAIR_OS_UI_DEMO + CJGEO_DEV_FAKE_AUTH, returns an in-memory demo salon (no DB).
 */
export async function getSalonForHairApi(supabase) {
  const {
    data: { user: sessionUser },
  } = await supabase.auth.getUser();

  const fakeAuth = process.env.CJGEO_DEV_FAKE_AUTH === "1";
  const user =
    sessionUser ||
    (fakeAuth && isDemoHairContext()
      ? {
          id: "00000000-0000-0000-0000-000000000001",
          email: "dev-fake-auth@local.invalid",
        }
      : null);

  if (!user) return { error: "unauthorized", status: 401 };

  if (isDemoHairContext()) {
    return { salon: getDemoSalon(), user };
  }

  const { data: salon, error } = await readSalon(supabase, { ownerId: user.id });
  if (error) return { error: String(error.message || error), status: 500 };
  if (!salon) return { error: "no salon", status: 404 };
  return { salon, user };
}
