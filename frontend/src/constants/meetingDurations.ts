export const MEETING_DURATION_MINUTES = [5, 15, 30, 45, 60] as const;

export type MeetingDurationMinutes = (typeof MEETING_DURATION_MINUTES)[number];

export const formatMeetingDurationLabel = (
  minutes: number,
  style: "short" | "long" = "short"
) => (style === "long" ? `${minutes} minutes` : `${minutes} min`);
