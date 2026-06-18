import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  // Profile info
  age: Number,
  gender: String,
  height: Number,
  weight: Number,
  bloodGroup: String,
  mobile: String,
  // Medical Info
  medicalConditions: [String],
  createdAt: { type: Date, default: Date.now },
});

export const User = mongoose.model('User', userSchema);

const carbonDataSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now },
  category: { type: String, enum: ['Transport', 'Energy', 'Diet', 'Waste'], required: true },
  value: { type: Number, required: true }, // in kg CO2
  description: String,
});

export const CarbonData = mongoose.model('CarbonData', carbonDataSchema);

const activityGoalSchema = new mongoose.Schema({
   userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
   targetCO2: Number, // monthly goal
   currentCO2: { type: Number, default: 0 },
});

export const ActivityGoal = mongoose.model('ActivityGoal', activityGoalSchema);
