import type { SafeUser } from '@buenprecio/shared';
import type { User } from '../schema.js';

type ToSafeSource = Pick<User, 'id' | 'name' | 'email' | 'role' | 'createdAt'>;

export function toSafeUser(user: ToSafeSource): SafeUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}