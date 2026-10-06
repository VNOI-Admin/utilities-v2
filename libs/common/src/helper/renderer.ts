import { spawn } from 'node:child_process';

// TODO:
// - ranking
// - rounded corners
// - animations

// TODO: Add more colors here
const statusColor = {
  WA: '#eab308',
  AC: '#22c55e',
} as const;

export type Params = {
  webcamSrc?: string;
  screenSrc?: string;
  teamName: string;
  university: {
    name: string;
    logoSrc: string;
  };
  problem: string;
  rank: {
    before: number;
    after: number;
  };
  status: keyof typeof statusColor;
};

export type Style = {
  background: string;
  foreground: string;
};

export type Configuration = {
  backgroundSrc: string;
  logoSrc: string;
  fontPath: string;

  padding: number;
  width: number;
  height: number;
  barHeight: number;

  fontSize: {
    base: number;
    teamName: number;
    universityName: number;
    problem: number;
  };

  style: {
    base: Style;
    banner: Style;
  };

  text: {
    headerLeft: string;
    headerRight: string;
    footer: string;
  };
};

// function formatRank(rank: number): string {
//   switch (rank) {
//     case 1:
//       return "1st place";
//     case 2:
//       return "2nd place";
//     case 3:
//       return "3rd place";
//     default:
//       return `${rank}th place`;
//   }
// }

function runCommand(cmd: string, args: readonly string[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });

    const chunks = new Array<Buffer>();
    const errChunks = new Array<Buffer>();

    p.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
    p.stderr.on('data', (chunk: Buffer) => errChunks.push(Buffer.from(chunk)));

    p.on('error', (err) => reject(err));
    p.on('close', (code) => {
      if (code !== 0) {
        const stderr = Buffer.concat(errChunks).toString('utf8');
        return reject(new Error(`${cmd} exited ${code}\n${stderr}`));
      }
      resolve(Buffer.concat(chunks));
    });
  });
}

function composeFilters(filters: ArrayLike<string>, prefix: string): string {
  let out = `[${prefix}]${filters[0]}[${prefix}0]`;
  let cnt = 0;
  for (let i = 1; i < filters.length - 1; ++i) {
    out = `${out}; [${prefix}${cnt}]${filters[i]}[${prefix}${cnt + 1}]`;
    cnt += 1;
  }
  return `${out}; [${prefix}${cnt}]${filters[filters.length - 1]}[outv]`;
}

export type RenderOptions = {
  webcamHasAudio?: boolean;
  screenHasAudio?: boolean;
};

function buildAudioFilter(webcamAudioIn: number | null, screenAudioIn: number | null): string {
  if (webcamAudioIn !== null && screenAudioIn !== null) {
    return `[${webcamAudioIn}:a][${screenAudioIn}:a]amix=inputs=2:normalize=0[outa]`;
  }
  if (webcamAudioIn !== null) {
    return `[${webcamAudioIn}:a]anull[outa]`;
  }
  if (screenAudioIn !== null) {
    return `[${screenAudioIn}:a]anull[outa]`;
  }
  return 'anullsrc=channel_layout=stereo:sample_rate=48000[outa]';
}

