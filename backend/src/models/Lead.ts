import mongoose, { Document, Schema } from "mongoose";

export enum SERVICE_TYPE {
  EDUCATION_PLANNING = "Education Planning",
  CARRER_FOCUS_STUDY_ABROAD = "Carrer Focus Study Abroad ",
  IVY_LEAGUE_ADMISSION = "Ivy League Admission",
  IELTS_GRE_LANGUAGE_COACHING = "IELTS/GRE/Language Coaching",
}

export enum LEAD_STAGE {
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
  mobileNumber: string;
  city?: string;
  serviceTypes: SERVICE_TYPE[];
  adminId: mongoose.Types.ObjectId; // Reference to Admin's userId
  assignedCounselorId?: mongoose.Types.ObjectId; // Reference to Counselor document
  stage: LEAD_STAGE;
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
    mobileNumber: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
      required: true,
    },
    serviceTypes: {
      type: [String],
      enum: Object.values(SERVICE_TYPE),
      required: true,
      validate: {
        validator: function(v: string[]) {
          return v && v.length > 0;
        },
        message: "At least one service type is required",
      },
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
    stage: {
      type: String,
      enum: Object.values(LEAD_STAGE),
      default: LEAD_STAGE.NEW,
    },
    notes: {
      type: [leadNoteSchema],
      default: [],
    },
    source: {
      type: String,
      default: "Enquiry Form",
    },
  },
  { timestamps: true }
);

// Index for faster queries
leadSchema.index({ adminId: 1, stage: 1 });
leadSchema.index({ assignedCounselorId: 1, stage: 1 });
leadSchema.index({ email: 1, adminId: 1 });

export default mongoose.model<ILead>("Lead", leadSchema);
