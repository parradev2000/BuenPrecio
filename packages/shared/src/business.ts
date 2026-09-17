import { z } from 'zod';
import { ITEM_UNITS } from './constants.js';

export const photoUrlSchema = z
  .string()
  .max(500, 'Foto demasiado larga')
  .refine((value) => /^(https?:\/\/|\/)/i.test(value), 'URL de foto inválida');

export const createBusinessSchema = z.object({
  name: z.string().trim().min(1, 'Escribe el nombre del negocio').max(200),
  description: z.string().trim().max(500).optional(),
  categoryId: z.string().uuid('Tipo de negocio inválido').optional(),
  address: z.string().trim().max(300).optional(),
  phone: z.string().trim().max(30).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  photoUrl: photoUrlSchema.optional(),
});

export const updateBusinessSchema = createBusinessSchema.partial().extend({
  active: z.boolean().optional(),
});

export const createItemSchema = z
  .object({
    type: z.enum(['producto', 'servicio']),
    name: z.string().trim().min(1, 'Escribe el nombre').max(200),
    description: z.string().trim().max(500).optional(),
    price: z.number().positive('El precio debe ser mayor a 0').max(999_999_999),
    unit: z.enum(ITEM_UNITS as unknown as [string, ...string[]]).optional(),
photoUrl: photoUrlSchema.optional(),
categoryId: z.string().uuid('Tipo de negocio inválido').optional(),
    available: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'servicio' && data.unit != null) {
      ctx.addIssue({ code: 'custom', message: 'Los servicios no llevan unidad', path: ['unit'] });
    }
  });

export const updateItemSchema = z
  .object({
    type: z.enum(['producto', 'servicio']).optional(),
    name: z.string().trim().min(1, 'Escribe el nombre').max(200).optional(),
    description: z.string().trim().max(500).nullable().optional(),
    price: z.number().positive('El precio debe ser mayor a 0').max(999_999_999).optional(),
    unit: z.enum(ITEM_UNITS as unknown as [string, ...string[]]).nullable().optional(),
    photoUrl: photoUrlSchema.nullable().optional(),
    categoryId: z.string().uuid('Tipo de negocio inválido').nullable().optional(),
    available: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'servicio' && data.unit != null) {
      ctx.addIssue({ code: 'custom', message: 'Los servicios no llevan unidad', path: ['unit'] });
    }
  });

export type CreateBusinessInput = z.infer<typeof createBusinessSchema>;
export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>;
export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;