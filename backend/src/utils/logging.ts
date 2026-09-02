function redact(value: string): string {
  const secret = process.env.GEMINI_API_KEY;
  return secret ? value.replaceAll(secret, '[REDACTED]') : value;
}

export function safeErrorForLog(error: unknown): Record<string, unknown> {
  if (!(error instanceof Error)) return { message: redact(String(error)) };
  const code = 'code' in error && typeof error.code === 'string' ? error.code : undefined;
  return {
    name: error.name,
    message: redact(error.message),
    ...(code ? { code } : {}),
    ...(process.env.NODE_ENV !== 'production' && error.stack ? { stack: redact(error.stack) } : {}),
  };
}
