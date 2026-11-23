import { createHash, randomBytes } from 'crypto';
import argon2 from 'argon2';
import { MongoClient } from 'mongodb';

const DB_URI = process.env.DEV_SEED_DB_URI || 'mongodb://localhost:27018/vnoi_ops_dev?directConnection=true';

const DEV_LOGINS = {
  admin: { username: 'admin', password: 'admin-local' },
  coach: { username: 'coach_uet', password: 'coach-local' },
};

const MIN = 60_000;
const HOUR = 60 * MIN;

let seed = 20251124;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const int = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
const pick = <T>(xs: T[]) => xs[Math.floor(rand() * xs.length)];

const GROUPS = [
  { code: 'UET_VNU', name: 'University of Engineering and Technology', short: 'uet' },
  { code: 'HUST', name: 'Hanoi University of Science and Technology', short: 'hust' },
  { code: 'HCMUS', name: 'VNU-HCM University of Science', short: 'hcmus' },
  { code: 'HCMUT', name: 'Ho Chi Minh City University of Technology', short: 'hcmut' },
  { code: 'PTIT', name: 'Posts and Telecommunications Institute of Technology', short: 'ptit' },
  { code: 'FPTU', name: 'FPT University', short: 'fpt' },
  { code: 'DUT', name: 'Da Nang University of Science and Technology', short: 'dut' },
  { code: 'CTU', name: 'Can Tho University', short: 'ctu' },
];
const TEAMS = ['Mocha', 'Bitset', 'Segment Tree', 'Lazy Prop', 'Kawaii', 'Overflow', 'Two Pointers', 'DSU', 'Monotonic', 'Convex Hull', 'Treap', 'Sparse Table', 'Dijkstra', 'Fenwick', 'Hashing', 'Bitmask', 'Suffix Array', 'KMP', 'Mo Algo', 'Centroid', 'Euler Tour', 'Greedy', 'Knapsack', 'Matrix', 'Sweep Line', 'Trie', 'Z Function', 'LCA', 'Max Flow', 'Bridges', 'SCC', 'FFT', 'Pho Bo', 'Banh Mi', 'Ca Phe', 'Che Ba Mau'];
const PROBLEMS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