export async function render(
  config: Configuration,
  params: Params,
  options?: RenderOptions,
): Promise<Buffer> {
  const smallW = config.width - 2 * config.padding;
  const smallH = Math.floor((smallW * 9) / 16);

  if (smallW <= 0) throw new Error('PAD too large.');

  const y1 = config.barHeight + config.padding;
  const y2 = config.height - y1 - smallH;

  const logoY = (config.barHeight - config.fontSize.base) / 2;

  const prefix = 'bg';

  const inputs: string[] = [];
  const webcamIn = params.webcamSrc ? inputs.push(params.webcamSrc) - 1 : null;
  const screenIn = params.screenSrc ? inputs.push(params.screenSrc) - 1 : null;
  if (webcamIn === null && screenIn === null) throw new Error('Need a webcam or a screen source.');
  const backgroundIn = inputs.push(config.backgroundSrc) - 1;
  const logoIn = inputs.push(config.logoSrc) - 1;
  const uniLogoIn = inputs.push(params.university.logoSrc) - 1;

  const webcamAudio = webcamIn !== null && (options?.webcamHasAudio ?? true);
  const screenAudio = screenIn !== null && (options?.screenHasAudio ?? true);

  const bannerY = y1 + smallH + config.padding;
  const bannerH = y2 - config.padding - bannerY;

  const uniLogoSize = bannerH - config.padding * 2;

  const bannerTextHeight =
    config.fontSize.teamName + config.padding + config.fontSize.universityName;
  const bannerTextX = 3 * config.padding + uniLogoSize;
  const teamNameY = bannerY + (bannerH - bannerTextHeight) / 2;
  const uniNameY = teamNameY + config.fontSize.teamName + config.padding;

  const filter = [
    // top video
    ...(webcamIn === null
      ? []
      : [
          `[${webcamIn}:v]setpts=PTS-STARTPTS,scale=${smallW}:${smallH}:force_original_aspect_ratio=disable,setsar=1[top-video]`,
        ]),

    // bottom video
    ...(screenIn === null
      ? []
      : [
          `[${screenIn}:v]setpts=PTS-STARTPTS,scale=${smallW}:${smallH}:force_original_aspect_ratio=disable,setsar=1[bottom-video]`,
        ]),

    // background: cover (scale increase) then center crop to OUT_WxOUT_H
    `[${backgroundIn}:v]scale=${config.width}:${config.height}:force_original_aspect_ratio=increase,crop=${config.width}:${config.height}:(in_w-${config.width})/2:(in_h-${config.height})/2,setsar=1[${prefix}]`,

    // logo: cover (scale increase) then center crop to OUT_WxOUT_H
    `[${logoIn}:v]scale=${config.fontSize.base}:${config.fontSize.base}:force_original_aspect_ratio=decrease,setsar=1[logo]`,

    // uni logo
    `[${uniLogoIn}:v]scale=${uniLogoSize}:${uniLogoSize}:force_original_aspect_ratio=decrease,setsar=1[uni-logo]`,

    buildAudioFilter(webcamAudio ? webcamIn : null, screenAudio ? screenIn : null),

    composeFilters(
      [
        // header
        `drawbox=0:0:${config.width}:${config.barHeight}:color=${config.style.base.background}@1:t=fill`,

        // footer
        `drawbox=0:(${config.height}-${config.barHeight}):${config.width}:${config.barHeight}:color=${config.style.base.background}@1:t=fill`,

        // logo
        `[logo]overlay=${config.padding}:${logoY}:format=yuv420`,

        // header text (left)
        `drawtext=fontfile=${config.fontPath}:text='${config.text.headerLeft}':fontcolor=${config.style.base.foreground}:fontsize=${config.fontSize.base}:x=${config.padding + config.fontSize.base}+max_glyph_w:y=(${config.barHeight}-text_h)/2:y_align=font`,

        // header text (right)
        `drawtext=fontfile=${config.fontPath}:text='${config.text.headerRight}':fontcolor=${config.style.base.foreground}:fontsize=${config.fontSize.base}:x=(w-text_w-${config.padding}):y=((${config.barHeight}-text_h)/2):y_align=font`,

        // footer text
        `drawtext=fontfile=${config.fontPath}:text='${config.text.footer}':fontcolor=${config.style.base.foreground}:fontsize=${config.fontSize.base}:x=(w-text_w)/2:y=h-${config.barHeight}+(${config.barHeight}-text_h)/2:y_align=font`,

        // banner
        `drawbox=${config.padding}:${bannerY}:${smallW}:${bannerH}:color=${statusColor[params.status]}@1:t=fill`,

        // uni logo
        `[uni-logo]overlay=${2 * config.padding}:${bannerY + config.padding}:format=yuv420`,

        // team name
        `drawtext=fontfile=${config.fontPath}:text='${params.teamName}':fontcolor=${config.style.banner.foreground}:fontsize=${config.fontSize.teamName}:x=${bannerTextX}:y=${teamNameY}:y_align=font`,

        // university name
        `drawtext=fontfile=${config.fontPath}:text='${params.university.name}':fontcolor=${config.style.banner.foreground}:fontsize=${config.fontSize.universityName}:x=${bannerTextX}:y=${uniNameY}:y_align=font`,

        // problem
        `drawtext=fontfile=${config.fontPath}:text='${params.problem}':fontcolor=${config.style.banner.foreground}:fontsize=${config.fontSize.problem}:x=${config.width - 2 * config.padding}-(${config.fontSize.problem}+text_w) / 2:y=${bannerY}+(${bannerH}-text_h)/2:y_align=font`,

        // videos
        ...(webcamIn === null ? [] : [`[top-video]overlay=${config.padding}:${y1}:format=yuv420`]),
        ...(screenIn === null ? [] : [`[bottom-video]overlay=${config.padding}:${y2}:format=yuv420`]),
      ],
      prefix,
    ),
  ].join('; ');

  const args = [
    ...inputs.flatMap((input) => ['-i', input]),

    // Apply the filters
    '-filter_complex', filter,
    '-filter_threads', '1',
    '-map', '[outv]',
    '-map', '[outa]',

    // VP9 video encoding (WebM only carries VP8/VP9/AV1)
    '-c:v', 'libvpx-vp9',
    '-crf', '32',
    '-b:v', '0',

    // Video encoding speed control
    '-deadline', 'realtime',
    '-cpu-used', '8',
    '-threads', '1',

    // OPUS audio encoding
    '-c:a', 'libopus',
    '-b:a', '128k',

    // Write to stdout
    '-f', 'webm',
    '-',
  ];

  if (!webcamAudio && !screenAudio) {
    // anullsrc generates infinite audio; cap output at video length
    args.splice(args.indexOf('-f'), 0, '-shortest');
  }

  const buffer = await runCommand('ffmpeg', args);
  return buffer;
}
