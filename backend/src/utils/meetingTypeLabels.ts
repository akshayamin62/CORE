import { MEETING_TYPE } from "../models/FollowUp";
import { TEAMMEET_TYPE } from "../models/TeamMeet";

/** Human-readable label for follow-up meeting types (values are already readable). */
export function formatFollowUpMeetingTypeLabel(meetingType: MEETING_TYPE | string): string {
  if (meetingType === MEETING_TYPE.ONLINE) return "Online";
  if (meetingType === MEETING_TYPE.FACE_TO_FACE) return "Face to Face";
  if (meetingType === MEETING_TYPE.PHONE_CALL) return "Phone Call";
  return String(meetingType || MEETING_TYPE.ONLINE);
}

/** WhatsApp detail suffix for follow-up notifications. */
export function getFollowUpWhatsAppMeetingInfo(
  meetingType: MEETING_TYPE | string,
  zohoMeetingUrl?: string | null
): string {
  if (meetingType === MEETING_TYPE.ONLINE) {
    return `Join at: ${zohoMeetingUrl || "Link pending"}`;
  }
  if (meetingType === MEETING_TYPE.PHONE_CALL) {
    return "Phone Call meeting";
  }
  return "In-person meeting";
}

/** Human-readable label for team meet types. */
export function formatTeamMeetTypeLabel(meetingType: TEAMMEET_TYPE | string): string {
  if (meetingType === TEAMMEET_TYPE.ONLINE) return "Online";
  if (meetingType === TEAMMEET_TYPE.FACE_TO_FACE) return "Face to Face";
  if (meetingType === TEAMMEET_TYPE.PHONE_CALL) return "Phone Call";
  return "Online";
}

/** WhatsApp detail line for team meet notifications. */
export function getTeamMeetWhatsAppDetails(params: {
  subject: string;
  formattedDate: string;
  scheduledTime: string;
  duration: number;
  meetingType: TEAMMEET_TYPE | string;
  zohoMeetingUrl?: string | null;
  zohoMeetingId?: string | null;
  zohoMeetingPassword?: string | null;
  suffix?: string;
}): string {
  const {
    subject,
    formattedDate,
    scheduledTime,
    duration,
    meetingType,
    zohoMeetingUrl,
    zohoMeetingId,
    zohoMeetingPassword,
    suffix = "Please be on time.",
  } = params;

  if (meetingType === TEAMMEET_TYPE.ONLINE && zohoMeetingUrl) {
    return `"${subject}" on ${formattedDate} at ${scheduledTime} (${duration} mins). Meeting ID: ${zohoMeetingId} | Password: ${zohoMeetingPassword} | Join at: ${zohoMeetingUrl}`;
  }

  const typeLabel = formatTeamMeetTypeLabel(meetingType);
  return `"${subject}" on ${formattedDate} at ${scheduledTime} (${duration} mins; ${typeLabel}). ${suffix}`;
}
