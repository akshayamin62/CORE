import { Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../types/auth";
import ReferrerFollowUp, { IReferrerFollowUp } from "../models/ReferrerFollowUp";
import Referrer, { REFERRER_STAGE, IReferrer } from "../models/Referrer";
import { FOLLOWUP_STATUS, MEETING_TYPE } from "../models/FollowUp";
import User from "../models/User";
import Admin from "../models/Admin";
import { createZohoMeeting } from "../utils/zohoMeeting";
import { sendMeetingScheduledEmail } from "../utils/email";
import { getFollowUpWhatsAppMeetingInfo } from "../utils/meetingTypeLabels";
import { sendWhatsAppGeneralNotification } from "../utils/whatsapp";
import { USER_ROLE } from "../types/roles";

const getDayBounds = (date: Date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const doTimeSlotsOverlap = (
  time1: string,
  duration1: number,
  time2: string,
  duration2: number
): boolean => {
  const start1 = timeToMinutes(time1);
  const end1 = start1 + duration1;
  const start2 = timeToMinutes(time2);
  const end2 = start2 + duration2;
  return start1 < end2 && start2 < end1;
};

const referrerPopulate = {
  path: "referrerId",
  select: "email mobileNumber stage referralSlug",
  populate: {
    path: "userId",
    select: "firstName middleName lastName email",
  },
};

async function getOwnedReferrer(referrerId: string, adminUserId: string) {
  return Referrer.findOne({ _id: referrerId, adminId: adminUserId }).populate({
    path: "userId",
    select: "firstName middleName lastName email",
  });
}

function getReferrerDisplayName(referrer: IReferrer): string {
  const user = referrer.userId as {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    email?: string;
  } | null;
  if (user) {
    const name = [user.firstName, user.middleName, user.lastName]
      .filter(Boolean)
      .join(" ");
    if (name) return name;
    if (user.email) return user.email;
  }
  return referrer.email || "Referrer";
}

async function attachZohoMeetingIfOnline(
  followUp: IReferrerFollowUp,
  referrer: IReferrer,
  adminUserId: string,
  referrerName: string
): Promise<void> {
  if (followUp.meetingType !== MEETING_TYPE.ONLINE) return;

  try {
    const [hours, mins] = followUp.scheduledTime.split(":").map(Number);
    const meetingStartTime = new Date(followUp.scheduledDate);
    meetingStartTime.setHours(hours, mins, 0, 0);

    const participantEmails: string[] = [];
    if (referrer.email) participantEmails.push(referrer.email);
    const userEmail = (referrer.userId as { email?: string } | null)?.email;
    if (userEmail && !participantEmails.includes(userEmail)) {
      participantEmails.push(userEmail);
    }

    const adminUser = await User.findById(adminUserId).select("email");
    if (adminUser?.email && !participantEmails.includes(adminUser.email)) {
      participantEmails.push(adminUser.email);
    }

    const zohoResult = await createZohoMeeting({
      topic: `Referrer Follow-up #${followUp.followUpNumber} - ${referrerName}`,
      startTime: meetingStartTime,
      duration: followUp.duration,
      agenda: followUp.notes || `Follow-up with referrer ${referrerName}`,
      participantEmails,
    });

    followUp.zohoMeetingKey = zohoResult.meetingKey;
    followUp.zohoMeetingUrl = zohoResult.meetingUrl;
    followUp.zohoMeetingId = zohoResult.meetingNumber || zohoResult.meetingKey;
    followUp.zohoMeetingPassword = zohoResult.meetingPassword || "";
  } catch (zohoError) {
    console.error(
      "⚠️  Zoho Meeting creation failed for referrer follow-up (saved without link):",
      zohoError
    );
  }
}

async function notifyReferrerFollowUpScheduled(
  followUp: IReferrerFollowUp,
  referrer: IReferrer,
  adminUserId: string,
  referrerName: string
): Promise<void> {
  const scheduleDate = new Date(followUp.scheduledDate);
  const formattedDate = scheduleDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const adminUser = await User.findById(adminUserId).select(
    "firstName middleName lastName email"
  );
  const adminFullName = adminUser
    ? [adminUser.firstName, adminUser.middleName, adminUser.lastName]
        .filter(Boolean)
        .join(" ")
    : "Admin";

  const meetingEmailDetails = {
    subject: `Referrer Follow-up #${followUp.followUpNumber} - ${referrerName}`,
    date: formattedDate,
    time: followUp.scheduledTime,
    duration: followUp.duration,
    meetingType: followUp.meetingType,
    meetingUrl: followUp.zohoMeetingUrl || undefined,
    meetingId: followUp.zohoMeetingId || undefined,
    meetingPassword: followUp.zohoMeetingPassword || undefined,
    agenda: followUp.notes || undefined,
    otherPartyName: "",
  };

  const referrerEmail =
    referrer.email || (referrer.userId as { email?: string } | null)?.email;

  if (referrerEmail) {
    sendMeetingScheduledEmail(referrerEmail, referrerName, {
      ...meetingEmailDetails,
      otherPartyName: adminFullName,
    }).catch((err) =>
      console.error("Failed to send referrer follow-up email to referrer:", err)
    );
  }

  if (adminUser?.email) {
    sendMeetingScheduledEmail(adminUser.email, adminFullName, {
      ...meetingEmailDetails,
      otherPartyName: referrerName,
    }).catch((err) =>
      console.error("Failed to send referrer follow-up email to admin:", err)
    );
  }

  const meetingInfo = getFollowUpWhatsAppMeetingInfo(
    followUp.meetingType,
    followUp.zohoMeetingUrl
  );
  const whatsAppDetails = `Follow-up #${followUp.followUpNumber} on ${formattedDate} at ${followUp.scheduledTime} (${followUp.duration} mins). ${meetingInfo}`;

  if (referrer.mobileNumber) {
    sendWhatsAppGeneralNotification(
      referrer.mobileNumber,
      referrerName,
      "A follow-up session has been scheduled for you.",
      whatsAppDetails
    ).catch((err) =>
      console.error("Failed to send referrer follow-up WhatsApp to referrer:", err)
    );
  }

  const adminProfile = await Admin.findOne({ userId: adminUserId }).select(
    "mobileNumber"
  );
  if (adminProfile?.mobileNumber) {
    sendWhatsAppGeneralNotification(
      adminProfile.mobileNumber,
      adminFullName,
      `A referrer follow-up has been scheduled with ${referrerName}.`,
      whatsAppDetails
    ).catch((err) =>
      console.error("Failed to send referrer follow-up WhatsApp to admin:", err)
    );
  }
}

export const createReferrerFollowUp = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const adminUserId = req.user?.userId;
    const { referrerId, scheduledDate, scheduledTime, duration, meetingType, notes } =
      req.body;

    if (!adminUserId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!referrerId || !scheduledDate || !scheduledTime || !duration) {
      return res.status(400).json({
        success: false,
        message: "Referrer ID, scheduled date, time, and duration are required",
      });
    }

    const referrer = await getOwnedReferrer(referrerId, adminUserId);
    if (!referrer) {
      return res.status(404).json({
        success: false,
        message: "Referrer not found or unauthorized",
      });
    }

    const scheduleDate = new Date(scheduledDate);
    const { start: dayStart, end: dayEnd } = getDayBounds(scheduleDate);

    const sameDay = await ReferrerFollowUp.find({
      adminId: adminUserId,
      scheduledDate: { $gte: dayStart, $lte: dayEnd },
    }).populate(referrerPopulate);

    for (const existing of sameDay) {
      if (
        doTimeSlotsOverlap(
          scheduledTime,
          duration,
          existing.scheduledTime,
          existing.duration
        )
      ) {
        const ref = existing.referrerId as any;
        const name = ref?.userId
          ? [ref.userId.firstName, ref.userId.middleName, ref.userId.lastName]
              .filter(Boolean)
              .join(" ")
          : "another referrer";
        return res.status(400).json({
          success: false,
          message: `Time slot conflicts with a follow-up at ${existing.scheduledTime} for ${name}`,
        });
      }
    }

    const followUpNumber =
      (await ReferrerFollowUp.countDocuments({ referrerId })) + 1;

    const initialStatus =
      referrer.stage === REFERRER_STAGE.CONVERTED
        ? FOLLOWUP_STATUS.CONVERTED
        : FOLLOWUP_STATUS.SCHEDULED;

    const effectiveMeetingType = meetingType || MEETING_TYPE.PHONE_CALL;
    const referrerName = getReferrerDisplayName(referrer);

    const followUp = new ReferrerFollowUp({
      referrerId,
      adminId: adminUserId,
      scheduledDate: scheduleDate,
      scheduledTime,
      duration,
      meetingType: effectiveMeetingType,
      status: initialStatus,
      stageAtFollowUp: referrer.stage || REFERRER_STAGE.NEW,
      followUpNumber,
      notes: notes || "",
      createdBy: adminUserId,
    });

    await attachZohoMeetingIfOnline(followUp, referrer, adminUserId, referrerName);
    await followUp.save();

    await followUp.populate(referrerPopulate);

    notifyReferrerFollowUpScheduled(
      followUp,
      referrer,
      adminUserId,
      referrerName
    ).catch((err) =>
      console.error("Failed to send referrer follow-up notifications:", err)
    );

    return res.status(201).json({
      success: true,
      message: "Referrer follow-up scheduled successfully",
      data: { followUp },
    });
  } catch (error) {
    console.error("Create referrer follow-up error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to schedule referrer follow-up",
    });
  }
};

