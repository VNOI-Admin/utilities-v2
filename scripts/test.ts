import { VNOJApi } from '@libs/api/vnoj';

async function test() {
  const vnojApi = new VNOJApi({
    baseURL: 'https://oj.vnoi.info',
  });
  vnojApi.setGlobalApiKey('vnoj-to-the-moon');

  const contestCode = 'vnoicup25_r1';

  // Fetch contest metadata
  const contestMetadata = await vnojApi.contest.getContestMetadata(contestCode);
  console.log('Contest Metadata:', contestMetadata);

  // Fetch problems
  const problems = await vnojApi.contest.getProblems(contestCode);
  console.log('Problems:', problems);

  // Fetch participants
  const participants = await vnojApi.contest.getParticipants(contestCode);
  console.log('Participants:', participants);

  // Fetch submissions since a specific timestamp
  const fromTimestamp = new Date(contestMetadata.start_time).toISOString();
  const submissions = await vnojApi.contest.getSubmissions(contestCode, {
    from_timestamp: fromTimestamp,
  });

  console.log('Submissions:', submissions);
}

test();
