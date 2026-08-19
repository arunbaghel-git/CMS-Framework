import pino from 'pino'
import { env, isDev, REDACTED_KEYS } from './env.js'

/**
 * App logger. Secrets kabhi log nahi hote — REDACTED_KEYS spec 003 se aata hai.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      ...REDACTED_KEYS.map((k) => `env.${k}`),
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      '*.password',
      '*.passwordHash',
    ],
    censor: '[redacted]',
  },
  transport: isDev
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
    : undefined,
})
