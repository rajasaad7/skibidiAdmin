'use client';

import { useState } from 'react';
import { Monitor, ShoppingCart } from 'lucide-react';

export default function DashboardViewToggle({
  onViewChange
}: {
  onViewChange: (view: 'monitoring' | 'marketplace') => void
}) {
  const [view, setView] = useState<'monitoring' | 'marketplace'>('monitoring');

  const handleToggle = (newView: 'monitoring' | 'marketplace') => {
    setView(newView);
    onViewChange(newView);
  };

  return (
    <div className="inline-flex items-center bg-gray-100 rounded-lg p-1">
      <button
        onClick={() => handleToggle('monitoring')}
        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${
          view === 'monitoring'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <Monitor className="w-4 h-4" />
        Monitoring
      </button>
      <button
        onClick={() => handleToggle('marketplace')}
        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${
          view === 'marketplace'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <ShoppingCart className="w-4 h-4" />
        Marketplace
      </button>
    </div>
  );
}
