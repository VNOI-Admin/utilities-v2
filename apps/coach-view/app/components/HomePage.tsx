'use client';
import { useEffect, useState } from 'react';

import { useDebounce } from '../hooks/useDebounce';
import HomePageTeam from './HomePageTeam';
import { get } from '../api/api';

export default function HomePage() {
  const [teamName, setTeamName] = useState('');
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const debouncedTeamName = useDebounce(teamName, 300);
  
  useEffect(() => {
    const getUsers = async () => {
      try {
        const res = await get('/user');
        console.log(res);
        setUsers(res);
      } catch (e) {
        console.log(e); 
        setError(e.message);
      }
    }
    getUsers();
  }, []);

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
      {
        !!error && <p>{ error }</p>
      }
      <div className="flex gap-4">
        {users.map((team, i) => {
          if (
            debouncedTeamName.length > 0 &&
            !team.username.toLowerCase().includes(debouncedTeamName.toLowerCase())
          ) {
            return null;
          }
          return <HomePageTeam key={i} team={team} />;
        })}
      </div>
    </>
  );
}
