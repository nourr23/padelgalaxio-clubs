import type { Metadata } from "next";
import Link from "next/link";

import { assertClubsAppAccess } from "@/lib/auth/assert-clubs-access";
import { createClient } from "@/lib/supabase/server";
import { CoachingPackagesEditor } from "@/src/components/coaching/coaching-packages-editor";
import { CoachingRequestsTable } from "@/src/components/coaching/coaching-requests-table";
import {
  getClubCoachingPackages,
  getClubCoachingRequests,
} from "@/src/features/coaching/queries";

export const metadata: Metadata = {
  title: "Coaching",
};

type CoachingPageProps = {
  searchParams: Promise<{ request?: string }>;
};

export default async function CoachingPage({ searchParams }: CoachingPageProps) {
  const { request } = await searchParams;
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

  const [packagesResult, requestsResult] = club
    ? await Promise.all([
        getClubCoachingPackages(supabase, club.id),
        getClubCoachingRequests(supabase, club.id),
      ])
    : [null, null];

  // Remount the editor after each save so drafts pick up their new ids.
  const editorKey =
    packagesResult?.packages
      .map((pkg) => `${pkg.id}:${pkg.updatedAt}`)
      .join("|") ?? "";

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8">
        <p className="text-sm text-muted">
          <Link href="/dashboard" className="transition hover:text-brand">
            Dashboard
          </Link>
          <span className="mx-2 text-muted/60">&gt;</span>
          Coaching
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-brand">
          Coaching.
        </h1>
        <p className="mt-2 text-[15px] text-muted">
          Set your coaching offers and follow up on the requests players send
          from the app. Players don&apos;t pay online yet: call them to arrange
          the sessions.
        </p>
      </div>

      {club && packagesResult && requestsResult ? (
        <>
          {packagesResult.error || requestsResult.error ? (
            <p
              role="alert"
              className="mb-5 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
            >
              {packagesResult.error ?? requestsResult.error}
            </p>
          ) : null}

          <section className="mb-12">
            <h2 className="mb-3 font-display text-xl font-semibold text-brand">
              Packages
            </h2>
            <CoachingPackagesEditor
              key={editorKey}
              clubId={club.id}
              initialPackages={packagesResult.packages}
            />
          </section>

          <section id="requests">
            <h2 className="mb-3 font-display text-xl font-semibold text-brand">
              Requests
            </h2>
            <CoachingRequestsTable
              clubId={club.id}
              requests={requestsResult.requests}
              highlightId={request ?? null}
            />
          </section>
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-panel px-6 py-12 text-center">
          <p className="font-medium text-foreground">No club linked yet</p>
          <p className="mt-2 text-sm text-muted">
            {access.role === "admin"
              ? "Admin accounts don’t own a club. Open a club owner account to manage coaching."
              : "Contact support to link a club to this account before adding coaching packages."}
          </p>
        </div>
      )}
    </div>
  );
}
