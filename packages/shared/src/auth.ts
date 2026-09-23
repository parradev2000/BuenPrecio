import { z } from 'zod';
import type { Role } from './index.js';

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Escribe tu nombre').max(80, 'El nombre no puede superar 80 caracteres'),
  email: z.email('Correo inválido').max(255, 'Correo demasiado largo'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(72, 'La contraseña no puede superar 72 caracteres'),
});

export const loginSchema = z.object({
  email: z.email('Correo inválido'),
  password: z.string().min(1, 'Escribe tu contraseña'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().trim().min(1),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, 'Escribe tu contraseña actual')
      .max(72, 'La contraseña no puede superar 72 caracteres'),
    newPassword: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .max(72, 'La contraseña no puede superar 72 caracteres'),
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'La nueva contraseña debe ser diferente a la actual',
    path: ['newPassword'],
  });

export const googleAuthSchema = z.object({
  idToken: z.string().trim().min(1, 'Token de Google inválido').max(4096, 'Token de Google inválido'),
});

export const forgotPasswordSchema = z.object({
  email: z.email('Correo inválido'),
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(1, 'Enlace de restablecimiento inválido').max(255, 'Enlace de restablecimiento inválido'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(72, 'La contraseña no puede superar 72 caracteres'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export type SafeUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: SafeUser;
};