import mongoose, { Document, Schema } from "mongoose";

export interface ICounselor extends Document {
  userId: mongoose.Types.ObjectId; // Reference to User model
  email: string;
  mobileNumber?: string;
  specializations?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

const counselorSchema = new Schema<ICounselor>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
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
    },
    specializations: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.model<ICounselor>("Counselor", counselorSchema);

