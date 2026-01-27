import mongoose, { Document, Schema } from "mongoose";

export interface IOps extends Document {
  userId: mongoose.Types.ObjectId; // Reference to User model
  email: string;
  mobileNumber?: string;
  specializations?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

const opsSchema = new Schema<IOps>(
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

export default mongoose.model<IOps>("Ops", opsSchema);


