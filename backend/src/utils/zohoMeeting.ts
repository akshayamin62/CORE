/**
 * Zoho Meeting Integration Utility
 *
 * Uses Zoho Meeting REST API v2 with OAuth2 auth.
 *
 * Required ENV variables:
 *   ZOHO_CLIENT_ID       – from Zoho API Console
 *   ZOHO_CLIENT_SECRET   – from Zoho API Console
 *   ZOHO_REFRESH_TOKEN   – generated once via OAuth2 flow
 *   ZOHO_ACCOUNT_DOMAIN  – "com" | "in" | "eu" | "com.au" | "com.cn" (default "com")
 *
 * The Zoho Meeting API v2 requires:
 *  1. ZSOID (organization ID) in the URL path: /api/v2/{zsoid}/sessions.json
 *  2. Authorization header: Zoho-oauthtoken {accessToken}
 */

import axios from "axios";

// ──────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────

export interface ZohoMeetingResult {
  meetingKey: string;
  meetingUrl: string; // join URL for all participants
  startUrl?: string; // host start URL (if returned)
  meetingNumber?: string;
  topic: string;
  startTime: string;
  duration: number;
}

interface ZohoTokenCache {
  accessToken: string;
  expiresAt: number; // epoch ms
}

// ──────────────────────────────────────────────────
// Caches
// ──────────────────────────────────────────────────

let tokenCache: ZohoTokenCache | null = null;
let zsoidCache: string | null = null;

const getAccountsDomain = (): string => {
  const domain = process.env.ZOHO_ACCOUNT_DOMAIN || "com";
  return `https://accounts.zoho.${domain}`;
};

const getMeetingApiBase = (): string => {
  const domain = process.env.ZOHO_ACCOUNT_DOMAIN || "com";
  return `https://meeting.zoho.${domain}/api/v2`;
};

// ──────────────────────────────────────────────────
// Token Management (cached in-memory)
// ──────────────────────────────────────────────────

/**
 * Refresh the access token using the stored refresh token.
 * Caches response; reuses until 2 min before expiry.
 */
const getAccessToken = async (): Promise<string> => {
  // Return cached token if still valid (with 2-min buffer)
  if (tokenCache && Date.now() < tokenCache.expiresAt - 120_000) {
    return tokenCache.accessToken;
  }

  const clientId = process.env.ZOHO_CLIENT_ID;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET;
  const refreshToken = process.env.ZOHO_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Zoho Meeting credentials not configured. Set ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, and ZOHO_REFRESH_TOKEN."
    );
  }

  try {
    const response = await axios.post(
      `${getAccountsDomain()}/oauth/v2/token`,
      null,
      {
        params: {
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "refresh_token",
        },
      }
    );

    const { access_token, expires_in } = response.data;

    if (!access_token) {
      console.error("Zoho token response:", response.data);
      throw new Error("No access_token in Zoho response");
    }

    tokenCache = {
      accessToken: access_token,
      expiresAt: Date.now() + expires_in * 1000,
    };

    console.log("✅ Zoho access token refreshed");
    return access_token;
  } catch (error: any) {
    console.error("❌ Failed to refresh Zoho access token:", error?.response?.data || error.message);
    throw new Error("Failed to obtain Zoho access token");
  }
};

// ──────────────────────────────────────────────────
// ZSOID (Organization ID) — required in all API paths
// ──────────────────────────────────────────────────

/**
 * Get the Zoho Service Organization ID (zsoid).
 * This is required in the URL path of all meeting API calls.
 *
 * Priority:
 *  1. ZOHO_ZSOID env var (if set manually) — NO API CALL NEEDED
 *  2. GET /api/v2/user.json endpoint (requires ZohoMeeting.manageOrg.READ scope)
 *
 * If you have the ZSOID, set ZOHO_ZSOID in .env and skip the OAuth scope requirement.
 */
