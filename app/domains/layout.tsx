import { redirect } from 'next/navigation';
import { checkAuth, getAdminEmail } from '@/lib/auth';
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

  const adminEmail = await getAdminEmail();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar adminEmail={adminEmail} />
      <main className="flex-1 p-8 md:ml-64 overflow-auto">
        {children}
      </main>
    </div>
  );
}
