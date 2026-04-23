import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database, CheckCircle, XCircle, RefreshCw, Loader2,
  Hash, Clock, Shield, AlertTriangle, Activity, BarChart3, Blocks
} from 'lucide-react';

const API = 'http://localhost:3000';

export default function BlockchainExplorer() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [filter, setFilter]   = useState('all'); // all | active | revoked

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
    if (filter === 'active')  return l.status === 'Active';
    if (filter === 'revoked') return l.status === 'Revoked';
    return true;
  }) || [];

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', padding: '2rem' }}>
      {/* Header */}
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '3rem', height: '3rem', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(99,102,241,0.4)' }}>
              <Blocks size={20} color="white" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f1f5f9', margin: 0 }}>Blockchain Explorer</h1>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0, marginTop: '2px' }}>Security Academy — Immutable Ledger Network</p>
            </div>
          </div>
          <button onClick={fetchExplorer} disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Làm mới
          </button>
        </div>

        {/* Stats Cards */}
        {data?.stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem', marginBottom: '2rem' }}>
            <StatCard icon={<Database size={20} />} label="Tổng Hash trên chuỗi" value={data.stats.totalHashes} color="#6366f1" glow="rgba(99,102,241,0.3)" />
            <StatCard icon={<Shield size={20} />} label="Bản ghi đang hoạt động" value={data.stats.activeCount} color="#10b981" glow="rgba(16,185,129,0.3)" />
            <StatCard icon={<AlertTriangle size={20} />} label="Đã thu hồi (Revoked)" value={data.stats.revokedCount} color="#f59e0b" glow="rgba(245,158,11,0.3)" />
          </div>
        )}

        {/* Live Network Status */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '1rem', padding: '1rem 1.25rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 8px #10b981', animation: 'pulse 2s infinite' }} />
            <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 700 }}>NETWORK ONLINE</span>
          </div>
          <span style={{ color: '#334155', fontSize: '0.75rem' }}>|</span>
          <span style={{ color: '#64748b', fontSize: '0.75rem' }}><Activity size={12} style={{ display: 'inline', marginRight: '4px' }} />SHA-256 Hash Chain</span>
          <span style={{ color: '#334155', fontSize: '0.75rem' }}>|</span>
          <span style={{ color: '#64748b', fontSize: '0.75rem' }}><BarChart3 size={12} style={{ display: 'inline', marginRight: '4px' }} />RSA-2048 Signature</span>
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          {[{ id: 'all', label: 'Tất cả' }, { id: 'active', label: '🟢 Active' }, { id: 'revoked', label: '🔴 Revoked' }].map(t => (
            <button key={t.id} onClick={() => setFilter(t.id)}
              style={{ padding: '0.375rem 1rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                background: filter === t.id ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.05)',
                color: filter === t.id ? '#a5b4fc' : '#64748b' }}>
              {t.label}
            </button>
          ))}
          <span style={{ marginLeft: 'auto', color: '#475569', fontSize: '0.75rem', alignSelf: 'center' }}>{filteredLogs.length} bản ghi</span>
        </div>

        {/* Hash Chain List */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '1rem', overflow: 'hidden' }}>
          {/* Table Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '2rem 1fr 1.5fr auto auto', gap: '1rem', padding: '0.75rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.03)' }}>
            <span style={{ color: '#475569', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase' }}>#</span>
            <span style={{ color: '#475569', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase' }}>Transaction Hash (SHA-256)</span>
            <span style={{ color: '#475569', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase' }}>Nội dung bản ghi</span>
            <span style={{ color: '#475569', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase' }}>Trạng thái</span>
            <span style={{ color: '#475569', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase' }}>Timestamp</span>
          </div>

          {loading ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: '#475569' }}>
              <Loader2 size={32} style={{ margin: '0 auto 1rem', display: 'block', animation: 'spin 1s linear infinite' }} />
              <p style={{ fontSize: '0.875rem' }}>Đang đọc dữ liệu từ Blockchain Node...</p>
            </div>
          ) : error ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: '#f87171' }}>
              <XCircle size={32} style={{ margin: '0 auto 1rem', display: 'block' }} />
              <p style={{ fontSize: '0.875rem' }}>{error}</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: '#475569' }}>
              <Database size={32} style={{ margin: '0 auto 1rem', display: 'block' }} />
              <p style={{ fontSize: '0.875rem' }}>Chưa có giao dịch nào trên Blockchain</p>
            </div>
          ) : (
            <AnimatePresence>
              {filteredLogs.map((log, idx) => (
                  <motion.div key={log.id}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.01 }}
                    style={{ display: 'grid', gridTemplateColumns: '2rem 1fr 1.5fr auto auto', gap: '1rem', padding: '0.875rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'center',
                      background: log.status === 'Revoked' ? 'rgba(239,68,68,0.04)' : 'transparent',
                      transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = log.status === 'Revoked' ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = log.status === 'Revoked' ? 'rgba(239,68,68,0.04)' : 'transparent'}
                  >
                    {/* Block number */}
                    <span style={{ color: '#334155', fontSize: '0.6875rem', fontWeight: 700 }}>#{log.id}</span>
  
                    {/* Hash */}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Hash size={12} color="#6366f1" />
                        <code style={{ fontSize: '0.6875rem', color: '#94a3b8', fontFamily: 'monospace', letterSpacing: '0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {log.data_hash}
                        </code>
                      </div>
                      {log.status === 'Revoked' && (
                        <p style={{ fontSize: '0.625rem', color: '#f87171', marginTop: '2px', marginLeft: '1.2rem' }}>
                          ⚠ Thu hồi bởi {log.revoked_by}: {log.revoke_reason}
                        </p>
                      )}
                    </div>

                    {/* Record Details */}
                    <div>
                      {log.record_type !== 'System' ? (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                             <span style={{ 
                               fontSize: '0.625rem', 
                               fontWeight: 800, 
                               padding: '2px 6px', 
                               borderRadius: '4px',
                               background: log.record_type === 'Grade' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(236, 72, 153, 0.1)',
                               color: log.record_type === 'Grade' ? '#c084fc' : '#f472b6',
                               textTransform: 'uppercase'
                             }}>
                               {log.record_type}
                             </span>
                             <span style={{ fontSize: '0.75rem', color: '#f1f5f9', fontWeight: 600 }}>{log.record_name}</span>
                          </div>
                          <p style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '2px' }}>
                            {log.student_name} ({log.student_id})
                          </p>
                        </>
                      ) : (
                        <span style={{ fontSize: '0.6875rem', color: '#475569', fontStyle: 'italic' }}>Dữ liệu hệ thống</span>
                      )}
                    </div>
  
                    {/* Status Badge */}
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                      padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.6875rem', fontWeight: 700,
                      background: log.status === 'Active' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                      color: log.status === 'Active' ? '#34d399' : '#f87171',
                      border: `1px solid ${log.status === 'Active' ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'}`
                    }}>
                      {log.status === 'Active' ? <CheckCircle size={10} /> : <XCircle size={10} />}
                      {log.status}
                    </span>
  
                    {/* Timestamp */}
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#475569', fontSize: '0.6875rem', whiteSpace: 'nowrap' }}>
                      <Clock size={10} />
                      {new Date(log.timestamp).toLocaleString('vi-VN')}
                    </span>
                  </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Footer note */}
        <p style={{ textAlign: 'center', color: '#334155', fontSize: '0.6875rem', marginTop: '1.5rem' }}>
          Security Academy Blockchain Ledger • SHA-256 Immutable Hash Chain • RSA-2048 Digital Signature
        </p>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, glow }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '1rem', padding: '1.25rem', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '-1rem', right: '-1rem', width: '5rem', height: '5rem', borderRadius: '50%', background: glow, filter: 'blur(20px)', opacity: 0.6 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div style={{ color, background: `${color}20`, padding: '0.5rem', borderRadius: '0.625rem' }}>{icon}</div>
        <span style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      </div>
      <p style={{ fontSize: '2rem', fontWeight: 800, color: '#f1f5f9', margin: 0, fontVariantNumeric: 'tabular-nums' }}>{value}</p>
    </div>
  );
}
