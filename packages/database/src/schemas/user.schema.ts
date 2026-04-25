import mongoose, { Schema } from 'mongoose';

const USER_ROLES = [
  'public',
  'customer',
  'doctor',
  'seller_staff',
  'seller_admin',
  'provider_support',
  'provider_admin',
  'super_admin',
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export interface IUser {
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    role: {
      type: String,
      enum: USER_ROLES,
      default: 'customer',
    },
  },
  { timestamps: true },
);

export const User =
  (mongoose.models.User as mongoose.Model<IUser>) ??
  mongoose.model<IUser>('User', userSchema);