const getZsoid = async (): Promise<string> => {
  // Check if ZSOID is set in env
  const envZsoid = process.env.ZOHO_ZSOID;
  if (envZsoid) {
    console.log(`✅ Using ZOHO_ZSOID from env: ${envZsoid}`);
    zsoidCache = envZsoid;
    return envZsoid;
  }

  if (zsoidCache) return zsoidCache;

  const accessToken = await getAccessToken();

  try {
    const response = await axios.get(
      `${getMeetingApiBase()}/user.json`,
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
        },
      }
    );

    console.log("📋 Zoho user details response:", JSON.stringify(response.data, null, 2));

    // Try multiple possible response structures
    const zsoid =
      response.data?.userDetails?.zsoid ||
      response.data?.zsoid ||
      response.data?.user?.zsoid ||
      response.data?.orgId ||
      response.data?.userDetails?.orgId;

    if (!zsoid) {
      console.error("❌ Could not extract zsoid from user response:", JSON.stringify(response.data, null, 2));
      throw new Error("Could not extract zsoid from Zoho user details");
    }

    zsoidCache = String(zsoid);
    console.log(`✅ Zoho ZSOID fetched from API: ${zsoidCache}`);
    return zsoidCache;
  } catch (error: any) {
    console.error("❌ Failed to fetch Zoho ZSOID from API:");
    console.error("   Status:", error?.response?.status);
    console.error("   Data:", JSON.stringify(error?.response?.data, null, 2));
    console.error("   Message:", error.message);
    console.error("➡️  SOLUTION: Set ZOHO_ZSOID in .env with your Organization ID to skip this API call");
    throw new Error(`Failed to get Zoho organization ID: ${error.message}`);
  }
};

// ──────────────────────────────────────────────────
// Create Meeting
// ──────────────────────────────────────────────────

interface CreateMeetingParams {
  topic: string;
  /** ISO date string or Date object */
  startTime: Date | string;
  /** Duration in minutes */
  duration: number;
  /** Timezone (IANA), default Asia/Kolkata */
  timezone?: string;
  /** Optional agenda / description */
  agenda?: string;
  /** Participant emails to invite */
  participantEmails?: string[];
}

/**
 * Create a Zoho Meeting and return the join link.
 *
 * API: POST /api/v2/{zsoid}/sessions.json
 * Docs: https://www.zoho.com/meeting/api-integration/meeting-api/create-a-meeting.html
 */
