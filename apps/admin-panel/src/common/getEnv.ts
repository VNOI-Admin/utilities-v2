import Config from '../../config/config.json';

export default function getEnv(name: EnvNameKey) {
  if (import.meta.env.MODE !== 'development') return Config[name as ConfigKeyTypes];

  return import.meta.env[name as ConfigKeyTypes];
}

type ConfigKeyTypes = keyof typeof Config;
type EnvNameKey = Exclude<ConfigKeyTypes, '_comment'>;
