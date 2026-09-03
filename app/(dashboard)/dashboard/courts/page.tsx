import type { Metadata } from "next";
import Link from "next/link";

import { assertClubsAppAccess } from "@/lib/auth/assert-clubs-access";
import { createClient } from "@/lib/supabase/server";
import { CourtsManagement } from "@/src/components/courts/courts-management";
import { getCourtsForClub } from "@/src/features/courts/queries";

export const metadata: Metadata = {
  title: "Courts",
};

export default async function CourtsPage() {
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

  const courts = club ? await getCourtsForClub(supabase, club.id) : [];

  if (!club) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-muted uppercase">
            <Link href="/dashboard" className="transition hover:text-brand">
              Dashboard
            </Link>
            <span className="mx-2 text-muted/50">&gt;</span>
            <span className="text-foreground/70">Courts</span>
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-brand sm:text-4xl">
            Court Management
          </h1>
        </div>

        <div className="rounded-2xl border border-dashed border-border bg-panel px-6 py-12 text-center">
          <p className="font-medium text-foreground">No club linked yet</p>
          <p className="mt-2 text-sm text-muted">
            {access.role === "admin"
              ? "Admin accounts don't own a club. Open a club owner account to manage courts."
              : "Contact support to link a club to this account before managing courts."}
          </p>
        </div>
      </div>
    );
  }

  return <CourtsManagement clubId={club.id} courts={courts} />;
}
