import Link from "next/link";
import { Team } from "../types";

interface OtherTeamProps {
    team: Team;
}

export default function OtherTeam({ team }: OtherTeamProps): JSX.Element {
    return <Link href='view' className="flex items-start gap-2">
        <img src="https://placeholder.co/100" />
        <p>{team.name}</p>
    </Link>;
}