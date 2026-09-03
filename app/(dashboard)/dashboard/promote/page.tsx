import type { Metadata } from "next";
import Link from "next/link";

import { assertClubsAppAccess } from "@/lib/auth/assert-clubs-access";
import { createClient } from "@/lib/supabase/server";
import { AvailabilityComposer } from "@/src/components/availability/availability-composer";
import {
  fetchAvailabilityPostForDate,
  fetchFreeSlotsForDate,
  fetchMyClub,
  fetchRecentAvailabilityPosts,
} from "@/src/features/availability-posts/api";
import { toYmd } from "@/src/features/schedule/slots";

export const metadata: Metadata = {
  title: "Promote availability",
};

export default async function PromoteAvailabilityPage() {
  const supabase = await createClient();
  const access = await assertClubsAppAccess(supabase);

  if (!access.ok) {
    return null;
  }

  let club = access.club;
  if (!club) {
    club = await fetchMyClub(supabase, access.user.id);
  }

  if (!club) {
    return (
      <div className="mx-auto max-w-7xl">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-brand sm:text-3xl">
          Promote availability
        </h1>
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-panel px-6 py-12 text-center">
          <p className="font-medium text-foreground">No club linked yet</p>
          <p className="mt-2 text-sm text-muted">
            Link a club before publishing availability posts.{" "}
            <Link href="/dashboard/settings" className="text-brand underline">
              Open settings
            </Link>
          </p>
        </div>
      </div>
    );
  }

  const initialYmd = toYmd(new Date());
  const [freeSlots, existingPost, recentPosts] = await Promise.all([
    fetchFreeSlotsForDate(supabase, club, initialYmd),
    fetchAvailabilityPostForDate(supabase, club.id, initialYmd),
    fetchRecentAvailabilityPosts(supabase, club.id),
  ]);

  return (
    <AvailabilityComposer
      club={club}
      initialData={{
        validForDate: initialYmd,
        freeSlots,
        existingPost,
        recentPosts,
      }}
    />
  );
}
