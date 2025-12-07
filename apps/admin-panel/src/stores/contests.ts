import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { ParticipantResponse } from '@libs/api/internal';

// Type definitions matching backend schemas
export interface ContestEntity {
  _id?: string;
  code: string;
  name: string;
  start_time: string | Date;
  end_time: string | Date;
  frozen_at?: string | Date;
  penalty?: number; // Minutes penalty per wrong submission (default 20)
}

export interface ProblemData {
  solveTime: number;
  wrongTries: number;
}

// Re-export ParticipantResponse as ParticipantEntity for backwards compatibility
export type ParticipantEntity = ParticipantResponse;

export enum SubmissionStatus {
  AC = 'AC',
  WA = 'WA',
  RTE = 'RTE',
  RE = 'RE',
  IR = 'IR',
  OLE = 'OLE',
  MLE = 'MLE',
  TLE = 'TLE',
  IE = 'IE',
  AB = 'AB',
  CE = 'CE',
  UNKNOWN = 'UNKNOWN',
}

export interface SubmissionData {
  score: number;
  penalty: number;
  old_rank: number;
  new_rank: number;
  reaction?: string;
}

export interface SubmissionEntity {
  _id: string;
  submittedAt: string | Date;
  judgedAt?: string | Date;
  author: string;
  submissionStatus: SubmissionStatus;
  contest_code: string;
  problem_code: string;
  data: SubmissionData;
  external_id?: string;
  language?: string;
}

export interface ProblemEntity {
  _id: string;
  code: string;
  contest: string;
}

export type ContestStatus = 'upcoming' | 'ongoing' | 'past' | 'frozen';
export type ContestFilter = 'all' | 'ongoing' | 'past' | 'future';

export const useContestsStore = defineStore('contests', () => {
  // State
  const contests = ref<ContestEntity[]>([]);
  const currentContest = ref<ContestEntity | null>(null);
  const participants = ref<ParticipantEntity[]>([]);
  const submissions = ref<SubmissionEntity[]>([]);
  const problems = ref<ProblemEntity[]>([]);

  const loading = ref(false);
  const loadingParticipants = ref(false);
  const loadingSubmissions = ref(false);
  const loadingProblems = ref(false);
  const error = ref<string | null>(null);

  // Computed - Calculate contest status
  const getContestStatus = (contest: ContestEntity): ContestStatus => {
    const now = new Date();
    const start = new Date(contest.start_time);
    const end = new Date(contest.end_time);

    if (contest.frozen_at) return 'frozen';
    if (now < start) return 'upcoming';
    if (now >= start && now <= end) return 'ongoing';
    return 'past';
  };

  // Computed - Contests with status
  const contestsWithStatus = computed(() => {
    return contests.value.map(contest => ({
      ...contest,
      status: getContestStatus(contest),
    }));
  });

  // Computed - Filter contests by status
  const getContestsByFilter = (filter: ContestFilter) => {
    if (filter === 'all') return contestsWithStatus.value;

    return contestsWithStatus.value.filter(contest => {
      if (filter === 'ongoing') return contest.status === 'ongoing' || contest.status === 'frozen';
      if (filter === 'past') return contest.status === 'past';
      if (filter === 'future') return contest.status === 'upcoming';
      return true;
    });
  };

  // Actions
  function setContests(data: ContestEntity[]) {
    contests.value = data;
  }

  function setCurrentContest(contest: ContestEntity | null) {
    currentContest.value = contest;
  }

  function addContest(contest: ContestEntity) {
    contests.value.push(contest);
  }

  function updateContest(code: string, updates: Partial<ContestEntity>) {
    const index = contests.value.findIndex(c => c.code === code);
    if (index !== -1) {
      contests.value[index] = { ...contests.value[index], ...updates };
    }

    // Update current contest if it matches
    if (currentContest.value?.code === code) {
      currentContest.value = { ...currentContest.value, ...updates };
    }
  }

  function removeContest(code: string) {
    contests.value = contests.value.filter(c => c.code !== code);
    if (currentContest.value?.code === code) {
      currentContest.value = null;
    }
  }

  function getContestByCode(code: string) {
    return contests.value.find(c => c.code === code);
  }

  // Participants actions
  function setParticipants(data: ParticipantEntity[]) {
    participants.value = data;
  }

  function updateParticipant(participantId: string, updates: Partial<ParticipantEntity>) {
    const index = participants.value.findIndex(p => p._id === participantId);
    if (index !== -1) {
      participants.value[index] = { ...participants.value[index], ...updates };
    }
  }

  function isUserMapped(username: string): ParticipantEntity | undefined {
    return participants.value.find(p => p.mapToUser === username);
  }

  // Submissions actions
  function setSubmissions(data: SubmissionEntity[]) {
    submissions.value = data;
  }

  // Problems actions
  function setProblems(data: ProblemEntity[]) {
    problems.value = data;
  }

  function clearContestData() {
    currentContest.value = null;
    participants.value = [];
    submissions.value = [];
    problems.value = [];
  }

  return {
    // State
    contests,
    currentContest,
    participants,
    submissions,
    problems,
    loading,
    loadingParticipants,
    loadingSubmissions,
    loadingProblems,
    error,

    // Computed
    contestsWithStatus,
    getContestsByFilter,
    getContestStatus,

    // Actions
    setContests,
    setCurrentContest,
    addContest,
    updateContest,
    removeContest,
    getContestByCode,
    setParticipants,
    updateParticipant,
    isUserMapped,
    setSubmissions,
    setProblems,
    clearContestData,
  };
});
