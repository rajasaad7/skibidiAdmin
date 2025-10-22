'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Globe, ShoppingCart, Users, DollarSign, LogOut } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/users', icon: Users, label: 'Users' },
    { href: '/domains', icon: Globe, label: 'Domains' },
    { href: '/orders', icon: ShoppingCart, label: 'Orders' },
    { href: '/payouts', icon: DollarSign, label: 'Payouts' },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-100 min-h-screen flex flex-col">
      <div className="px-6 py-5 border-b border-gray-100">
        <h1 className="text-base font-semibold text-gray-900">Super Admin</h1>
        <p className="text-xs text-gray-500 mt-0.5">LinkWatcher Panel</p>
      </div>

      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition text-sm ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-[18px] h-[18px]" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="px-3 py-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition w-full text-sm"
        >
          <LogOut className="w-[18px] h-[18px]" />
          Logout
        </button>
      </div>
    </aside>
  );
}
