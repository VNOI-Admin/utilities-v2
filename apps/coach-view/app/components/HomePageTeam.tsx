import Link from 'next/link';

import type { Team } from '../types';

interface HomePageTeamProps {
  team: Team;
}

export default function HomePageTeam({ team }: HomePageTeamProps): JSX.Element {
  return (
    <table>
      <Link href="view">
        <p>{team.username}</p>
      </Link>
    </table>
  );
}
