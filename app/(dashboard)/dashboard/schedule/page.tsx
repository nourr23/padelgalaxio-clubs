import type { Metadata } from "next";
import Link from "next/link";

import { assertClubsAppAccess } from "@/lib/auth/assert-clubs-access";
import { createClient } from "@/lib/supabase/server";
import { ScheduleCalendar } from "@/src/components/schedule/schedule-calendar";
import { getScheduleForDate } from "@/src/features/schedule/queries";
import { toYmd } from "@/src/features/schedule/slots";

export const metadata: Metadata = {
  title: "Calendar",
};

export default async function SchedulePage() {
  const supabase = await createClient();
  const access = await assertClubsAppAccess(supabase);

  if (!access.ok) {
    return null;
  }

  let club = access.club;

  if (!club && access.role === "club") {
    const { data } = await supabase
      .from("clubs")
      .select("*")
      .eq("owner_user_id", access.user.id)
      .maybeSingle();
    club = data;
  }

  const today = toYmd(new Date());

  if (!club) {
    return (
      <div className="mx-auto max-w-7xl">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-brand sm:text-3xl">
          Booking Schedule
        </h1>
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-panel px-6 py-12 text-center">
          <p className="font-medium text-foreground">No club linked yet</p>
          <p className="mt-2 text-sm text-muted">
            Link a club to view the booking calendar.{" "}
            <Link href="/dashboard/settings" className="text-brand underline">
              Open settings
            </Link>
          </p>
        </div>
      </div>
    );
  }

  const initialData = await getScheduleForDate(supabase, club, today);

  return (
    <ScheduleCalendar club={club} initialYmd={today} initialData={initialData} />
  );
}
