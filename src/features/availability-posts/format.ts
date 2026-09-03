import { formatSlotLabelFr } from "@/src/features/availability-posts/slots";

export function formatAvailabilityDateLabel(ymd: string, now = new Date()) {
  const date = new Date(`${ymd}T12:00:00`);
  if (Number.isNaN(date.getTime())) return ymd;

  const todayYmd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  if (ymd === todayYmd) return "aujourd'hui";

  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

export function buildAvailabilityTitle(ymd: string, now = new Date()) {
  const label = formatAvailabilityDateLabel(ymd, now);
  if (label === "aujourd'hui") {
    return "Créneaux dispo aujourd'hui";
  }
  return `Créneaux dispo ${label}`;
}

export function buildAvailabilityPreview(args: {
  clubName: string;
  ymd: string;
  slots: string[];
  description?: string | null;
  price?: number | null;
  currency?: string | null;
}) {
  const dateLabel = formatAvailabilityDateLabel(args.ymd);
  const slotLine = args.slots.map(formatSlotLabelFr).join(" · ");
  const lines = [
    `📍 ${args.clubName} – créneaux dispo ${dateLabel}`,
    `Padel : ${slotLine}`,
  ];

  if (args.description?.trim()) {
    lines.push(args.description.trim());
  }

  if (args.price != null && Number.isFinite(args.price)) {
    const currency = args.currency?.trim() || "TND";
    lines.push(`À partir de ${args.price} ${currency}`);
  }

  return lines.join("\n");
}