export const getAdminReferrerFollowUps = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const adminUserId = req.user?.userId;
    if (!adminUserId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { startDate, endDate, status } = req.query;
    const filter: Record<string, unknown> = { adminId: adminUserId };

    if (startDate && endDate) {
      filter.scheduledDate = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      };
    }
    if (status) filter.status = status;

    const followUps = await ReferrerFollowUp.find(filter)
      .populate(referrerPopulate)
      .sort({ scheduledDate: 1, scheduledTime: 1 });

    return res.json({ success: true, data: { followUps } });
  } catch (error) {
    console.error("Get admin referrer follow-ups error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch referrer follow-ups",
    });
  }
};

export const getAdminReferrerFollowUpSummary = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const adminUserId = req.user?.userId;
    if (!adminUserId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const today = new Date();
    const { start: todayStart, end: todayEnd } = getDayBounds(today);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const { start: tomorrowStart, end: tomorrowEnd } = getDayBounds(tomorrow);

    const baseFilter = { adminId: adminUserId };

    const [todayFollowUps, missedFollowUps, upcomingFollowUps] =
      await Promise.all([
        ReferrerFollowUp.find({
          ...baseFilter,
          scheduledDate: { $gte: todayStart, $lte: todayEnd },
        })
          .populate(referrerPopulate)
          .sort({ scheduledTime: 1 }),
        ReferrerFollowUp.find({
          ...baseFilter,
          scheduledDate: { $lt: todayStart },
          status: FOLLOWUP_STATUS.SCHEDULED,
        })
          .populate(referrerPopulate)
          .sort({ scheduledDate: -1 }),
        ReferrerFollowUp.find({
          ...baseFilter,
          scheduledDate: { $gte: tomorrowStart, $lte: tomorrowEnd },
          status: FOLLOWUP_STATUS.SCHEDULED,
        })
          .populate(referrerPopulate)
          .sort({ scheduledTime: 1 }),
      ]);

    return res.json({
      success: true,
      data: {
        today: todayFollowUps,
        missed: missedFollowUps,
        upcoming: upcomingFollowUps,
        counts: {
          today: todayFollowUps.length,
          missed: missedFollowUps.length,
          upcoming: upcomingFollowUps.length,
        },
      },
    });
  } catch (error) {
    console.error("Get referrer follow-up summary error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch referrer follow-up summary",
    });
  }
};

