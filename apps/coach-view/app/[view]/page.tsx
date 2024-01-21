'use client';

import React from "react";
import OtherTeam from "../components/OtherTeam";
import { Team } from "../types";

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
    const [isLoaded, setIsLoaded] = React.useState<boolean>(false);
  return (
    <>
      <main className="flex justify-between min-h-[calc(100vh-80px)] max-h-[calc(100vh-80px)]">
        <div className="min-w-[300px] flex flex-col gap-4 p-3">
          <h4 className="text-xl text-center">Other NUS teams</h4>
          {
            data.map((team) => <OtherTeam key={team.id} team={team} />)
          }
        </div>
        <div className="w-full">
          <div className="w-full aspect-video">
            <video className="w-full aspect-video mb-4" autoPlay id="video-background" muted>
                <source src="http://localhost:9090/video.ogg" type="video/ogg" />
            </video>
          </div>
          <h1 className="text-4xl text-center">Watching team NUS</h1>
        </div>
      </main>
    </>
  );
}