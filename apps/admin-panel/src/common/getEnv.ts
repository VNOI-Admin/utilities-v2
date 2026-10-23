import Config from '../../config/config.json';

export default function getEnv(key: string): string {
  const value = (Config as Record<string, string>)[key];
  // Unsubstituted '$NAME' tokens mean the bundle wasn't served by nginx.sh (vite dev, plain vite build).
  if (!import.meta.env.DEV && value && !value.startsWith('$')) return value;

  return import.meta.env[key] || '';
}
