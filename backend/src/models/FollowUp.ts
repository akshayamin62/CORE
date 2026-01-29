import mongoose, { Document, Schema } from "mongoose";
import { LEAD_STAGE } from "./Lead";

export enum FOLLOWUP_STATUS {
  SCHEDULED = "Scheduled",
  PHONE_NOT_PICKED = "Phone not picked up",
  CALL_DISCONNECTED = "Call disconnected",
  COMPLETED = "Completed",
  RESCHEDULED = "Rescheduled",
  NO_RESPONSE = "No response",
  MISSED = "Missed",
}

export interface IFollowUp extends Document {
  leadId: mongoose.Types.ObjectId;
  counselorId: mongoose.Types.ObjectId; // Reference to Counselor document
  scheduledDate: Date;
  scheduledTime: string; // Format: "HH:mm"
  duration: number; // Duration in minutes (15, 30, 45, 60)
  status: FOLLOWUP_STATUS;
  stageAtFollowUp: LEAD_STAGE; // Stage of lead at the time of follow-up
  stageChangedTo?: LEAD_STAGE; // If stage was changed during this follow-up
  notes?: string;
  createdBy: mongoose.Types.ObjectId; // User who created
  updatedBy?: mongoose.Types.ObjectId; // User who last updated
  completedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const followUpSchema = new Schema<IFollowUp>(
  {
    leadId: {
      type: Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
    },
    counselorId: {
      type: Schema.Types.ObjectId,
      ref: "Counselor",
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
        validator: function (v: string) {
          return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: "Time must be in HH:mm format",
      },
    },
    duration: {
      type: Number,
      required: true,
      enum: [15, 30, 45, 60],
      default: 30,
    },
    status: {
      type: String,
      enum: Object.values(FOLLOWUP_STATUS),
      default: FOLLOWUP_STATUS.SCHEDULED,
    },
    stageAtFollowUp: {
      type: String,
      enum: Object.values(LEAD_STAGE),
      required: true,
    },
    stageChangedTo: {
      type: String,
      enum: Object.values(LEAD_STAGE),
      default: null,
    },
    notes: {
      type: String,
      default: "",
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

// Index for faster queries
followUpSchema.index({ leadId: 1, status: 1 });
followUpSchema.index({ counselorId: 1, scheduledDate: 1 });
followUpSchema.index({ counselorId: 1, scheduledDate: 1, scheduledTime: 1 });
followUpSchema.index({ status: 1, scheduledDate: 1 });

export default mongoose.model<IFollowUp>("FollowUp", followUpSchema);
