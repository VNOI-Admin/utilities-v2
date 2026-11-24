import { SubmissionStatus } from '../schemas/submission.schema';
import { parseEventFeed, parseReltime, planClicsSync } from './clics-sync';

const line = (type: string, data: unknown, id: string | null = null) => JSON.stringify({ type, id, data });

const feed = [
  line('contest', {
    id: 'icpc26',
    name: 'ICPC Vietnam 2026',
    formal_name: 'ICPC Vietnam 2026',
    start_time: '2026-11-24T02:00:00.000+00:00',
    duration: '5:00:00.000',
    scoreboard_type: 'pass-fail',
    penalty_time: 20,
    scoreboard_freeze_duration: '1:00:00.000',
  }),
  line('judgement-types', [{ id: 'AC', name: 'Accepted', solved: true, penalty: false }]),
  line('problems', [
    { id: 'icpc26_b', label: 'A', name: 'Bottles', ordinal: 0 },
    { id: 'icpc26_a', label: 'B', name: 'Asteroids', ordinal: 1 },
  ]),
  line('teams', [
    { id: 'team_alpha', label: 'team_alpha', name: 'Alpha', hidden: false },
    { id: 'team_cheater', label: 'team_cheater', name: 'Cheater', hidden: true },
  ]),
  line('submissions', [
    { id: '11', language_id: 'CPP17', problem_id: 'icpc26_b', team_id: 'team_alpha', time: '2026-11-24T02:10:00.000+00:00', contest_time: '0:10:00.000' },
    { id: '12', language_id: 'CPP17', problem_id: 'icpc26_b', team_id: 'team_alpha', time: '2026-11-24T02:25:30.000+00:00', contest_time: '0:25:30.000' },
    { id: '13', language_id: 'PY3', problem_id: 'icpc26_a', team_id: 'team_cheater', time: '2026-11-24T06:10:00.000+00:00', contest_time: '4:10:00.000' },
  ]),
  line('judgements', [
    { id: '11', submission_id: '11', judgement_type_id: 'WA', start_time: '2026-11-24T02:10:01.000+00:00', end_time: '2026-11-24T02:10:04.000+00:00' },
    { id: '12', submission_id: '12', judgement_type_id: 'AC', start_time: '2026-11-24T02:25:31.000+00:00', end_time: '2026-11-24T02:25:35.000+00:00' },
  ]),
  line('state', { started: '2026-11-24T02:00:00.000+00:00', ended: null }),
  '',
].join('\n');

describe('parseReltime', () => {
  it('parses hours, minutes, seconds and milliseconds, including negatives', () => {
    expect(parseReltime('5:00:00.000')).toBe(5 * 3600_000);
    expect(parseReltime('1:01:05.007')).toBe(3665_007);
    expect(parseReltime('-0:01:30')).toBe(-90_000);
  });
});

describe('parseEventFeed', () => {
  it('replaces a collection on a batch event and applies single-object updates and deletes', () => {
    const snapshot = parseEventFeed(
      [
        line('teams', [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }]),
        line('teams', [{ id: 'c', name: 'C' }]),
        line('teams', { id: 'd', name: 'D' }, 'd'),
        line('teams', null, 'c'),
      ].join('\n'),
    );

    expect([...snapshot.teams.keys()]).toEqual(['d']);
  });
});

describe('planClicsSync', () => {
  const plan = planClicsSync(parseEventFeed(feed), 'icpc26');

  it('derives contest times and penalty from the contest object', () => {
    expect(plan.contest).toEqual({
      name: 'ICPC Vietnam 2026',
      start_time: new Date('2026-11-24T02:00:00Z'),
      end_time: new Date('2026-11-24T07:00:00Z'),
      frozen_at: new Date('2026-11-24T06:00:00Z'),
      penalty: 20,
    });
  });

  it('strips the contest prefix from problem codes and keeps the order', () => {
    expect(plan.problems).toEqual([
      { code: 'b', name: 'Bottles', label: 'A', ordinal: 0 },
      { code: 'a', name: 'Asteroids', label: 'B', ordinal: 1 },
    ]);
  });

  it('maps teams to participants with their hidden flag', () => {
    expect(plan.participants).toEqual([
      { username: 'team_alpha', hidden: false },
      { username: 'team_cheater', hidden: true },
    ]);
  });

  it('maps judgements to verdicts and leaves unjudged submissions pending', () => {
    expect(plan.submissions).toEqual([
      {
        external_id: '11',
        author: 'team_alpha',
        problem_code: 'b',
        language: 'CPP17',
        submittedAt: new Date('2026-11-24T02:10:00Z'),
        judgedAt: new Date('2026-11-24T02:10:01Z'),
        judgeEndAt: new Date('2026-11-24T02:10:04Z'),
        submissionStatus: SubmissionStatus.WA,
        penaltyMinutes: 10,
      },
      {
        external_id: '12',
        author: 'team_alpha',
        problem_code: 'b',
        language: 'CPP17',
        submittedAt: new Date('2026-11-24T02:25:30Z'),
        judgedAt: new Date('2026-11-24T02:25:31Z'),
        judgeEndAt: new Date('2026-11-24T02:25:35Z'),
        submissionStatus: SubmissionStatus.AC,
        penaltyMinutes: 25,
      },
      {
        external_id: '13',
        author: 'team_cheater',
        problem_code: 'a',
        language: 'PY3',
        submittedAt: new Date('2026-11-24T06:10:00Z'),
        judgedAt: undefined,
        judgeEndAt: undefined,
        submissionStatus: SubmissionStatus.PENDING,
        penaltyMinutes: 250,
      },
    ]);
  });

  it('ignores superseded judgements and maps unknown verdicts to UNKNOWN', () => {
    const rejudged = planClicsSync(
      parseEventFeed(
        [
          feed,
          line('judgements', [
            { id: 'old', submission_id: '11', judgement_type_id: 'AC', start_time: '2026-11-24T02:10:01.000+00:00', current: false },
            { id: 'new', submission_id: '11', judgement_type_id: 'XX', start_time: '2026-11-24T03:00:00.000+00:00' },
          ]),
        ].join('\n'),
      ),
      'icpc26',
    );

    expect(rejudged.submissions[0].submissionStatus).toBe(SubmissionStatus.UNKNOWN);
  });
});
