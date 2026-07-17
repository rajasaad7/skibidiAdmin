import { redirect } from 'next/navigation';
import { checkAuth, getAdminEmail, getUserRole } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';

export default async function MarketplaceProLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAuthenticated = await checkAuth();
  if (!isAuthenticated) {
    redirect('/login');
  }

  const userRole = await getUserRole();
  // Marketplace Pro management is super-admin only.
  if (userRole !== 'super_admin') {
    redirect('/domains');
  }

  const adminEmail = await getAdminEmail();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar adminEmail={adminEmail} userRole={userRole} />
      <main className="flex-1 p-8 md:ml-64 overflow-auto">
        {children}
      </main>
    </div>
  );
}
