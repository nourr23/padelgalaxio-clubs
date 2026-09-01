import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { assertClubsAppAccess } from "@/lib/auth/assert-clubs-access";
import { createClient } from "@/lib/supabase/server";
import { GameDetailView } from "@/src/components/schedule/game-detail-view";
import {
  getClubGameDetail,
  getGameDeletionRequest,
} from "@/src/features/schedule/game-detail";
import { toYmd } from "@/src/features/schedule/slots";

export const metadata: Metadata = {
  title: "Booking details",
};

type GameDetailPageProps = {
  params: Promise<{ gameId: string }>;
  searchParams: Promise<{ from?: string }>;
};

export default async function GameDetailPage({
  params,
  searchParams,
}: GameDetailPageProps) {
  const { gameId } = await params;
  const { from } = await searchParams;

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
    notFound();
  }

  const game = await getClubGameDetail(supabase, club.id, gameId);
  if (!game) {
    notFound();
  }

  const deletionRequest = await getGameDeletionRequest(supabase, gameId);

  const backDate = from ?? toYmd(new Date(game.startsAt));
  const backHref = `/dashboard/schedule?date=${backDate}`;

  return (
    <GameDetailView
      clubId={club.id}
      game={game}
      backHref={backHref}
      deletionRequest={deletionRequest}
    />
  );
}
