import React, { useState, useEffect } from 'react';
import { Shield, Search, Lock, LogIn, Menu, X } from 'lucide-react';

export default function TopNav({ activeTab, setActiveTab, user }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Trang chủ', id: 'lookup' },
    { label: 'Xác thực JSON', id: 'verifier' },
    { label: '🔗 Blockchain Explorer', id: 'explorer' },
    { label: 'Công nghệ', id: 'tech' },
  ];

  return (
    <nav className={`landing-nav ${scrolled ? 'landing-nav-scrolled' : ''}`}>
      <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('lookup')}>
        <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-200">
          <Shield size={35} className="text-white" />
        </div>
        <div>
          <h1 className="text-lg font-extrabold text-slate-900 leading-none">Security Academy</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Blockchain Ledger</p>
        </div>
      </div>

      {/* Desktop Links */}
      <div className="hidden md:flex items-center gap-8">
        {navLinks.map(link => (
          <button
            key={link.id}
            onClick={() => {
              if (['lookup', 'verifier', 'explorer'].includes(link.id)) setActiveTab(link.id);
              else {
                  const el = document.getElementById(link.id);
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="text-sm font-bold text-slate-600 hover:text-brand-600 transition-colors"
          >
            {link.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        {user ? (
          <button
            onClick={() => setActiveTab('dashboard')}
            className="btn-md btn-primary"
          >
            Vào Dashboard
          </button>
        ) : (
          <button
            onClick={() => setActiveTab('login')}
            className="btn-md btn-primary px-6"
          >
            <LogIn size={16} /> Đăng nhập
          </button>
        )}
        
        <button 
          className="md:hidden p-2 text-slate-600"
          onClick={() => setMobileMenu(!mobileMenu)}
        >
          {mobileMenu ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenu && (
        <div className="absolute top-full left-0 right-0 bg-white border-b border-slate-100 p-4 md:hidden shadow-xl animate-in slide-in-from-top duration-300">
          <div className="flex flex-col gap-4">
            {navLinks.map(link => (
              <button
                key={link.id}
                onClick={() => {
                  if (link.id === 'lookup') setActiveTab('lookup');
                  else if (link.id === 'verifier') setActiveTab('verifier');
                  else {
                      setTimeout(() => {
                        document.getElementById(link.id)?.scrollIntoView({ behavior: 'smooth' });
                      }, 100);
                  }
                  setMobileMenu(false);
                }}
                className="text-left font-bold text-slate-700 p-2"
              >
                {link.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
