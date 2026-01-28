import mongoose, { Document, Schema } from "mongoose";

export enum SERVICE_TYPE {
  STUDY_ABROAD = "Study Abroad",
  IVY_LEAGUE = "Ivy League",
  EDUCATION_PLANNING = "Education Planning",
  IELTS_GRE_COACHING = "IELTS/GRE Coaching",
}

export enum LEAD_STATUS {
  NEW = "New",
  HOT = "Hot",
  WARM = "Warm",
  COLD = "Cold",
  CONVERTED = "Converted to Student",
  CLOSED = "Closed",
}

export interface ILeadNote {
  text: string;
  addedBy: mongoose.Types.ObjectId;
  addedByName: string;
  createdAt: Date;
}

export interface ILead extends Document {
  name: string;
  email: string;
  phoneNumber: string;
  serviceType: SERVICE_TYPE;
  adminId: mongoose.Types.ObjectId; // Reference to Admin's userId
  assignedCounselorId?: mongoose.Types.ObjectId; // Reference to Counselor document
  status: LEAD_STATUS;
  notes: ILeadNote[];
  source: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const leadNoteSchema = new Schema<ILeadNote>(
  {
    text: {
      type: String,
      required: true,
    },
    addedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    addedByName: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const leadSchema = new Schema<ILead>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    serviceType: {
      type: String,
      enum: Object.values(SERVICE_TYPE),
      required: true,
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedCounselorId: {
      type: Schema.Types.ObjectId,
      ref: "Counselor",
      default: null,
    },
    status: {
      type: String,
      enum: Object.values(LEAD_STATUS),
      default: LEAD_STATUS.NEW,
    },
    notes: {
      type: [leadNoteSchema],
      default: [],
    },
    source: {
      type: String,
      default: "Inquiry Form",
    },
  },
  { timestamps: true }
);

// Index for faster queries
leadSchema.index({ adminId: 1, status: 1 });
leadSchema.index({ assignedCounselorId: 1, status: 1 });
leadSchema.index({ email: 1, adminId: 1 });

export default mongoose.model<ILead>("Lead", leadSchema);
