import React from 'react';
import { Link, GraduationCap, LogOut, LayoutDashboard, Search, Key } from 'lucide-react';

const Navbar = ({ activeTab, setActiveTab, user, onLogout }) => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-xl border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => setActiveTab('lookup')}
        >
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
            <GraduationCap size={24} />
          </div>
          <span className="text-2xl font-bold tracking-tight text-slate-900 font-sans">
            Security Academy
          </span>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <button 
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all ${
                  activeTab === 'dashboard' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <LayoutDashboard size={18} />
                <span>Quản lý</span>
              </button>
              <button 
                onClick={onLogout}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-red-500 hover:bg-red-50 transition-all ml-2"
              >
                <LogOut size={18} />
                <span>Thoát</span>
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => setActiveTab('lookup')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all ${
                  activeTab === 'lookup' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Search size={18} />
                <span>Tra cứu</span>
              </button>
              <button 
                onClick={() => setActiveTab('login')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all ${
                  activeTab === 'login' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Key size={18} />
                <span>Admin</span>
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
