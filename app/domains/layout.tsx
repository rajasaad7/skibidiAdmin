import { redirect } from 'next/navigation';
import { checkAuth } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';

export default async function DomainsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAuthenticated = await checkAuth();

  if (!isAuthenticated) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}
