import mongoose, { Document, Schema } from "mongoose";
import { FOLLOWUP_STATUS, MEETING_TYPE } from "./FollowUp";
import { REFERRER_STAGE } from "./Referrer";

export interface IReferrerFollowUp extends Document {
  referrerId: mongoose.Types.ObjectId;
  adminId: mongoose.Types.ObjectId;
  scheduledDate: Date;
  scheduledTime: string;
  duration: number;
  meetingType: MEETING_TYPE;
  status: FOLLOWUP_STATUS;
  stageAtFollowUp: REFERRER_STAGE;
  stageChangedTo?: REFERRER_STAGE;
  followUpNumber: number;
  notes?: string;
  zohoMeetingKey?: string;
  zohoMeetingUrl?: string;
  zohoMeetingId?: string;
  zohoMeetingPassword?: string;
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  completedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const referrerFollowUpSchema = new Schema<IReferrerFollowUp>(
  {
    referrerId: {
      type: Schema.Types.ObjectId,
      ref: "Referrer",
      required: true,
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    scheduledDate: {
      type: Date,
      required: true,
    },
    scheduledTime: {
      type: String,
      required: true,
      validate: {
        validator: (v: string) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v),
        message: "Time must be in HH:mm format",
      },
    },
    duration: {
      type: Number,
      required: true,
      enum: [15, 30, 45, 60],
      default: 30,
    },
    meetingType: {
      type: String,
      enum: Object.values(MEETING_TYPE),
      required: true,
      default: MEETING_TYPE.PHONE_CALL,
    },
    status: {
      type: String,
      enum: Object.values(FOLLOWUP_STATUS),
      default: FOLLOWUP_STATUS.SCHEDULED,
    },
    stageAtFollowUp: {
      type: String,
      enum: Object.values(REFERRER_STAGE),
      required: true,
    },
    stageChangedTo: {
      type: String,
      enum: Object.values(REFERRER_STAGE),
      default: null,
    },
    followUpNumber: {
      type: Number,
      required: true,
      default: 1,
    },
    notes: {
      type: String,
      default: "",
    },
    zohoMeetingKey: {
      type: String,
      default: null,
    },
    zohoMeetingUrl: {
      type: String,
      default: null,
    },
    zohoMeetingId: {
      type: String,
      default: null,
    },
    zohoMeetingPassword: {
      type: String,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

referrerFollowUpSchema.index({ referrerId: 1, scheduledDate: 1 });
referrerFollowUpSchema.index({ adminId: 1, scheduledDate: 1, status: 1 });

const ReferrerFollowUp = mongoose.model<IReferrerFollowUp>(
  "ReferrerFollowUp",
  referrerFollowUpSchema
);

export default ReferrerFollowUp;
