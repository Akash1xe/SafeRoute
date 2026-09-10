import { z } from 'zod';

import { routePreferences } from '../../routing-engine/scoring/route-profiles.js';

export const calculateRouteSchema = z
  .object({
    originNodeId: z.string().trim().min(1).max(80),
    destinationNodeId: z.string().trim().min(1).max(80),
    preferences: z.array(z.enum(routePreferences)).min(1).max(3).optional(),
  })
  .refine((input) => input.originNodeId !== input.destinationNodeId, {
    message: 'Origin and destination must be different',
    path: ['destinationNodeId'],
  });

export type CalculateRouteInput = z.infer<typeof calculateRouteSchema>;
