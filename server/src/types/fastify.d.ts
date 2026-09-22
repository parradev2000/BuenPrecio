import type { Role } from '@buenprecio/shared';

declare module 'fastify' {
  interface FastifyRequest {
    currentUser?: {
      id: string;
      name: string;
      email: string;
      role: Role;
      status: 'active' | 'suspended';
      createdAt: Date;
    };
  }
}