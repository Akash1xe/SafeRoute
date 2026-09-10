import { randomUUID } from 'node:crypto';

const validRequestId = /^[A-Za-z0-9._:-]{1,128}$/;

export function resolveRequestId(value: string | string[] | undefined): string {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate && validRequestId.test(candidate) ? candidate : randomUUID();
}
