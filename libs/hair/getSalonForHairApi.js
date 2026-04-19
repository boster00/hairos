import { readSalon } from "@/libs/salon";
import { getDemoSalon, isDemoHairContext } from "@/libs/hairos/demoStore";

/**
 * Resolves the current user's salon for HairOS APIs.
 * In HAIR_OS_UI_DEMO + CJGEO_DEV_FAKE_AUTH, returns an in-memory demo salon (no DB).
 */
export async function getSalonForHairApi(supabase) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthorized", status: 401 };

  if (isDemoHairContext()) {
    return { salon: getDemoSalon(), user };
  }

  const { data: salon, error } = await readSalon(supabase, { ownerId: user.id });
  if (error) return { error: String(error.message || error), status: 500 };
  if (!salon) return { error: "no salon", status: 404 };
  return { salon, user };
}
