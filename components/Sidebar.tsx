'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Globe, ShoppingCart, Users, DollarSign, LogOut, User, Activity, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';

interface SidebarProps {
  adminEmail?: string;
}

export default function Sidebar({ adminEmail = 'admin@linkwatcher.io' }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    setIsNavigating(false);
    setIsCollapsed(true); // Close sidebar on mobile after navigation
  }, [pathname]);

  const handleNavigation = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (pathname !== href) {
      setIsNavigating(true);
    }
  };

  const handleLogout = async () => {
    setIsNavigating(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/activity', icon: Activity, label: "Today's Activity" },
    { href: '/users', icon: Users, label: 'Users' },
    { href: '/domains', icon: Globe, label: 'Domains' },
    { href: '/orders', icon: ShoppingCart, label: 'Orders' },
    { href: '/payouts', icon: DollarSign, label: 'Payouts' },
  ];

  return (
    <>
      {/* Loading Overlay */}
      {isNavigating && (
        <div className="fixed inset-0 bg-white bg-opacity-80 z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-sm text-gray-600 font-medium">Loading...</p>
          </div>
        </div>
      )}

      {/* Mobile Overlay */}
      {!isCollapsed && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsCollapsed(true)}
        />
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg border border-gray-200 hover:bg-gray-50 transition lg:hidden"
      >
        {isCollapsed ? <Menu className="w-5 h-5 text-gray-700" /> : <X className="w-5 h-5 text-gray-700" />}
      </button>

    <aside className={`w-64 bg-white border-r border-gray-100 h-screen flex flex-col fixed left-0 top-0 z-40 transition-transform duration-300 ${
      isCollapsed ? '-translate-x-full lg:translate-x-0' : 'translate-x-0'
    }`}>
      <div className="px-3 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">Super Admin</p>
            <p className="text-xs text-gray-500 truncate">{adminEmail}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={(e) => handleNavigation(e, item.href)}
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
    </>
  );
}