export const getReferrerFollowUpHistory = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const adminUserId = req.user?.userId;
    const { referrerId } = req.params;

    if (!adminUserId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const referrer = await getOwnedReferrer(referrerId, adminUserId);
    if (!referrer) {
      return res.status(404).json({
        success: false,
        message: "Referrer not found or unauthorized",
      });
    }

    const followUps = await ReferrerFollowUp.find({ referrerId })
      .populate(referrerPopulate)
      .sort({ followUpNumber: 1 });

    return res.json({ success: true, data: { followUps } });
  } catch (error) {
    console.error("Get referrer follow-up history error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch referrer follow-up history",
    });
  }
};

export const getReferrerFollowUpById = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const adminUserId = req.user?.userId;
    const { followUpId } = req.params;

    if (!adminUserId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const followUp = await ReferrerFollowUp.findOne({
      _id: followUpId,
      adminId: adminUserId,
    }).populate(referrerPopulate);

    if (!followUp) {
      return res.status(404).json({
        success: false,
        message: "Follow-up not found",
      });
    }

    const totalFollowUpsForReferrer = await ReferrerFollowUp.countDocuments({
      referrerId: followUp.referrerId,
    });

    let nextFollowUpInfo = null;
    if (followUp.followUpNumber < totalFollowUpsForReferrer) {
      const nextFollowUp = await ReferrerFollowUp.findOne({
        referrerId: followUp.referrerId,
        followUpNumber: followUp.followUpNumber + 1,
      }).select("scheduledDate scheduledTime duration followUpNumber meetingType");
      if (nextFollowUp) {
        nextFollowUpInfo = {
          scheduledDate: nextFollowUp.scheduledDate,
          scheduledTime: nextFollowUp.scheduledTime,
          duration: nextFollowUp.duration,
          followUpNumber: nextFollowUp.followUpNumber,
          meetingType: nextFollowUp.meetingType,
        };
      }
    }

    return res.json({
      success: true,
      data: { followUp, totalFollowUpsForReferrer, nextFollowUpInfo },
    });
  } catch (error) {
    console.error("Get referrer follow-up by id error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch follow-up",
    });
  }
};

