import Config from '../../config/config.json';

export default function getEnv(name: EnvNameKey) {
  console.log('MODE', import.meta.env.MODE);
  console.log('CONFIG', Config);
  if (import.meta.env.MODE !== 'development') return Config[name as ConfigKeyTypes];

  return import.meta.env[name as ConfigKeyTypes];
}

type ConfigKeyTypes = keyof typeof Config;
type EnvNameKey = Exclude<ConfigKeyTypes, '_comment'>;
