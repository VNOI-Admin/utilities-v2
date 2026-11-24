import { ContestFormat } from '@libs/common-db/schemas/contest.schema';
import { SubmissionStatus } from '@libs/common-db/schemas/submission.schema';

import {
  type ClicsData,
  buildCollections,
  buildContest,
  buildScoreboard,
  buildState,
  filterByIds,
  formatReltime,
  formatTime,
} from './clics-objects';

const start = new Date('2026-11-24T02:00:00Z');
const at = (minutes: number) => new Date(start.getTime() + minutes * 60_000);

const data: ClicsData = {
  contest: {
    code: 'icpc26',
    name: 'ICPC Vietnam 2026',
    start_time: start,
    end_time: at(300),
    frozen_at: at(240),
    format: ContestFormat.ICPC,
  },
  problems: [
    { code: 'b', name: 'Bottles', label: 'B', ordinal: 1 },
    { code: 'a', name: 'Asteroids', displayName: 'Rocks', label: 'A', ordinal: 0 },
  ],
  participants: [
    {
      username: 'alpha',
      mapToUser: 'u_alpha',
      hidden: false,
      rank: 1,
      solvedCount: 1,
      solvedProblems: ['a'],
      totalPenalty: 45,
      problemData: { a: { solveTime: 25, wrongTries: 1 }, b: { solveTime: 0, wrongTries: 0, pending: 1 } },
    },
    { username: 'ghost', hidden: true, rank: 2, solvedCount: 0, solvedProblems: [], totalPenalty: 0, problemData: {} },
  ],
  users: [{ username: 'u_alpha', fullName: 'Team Alpha', group: 'hcmus', role: 'contestant', vpnIpAddress: '10.10.0.5' }],
  groups: [{ code: 'hcmus', name: 'HCMUS', logoUrl: 'https://cdn.example/hcmus.svg' }],
  submissions: [
    {
      external_id: '11',
      author: 'alpha',
      problem_code: 'a',
      language: 'CPP17',
      submittedAt: at(10),
      judgedAt: at(10.1),
      judgeEndAt: at(10.2),
      submissionStatus: SubmissionStatus.WA,
      data: {},
    },
    {
      external_id: '12',
      author: 'alpha',
      problem_code: 'a',
      language: 'CPP17',
      submittedAt: at(25),
      judgedAt: at(25.1),
      submissionStatus: SubmissionStatus.AC,
      data: { reaction: 'https://cdn.example/r/12.mp4' },
    },
    { external_id: '13', author: 'alpha', problem_code: 'b', submittedAt: at(250), submissionStatus: SubmissionStatus.PENDING, data: {} },
  ],
};

const media = { streamBase: 'https://admin.example/stream-source', streamToken: (ip: string) => `tok-${ip}` };

describe('formatters', () => {
  it('formats CLICS TIME and RELTIME', () => {
    expect(formatTime(start)).toBe('2026-11-24T02:00:00.000+00:00');
    expect(formatReltime(3665_007)).toBe('1:01:05.007');
    expect(formatReltime(-90_000)).toBe('-0:01:30.000');
  });
});

describe('buildContest and buildState', () => {
  it('describes the contest with freeze and penalty', () => {
    expect(buildContest(data.contest)).toEqual({
      id: 'icpc26',
      name: 'ICPC Vietnam 2026',
      formal_name: 'ICPC Vietnam 2026',
      start_time: '2026-11-24T02:00:00.000+00:00',
      duration: '5:00:00.000',
      scoreboard_freeze_duration: '1:00:00.000',
      scoreboard_type: 'pass-fail',
      penalty_time: 20,
    });
  });

  it('only finalizes an ended contest with nothing pending when asked', () => {
    expect(buildState(data.contest, at(250), { finalize: true, hasPending: false })).toMatchObject({
      started: '2026-11-24T02:00:00.000+00:00',
      frozen: '2026-11-24T06:00:00.000+00:00',
      ended: null,
      end_of_updates: null,
    });
    expect(buildState(data.contest, at(301), { finalize: true, hasPending: true }).end_of_updates).toBeNull();
    expect(buildState(data.contest, at(301), { finalize: true, hasPending: false })).toMatchObject({
      ended: '2026-11-24T07:00:00.000+00:00',
      finalized: '2026-11-24T07:00:00.000+00:00',
      end_of_updates: '2026-11-24T07:00:00.000+00:00',
    });
  });
});