async function run() {
  const client = await MongoClient.connect(DB_URI);
  const db = client.db();
  const now = Date.now();
  const start = new Date(now - (3 * HOUR + 12 * MIN));
  const contestCode = 'vnoicup25_final';

  await db.dropDatabase();

  const hash = (p: string) => argon2.hash(p);
  const adminHash = await hash(DEV_LOGINS.admin.password);
  const coachHash = await hash(DEV_LOGINS.coach.password);
  const contestantHash = await hash('contestant-local');

  await db.collection('groups').insertMany(GROUPS.map(({ code, name }) => ({ code, name })));

  const users: Record<string, unknown>[] = [];
  const participants: Record<string, unknown>[] = [];
  for (let i = 0; i < 36; i++) {
    const g = GROUPS[i % 8];
    const username = `${g.short}_${String(Math.floor(i / 8) + 1).padStart(2, '0')}`;
    const online = ![6, 29].includes(i);
    users.push({
      username,
      fullName: `${g.short.toUpperCase()} ${TEAMS[i]}`,
      password: contestantHash,
      role: 'contestant',
      group: g.code,
      vpnIpAddress: `10.10.0.${11 + i}`,
      apiKey: null,
      isActive: true,
      keyPair: { publicKey: null, privateKey: null },
      machineUsage: {
        cpu: i === 3 ? 97 : int(6, 52),
        memory: i === 25 ? 91 : int(28, 68),
        disk: i === 11 ? 93 : int(18, 64),
        ping: i === 17 ? 380 : int(4, 38),
        isOnline: online,
        lastReportedAt: new Date(online ? now - 5000 : now - int(4, 20) * MIN),
      },
    });

    const skill = 0.35 + rand() * 0.75;
    const problemData: Record<string, { solveTime: number; wrongTries: number }> = {};
    const solvedProblems: string[] = [];
    let penalty = 0;
    PROBLEMS.forEach((p, k) => {
      if (rand() < skill - k * 0.08) {
        const wrong = int(0, 2);
        const t = Math.min(190, int(8, 40) + k * int(6, 15));
        problemData[p] = { solveTime: t, wrongTries: wrong };
        solvedProblems.push(p);
        penalty += t + 20 * wrong;
      } else if (rand() < 0.35) {
        problemData[p] = { solveTime: 0, wrongTries: int(1, 4) };
      }
    });
    const unlinked = [8, 21, 33].includes(i);
    participants.push({
      username: unlinked ? `${username.replace('_', '')}_team` : username,
      contest: contestCode,
      mapToUser: unlinked ? undefined : username,
      solvedCount: solvedProblems.length,
      totalPenalty: penalty,
      solvedProblems,
      problemData,
    });
  }
  participants
    .sort((a, b) => (b.solvedCount as number) - (a.solvedCount as number) || (a.totalPenalty as number) - (b.totalPenalty as number))
    .forEach((p, i) => {
      p.rank = i + 1;
    });

  users.push(
    ...GROUPS.map((g, i) => ({
      username: `coach_${g.short}`,
      fullName: `${g.short.toUpperCase()} Coach`,
      password: coachHash,
      role: 'coach',
      group: g.code,
      vpnIpAddress: `10.20.0.${11 + i}`,
      apiKey: null,
      isActive: true,
      keyPair: { publicKey: null, privateKey: null },
    })),
    {
      username: DEV_LOGINS.admin.username,
      fullName: 'Contest Admin',
      password: adminHash,
      role: 'admin',
      vpnIpAddress: '10.100.0.11',
      apiKey: null,
      isActive: true,
      keyPair: { publicKey: null, privateKey: null },
    },
    ...Array.from({ length: 6 }, (_, i) => ({
      username: `guest${String(i + 1).padStart(2, '0')}`,
      fullName: `Guest ${i + 1}`,
      password: contestantHash,
      role: 'guest',
      vpnIpAddress: `10.30.0.${11 + i}`,
      apiKey: null,
      isActive: true,
      keyPair: { publicKey: null, privateKey: null },
      machineUsage: { cpu: 0, memory: 0, disk: 0, ping: 0, isOnline: i < 4, lastReportedAt: new Date(now) },
    })),
  );
  await db.collection('users').insertMany(users);

  await db.collection('contests').insertMany([
    { code: contestCode, name: 'VNOI Cup 2025 Final', start_time: start, end_time: new Date(start.getTime() + 5 * HOUR), frozen_at: new Date(start.getTime() + 4 * HOUR), penalty: 20 },
    { code: 'icpc_hn_warmup', name: 'ICPC Hanoi Regional Warm-up', start_time: new Date(now + 26 * HOUR), end_time: new Date(now + 28 * HOUR), frozen_at: new Date(now + 27 * HOUR), penalty: 20 },
    { code: 'vnoicup25_r3', name: 'VNOI Cup 2025 Round 3', start_time: new Date(now - 14 * 24 * HOUR), end_time: new Date(now - 14 * 24 * HOUR + 3 * HOUR), frozen_at: new Date(now - 14 * 24 * HOUR + 2 * HOUR), penalty: 20 },
  ]);
  await db.collection('problems').insertMany(PROBLEMS.map((code) => ({ code, contest: contestCode })));
  await db.collection('participants').insertMany(participants);

  const contestants = users.filter((u) => u.role === 'contestant').map((u) => u.username as string);
  let t = now;
  await db.collection('submissions').insertMany(
    Array.from({ length: 60 }, (_, i) => {
      t -= int(8, 30) * 1000;
      return {
        submittedAt: new Date(t),
        judgedAt: new Date(t + 4000),
        author: pick(contestants),
        submissionStatus: pick(['AC', 'AC', 'WA', 'WA', 'WA', 'TLE', 'RTE']),
        contest_code: contestCode,
        problem_code: pick(PROBLEMS),
        external_id: String(482190 - i),
        language: 'C++17',
        data: { score: 0, penalty: 0, old_rank: 0, new_rank: 0 },
      };
    }),
  );

  await db.collection('overlaylayouts').insertOne({
    key: 'global-config',
    current: false,
    data: { contestId: contestCode, fullViewMode: false, showSubmissionQueue: true, showFooter: true, footerContentType: 'announcements', currentLayout: 'none' },
  });
  await db.collection('systemconfigs').insertOne({ key: 'coachAccessReopenedAt', value: new Date(now - 24 * HOUR).toISOString(), createdAt: new Date(), updatedAt: new Date() });

  await db.collection('printclients').insertMany([
    { clientId: 'hall-a', authKey: randomBytes(12).toString('hex'), isActive: true, isOnline: true, lastReportedAt: new Date(now) },
    { clientId: 'hall-b', authKey: randomBytes(12).toString('hex'), isActive: true, isOnline: true, lastReportedAt: new Date(now) },
    { clientId: 'lab-3', authKey: randomBytes(12).toString('hex'), isActive: true, isOnline: false, lastReportedAt: new Date(now - 25 * MIN) },
  ]);
  const files = ['main.cpp', 'sol_a.cpp', 'brute.py', 'gen.cpp', 'notes.txt', 'sol_d.cpp'];
  await db.collection('printjobs').insertMany([
    ...[[1, 'hall-a'], [2, 'hall-b'], [7, 'lab-3'], [9, 'lab-3'], [4, 'hall-a']].map(([m, c], i) => ({
      jobId: `pj_${900 + i}`, username: pick(contestants), clientId: c, status: 'queued', priority: 0,
      requestedAt: new Date(now - (m as number) * MIN), filename: pick(files), content: '// sample print job',
    })),
    ...Array.from({ length: 9 }, (_, i) => ({
      jobId: `pj_${800 + i}`, username: pick(contestants), clientId: pick(['hall-a', 'hall-b']), status: 'done', priority: 0,
      requestedAt: new Date(now - int(12, 150) * MIN), filename: pick(files), content: '// sample print job',
    })),
  ]);

  const scripts = [
    ['lock-screen.sh', 'loginctl lock-sessions'],
    ['unlock-screen.sh', 'loginctl unlock-sessions'],
    ['collect-logs.sh', 'tar czf /tmp/logs.tgz /home/contestant/.bash_history'],
    ['restart-obs.sh', 'systemctl --user restart obs-stream'],
  ].map(([name, body]) => {
    const content = `#!/usr/bin/env bash\nset -euo pipefail\n${body}\n`;
    return { name, content, hash: createHash('sha256').update(content).digest('hex'), createdAt: new Date(now - 2 * 24 * HOUR), updatedAt: new Date(now - 2 * 24 * HOUR) };
  });
  await db.collection('remotecontrolscripts').insertMany(scripts);

  const jobs = [
    { jobId: 'job_a07e', script: scripts[2], by: 'admin', at: now - 12 * MIN, fail: [5, 19, 30], running: -1 },
    { jobId: 'job_b3f1', script: scripts[3], by: 'admin', at: now - 2 * MIN, fail: [], running: 14 },
    { jobId: 'job_91c2', script: scripts[1], by: 'admin', at: now - 3 * HOUR - 13 * MIN, fail: [], running: -1 },
  ];
  for (const j of jobs) {
    const runs = contestants.map((target, i) => {
      const status = j.fail.includes(i) ? 'failed' : j.running < 0 || i < j.running ? 'success' : i === j.running ? 'running' : 'pending';
      return {
        jobId: j.jobId, target, status, outputFiles: [], updatedAt: new Date(j.at + 5000),
        exitCode: status === 'failed' ? 2 : status === 'success' ? 0 : null,
        log: status === 'failed' ? 'tar: /home/contestant/.cache: Cannot open: Permission denied' : status === 'success' ? 'ok' : null,
      };
    });
    const counts = { pending: 0, running: 0, success: 0, failed: 0 } as Record<string, number>;
    for (const r of runs) counts[r.status]++;
    await db.collection('remotejobs').insertOne({
      jobId: j.jobId, scriptName: j.script.name, scriptHash: j.script.hash, args: [], env: {}, inputFiles: [],
      targets: contestants, statusCounts: counts, createdBy: j.by, createdAt: new Date(j.at),
    });
    await db.collection('remotejobruns').insertMany(runs);
  }

  await client.close();
  console.log(`Seeded ${DB_URI}`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
