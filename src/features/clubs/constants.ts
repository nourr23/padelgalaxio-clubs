export const CLUB_TIMEZONES = [
  "UTC",
  "Europe/Paris",
  "Europe/Madrid",
  "Europe/Lisbon",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Rome",
  "Europe/Amsterdam",
  "Europe/Brussels",
  "Africa/Casablanca",
  "Africa/Tunis",
  "America/New_York",
  "America/Los_Angeles",
  "America/Mexico_City",
  "Asia/Dubai",
] as const;

export const SLOT_DURATION_OPTIONS = [
  { value: 60, label: "60 minutes" },
  { value: 90, label: "90 minutes" },
  { value: 120, label: "120 minutes" },
] as const;
