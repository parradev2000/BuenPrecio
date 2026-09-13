import { z } from 'zod';
import { ROLE_NAMES } from './constants.js';

export const USER_STATUS_NAMES = ['active', 'suspended'] as const;

export const updateUserSchema = z
  .object({
    status: z.enum(USER_STATUS_NAMES).optional(),
    role: z.enum(ROLE_NAMES).optional(),
  })
  .superRefine((data, ctx) => {
    if (Object.keys(data).length === 0) {
      ctx.addIssue({ code: 'custom', message: 'No hay campos para actualizar' });
    }
  });

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'Escribe el nombre de la categoría').max(100),
  kind: z.enum(['negocio', 'item'], { message: 'kind inválido' }),
});

export const updateCategorySchema = z
  .object({
    name: z.string().trim().min(1, 'Escribe el nombre de la categoría').max(100).optional(),
    kind: z.enum(['negocio', 'item']).optional(),
  })
  .superRefine((data, ctx) => {
    if (Object.keys(data).length === 0) {
      ctx.addIssue({ code: 'custom', message: 'No hay campos para actualizar' });
    }
  });

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;