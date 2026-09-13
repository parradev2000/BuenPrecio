import type { ZodError } from 'zod';

export function zodError(error: ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = (issue.path[0] as string) ?? '_form';
    if (!result[key]) {
      result[key] = issue.message;
    }
  }
  return result;
}