import Link from "next/link";

import { GameDeletionRequestPanel } from "@/src/components/schedule/game-deletion-request";
import {
  formatGameDateTime,
  formatLevelRange,
  formatStatusLabel,
  type ClubGameDetail,
  type GameDeletionRequest,
} from "@/src/features/schedule/game-detail";

type GameDetailViewProps = {
  clubId: string;
  game: ClubGameDetail;
  backHref: string;
  deletionRequest: GameDeletionRequest | null;
};

export function GameDetailView({
  clubId,
  game,
  backHref,
  deletionRequest,
}: GameDetailViewProps) {
  const { date, timeRange } = formatGameDateTime(game.startsAt, game.endsAt);
  const levelRange = formatLevelRange(game.levelMin, game.levelMax);

  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-[11px] font-semibold tracking-[0.18em] text-muted uppercase">
        <Link href="/dashboard" className="transition hover:text-brand">
          Dashboard
        </Link>
        <span className="mx-2 text-muted/50">&gt;</span>
        <Link href={backHref} className="transition hover:text-brand">
          Calendar
        </Link>
        <span className="mx-2 text-muted/50">&gt;</span>
        <span className="text-foreground/70">Booking</span>
      </p>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-brand sm:text-4xl">
            Game details
          </h1>
          <p className="mt-2 text-[15px] text-muted">
            {game.courtName} · {game.clubName}
          </p>
        </div>
        <StatusBadge status={game.status} />
      </div>

      <div className="mt-8 space-y-4">
        <section className="rounded-2xl border border-border bg-panel p-6 shadow-sm">
          <h2 className="text-[11px] font-semibold tracking-wider text-muted uppercase">
            Schedule
          </h2>
          <p className="mt-3 text-lg font-semibold text-foreground">{date}</p>
          <p className="mt-1 text-sm text-muted">{timeRange}</p>
        </section>

        <section className="rounded-2xl border border-border bg-panel p-6 shadow-sm">
          <h2 className="text-[11px] font-semibold tracking-wider text-muted uppercase">
            Court
          </h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <DetailItem label="Court" value={game.courtName} />
            <DetailItem
              label="Environment"
              value={game.courtEnvironment ?? "—"}
              capitalize
            />
            <DetailItem label="Club" value={game.clubName} />
            <DetailItem label="City" value={game.clubCity ?? "—"} />
          </dl>
        </section>

        <section className="rounded-2xl border border-border bg-panel p-6 shadow-sm">
          <h2 className="text-[11px] font-semibold tracking-wider text-muted uppercase">
            Session info
          </h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <DetailItem label="Host" value={game.hostName ?? "—"} />
            <DetailItem label="Status" value={formatStatusLabel(game.status)} />
            {levelRange ? <DetailItem label="Level" value={levelRange} /> : null}
            {game.genderCategory ? (
              <DetailItem
                label="Category"
                value={game.genderCategory}
                capitalize
              />
            ) : null}
          </dl>
          {game.notes ? (
            <div className="mt-4 rounded-xl bg-field px-4 py-3">
              <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">
                Notes
              </p>
              <p className="mt-2 text-sm text-foreground">{game.notes}</p>
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-border bg-panel p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[11px] font-semibold tracking-wider text-muted uppercase">
              Players
            </h2>
            <span className="text-sm font-medium text-muted">
              {game.players.length} player{game.players.length !== 1 ? "s" : ""}
            </span>
          </div>

          {game.players.length > 0 ? (
            <ul className="mt-4 divide-y divide-border">
              {game.players.map((player) => (
                <li
                  key={player.id}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
                      {player.name.charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {player.name}
                        {player.isHost ? (
                          <span className="ml-2 text-xs font-medium text-brand">
                            Host
                          </span>
                        ) : null}
                      </p>
                    </div>
                  </div>
                  <PlayerStatusPill status={player.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted">No players listed yet.</p>
          )}
        </section>

        <GameDeletionRequestPanel
          clubId={clubId}
          gameId={game.id}
          gameStatus={game.status}
          deletionRequest={deletionRequest}
        />
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href={backHref}
          className="inline-flex rounded-xl border border-border bg-panel px-4 py-2.5 text-sm font-semibold text-brand transition hover:bg-field"
        >
          ← Back to calendar
        </Link>
      </div>
    </div>
  );
}

function DetailItem({
  label,
  value,
  capitalize = false,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div>
      <dt className="text-[11px] font-semibold tracking-wider text-muted uppercase">
        {label}
      </dt>
      <dd
        className={`mt-1 text-sm font-medium text-foreground ${capitalize ? "capitalize" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}

function StatusBadge({ status }: { status: ClubGameDetail["status"] }) {
  const styles =
    status === "cancelled"
      ? "bg-red-50 text-red-700"
      : status === "completed"
        ? "bg-field text-muted"
        : status === "full"
          ? "bg-accent/20 text-brand-soft"
          : "bg-brand/10 text-brand";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold tracking-wider uppercase ${styles}`}
    >
      {formatStatusLabel(status)}
    </span>
  );
}

function PlayerStatusPill({ status }: { status: string }) {
  const label =
    status === "confirmed"
      ? "Confirmed"
      : status === "hosting"
        ? "Host"
        : status === "pending"
          ? "Pending"
          : status === "invited"
            ? "Invited"
            : status;

  return (
    <span className="rounded-full bg-field px-2.5 py-1 text-xs font-medium text-muted capitalize">
      {label}
    </span>
  );
}
