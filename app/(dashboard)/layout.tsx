import { redirect } from "next/navigation";

import { assertClubsAppAccess } from "@/lib/auth/assert-clubs-access";
import { logout } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { BrandMark } from "@/src/components/auth/brand-mark";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const access = await assertClubsAppAccess(supabase);

  if (!access.ok) {
    redirect("/login");
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border bg-panel">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <BrandMark />
          <div className="flex items-center gap-4">
            <p className="hidden text-sm text-muted sm:block">
              {access.club?.name ?? access.user.email}
            </p>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition hover:border-brand hover:text-brand"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
