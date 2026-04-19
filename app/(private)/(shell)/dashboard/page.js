import { createClient } from "@/libs/supabase/server";
import { readSalon } from "@/libs/salon";
import { readAppointments } from "@/libs/booking";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: salon } = await readSalon(supabase, { ownerId: user.id });

  const today = new Date().toISOString().split("T")[0];
  const { data: todayAppts } = salon
    ? await readAppointments(supabase, { salonId: salon.id, from: `${today}T00:00:00Z`, to: `${today}T23:59:59Z` })
    : { data: [] };

  if (!salon) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Welcome to HairOS</h1>
        <p className="text-base-content/60 mb-4">Let&apos;s set up your salon to get started.</p>
        <a href="/onboarding" className="btn btn-primary">Set up my salon</a>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-1">{salon.name}</h1>
      <p className="text-base-content/60 mb-6">Today&apos;s overview</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="stat bg-base-200 rounded-box">
          <div className="stat-title">Appointments today</div>
          <div className="stat-value">{todayAppts?.length ?? 0}</div>
        </div>
      </div>

      <h2 className="text-lg font-semibold mb-3">Today&apos;s schedule</h2>
      {!todayAppts?.length ? (
        <p className="text-base-content/50">No appointments today.</p>
      ) : (
        <div className="space-y-2">
          {todayAppts.map(appt => (
            <div key={appt.id} className="flex items-center gap-4 p-3 bg-base-200 rounded-lg">
              <span className="text-sm font-mono w-20">
                {new Date(appt.starts_at).toLocaleTimeString("en-US", { timeStyle: "short" })}
              </span>
              <span className="font-medium">{appt.client_name}</span>
              <span className="text-base-content/60 text-sm">{appt.services?.name}</span>
              <span className="text-base-content/50 text-sm ml-auto">{appt.staff?.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
