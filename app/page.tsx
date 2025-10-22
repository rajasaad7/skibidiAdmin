import { redirect } from 'next/navigation';
import { checkAuth } from '@/lib/auth';

export default async function Home() {
  const isAuthenticated = await checkAuth();

  if (!isAuthenticated) {
    redirect('/login');
  }

  redirect('/dashboard');
}
