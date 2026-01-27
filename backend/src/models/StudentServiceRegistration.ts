import mongoose, { Document, Schema } from "mongoose";

export enum ServiceRegistrationStatus {
  REGISTERED = "REGISTERED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export interface IStudentServiceRegistration extends Document {
  studentId: mongoose.Types.ObjectId;
  serviceId: mongoose.Types.ObjectId;
  primaryOpsId?: mongoose.Types.ObjectId;
  secondaryOpsId?: mongoose.Types.ObjectId;
  activeOpsId?: mongoose.Types.ObjectId;  // Points to either primary or secondary
  status: ServiceRegistrationStatus;
  registeredAt: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  paymentStatus?: string;
  paymentAmount?: number;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const studentServiceRegistrationSchema = new Schema<IStudentServiceRegistration>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },
    primaryOpsId: {
      type: Schema.Types.ObjectId,
      ref: "Ops",
      required: false,
    },
    secondaryOpsId: {
      type: Schema.Types.ObjectId,
      ref: "Ops",
      required: false,
    },
    activeOpsId: {
      type: Schema.Types.ObjectId,
      ref: "Ops",
      required: false,
    },
    status: {
      type: String,
      enum: Object.values(ServiceRegistrationStatus),
      default: ServiceRegistrationStatus.REGISTERED,
    },
    registeredAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: undefined,
    },
    cancelledAt: {
      type: Date,
      default: undefined,
    },
    paymentStatus: {
      type: String,
      default: undefined,
    },
    paymentAmount: {
      type: Number,
      default: undefined,
    },
    notes: {
      type: String,
      default: undefined,
    },
  },
  { timestamps: true }
);

// Compound index to ensure a student can only register once per service
studentServiceRegistrationSchema.index(
  { studentId: 1, serviceId: 1 },
  { unique: true }
);

export default mongoose.model<IStudentServiceRegistration>(
  "StudentServiceRegistration",
  studentServiceRegistrationSchema
);