export const updateReferrerFollowUp = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const adminUserId = req.user?.userId;
    const { followUpId } = req.params;
    const { status, stageChangedTo, notes, nextFollowUp } = req.body;

    if (!adminUserId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const followUp = await ReferrerFollowUp.findOne({
      _id: followUpId,
      adminId: adminUserId,
    });

    if (!followUp) {
      return res.status(404).json({
        success: false,
        message: "Follow-up not found",
      });
    }

    const totalFollowUpsForReferrer = await ReferrerFollowUp.countDocuments({
      referrerId: followUp.referrerId,
    });
    const isLocked = followUp.followUpNumber < totalFollowUpsForReferrer;

    if (isLocked && nextFollowUp) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot schedule next follow-up from a locked follow-up. Only the latest follow-up can schedule next.",
      });
    }

    if (status) {
      followUp.status = status;
      if (status !== FOLLOWUP_STATUS.SCHEDULED && !followUp.completedAt) {
        followUp.completedAt = new Date();
      }
    }
    if (notes !== undefined) followUp.notes = notes;
    followUp.updatedBy = new mongoose.Types.ObjectId(adminUserId);

    if (stageChangedTo) {
      followUp.stageChangedTo = stageChangedTo;
      await Referrer.findByIdAndUpdate(followUp.referrerId, {
        stage: stageChangedTo,
      }, { runValidators: false });
    }

    await followUp.save();

    let newFollowUp = null;
    if (nextFollowUp?.scheduledDate && nextFollowUp?.scheduledTime) {
      const referrer = await Referrer.findById(followUp.referrerId);
      if (!referrer) {
        return res.status(404).json({
          success: false,
          message: "Referrer not found",
        });
      }

      const nextDate = new Date(nextFollowUp.scheduledDate);
      const { start: dayStart, end: dayEnd } = getDayBounds(nextDate);
      const nextDuration = nextFollowUp.duration || 30;

      const conflicting = await ReferrerFollowUp.find({
        adminId: adminUserId,
        scheduledDate: { $gte: dayStart, $lte: dayEnd },
      }).populate(referrerPopulate);

      for (const existing of conflicting) {
        if (
          doTimeSlotsOverlap(
            nextFollowUp.scheduledTime,
            nextDuration,
            existing.scheduledTime,
            existing.duration
          )
        ) {
          const ref = existing.referrerId as any;
          const name = ref?.userId
            ? [ref.userId.firstName, ref.userId.middleName, ref.userId.lastName]
                .filter(Boolean)
                .join(" ")
            : "another referrer";
          return res.status(400).json({
            success: false,
            message: `Next follow-up time conflicts with another follow-up at ${existing.scheduledTime} for ${name}`,
          });
        }
      }

      const followUpNumber = totalFollowUpsForReferrer + 1;
      const initialStatus =
        referrer.stage === REFERRER_STAGE.CONVERTED
          ? FOLLOWUP_STATUS.CONVERTED
          : FOLLOWUP_STATUS.SCHEDULED;

      const nextMeetingType = nextFollowUp.meetingType || MEETING_TYPE.PHONE_CALL;
      const populatedReferrer = await Referrer.findById(followUp.referrerId).populate({
        path: "userId",
        select: "firstName middleName lastName email",
      });
      const referrerName = populatedReferrer
        ? getReferrerDisplayName(populatedReferrer)
        : "Referrer";

      newFollowUp = new ReferrerFollowUp({
        referrerId: followUp.referrerId,
        adminId: adminUserId,
        scheduledDate: nextDate,
        scheduledTime: nextFollowUp.scheduledTime,
        duration: nextDuration,
        meetingType: nextMeetingType,
        status: initialStatus,
        stageAtFollowUp: referrer.stage || REFERRER_STAGE.NEW,
        followUpNumber,
        notes: "",
        createdBy: adminUserId,
      });

      if (populatedReferrer) {
        await attachZohoMeetingIfOnline(
          newFollowUp,
          populatedReferrer,
          adminUserId,
          referrerName
        );
      }

      await newFollowUp.save();
      await newFollowUp.populate(referrerPopulate);

      if (populatedReferrer) {
        notifyReferrerFollowUpScheduled(
          newFollowUp,
          populatedReferrer,
          adminUserId,
          referrerName
        ).catch((err) =>
          console.error("Failed to send next referrer follow-up notifications:", err)
        );
      }
    }

    await followUp.populate(referrerPopulate);

    return res.json({
      success: true,
      message: "Follow-up updated successfully",
      data: { followUp, newFollowUp },
    });
  } catch (error) {
    console.error("Update referrer follow-up error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update follow-up",
    });
  }
};

