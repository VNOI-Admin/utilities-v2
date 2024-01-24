'use client';
import Link from 'next/link';
import { useFormState } from 'react-dom';
import { logout } from '../logout/action';

export default function Navbar({ user }): JSX.Element {
  
  const onSubmit = () => {
    logout();
  }

  return (
    <header className="grid grid-cols-3 items-center bg-white px-8 py-4 shadow">
      <div className="flex items-center gap-2">
        <h3 className="text-xl font-bold text-gray-900">
          <Link href="/">Vietnam Contest System</Link>
        </h3>
      </div>
      <h1 className="mx-auto text-center text-3xl">Coach view</h1>
      {
        !!user &&
        <div className="justify-self-end">
          Logged in as admin
          <button onClick={onSubmit} className='p-2 bg-red-300 rounded-md'>Logout</button>
        </div>
      }
    </header>
  );
}
