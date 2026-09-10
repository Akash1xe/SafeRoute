import { z } from 'zod';

import {
  confirmationDecisions,
  incidentCategories,
  incidentStatuses,
} from './incident.types.js';

export const createIncidentSchema = z.object({
  category: z.enum(incidentCategories),
  description: z.string().trim().min(10).max(1000),
  severity: z.number().int().min(1).max(5),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  evidenceUrl: z.string().url().max(2048).optional(),
  expiresAt: z.coerce
    .date()
    .refine(
      (date) => date.getTime() > Date.now(),
      'Expiration must be in the future',
    )
    .optional(),
});

export const nearbyIncidentsSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radiusMeters: z.coerce.number().positive().max(10_000).default(1000),
  limit: z.coerce.number().int().positive().max(100).default(50),
  page: z.coerce.number().int().positive().default(1),
});

export const confirmationSchema = z.object({
  decision: z.enum(confirmationDecisions),
});

export const incidentIdSchema = z.object({ id: z.string().uuid() });

export const moderateIncidentSchema = z.object({
  status: z.enum([incidentStatuses[1], incidentStatuses[2]]),
});

export type CreateIncidentInput = z.infer<typeof createIncidentSchema>;
export type NearbyIncidentsInput = z.infer<typeof nearbyIncidentsSchema>;
