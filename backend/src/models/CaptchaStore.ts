import mongoose, { Schema } from 'mongoose';

const captchaStoreSchema = new Schema({
  token:     { type: String, required: true, unique: true },
  answer:    { type: Number, required: true },
  expiresAt: { type: Date, required: true },
});

// MongoDB TTL index — automatically deletes documents after expiresAt
captchaStoreSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('CaptchaStore', captchaStoreSchema);
