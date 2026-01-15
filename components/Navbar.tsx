import React from 'react';
import { Zap, MapPin, User, Menu } from 'lucide-react';
import { INITIAL_USER_AVATAR } from '../constants';

interface NavbarProps {
  viewMode: 'driver' | 'host';
  setViewMode: (mode: 'driver' | 'host') => void;
}

const Navbar: React.FC<NavbarProps> = ({ viewMode, setViewMode }) => {
  return (
    <nav className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 shadow-sm z-50 relative">
      {/* Brand */}
      <div className="flex items-center gap-2">
        <div className="bg-emerald-500 p-1.5 rounded-lg text-white">
          <Zap size={20} fill="currentColor" />
        </div>
        <span className="text-xl font-bold tracking-tight text-slate-800 hidden sm:block">
          Snap<span className="text-emerald-600">Charge</span>
        </span>
      </div>

      {/* Mode Toggle */}
      <div className="flex bg-slate-100 p-1 rounded-full border border-slate-200">
        <button
          onClick={() => setViewMode('driver')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
            viewMode === 'driver'
              ? 'bg-white text-emerald-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Driver
        </button>
        <button
          onClick={() => setViewMode('host')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
            viewMode === 'host'
              ? 'bg-white text-emerald-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Host
        </button>
      </div>

      {/* User Actions */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center text-xs font-medium bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-100">
          <MapPin size={12} className="mr-1" />
          Pune
        </div>
        <button className="p-2 text-slate-500 hover:bg-slate-50 rounded-full sm:hidden">
          <Menu size={20} />
        </button>
        <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full overflow-hidden border-2 border-white shadow-sm ring-1 ring-slate-100 cursor-pointer">
          <img src={INITIAL_USER_AVATAR} alt="Profile" className="h-full w-full object-cover" />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;