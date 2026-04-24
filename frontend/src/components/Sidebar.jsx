import React from 'react';
import { 
  ShieldCheck, Search, LayoutDashboard, LogOut, 
  Users, BookOpen, Scroll, Lock, Blocks, ScanLine, X
} from 'lucide-react';

const NAV = [
  { id: 'lookup',    label: 'Tra cứu công khai', icon: Search,         public: true  },
  { id: 'verifier',  label: 'Xác thực JSON',      icon: ScanLine,       public: true  },
  { id: 'explorer',  label: 'Blockchain Explorer', icon: Blocks,         public: true  },
  { id: 'login',     label: 'Đăng nhập',           icon: Lock,           public: true  },
  { id: 'dashboard', label: 'Quản trị',            icon: LayoutDashboard, public: false },
];

export default function Sidebar({ activeTab, setActiveTab, user, onLogout, isOpen, setIsOpen }) {
  return (
    <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
      {/* ── Brand ── */}
      <div className="px-5 py-6 border-b border-slate-100 flex items-center justify-between">
        <button
          onClick={() => setActiveTab('lookup')}
          className="flex items-center gap-3 group"
        >
          <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center shadow-md shadow-brand-500/30 group-hover:scale-105 transition-transform">
            <ShieldCheck size={20} className="text-white" />
          </div>
          <div className="text-left">
            <div className="text-sm font-bold text-slate-900 tracking-tight">Security Academy</div>
            <div className="text-[10px] text-slate-400 font-semibold">Academic Ledger</div>
          </div>
        </button>

        <button 
          onClick={() => setIsOpen(false)}
          className="lg:hidden p-2 text-slate-400 hover:bg-slate-100 rounded-lg"
        >
          <X size={20} />
        </button>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-thin">
        <p className="px-3 pt-1 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Menu</p>

        {NAV.map(item => {
          if (!item.public && !user) return null;
          if (item.id === 'login' && user) return null;

          const active = activeTab === item.id;
          const Icon   = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`nav-item w-full ${active ? 'nav-item-active' : ''}`}
            >
              <Icon size={18} className={active ? 'text-brand-600' : ''} />
              <span>{item.label}</span>
              {active && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-600" />
              )}
            </button>
          );
        })}

        {/* ── Admin sub-items when on dashboard ── */}
        {user && activeTab === 'dashboard' && (
          <>
            <div className="pt-4 pb-2 px-3">
              <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Phân hệ</p>
            </div>
            {[
              { id: 'students', icon: Users,     label: 'Sinh viên' },
              { id: 'grades',   icon: BookOpen,  label: 'Điểm số'   },
              { id: 'certs',    icon: Scroll,    label: 'Chứng chỉ' },
            ].map(sub => (
              <div key={sub.id} className="flex items-center gap-3 px-3 py-2 text-xs text-slate-400 font-medium">
                <sub.icon size={14} />
                <span>{sub.label}</span>
              </div>
            ))}
          </>
        )}
      </nav>

      {/* ── User + Logout ── */}
      {user && (
        <div className="px-3 py-4 border-t border-slate-100 space-y-1">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 mb-1">
            <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {user.username?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">{user.username}</p>
              <p className="text-[10px] text-slate-400 font-semibold uppercase">{user.role}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="nav-item w-full text-red-400 hover:text-red-600 hover:bg-red-50"
          >
            <LogOut size={16} />
            <span>Đăng xuất</span>
          </button>
        </div>
      )}
    </aside>
  );
}