export const createZohoMeeting = async (
  params: CreateMeetingParams
): Promise<ZohoMeetingResult> => {
  const {
    topic,
    startTime,
    duration,
    timezone = "Asia/Kolkata",
    agenda,
    participantEmails,
  } = params;

  // Check if Zoho credentials are configured
  if (!process.env.ZOHO_CLIENT_ID || !process.env.ZOHO_CLIENT_SECRET || !process.env.ZOHO_REFRESH_TOKEN) {
    console.warn("⚠️  Zoho Meeting credentials not configured. Returning placeholder link.");
    return {
      meetingKey: "not-configured",
      meetingUrl: "",
      topic,
      startTime: new Date(startTime).toISOString(),
      duration,
    };
  }

  const accessToken = await getAccessToken();
  const zsoid = await getZsoid();
  console.log("🔑 Got access token & zsoid, preparing Zoho meeting request...");

  // Format start time for Zoho: "MMM dd, yyyy hh:mm AM/PM"
  const dateObj = new Date(startTime);
  const zohoStartTime = formatZohoDateTime(dateObj);
  console.log(`📅 Formatted meeting time: ${zohoStartTime}`);

  const requestBody: any = {
    session: {
      topic,
      startTime: zohoStartTime,
      duration: duration,
      timezone,
    },
  };

  if (agenda) {
    requestBody.session.agenda = agenda;
  }

  if (participantEmails && participantEmails.length > 0) {
    requestBody.session.participants = participantEmails.map((email) => ({
      email,
    }));
  }

  // Correct URL: /api/v2/{zsoid}/sessions.json
  const apiUrl = `${getMeetingApiBase()}/${zsoid}/sessions.json`;
  console.log(`📤 Zoho API URL: ${apiUrl}`);
  console.log(`📤 Zoho request body:`, JSON.stringify(requestBody, null, 2));

  try {
    const response = await axios.post(
      apiUrl,
      requestBody,
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Log full response for debugging
    console.log("📋 Zoho Meeting API full response:", JSON.stringify(response.data, null, 2));

    // Handle both object and array response formats
    const rawSession = response.data?.session;
    const session = Array.isArray(rawSession) ? rawSession[0] : rawSession;

    if (!session) {
      console.error("Zoho Meeting API response (no session):", JSON.stringify(response.data, null, 2));
      throw new Error("Unexpected Zoho Meeting API response structure");
    }

    // Zoho Meeting API returns "startLink" for the meeting join/start URL
    const meetingUrl =
      session.startLink ||
      session.joinUrl ||
      session.joinLink ||
      session.meetingURL ||
      session.meetingUrl ||
      "";

    // Fallback: construct join URL from meeting key if no URL returned
    const domain = process.env.ZOHO_ACCOUNT_DOMAIN || "com";
    const fallbackUrl = session.meetingKey
      ? `https://meeting.zoho.${domain}/meeting/${session.meetingKey}`
      : "";

    const result: ZohoMeetingResult = {
      meetingKey: String(session.meetingKey || session.sessionKey || ""),
      meetingUrl: meetingUrl || fallbackUrl,
      startUrl: session.startLink || session.startUrl || session.hostUrl || "",
      meetingNumber: String(session.meetingNumber || session.sessionId || ""),
      topic: session.topic || topic,
      startTime: session.startTime || dateObj.toISOString(),
      duration: session.duration || duration,
    };

    console.log(`✅ Zoho Meeting created: key=${result.meetingKey}, url=${result.meetingUrl}`);
    return result;
  } catch (error: any) {
    console.error("❌ Failed to create Zoho Meeting:");
    console.error("   Error message:", error.message);
    console.error("   Response status:", error?.response?.status);
    console.error("   Response data:", JSON.stringify(error?.response?.data, null, 2));
    throw new Error(
      `Failed to create Zoho Meeting: ${error?.response?.data?.message || error?.response?.data?.error || error.message}`
    );
  }
};

// ──────────────────────────────────────────────────
// Delete / Cancel Meeting
// ──────────────────────────────────────────────────

/**
 * Delete a Zoho meeting by its key.
 * API: DELETE /api/v2/{zsoid}/sessions/{meetingKey}.json
 */
export const deleteZohoMeeting = async (meetingKey: string): Promise<void> => {
  if (!meetingKey || meetingKey === "not-configured") return;

  if (!process.env.ZOHO_CLIENT_ID) {
    console.warn("⚠️  Zoho not configured, skipping meeting deletion.");
    return;
  }

  try {
    const accessToken = await getAccessToken();
    const zsoid = await getZsoid();

    await axios.delete(
      `${getMeetingApiBase()}/${zsoid}/sessions/${meetingKey}.json`,
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
        },
      }
    );

    console.log(`✅ Zoho Meeting ${meetingKey} deleted`);
  } catch (error: any) {
    console.error(
      `❌ Failed to delete Zoho Meeting ${meetingKey}:`,
      error?.response?.data || error.message
    );
    // Non-fatal – don't throw; meeting might already be deleted
  }
};

// ──────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────

/**
 * Format a Date to Zoho's expected format: "MMM dd, yyyy hh:mm a"
 * e.g. "Feb 07, 2026 02:30 PM"
 */
function formatZohoDateTime(date: Date): string {
  const months = [
    "Jan","Feb","Mar","Apr","May","Jun",
    "Jul","Aug","Sep","Oct","Nov","Dec",
  ];

  const month = months[date.getMonth()];
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;

  return `${month} ${day}, ${year} ${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
}
