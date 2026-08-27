import type { Metadata } from "next";

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
    <div>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
        Dashboard
      </h1>
      <p className="mt-2 text-muted">
        {access.club
          ? `Managing ${access.club.name}${access.club.city ? ` · ${access.club.city}` : ""}.`
          : access.role === "admin"
            ? "Signed in as admin."
            : "No club is linked to this account yet."}
      </p>
    </div>
  );
}
