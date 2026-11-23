import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { type Configuration, type Params, render } from './renderer';

const font = ['/usr/share/fonts/dejavu/DejaVuSans.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'].find(
  (f) => existsSync(f),
);
const canRun = font !== undefined && spawnSync('ffmpeg', ['-version']).status === 0;

(canRun ? describe : describe.skip)('render', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'render-spec-'));
  const file = (name: string) => path.join(dir, name);
  const ffmpeg = (...args: string[]) => spawnSync('ffmpeg', ['-loglevel', 'error', '-y', ...args]);

  beforeAll(() => {
    ffmpeg('-f', 'lavfi', '-i', 'color=c=blue:s=320x180', '-frames:v', '1', file('bg.png'));
    ffmpeg('-f', 'lavfi', '-i', 'color=c=red:s=64x64', '-frames:v', '1', file('logo.png'));
    ffmpeg('-f', 'lavfi', '-i', 'testsrc=size=320x180:rate=10:duration=2', file('clip.mkv'));
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  const config = (): Configuration => ({
    backgroundSrc: file('bg.png'),
    logoSrc: file('logo.png'),
    fontPath: font as string,
    width: 1080,
    height: 1920,
    text: { headerLeft: 'left', headerRight: 'right', footer: 'footer' },
  });
  const params = (sources: Pick<Params, 'webcamSrc' | 'screenSrc'>): Params => ({
    ...sources,
    teamName: 'team',
    university: { name: 'uni', logoSrc: file('logo.png') },
    problem: 'A',
    rank: { before: 2, after: 1 },
    status: 'AC',
  });

  it.each([
    ['screen only', { screenSrc: 'clip.mkv' }],
    ['webcam only', { webcamSrc: 'clip.mkv' }],
    ['both', { webcamSrc: 'clip.mkv', screenSrc: 'clip.mkv' }],
  ])(
    'renders the clip length with %s',
    async (_, sources: { webcamSrc?: string; screenSrc?: string }) => {
      const resolved = Object.fromEntries(Object.entries(sources).map(([k, v]) => [k, file(v)])) as Pick<Params, 'webcamSrc' | 'screenSrc'>;
      const video = await render(config(), params(resolved), { webcamHasAudio: false, screenHasAudio: false });
      writeFileSync(file('out.mp4'), video);
      const probe = spawnSync('ffprobe', [
        '-v', 'error', '-count_frames', '-select_streams', 'v:0',
        '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', file('out.mp4'),
      ]);
      expect(Number(probe.stdout.toString().trim())).toBeGreaterThanOrEqual(15);
    },
    60_000,
  );
});
