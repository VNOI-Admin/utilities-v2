'use client';

import React from "react";
import Navbar from "./components/Navbar";
import OtherTeam from "./components/OtherTeam";
import Link from 'next/link';
import { Team } from "./types";
import { useDebounce } from "./hooks/useDebounce";
import HomePageTeam from "./components/HomePageTeam";

const data: Team[] = [
  {
    id: 1,
    name: 'NUS',
  },
  {
    id: 2,
    name: 'NUS 2',
  },
]

export default function Page(): JSX.Element {
  const [teamName, setTeamName] = React.useState<string>('');
  const debouncedTeamName = useDebounce(teamName, 300);
  return (
    <>
      <main className="min-h-[calc(100vh-80px)] max-h-[calc(100vh-80px)] px-4 py-4">
        <div className="mb-4">
          <input className="border border-blue-300" onChange={(e) => {
            setTeamName(e.target.value);
          }} placeholder="Filter by team name" />
        </div>
        <div className="flex gap-4">
          {
            data.map((team) => {
              if (debouncedTeamName.length > 0 && !team.name.toLowerCase().includes(debouncedTeamName.toLowerCase())) {
                return null;
              }
              return <HomePageTeam key={team.id} team={team} />
            })
          }
        </div>
      </main>
    </>
  );
}
