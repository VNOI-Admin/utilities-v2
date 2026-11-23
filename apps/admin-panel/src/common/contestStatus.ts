export type ContestStatus = 'upcoming' | 'ongoing' | 'frozen' | 'past';

interface ContestTimes {
  start_time: string | Date;
  end_time: string | Date;
  frozen_at?: string | Date | null;
}

export function isFrozen(contest: ContestTimes, now = new Date()): boolean {
  return !!contest.frozen_at && now >= new Date(contest.frozen_at);
}

export function contestStatus(contest: ContestTimes, now = new Date()): ContestStatus {
  if (now < new Date(contest.start_time)) return 'upcoming';
  if (now > new Date(contest.end_time)) return 'past';
  return isFrozen(contest, now) ? 'frozen' : 'ongoing';
}
