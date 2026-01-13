import mongoose, { Document, Schema } from "mongoose";

export interface IStudent extends Document {
  userId: mongoose.Types.ObjectId;
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
    mobileNumber: {
      type: String,
      required: false,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.model<IStudent>("Student", studentSchema);

