import type { Metadata } from "next";
import Link from "next/link";

import { assertClubsAppAccess } from "@/lib/auth/assert-clubs-access";
import { createClient } from "@/lib/supabase/server";
import { ClubSettingsForm } from "@/src/components/clubs/club-settings-form";

export const metadata: Metadata = {
  title: "Club settings",
};

export default async function ClubSettingsPage() {
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

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <p className="text-sm text-muted">
          <Link href="/dashboard" className="transition hover:text-brand">
            Dashboard
          </Link>
          <span className="mx-2 text-muted/60">&gt;</span>
          Club settings
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-brand">
          Club settings.
        </h1>
        <p className="mt-2 text-[15px] text-muted">
          Update your club identity, timezone, and booking slot window.
        </p>
      </div>

      {club ? (
        <div className="rounded-2xl border border-border bg-panel p-6 shadow-sm sm:p-8">
          <ClubSettingsForm club={club} />
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-panel px-6 py-12 text-center">
          <p className="font-medium text-foreground">No club linked yet</p>
          <p className="mt-2 text-sm text-muted">
            {access.role === "admin"
              ? "Admin accounts don’t own a club. Open a club owner account to edit settings."
              : "Contact support to link a club to this account before editing settings."}
          </p>
        </div>
      )}
    </div>
  );
}
