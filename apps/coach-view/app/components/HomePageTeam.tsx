import Link from 'next/link';

import type { Team } from '../types';

interface HomePageTeamProps {
  team: Team;
}

export default function HomePageTeam({ team }: HomePageTeamProps): JSX.Element {
  return (
    <Link href="view">
      <img src="https://placeholder.co/300" />
      <p>{team.name}</p>
    </Link>
  );
}
