import { z } from 'zod';

const developmentSecret = 'development-only-secret-change-me-now';

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    API_PORT: z.coerce.number().int().positive().default(4000),
    WEB_ORIGIN: z.string().url().default('http://localhost:3000'),
    DATABASE_URL: z
      .string()
      .min(1)
      .default('postgresql://saferoute:saferoute@localhost:5432/saferoute'),
    REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
    ROUTE_CACHE_TTL_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .max(3600)
      .default(120),
    INCIDENT_MAINTENANCE_INTERVAL_MS: z.coerce
      .number()
      .int()
      .min(60_000)
      .default(300_000),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
      .default('info'),
    JWT_ACCESS_SECRET: z.string().min(32).default(developmentSecret),
    ACCESS_TOKEN_TTL_MINUTES: z.coerce
      .number()
      .int()
      .positive()
      .max(60)
      .default(15),
    REFRESH_TOKEN_TTL_DAYS: z.coerce
      .number()
      .int()
      .positive()
      .max(30)
      .default(7),
    COOKIE_SECURE: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
  })
  .superRefine((configuration, context) => {
    if (
      configuration.NODE_ENV === 'production' &&
      configuration.JWT_ACCESS_SECRET === developmentSecret
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_ACCESS_SECRET'],
        message: 'JWT_ACCESS_SECRET must be changed in production',
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
}

export const env = parsed.data;
