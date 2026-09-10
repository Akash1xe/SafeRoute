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
    API_RATE_LIMIT_WINDOW_MS: z.coerce
      .number()
      .int()
      .min(1_000)
      .default(60_000),
    API_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
    REQUEST_BODY_LIMIT: z
      .string()
      .regex(/^\d+(kb|mb)$/i)
      .default('64kb'),
    HTTP_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1_000).default(15_000),
    SLOW_REQUEST_THRESHOLD_MS: z.coerce.number().int().positive().default(750),
    GRACEFUL_SHUTDOWN_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .min(1_000)
      .default(10_000),
    POSTGRES_POOL_MAX: z.coerce.number().int().positive().max(100).default(20),
    POSTGRES_STATEMENT_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .min(1_000)
      .default(10_000),
    WS_MAX_CONNECTIONS: z.coerce.number().int().positive().default(1_000),
    WS_MAX_CONNECTIONS_PER_IP: z.coerce.number().int().positive().default(10),
    WS_MAX_PAYLOAD_BYTES: z.coerce
      .number()
      .int()
      .min(1_024)
      .max(1_048_576)
      .default(4_096),
    WS_MAX_BUFFERED_BYTES: z.coerce
      .number()
      .int()
      .min(1_024)
      .default(1_048_576),
    METRICS_TOKEN: z.string().min(32).optional(),
    TRUST_PROXY: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
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