async function validateAdminUser(adminId: string) {
  return User.findOne({ _id: adminId, role: USER_ROLE.ADMIN });
}

export const getAdminReferrerFollowUpsForSuperAdmin = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const { adminId } = req.params;
    const { startDate, endDate, status } = req.query;

    const adminUser = await validateAdminUser(adminId);
    if (!adminUser) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    const filter: Record<string, unknown> = { adminId };

    if (startDate && endDate) {
      filter.scheduledDate = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      };
    }
    if (status) filter.status = status;

    const followUps = await ReferrerFollowUp.find(filter)
      .populate(referrerPopulate)
      .sort({ scheduledDate: 1, scheduledTime: 1 });

    return res.json({ success: true, data: { followUps } });
  } catch (error) {
    console.error("Get admin referrer follow-ups for super admin error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch referrer follow-ups",
    });
  }
};

export const getAdminReferrerFollowUpSummaryForSuperAdmin = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const { adminId } = req.params;

    const adminUser = await validateAdminUser(adminId);
    if (!adminUser) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    const today = new Date();
    const { start: todayStart, end: todayEnd } = getDayBounds(today);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const { start: tomorrowStart, end: tomorrowEnd } = getDayBounds(tomorrow);

    const baseFilter = { adminId };

    const [todayFollowUps, missedFollowUps, upcomingFollowUps] =
      await Promise.all([
        ReferrerFollowUp.find({
          ...baseFilter,
          scheduledDate: { $gte: todayStart, $lte: todayEnd },
        })
          .populate(referrerPopulate)
          .sort({ scheduledTime: 1 }),
        ReferrerFollowUp.find({
          ...baseFilter,
          scheduledDate: { $lt: todayStart },
          status: FOLLOWUP_STATUS.SCHEDULED,
        })
          .populate(referrerPopulate)
          .sort({ scheduledDate: -1 }),
        ReferrerFollowUp.find({
          ...baseFilter,
          scheduledDate: { $gte: tomorrowStart, $lte: tomorrowEnd },
          status: FOLLOWUP_STATUS.SCHEDULED,
        })
          .populate(referrerPopulate)
          .sort({ scheduledTime: 1 }),
      ]);

    return res.json({
      success: true,
      data: {
        today: todayFollowUps,
        missed: missedFollowUps,
        upcoming: upcomingFollowUps,
        counts: {
          today: todayFollowUps.length,
          missed: missedFollowUps.length,
          upcoming: upcomingFollowUps.length,
        },
      },
    });
  } catch (error) {
    console.error("Get referrer follow-up summary for super admin error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch referrer follow-up summary",
    });
  }
};

