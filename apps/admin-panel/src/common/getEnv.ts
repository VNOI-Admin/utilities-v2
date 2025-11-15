export default function getEnv(key: string): string {
  // In development, use import.meta.env
  if (import.meta.env.DEV) {
    return import.meta.env[key] || '';
  }

  // In production, use config.json
  // For now, fall back to import.meta.env
  return import.meta.env[key] || '';
}
