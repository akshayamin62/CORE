import mongoose, { Document, Schema } from "mongoose";

export interface IAdmin extends Document {
  userId: mongoose.Types.ObjectId; // Reference to User model
  email: string;
  mobileNumber?: string;
  enquiryFormSlug: string; // Unique slug for enquiry form URL
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
    enquiryFormSlug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
  },
  { timestamps: true }
);

// Index for faster slug lookup
adminSchema.index({ enquiryFormSlug: 1 });

export default mongoose.model<IAdmin>("Admin", adminSchema);
