import mongoose, { Document, Schema } from "mongoose";

export interface IProgram extends Document {
  createdBy: mongoose.Types.ObjectId; // User who created this program (can be student, counselor, or admin)
  studentId?: mongoose.Types.ObjectId; // Student who selected this program (if selected)
  university: string;
  universityRanking: {
    webometricsWorld?: number;
    webometricsNational?: number;
    usNews?: number;
    qs?: number;
  };
  programName: string;
  websiteUrl: string;
  campus: string;
  country: string;
  studyLevel: string;
  duration: number; // in months
  ieltsScore: number;
  applicationFee: number; // in GBP
  yearlyTuitionFees: number; // in GBP
  priority?: number; // Student's priority (if selected)
  intake?: string; // Student's selected intake
  year?: string; // Student's selected year
  selectedAt?: Date; // When student selected this program
  isSelectedByStudent: boolean; // Whether student has selected this program
  createdAt?: Date;
  updatedAt?: Date;
}

const programSchema = new Schema<IProgram>(
  {
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: false,
    },
    university: {
      type: String,
      required: true,
    },
    universityRanking: {
      webometricsWorld: { type: Number, required: false },
      webometricsNational: { type: Number, required: false },
      usNews: { type: Number, required: false },
      qs: { type: Number, required: false },
    },
    programName: {
      type: String,
      required: true,
    },
    websiteUrl: {
      type: String,
      required: true,
    },
    campus: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      required: true,
    },
    studyLevel: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
    },
    ieltsScore: {
      type: Number,
      required: true,
    },
    applicationFee: {
      type: Number,
      required: true,
    },
    yearlyTuitionFees: {
      type: Number,
      required: true,
    },
    priority: {
      type: Number,
      required: false,
    },
    intake: {
      type: String,
      required: false,
    },
    year: {
      type: String,
      required: false,
    },
    selectedAt: {
      type: Date,
      required: false,
    },
    isSelectedByStudent: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IProgram>("Program", programSchema);

