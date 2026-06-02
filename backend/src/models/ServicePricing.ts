import mongoose, { Document, Schema } from 'mongoose';

export interface IServicePricing extends Document {
  adminId?: mongoose.Types.ObjectId;
  advisorId?: mongoose.Types.ObjectId;
  serviceSlug: string;
  prices: Map<string, number>;
  // Tax (GST) percentage applied on top of the base price for this admin/advisor + service.
  // Defaults to 18%. Each admin/advisor can override it per service.
  gstPercentage?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const servicePricingSchema = new Schema<IServicePricing>(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      required: false,
    },
    advisorId: {
      type: Schema.Types.ObjectId,
      ref: 'Advisor',
      required: false,
    },
    serviceSlug: {
      type: String,
      required: true,
    },
    prices: {
      type: Map,
      of: { type: Number, min: 0 },
      required: true,
    },
    gstPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 18,
    },
  },
  { timestamps: true }
);

// Compound unique: one pricing per admin per service
servicePricingSchema.index({ adminId: 1, serviceSlug: 1 }, { unique: true, partialFilterExpression: { adminId: { $exists: true } } });
servicePricingSchema.index({ advisorId: 1, serviceSlug: 1 }, { unique: true, partialFilterExpression: { advisorId: { $exists: true } } });

export default mongoose.model<IServicePricing>('ServicePricing', servicePricingSchema);
