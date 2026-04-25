import { z } from 'zod';

export const RoleSchema = z.enum([
  'public',
  'customer',
  'doctor',
  'seller_staff',
  'seller_admin',
  'provider_support',
  'provider_admin',
  'super_admin',
]);

export type Role = z.infer<typeof RoleSchema>;

export const CreateUserDtoSchema = z.object({
  email: z.string().email(),
  name: z.string(),
  role: RoleSchema,
});

export type CreateUserDto = z.infer<typeof CreateUserDtoSchema>;

export const UserResponseDtoSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: RoleSchema,
  createdAt: z.string(),
});

export type UserResponseDto = z.infer<typeof UserResponseDtoSchema>;
