import type { ProducerApplication } from '../schema.js';

export function toSafeApplication(
  application: Pick<ProducerApplication, 'id' | 'status' | 'reviewedBy' | 'createdAt' | 'reviewedAt'>,
) {
  return {
    id: application.id,
    status: application.status,
    reviewedBy: application.reviewedBy,
    createdAt: application.createdAt,
    reviewedAt: application.reviewedAt,
  };
}