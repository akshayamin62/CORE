import mongoose, { Document, Schema } from "mongoose";

export enum ReferrerDocumentStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export interface IReferrerDocument extends Document {
  referrerId: mongoose.Types.ObjectId;
  documentFieldId?: mongoose.Types.ObjectId;
  documentName: string;
  documentKey: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
  uploadedBy: mongoose.Types.ObjectId;
  uploadedByRole: string;
  status: ReferrerDocumentStatus;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  rejectedBy?: mongoose.Types.ObjectId;
  rejectedAt?: Date;
  rejectionMessage?: string;
  version: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const referrerDocumentSchema = new Schema<IReferrerDocument>(
  {
    referrerId: {
      type: Schema.Types.ObjectId,
      ref: "Referrer",
      required: true,
      index: true,
    },
    documentFieldId: {
      type: Schema.Types.ObjectId,
      ref: "ReferrerDocumentField",
      required: false,
      default: null,
    },
    documentName: { type: String, required: true },
    documentKey: { type: String, required: true },
    fileName: { type: String, required: true },
    filePath: { type: String, required: true },
    fileSize: { type: Number, required: true },
    mimeType: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    uploadedByRole: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(ReferrerDocumentStatus),
      default: ReferrerDocumentStatus.PENDING,
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    rejectedBy: { type: Schema.Types.ObjectId, ref: "User" },
    rejectedAt: { type: Date },
    rejectionMessage: { type: String },
    version: { type: Number, default: 1 },
  },
  { timestamps: true }
);

referrerDocumentSchema.index({ referrerId: 1, documentKey: 1 });
referrerDocumentSchema.index({ referrerId: 1, status: 1 });

const ReferrerDocument = mongoose.model<IReferrerDocument>(
  "ReferrerDocument",
  referrerDocumentSchema
);

export default ReferrerDocument;
