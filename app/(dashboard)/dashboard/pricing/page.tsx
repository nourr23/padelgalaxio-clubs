import type { Metadata } from "next";
import Link from "next/link";

import { assertClubsAppAccess } from "@/lib/auth/assert-clubs-access";
import { createClient } from "@/lib/supabase/server";
import { BookingWindowForm } from "@/src/components/pricing/booking-window-form";
import { PricingEditor } from "@/src/components/pricing/pricing-editor";
import { getClubPricing } from "@/src/features/pricing/queries";

export const metadata: Metadata = {
  title: "Pricing",
};

export default async function PricingPage() {
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

  const pricing = club ? await getClubPricing(supabase, club.id) : null;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8">
        <p className="text-sm text-muted">
          <Link href="/dashboard" className="transition hover:text-brand">
            Dashboard
          </Link>
          <span className="mx-2 text-muted/60">&gt;</span>
          Pricing
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-brand">
          Session pricing.
        </h1>
        <p className="mt-2 text-[15px] text-muted">
          Set how far ahead players can book, and court prices by day, time
          range and court.
        </p>
      </div>

      {club && pricing ? (
        <>
          {pricing.error ? (
            <p
              role="alert"
              className="mb-5 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
            >
              {pricing.error}
            </p>
          ) : null}
          <section className="mb-8">
            <h2 className="mb-3 font-display text-xl font-semibold text-brand">
              Booking window
            </h2>
            <BookingWindowForm
              clubId={club.id}
              bookingWindowDays={club.booking_window_days}
            />
          </section>
          <h2 className="mb-3 font-display text-xl font-semibold text-brand">
            Session prices
          </h2>
          <PricingEditor
            club={club}
            courts={pricing.courts}
            initialGroups={pricing.groups}
          />
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-panel px-6 py-12 text-center">
          <p className="font-medium text-foreground">No club linked yet</p>
          <p className="mt-2 text-sm text-muted">
            {access.role === "admin"
              ? "Admin accounts don’t own a club. Open a club owner account to set prices."
              : "Contact support to link a club to this account before setting prices."}
          </p>
        </div>
      )}
    </div>
  );
}
