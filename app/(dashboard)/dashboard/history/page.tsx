import type { Metadata } from "next";
import Link from "next/link";

import { assertClubsAppAccess } from "@/lib/auth/assert-clubs-access";
import { createClient } from "@/lib/supabase/server";
import { HistoryView } from "@/src/components/history/history-view";
import { getHistoryData } from "@/src/features/history/queries";

export const metadata: Metadata = {
  title: "History & Statistics",
};

export default async function HistoryPage() {
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

  if (!club) {
    return (
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-muted uppercase">
            <Link href="/dashboard" className="transition hover:text-brand">
              Dashboard
            </Link>
            <span className="mx-2 text-muted/50">&gt;</span>
            <span className="text-foreground/70">History &amp; Statistics</span>
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-brand sm:text-4xl">
            History &amp; Statistics
          </h1>
        </div>

        <div className="rounded-2xl border border-dashed border-border bg-panel px-6 py-12 text-center">
          <p className="font-medium text-foreground">No club linked yet</p>
          <p className="mt-2 text-sm text-muted">
            {access.role === "admin"
              ? "Admin accounts don't own a club. Open a club owner account to view history."
              : "Contact support to link a club to this account before viewing history."}
          </p>
        </div>
      </div>
    );
  }

  const data = await getHistoryData(supabase, club);

  return <HistoryView data={data} />;
}
