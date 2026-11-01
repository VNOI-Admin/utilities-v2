const ADJECTIVES = `
amber azure bold brave breezy bright brisk calm clever cosmic crisp curious daring dusty eager early
fancy fierce gentle giddy glad golden grand happy hardy humble jolly keen kind lively lucky lunar
mellow merry mighty misty modest noble nimble plucky polar proud quick quiet rapid rosy rustic shiny
silent silver sleek snowy solar spry steady sunny swift tidy vivid warm wild wise witty zesty
`
  .trim()
  .split(/\s+/);

const ANIMALS = `
alpaca badger beaver bison bobcat camel cheetah condor corgi coyote crane dingo dolphin eagle falcon ferret
finch gecko gibbon gopher heron hippo husky ibex iguana impala jackal jaguar koala lemur leopard llama
lynx magpie marmot meerkat moose narwhal newt ocelot okapi orca osprey otter owl panda parrot pelican
penguin puffin quail rabbit raven seal sloth swan tapir tiger toucan turtle walrus wombat yak zebra
`
  .trim()
  .split(/\s+/);

export function machineName(fingerprint: string): string {
  const bytes = Buffer.from(fingerprint, 'hex');
  return `${ADJECTIVES[bytes[0] & 63]}-${ANIMALS[bytes[1] & 63]}`;
}

export function nextFreeName(base: string, taken: string[]): string {
  const used = new Set(taken);
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}