describe('buildCollections', () => {
  const collections = buildCollections(data, media);

  it('orders problems by ordinal and prefers the manual display name', () => {
    expect(collections.problems).toEqual([
      { id: 'a', label: 'A', name: 'Rocks', ordinal: 0, test_data_count: 0 },
      { id: 'b', label: 'B', name: 'Bottles', ordinal: 1, test_data_count: 0 },
    ]);
  });

  it('builds teams with organization and signed HLS links', () => {
    expect(collections.teams[0]).toEqual({
      id: 'alpha',
      label: 'alpha',
      name: 'Team Alpha',
      display_name: 'Team Alpha',
      organization_id: 'hcmus',
      group_ids: [],
      hidden: false,
      desktop: [
        {
          href: 'https://admin.example/stream-source/t/tok-10.10.0.5/10.10.0.5/stream.m3u8',
          mime: 'application/vnd.apple.mpegurl',
        },
      ],
      webcam: [
        {
          href: 'https://admin.example/stream-source/t/tok-10.10.0.5/10.10.0.5/webcam.m3u8',
          mime: 'application/vnd.apple.mpegurl',
        },
      ],
    });
    expect(collections.teams[1]).toMatchObject({ id: 'ghost', name: 'ghost', hidden: true });
    expect(collections.teams[1]).not.toHaveProperty('desktop');
    expect(collections.organizations).toEqual([
      { id: 'hcmus', name: 'HCMUS', formal_name: 'HCMUS', logo: [{ href: 'https://cdn.example/hcmus.svg', mime: 'image/svg+xml' }] },
    ]);
  });

  it('builds submissions with reactions and one judgement per judged submission', () => {
    expect(collections.submissions.map((s) => [s.id, s.contest_time, s.language_id])).toEqual([
      ['11', '0:10:00.000', 'CPP17'],
      ['12', '0:25:00.000', 'CPP17'],
      ['13', '4:10:00.000', 'unknown'],
    ]);
    expect(collections.submissions[1].reaction).toEqual([{ href: 'https://cdn.example/r/12.mp4', mime: 'video/mp4' }]);
    expect(collections.judgements).toEqual([
      {
        id: '11',
        submission_id: '11',
        judgement_type_id: 'WA',
        current: true,
        start_time: '2026-11-24T02:10:06.000+00:00',
        start_contest_time: '0:10:06.000',
        end_time: '2026-11-24T02:10:12.000+00:00',
        end_contest_time: '0:10:12.000',
      },
      {
        id: '12',
        submission_id: '12',
        judgement_type_id: 'AC',
        current: true,
        start_time: '2026-11-24T02:25:06.000+00:00',
        start_contest_time: '0:25:06.000',
        end_time: '2026-11-24T02:25:06.000+00:00',
        end_contest_time: '0:25:06.000',
      },
    ]);
    expect(collections.languages).toEqual([
      { id: 'CPP17', name: 'CPP17', entry_point_required: false, extensions: [] },
      { id: 'unknown', name: 'unknown', entry_point_required: false, extensions: [] },
    ]);
  });

  it('marks AC as solved and only CE and IE as penalty-free', () => {
    const types = Object.fromEntries(collections['judgement-types'].map((t) => [t.id, [t.solved, t.penalty]]));
    expect(types.AC).toEqual([true, false]);
    expect(types.WA).toEqual([false, true]);
    expect(types.CE).toEqual([false, false]);
    expect(types.JE).toEqual([false, false]);
    expect(Object.keys(types).sort()).toEqual(['AC', 'CE', 'CS', 'JE', 'MLE', 'OLE', 'RE', 'RTE', 'TLE', 'WA']);
  });

  it('maps VNOJ-only verdicts onto the spec judgement type IDs', () => {
    const verdicts = ['RE', 'IR', 'PAC', 'SC', 'AB', 'IE', 'UNKNOWN', 'XYZ'];
    const { judgements } = buildCollections(
      {
        ...data,
        submissions: verdicts.map((status, i) => ({
          external_id: String(i),
          author: 'alpha',
          problem_code: 'a',
          submittedAt: at(i),
          submissionStatus: status,
        })),
      },
      media,
    );
    expect(judgements.map((j) => j.judgement_type_id)).toEqual(['RTE', 'RTE', 'RE', 'RE', 'CS', 'JE', 'CS', 'CS']);
  });
});

describe('buildScoreboard', () => {
  it('lists visible teams in rank order with per-problem results', () => {
    const scoreboard = buildScoreboard(data, at(100));
    expect(scoreboard.contest_time).toBe('1:40:00.000');
    expect(scoreboard.rows).toEqual([
      {
        rank: 1,
        team_id: 'alpha',
        score: { num_solved: 1, total_time: 45 },
        problems: [
          { problem_id: 'a', num_judged: 2, num_pending: 0, solved: true, time: 25 },
          { problem_id: 'b', num_judged: 0, num_pending: 1, solved: false },
        ],
      },
    ]);
  });
});

describe('filterByIds', () => {
  const items = [
    { id: '1', team_id: 'a', problem_id: 'x' },
    { id: '2', team_id: 'b', problem_id: 'x' },
    { id: '3', team_id: null, problem_id: 'y' },
  ];

  it('ANDs ID filters, treats an empty value as null, and ignores other params', () => {
    expect(filterByIds(items, { team_id: 'a', problem_id: 'x' }).map((i) => i.id)).toEqual(['1']);
    expect(filterByIds(items, { team_id: '' }).map((i) => i.id)).toEqual(['3']);
    expect(filterByIds(items, { finalize: '1' })).toHaveLength(3);
  });
});
