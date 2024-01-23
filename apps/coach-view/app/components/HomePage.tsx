'use client';
import { useState } from 'react';

import { useDebounce } from '../hooks/useDebounce';
import type { Team } from '../types';
import HomePageTeam from './HomePageTeam';

const data: Team[] = [
  {
    id: 1,
    name: 'NUS',
  },
  {
    id: 2,
    name: 'NUS 2',
  },
];

export default function HomePage() {
  const [teamName, setTeamName] = useState('');
  const debouncedTeamName = useDebounce(teamName, 300);
  return (
    <>
      <div className="mb-4">
        <input
          className="border border-blue-300"
          onChange={(e) => {
            setTeamName(e.target.value);
          }}
          placeholder="Filter by team name"
        />
      </div>
      <div className="flex gap-4">
        {data.map((team) => {
          if (
            debouncedTeamName.length > 0 &&
            !team.name.toLowerCase().includes(debouncedTeamName.toLowerCase())
          ) {
            return null;
          }
          return <HomePageTeam key={team.id} team={team} />;
        })}
      </div>
    </>
  );
}
