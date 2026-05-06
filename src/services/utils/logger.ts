import winston from 'winston';

const { combine, timestamp, json, colorize, printf, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  if (metadata && Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  if (stack) {
    msg += `\n${stack}`;
  }
  return msg;
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json()
  ),
  defaultMeta: { service: 'cac-bot' },
  transports: [
    new winston.transports.Console({
      format: combine(
        colorize(),
        logFormat
      )
    })
  ]
});

// Helper for masking sensitive data in logs
export function maskData(data: any): any {
  if (!data) return data;
  const masked = { ...data };
  const sensitiveKeys = ['password', 'apiKey', 'token', 'secret', 'RRR', 'nin'];
  
  for (const key of Object.keys(masked)) {
    if (sensitiveKeys.includes(key.toLowerCase())) {
      masked[key] = '***MASKED***';
    } else if (typeof masked[key] === 'object') {
      masked[key] = maskData(masked[key]);
    }
  }
  return masked;
}
