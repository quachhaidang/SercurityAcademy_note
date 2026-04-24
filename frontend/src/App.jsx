import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Lookup from './components/Lookup';
import Verifier from './components/Verifier';
import Sidebar from './components/Sidebar';
import TopNav from './components/TopNav';
import BlockchainExplorer from './components/BlockchainExplorer';

function App() {
  const [activeTab, setActiveTab] = useState('lookup');
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isLanding = activeTab === 'lookup' || activeTab === 'verifier' || activeTab === 'explorer';

  useEffect(() => {
    const token     = localStorage.getItem('uc_token');
    const role      = localStorage.getItem('uc_role');
    const username  = localStorage.getItem('uc_username');
    if (token) {
      setUser({ token, role, username });
      setActiveTab('dashboard');
    }
  }, []);

  const handleLoginSuccess = (data) => {
    localStorage.setItem('uc_token', data.token);
    localStorage.setItem('uc_role',  data.role);
    localStorage.setItem('uc_username', data.username);
    setUser({ token: data.token, role: data.role, username: data.username });
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    ['uc_token','uc_role','uc_username'].forEach(k => localStorage.removeItem(k));
    setUser(null);
    setActiveTab('lookup');
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {isLanding ? (
        <TopNav activeTab={activeTab} setActiveTab={setActiveTab} user={user} />
      ) : (
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => { setActiveTab(tab); setSidebarOpen(false); }}
          user={user}
          onLogout={handleLogout}
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
        />
      )}

      {/* Mobile Overlay */}
      {!isLanding && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className={`main-content flex-1 flex flex-col ${isLanding ? 'main-content-full' : ''}`} style={{ paddingTop: isLanding ? '4.5rem' : '4rem' }}>
        {/* ── Header ── (Only show when not on landing) */}
        {!isLanding && (
          <header className={`main-header ${isLanding ? 'hidden' : ''}`} style={{ left: isLanding ? '0' : '' }}>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg"
              >
                <Menu size={20} />
              </button>
              <div>
                <h1 className="text-sm font-bold text-slate-900">
                  {activeTab === 'login'     && 'Đăng nhập hệ thống'}
                  {activeTab === 'dashboard' && 'Bảng điều khiển quản trị'}
                </h1>
                <p className="text-xs text-slate-400 font-medium">
                  Security Academy Blockchain Ledger
                </p>
              </div>
            </div>

            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2.5 pl-3 pr-4 py-1.5 bg-white rounded-xl border border-slate-100 shadow-sm">
                  <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center text-white text-xs font-bold">
                    {user.username?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 leading-none">{user.username}</p>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">{user.role}</p>
                  </div>
                </div>
              </div>
            ) : null}
          </header>
        )}

        {/* ── Content ── */}
        <main className="flex-1 overflow-auto">
          {activeTab === 'lookup'                          && <Lookup />}
          {activeTab === 'verifier'                        && <Verifier />}
          {activeTab === 'explorer'                        && <BlockchainExplorer />}
          {activeTab === 'login'   && !user               && <Login onLoginSuccess={handleLoginSuccess} />}
          {activeTab === 'login'   && user                && <AlreadyLoggedIn setActiveTab={setActiveTab} />}
          {activeTab === 'dashboard' && user              && <Dashboard userToken={user.token} userRole={user.role} />}
        </main>
      </div>
    </div>
  );
}

function AlreadyLoggedIn({ setActiveTab }) {
  return (
    <div className="page-container flex items-center justify-center py-24">
      <div className="card p-12 text-center max-w-sm">
        <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Đã đăng nhập</h2>
        <p className="text-slate-500 text-sm mb-6">Phiên làm việc của bạn đang hoạt động.</p>
        <button onClick={() => setActiveTab('dashboard')} className="btn-md btn-primary w-full">
          Vào Dashboard
        </button>
      </div>
    </div>
  );
}

export default App;
