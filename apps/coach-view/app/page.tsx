'use client';

import HomePage from "./components/HomePage";
import Login from "./components/Login";
import { useUser } from "./hooks/useUser";

export default function Page(): JSX.Element {
  const { user } = useUser();
  console.log(user);
  
  return (
    <>
      <main className="min-h-[calc(100vh-80px)] h-[calc(100vh-80px)] px-4 py-4">
        {
          Object.keys(user).length ? <HomePage /> : <Login />
        }
      </main>
    </>
  );
}
