export const MEETING_DURATION_MINUTES = [5, 15, 30, 45, 60] as const;

export type MeetingDurationMinutes = (typeof MEETING_DURATION_MINUTES)[number];

export const MEETING_DURATION_ERROR_MESSAGE =
  "Duration must be 5, 15, 30, 45, or 60 minutes";

export const isValidMeetingDuration = (
  duration: number
): duration is MeetingDurationMinutes =>
  (MEETING_DURATION_MINUTES as readonly number[]).includes(duration);