export const getReferrerFollowUpHistoryForSuperAdmin = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const { referrerId } = req.params;

    const referrer = await Referrer.findById(referrerId);
    if (!referrer) {
      return res.status(404).json({
        success: false,
        message: "Referrer not found",
      });
    }

    const followUps = await ReferrerFollowUp.find({ referrerId })
      .populate(referrerPopulate)
      .sort({ followUpNumber: 1 });

    return res.json({ success: true, data: { followUps } });
  } catch (error) {
    console.error("Get referrer follow-up history for super admin error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch referrer follow-up history",
    });
  }
};

export const getReferrerFollowUpByIdForSuperAdmin = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const { followUpId } = req.params;

    const followUp = await ReferrerFollowUp.findById(followUpId).populate(
      referrerPopulate
    );

    if (!followUp) {
      return res.status(404).json({
        success: false,
        message: "Follow-up not found",
      });
    }

    const totalFollowUpsForReferrer = await ReferrerFollowUp.countDocuments({
      referrerId: followUp.referrerId,
    });

    let nextFollowUpInfo = null;
    if (followUp.followUpNumber < totalFollowUpsForReferrer) {
      const nextFollowUp = await ReferrerFollowUp.findOne({
        referrerId: followUp.referrerId,
        followUpNumber: followUp.followUpNumber + 1,
      }).select("scheduledDate scheduledTime duration followUpNumber meetingType");
      if (nextFollowUp) {
        nextFollowUpInfo = {
          scheduledDate: nextFollowUp.scheduledDate,
          scheduledTime: nextFollowUp.scheduledTime,
          duration: nextFollowUp.duration,
          followUpNumber: nextFollowUp.followUpNumber,
          meetingType: nextFollowUp.meetingType,
        };
      }
    }

    return res.json({
      success: true,
      data: { followUp, totalFollowUpsForReferrer, nextFollowUpInfo },
    });
  } catch (error) {
    console.error("Get referrer follow-up by id for super admin error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch follow-up",
    });
  }
};
