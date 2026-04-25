import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database, CheckCircle, XCircle, RefreshCw, Loader2,
  Hash, Clock, Shield, AlertTriangle, Activity, BarChart3, Blocks,
  ChevronRight, ExternalLink, Box, Fingerprint, Search, X
} from 'lucide-react';
import API_URL from '../config';

const API = API_URL;

export default function BlockchainExplorer() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [filter, setFilter]   = useState('all'); 
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchExplorer = async () => {
    setLoading(true); setError(null);
    try {
      const res = await axios.get(`${API}/api/public/explorer`);
      setData(res.data);
    } catch {
      setError('Không thể kết nối đến Blockchain Node');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchExplorer(); }, []);

  const filteredLogs = data?.logs?.filter(l => {
    const matchesFilter = filter === 'active' ? l.status === 'Active' : (filter === 'revoked' ? l.status === 'Revoked' : true);
    const matchesSearch = searchQuery === '' || 
                          l.data_hash?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          l.student_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          l.student_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  }) || [];

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-slate-300 p-4 md:p-8 font-sans selection:bg-brand-500/30">
      <div className="max-w-7xl mx-auto">
        
        {/* ── Header ── */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-brand-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-brand-500/20 rotate-3">
              <Blocks size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Blockchain Explorer</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Mainnet Live Node</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-400 transition-colors" size={16} />
                <input 
                  type="text" 
                  placeholder="Tìm hash, MSSV..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-900/50 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-brand-500/50 focus:ring-4 focus:ring-brand-500/5 transition-all w-full md:w-64"
                />
             </div>
             <button onClick={fetchExplorer} disabled={loading}
              className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition-all text-slate-400 disabled:opacity-50">
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </header>

        {/* ── Stats ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <StatCard icon={<Database size={20} />} label="Total Records" value={data?.stats?.totalHashes || 0} color="text-brand-400" bg="bg-brand-500/5" />
          <StatCard icon={<Shield size={20} />} label="Verified" value={data?.stats?.activeCount || 0} color="text-emerald-400" bg="bg-emerald-500/5" />
          <StatCard icon={<AlertTriangle size={20} />} label="Revoked" value={data?.stats?.revokedCount || 0} color="text-amber-400" bg="bg-amber-500/5" />
          <StatCard icon={<Activity size={20} />} label="TPS" value="0.87" color="text-indigo-400" bg="bg-indigo-500/5" />
        </div>

        {/* ── Filter Tabs ── */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
           <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-800">
              {[
                { id: 'all', label: 'Tất cả' },
                { id: 'active', label: 'Hoạt động' },
                { id: 'revoked', label: 'Thu hồi' }
              ].map(t => (
                <button 
                  key={t.id} 
                  onClick={() => setFilter(t.id)}
                  className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${filter === t.id ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {t.label}
                </button>
              ))}
           </div>
           <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
              Found {filteredLogs.length} blocks
           </p>
        </div>

        {/* ── Desktop Table ── */}
        <div className="hidden lg:block bg-slate-900/30 border border-slate-800/50 rounded-2xl overflow-hidden backdrop-blur-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/50 text-[10px] uppercase font-black tracking-[0.15em] text-slate-500 border-b border-slate-800">
                <th className="px-6 py-4">Block</th>
                <th className="px-6 py-4">Hash ID</th>
                <th className="px-6 py-4">Record Name</th>
                <th className="px-6 py-4">Owner</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Age</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr><td colSpan={6} className="py-20 text-center"><Loader2 size={32} className="animate-spin mx-auto text-brand-500" /></td></tr>
              ) : filteredLogs.map((log, idx) => (
                <tr 
                  key={log.id} 
                  onClick={() => setSelectedBlock(log)}
                  className="group hover:bg-white/10 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-5">
                    <span className="text-sm font-mono text-brand-400">#{log.id}</span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <Fingerprint size={14} className="text-slate-600" />
                      <code className="text-[11px] text-slate-400 group-hover:text-brand-300 transition-colors">
                        {log.data_hash?.substring(0, 8)}...{log.data_hash?.substring(log.data_hash.length - 8)}
                      </code>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                       <div className={`w-1.5 h-1.5 rounded-full ${log.record_type === 'Grade' ? 'bg-indigo-500' : 'bg-pink-500'}`} />
                       <span className="text-sm font-bold text-slate-200">{log.record_name || 'System Record'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-xs text-slate-500">{log.student_name || 'N/A'}</span>
                  </td>
                  <td className="px-6 py-5">
                    <StatusBadge status={log.status} />
                  </td>
                  <td className="px-6 py-5 text-right">
                    <span className="text-[11px] text-slate-600 font-medium">
                      {formatTime(log.timestamp)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Mobile Card View ── */}
        <div className="lg:hidden space-y-4">
          {loading ? (
             <div className="py-20 text-center"><Loader2 size={32} className="animate-spin mx-auto text-brand-500" /></div>
          ) : filteredLogs.map(log => (
            <div 
              key={log.id} 
              onClick={() => setSelectedBlock(log)}
              className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl active:scale-[0.98] transition-transform"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-brand-500/10 rounded-lg flex items-center justify-center text-brand-400 font-mono text-xs">
                    #{log.id}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{log.record_name || 'System'}</h4>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">{log.record_type}</p>
                  </div>
                </div>
                <StatusBadge status={log.status} />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">Hash ID</span>
                  <code className="text-brand-300">{log.data_hash?.substring(0, 10)}...</code>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">Owner</span>
                  <span className="text-slate-300">{log.student_name || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">Time</span>
                  <span className="text-slate-600">{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Detail Modal ── */}
        <AnimatePresence>
          {selectedBlock && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setSelectedBlock(null)}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-[#111827] border border-slate-800 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl"
              >
                <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                   <div className="flex items-center gap-3">
                      <Box className="text-brand-500" size={20} />
                      <h3 className="font-bold text-white">Chi tiết khối #{selectedBlock.id}</h3>
                   </div>
                   <button onClick={() => setSelectedBlock(null)} className="p-2 hover:bg-slate-800 rounded-xl transition-colors">
                      <X size={20} className="text-slate-500" />
                   </button>
                </div>
                
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                  <DetailItem label="Transaction Hash" value={selectedBlock.data_hash} isCopyable />
                  <div className="grid grid-cols-2 gap-6">
                    <DetailItem label="Loại bản ghi" value={selectedBlock.record_type} />
                    <DetailItem label="Trạng thái" value={selectedBlock.status} isStatus />
                  </div>
                  <DetailItem label="Đối tượng" value={`${selectedBlock.student_name || 'N/A'} (${selectedBlock.student_id || 'N/A'})`} />
                  <DetailItem label="Nội dung" value={selectedBlock.record_name} />
                  <DetailItem label="Thời gian ký" value={new Date(selectedBlock.timestamp).toLocaleString('vi-VN')} />
                  
                  <div className="pt-4">
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-3">Blockchain Metadata</p>
                    <div className="bg-black/40 rounded-2xl p-4 border border-slate-800 font-mono text-[11px] text-emerald-500/80 leading-relaxed whitespace-pre-wrap break-all">
                      {JSON.stringify(selectedBlock, null, 2)}
                    </div>
                  </div>
                </div>
                
                <div className="p-6 bg-slate-900/50 border-t border-slate-800 flex justify-end">
                   <button onClick={() => setSelectedBlock(null)} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-bold transition-all">
                      Đóng
                   </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, bg }) {
  return (
    <div className={`p-5 rounded-2xl border border-slate-800/50 bg-slate-900/30 ${bg} backdrop-blur-sm`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`${color} opacity-80`}>{icon}</div>
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const isActive = status === 'Active';
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
      <span className={`w-1 h-1 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-amber-500'}`} />
      {status}
    </span>
  );
}

function DetailItem({ label, value, isCopyable, isStatus }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{label}</p>
      <div className="flex items-center gap-2 group">
        <p className={`text-sm font-bold ${isStatus ? (value === 'Active' ? 'text-emerald-500' : 'text-amber-500') : 'text-slate-200'} break-all`}>
          {value}
        </p>
        {isCopyable && (
          <button 
            onClick={() => navigator.clipboard.writeText(value)}
            className="p-1.5 text-slate-600 hover:text-brand-400 hover:bg-brand-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
          >
            <ExternalLink size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

function formatTime(timestamp) {
  const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(timestamp).toLocaleDateString();
}
