import mongoose, { Schema } from 'mongoose';

// Single-document collection — always upserted on _id: 'global'
const siteStatsSchema = new Schema({
  _id:           { type: String, default: 'global' },
  totalVisitors: { type: Number, default: 0 },
}, { _id: false });

export default mongoose.model('SiteStats', siteStatsSchema);
