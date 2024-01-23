import type { Metadata } from 'next';

import { Form } from './Form';

export const metadata: Metadata = {
  title: 'Login',
};

export default function Page() {
  return (
    <section className="flex h-[50%] items-center justify-center">
      <div className="rounded-md bg-gray-100 p-8">
        <Form />
      </div>
    </section>
  );
}
