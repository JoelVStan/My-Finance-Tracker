import React from 'react';
import { MobileTab } from '../types';
import { Home, PlusCircle, PieChart, History } from 'lucide-react';

interface MobileNavProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'home' as MobileTab, label: 'Home', icon: Home },
    { id: 'add' as MobileTab, label: 'Add New', icon: PlusCircle },
    { id: 'analysis' as MobileTab, label: 'Analysis', icon: PieChart },
    { id: 'history' as MobileTab, label: 'History', icon: History },
  ];

  return (
    <nav
      id="mobile-sticky-bottom-nav"
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-neutral-950/95 backdrop-blur-md border-t border-neutral-800 pb-safe"
    >
      <div className="grid grid-cols-4 h-16 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              id={`nav-btn-${tab.id}`}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center gap-1 transition-colors relative ${
                isActive ? 'text-emerald-400' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <div
                className={`relative flex items-center justify-center ${
                  isActive ? 'scale-110 transition-transform' : ''
                }`}
              >
                <Icon className="w-5 h-5" />
                {isActive && (
                  <span className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-emerald-400" />
                )}
              </div>
              <span className="text-[11px] font-medium tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
