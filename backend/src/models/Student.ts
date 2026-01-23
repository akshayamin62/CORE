import mongoose, { Document, Schema } from "mongoose";

export interface IStudent extends Document {
  userId: mongoose.Types.ObjectId;
  email?: string;
  mobileNumber?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const studentSchema = new Schema<IStudent>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: false,
      trim: true,
      lowercase: true,
    },
    mobileNumber: {
      type: String,
      required: false,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

// Database indexes for performance
studentSchema.index({ userId: 1 });
studentSchema.index({ email: 1 });

export default mongoose.model<IStudent>("Student", studentSchema);

