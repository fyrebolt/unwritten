import mongoose from "mongoose";
const { Schema, model } = mongoose;

type MedicalProfile = {
  diagnoses: string[];
  medications: string[];
  allergies: string[];
  clinicians: string[];
  notes?: string;
};

export type UserDocument = {
  _id: string;
  email: string;
  passwordHash: string;
  name: string;
  medicalProfile: MedicalProfile;
  createdAt: Date;
  updatedAt: Date;
};

const medicalProfileSchema = new Schema<MedicalProfile>(
  {
    diagnoses: { type: [String], default: [] },
    medications: { type: [String], default: [] },
    allergies: { type: [String], default: [] },
    clinicians: { type: [String], default: [] },
    notes: { type: String, default: "" },
  },
  { _id: false },
);

const userSchema = new Schema<UserDocument>(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    medicalProfile: { type: medicalProfileSchema, default: () => ({}) },
  },
  {
    timestamps: true,
  },
);

export const User = mongoose.models.User || model<UserDocument>("User", userSchema);
