import mongoose, { Document, Schema } from "mongoose";

export interface IReferrerDocumentField extends Document {
  referrerId: mongoose.Types.ObjectId;
  documentName: string;
  documentKey: string;
  section?: string;
  required: boolean;
  helpText?: string;
  order: number;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdByRole: "ADMIN" | "REFERRER" | "SUPER_ADMIN" | "SYSTEM";
  createdAt: Date;
  updatedAt: Date;
}

const referrerDocumentFieldSchema = new Schema<IReferrerDocumentField>(
  {
    referrerId: {
      type: Schema.Types.ObjectId,
      ref: "Referrer",
      required: true,
      index: true,
    },
    documentName: { type: String, required: true },
    documentKey: { type: String, required: true },
    section: { type: String },
    required: { type: Boolean, default: false },
    helpText: { type: String },
    order: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdByRole: {
      type: String,
      enum: ["ADMIN", "REFERRER", "SUPER_ADMIN", "SYSTEM"],
      required: true,
    },
  },
  { timestamps: true }
);

referrerDocumentFieldSchema.index({ referrerId: 1, isActive: 1 });
referrerDocumentFieldSchema.index({ referrerId: 1, documentKey: 1 });

const ReferrerDocumentField = mongoose.model<IReferrerDocumentField>(
  "ReferrerDocumentField",
  referrerDocumentFieldSchema
);

export default ReferrerDocumentField;
