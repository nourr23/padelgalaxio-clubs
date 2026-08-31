import type { Metadata } from "next";
import Link from "next/link";

import { assertClubsAppAccess } from "@/lib/auth/assert-clubs-access";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const access = await assertClubsAppAccess(supabase);

  if (!access.ok) {
    return null;
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display text-4xl font-semibold tracking-tight text-brand">
        Dashboard.
      </h1>
      <p className="mt-2 text-[15px] text-muted">
        {access.club
          ? `Managing ${access.club.name}${access.club.city ? ` · ${access.club.city}` : ""}.`
          : access.role === "admin"
            ? "Signed in as admin."
            : "No club is linked to this account yet."}
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Link
          href="/dashboard/settings"
          className="rounded-2xl border border-border bg-panel px-5 py-4 text-sm font-semibold text-foreground transition hover:border-brand hover:text-brand"
        >
          Club settings →
        </Link>
        <Link
          href="/dashboard/courts"
          className="rounded-2xl border border-border bg-panel px-5 py-4 text-sm font-semibold text-foreground transition hover:border-brand hover:text-brand"
        >
          Courts →
        </Link>
      </div>
    </div>
  );
}
