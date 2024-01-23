'use client';

import React from 'react';

import OtherTeam from '../components/OtherTeam';
import type { Team } from '../types';

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

export default function Page() {
  return (
    <>
      <main className="flex max-h-[calc(100vh-80px)] min-h-[calc(100vh-80px)] justify-between">
        <div className="flex min-w-[300px] flex-col gap-4 p-3">
          <h4 className="text-center text-xl">Other NUS teams</h4>
          {data.map((team) => (
            <OtherTeam key={team.id} team={team} />
          ))}
        </div>
        <div className="w-full">
          <div className="aspect-video w-full">
            <video className="mb-4 aspect-video w-full" autoPlay id="video-background" muted>
              <source src="http://localhost:9090/video.ogg" type="video/ogg" />
            </video>
          </div>
          <h1 className="text-center text-4xl">Watching team NUS</h1>
        </div>
      </main>
    </>
  );
}
