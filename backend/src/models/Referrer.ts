import mongoose, { Document, Schema } from "mongoose";

export enum REFERRER_STAGE {
  NEW = "New",
  HOT = "Hot",
  WARM = "Warm",
  COLD = "Cold",
  CONVERTED = "Converted",
  CLOSED = "Closed",
}

export interface IReferrerNote {
  text: string;
  noteDate: Date;
  createdByRole: string;
  createdByName: string;
  createdAt: Date;
}

export interface IReferrer extends Document {
  userId: mongoose.Types.ObjectId;
  adminId: mongoose.Types.ObjectId;
  email: string;
  mobileNumber?: string;
  referralSlug: string;
  country: string;
  state: string;
  city: string;
  qualification: string;
  currentRole: string;
  stage: REFERRER_STAGE;
  notes: IReferrerNote[];
  onboardingProfileData?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

const referrerSchema = new Schema<IReferrer>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    mobileNumber: {
      type: String,
      required: false,
      trim: true,
      validate: {
        validator: function (v: string) {
          if (!v) return true;
          return /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,5}[-\s.]?[0-9]{1,5}$/.test(v);
        },
        message: "Invalid phone number format",
      },
    },
    referralSlug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    country: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    qualification: {
      type: String,
      required: true,
      trim: true,
    },
    currentRole: {
      type: String,
      required: true,
      trim: true,
    },
    stage: {
      type: String,
      enum: Object.values(REFERRER_STAGE),
      default: REFERRER_STAGE.NEW,
    },
    notes: {
      type: [
        {
          text: { type: String, required: true, trim: true },
          noteDate: { type: Date, required: true },
          createdByRole: { type: String, required: true },
          createdByName: { type: String, default: '' },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    onboardingProfileData: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

referrerSchema.post('init', function (this: IReferrer) {
  if (!Array.isArray(this.notes)) {
    this.notes = [];
  }
});

referrerSchema.index({ adminId: 1 });

export default mongoose.model<IReferrer>("Referrer", referrerSchema);
