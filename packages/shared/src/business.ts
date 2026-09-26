import { z } from 'zod';
import { ITEM_UNITS } from './constants.js';

export const photoUrlSchema = z
  .string()
  .max(500, 'Foto demasiado larga')
  .refine((value) => /^(https?:\/\/|\/)/i.test(value), 'URL de foto inválida');

export const phoneSchema = z.string().trim().min(1, 'Escribe el teléfono').max(30, 'El teléfono no puede superar 30 caracteres');

export const createBusinessSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Escribe el nombre del negocio')
    .max(200, 'El nombre no puede superar 200 caracteres'),
  description: z.string().trim().max(500, 'La descripción no puede superar 500 caracteres').optional(),
  categoryId: z.string().uuid('Tipo de negocio inválido').optional(),
  address: z.string().trim().max(300, 'La dirección no puede superar 300 caracteres').optional(),
  phone: z.string().trim().max(30, 'El teléfono no puede superar 30 caracteres').optional(),
  phones: z.array(phoneSchema).max(10, 'Máximo 10 teléfonos').optional(),
  email: z
    .string()
    .trim()
    .email('Correo inválido')
    .max(200, 'El correo no puede superar 200 caracteres')
    .nullish(),
  latitude: z.number().min(-90, 'Latitud inválida').max(90, 'Latitud inválida').optional(),
  longitude: z.number().min(-180, 'Longitud inválida').max(180, 'Longitud inválida').optional(),
  photoUrl: photoUrlSchema.optional(),
});

export const updateBusinessSchema = createBusinessSchema.partial().extend({
  active: z.boolean().optional(),
});

export const createItemSchema = z
  .object({
    type: z.enum(['producto', 'servicio']),
    name: z
      .string()
      .trim()
      .min(1, 'Escribe el nombre')
      .max(200, 'El nombre no puede superar 200 caracteres'),
    description: z.string().trim().max(500, 'La descripción no puede superar 500 caracteres').optional(),
    price: z
      .number()
      .positive('El precio debe ser mayor a 0')
      .max(999_999_999, 'El precio es demasiado alto'),
    unit: z.enum(ITEM_UNITS as unknown as [string, ...string[]]).optional(),
    photoUrl: photoUrlSchema.optional(),
    categoryId: z.string().uuid('Categoría inválida').optional(),
    newCategoryName: z.string().trim().min(1, 'Escribe el nombre de la categoría').max(60, 'El nombre de la categoría no puede superar 60 caracteres').optional(),
    available: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    const hasNewCategory = data.newCategoryName != null && data.newCategoryName.trim() !== '';
    if (data.categoryId == null && !hasNewCategory) {
      ctx.addIssue({ code: 'custom', message: 'Categoría inválida', path: ['categoryId'] });
    }
    if (data.type === 'servicio' && data.unit != null) {
      ctx.addIssue({ code: 'custom', message: 'Los servicios no llevan unidad', path: ['unit'] });
    }
  });

export const updateItemSchema = z
  .object({
    type: z.enum(['producto', 'servicio']).optional(),
    name: z
      .string()
      .trim()
      .min(1, 'Escribe el nombre')
      .max(200, 'El nombre no puede superar 200 caracteres')
      .optional(),
    description: z.string().trim().max(500, 'La descripción no puede superar 500 caracteres').nullable().optional(),
    price: z
      .number()
      .positive('El precio debe ser mayor a 0')
      .max(999_999_999, 'El precio es demasiado alto')
      .optional(),
    unit: z.enum(ITEM_UNITS as unknown as [string, ...string[]]).nullable().optional(),
    photoUrl: photoUrlSchema.nullable().optional(),
    categoryId: z.string().uuid('Categoría inválida').nullable().optional(),
    newCategoryName: z.string().trim().min(1, 'Escribe el nombre de la categoría').max(60, 'El nombre de la categoría no puede superar 60 caracteres').optional(),
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