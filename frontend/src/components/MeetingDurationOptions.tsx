import {
  MEETING_DURATION_MINUTES,
  formatMeetingDurationLabel,
} from "@/constants/meetingDurations";

interface MeetingDurationOptionsProps {
  labelStyle?: "short" | "long";
}

export default function MeetingDurationOptions({
  labelStyle = "short",
}: MeetingDurationOptionsProps) {
  return (
    <>
      {MEETING_DURATION_MINUTES.map((minutes) => (
        <option key={minutes} value={minutes}>
          {formatMeetingDurationLabel(minutes, labelStyle)}
        </option>
      ))}
    </>
  );
}
