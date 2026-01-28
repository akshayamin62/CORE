import mongoose, { Document, Schema } from "mongoose";

export interface IAdmin extends Document {
  userId: mongoose.Types.ObjectId; // Reference to User model
  email: string;
  mobileNumber?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const adminSchema = new Schema<IAdmin>(
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
  },
  { timestamps: true }
);

export default mongoose.model<IAdmin>("Admin", adminSchema);
