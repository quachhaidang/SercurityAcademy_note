import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, AlertTriangle, Shield, CheckCircle2, 
  Loader2, Info, ChevronRight, Calculator, BookOpen, 
  Trash2, Ban
} from 'lucide-react';

/**
 * GradeTable Component
 * Handles displaying and editing grades in a unified way.
 * 
 * @param {Array} grades - Array of grade objects
 * @param {Boolean} isEditable - Whether to show input fields
 * @param {Function} onSave - Callback when saving a grade (only in Editable mode)
 * @param {String} savingId - ID of student being saved
 * @param {Boolean} isPublicView - If true, optimized for public lookup
 */
export default function GradeTable({ 
  grades = [], 
  isEditable = false, 
  onSave = () => {}, 
  savingId = null,
  isPublicView = false,
  studentInfo = null // Optional {student_id, name, class_name}
}) {
  const [activeTab, setActiveTab] = useState('summary');
  const [localEdits, setLocalEdits] = useState({});

  // Group grades by semester
  const grouped = useMemo(() => {
    return (grades || []).reduce((acc, g) => {
      const sem = g?.semester || 'Khác';
      if (!acc[sem]) acc[sem] = [];
      acc[sem].push(g);
      return acc;
    }, {});
  }, [grades]);

  const semesters = useMemo(() => Object.keys(grouped).sort(), [grouped]);

  // GPA Calculation Logic
  const calculateGPA = (studentGrades) => {
    if (!studentGrades || studentGrades.length === 0) return 0;
    const totalScore = (studentGrades || []).reduce((sum, g) => sum + parseFloat(g?.score || g?.tb || 0), 0);
    return (totalScore / studentGrades.length).toFixed(2);
  };

  const summaryData = useMemo(() => {
    return semesters.map(sem => {
      const items = grouped[sem];
      return {
        sem,
        count: items.length,
        avg: calculateGPA(items)
      };
    });
  }, [semesters, grouped]);

  const totalAvg = useMemo(() => {
    if (summaryData.length === 0) return 0;
    const sum = summaryData.reduce((acc, s) => acc + parseFloat(s.avg), 0);
    return (sum / summaryData.length).toFixed(2);
  }, [summaryData]);

  const handleInputChange = (gradeId, field, value) => {
    setLocalEdits(prev => ({
      ...prev,
      [gradeId]: {
        ...(prev[gradeId] || {}),
        [field]: value
      }
    }));
  };

  if (grades.length === 0) {
    return (
      <div className="card p-12 text-center border-dashed border-2 border-slate-100 bg-slate-50/50">
        <BookOpen size={40} className="text-slate-200 mx-auto mb-4" />
        <p className="text-slate-400 font-medium italic">Chưa có dữ liệu điểm số nào được ghi nhận.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Summary Stats (Public View Only) ── */}
      {isPublicView && activeTab === 'summary' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="card p-6 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-xl shadow-indigo-200"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-white/20 rounded-lg"><Calculator size={20} /></div>
              <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded-full">TỔNG KẾT</span>
            </div>
            <p className="text-indigo-100 text-xs font-bold uppercase tracking-wider mb-1">GPA Toàn khóa</p>
            <h4 className="text-3xl font-black">{totalAvg}</h4>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="card p-6 border-slate-200"
          >
            <div className="flex justify-between items-start mb-4 text-emerald-600">
              <div className="p-2 bg-emerald-50 rounded-lg"><CheckCircle2 size={20} /></div>
              <span className="text-xs font-bold bg-emerald-50 px-2 py-1 rounded-full uppercase">Hợp lệ</span>
            </div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Môn học đã hoàn thành</p>
            <h4 className="text-3xl font-black text-slate-900">{grades.length}</h4>
          </motion.div>

          {studentInfo && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="card p-6 border-slate-200"
            >
              <div className="flex justify-between items-start mb-4 text-indigo-600">
                <div className="p-2 bg-indigo-50 rounded-lg"><ShieldCheck size={20} /></div>
              </div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Mã số sinh viên</p>
              <h4 className="text-xl font-bold text-slate-900">{studentInfo.student_id}</h4>
              <p className="text-indigo-600 text-[10px] font-bold mt-1 uppercase">Blockchain Verified</p>
            </motion.div>
          )}
        </div>
      )}

      {/* ── Tab Navigation ── */}
      <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar scroll-smooth">
        <button
          onClick={() => setActiveTab('summary')}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all whitespace-nowrap text-sm ${
            activeTab === 'summary' 
              ? 'bg-slate-900 text-white shadow-xl shadow-slate-200 scale-105' 
              : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Info size={16} /> Bảng tổng quát
        </button>
        {semesters.map(sem => (
          <button
            key={sem}
            onClick={() => setActiveTab(sem)}
            className={`px-6 py-3 rounded-2xl font-bold transition-all whitespace-nowrap text-sm ${
              activeTab === sem 
                ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 scale-105' 
                : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            {sem}
          </button>
        ))}
      </div>

      {/* ── Table Content ── */}
      <AnimatePresence mode="wait">
        {activeTab === 'summary' ? (
          <motion.div
            key="summary-tab"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="overflow-hidden"
          >
            <div className="card overflow-hidden border border-slate-200 shadow-sm">
              <table className="w-full text-center text-sm border-collapse">
                <thead className="bg-[#f8fafc] border-b border-slate-200 text-slate-800">
                  <tr>
                    <th className="px-6 py-5 font-bold text-left border-r border-slate-100">Học kỳ</th>
                    <th className="px-6 py-5 font-bold border-r border-slate-100">Số môn học</th>
                    <th className="px-6 py-5 font-bold">Điểm trung bình (GPA)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summaryData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-indigo-50/30 transition-colors group">
                      <td className="px-6 py-5 text-left border-r border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            {idx + 1}
                          </div>
                          <span className="font-bold text-slate-800">{row.sem}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 border-r border-slate-100 text-slate-600 font-medium">
                        {row.count} môn học
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-center gap-2">
                          <span className={`text-lg font-black ${parseFloat(row.avg) >= 8 ? 'text-emerald-600' : parseFloat(row.avg) >= 5 ? 'text-indigo-600' : 'text-rose-500'}`}>
                            {row.avg}
                          </span>
                          <button onClick={() => setActiveTab(row.sem)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-all">
                             <ChevronRight size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-900 text-white font-bold">
                    <td className="px-6 py-5 text-left">TỔNG KẾT TOÀN KHÓA</td>
                    <td className="px-6 py-5 border-x border-white/10">{grades.length} môn</td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col items-center">
                        <span className="text-xl font-black text-white">{totalAvg}</span>
                        <span className="text-[10px] text-white/50 uppercase tracking-tighter">Hợp lệ trên Blockchain</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="overflow-hidden"
          >
            <div className="card overflow-hidden border border-slate-200 shadow-sm">
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-center text-sm border-collapse min-w-[800px]">
                  <thead className="bg-[#f8fafc] border-b border-slate-200 text-slate-800">
                    <tr>
                      <th className="px-4 py-4 font-bold text-left sticky left-0 bg-[#f8fafc] z-10 border-r border-slate-200">Môn học</th>
                      <th className="px-3 py-4 font-bold border-r border-slate-100 text-[10px] uppercase text-slate-400">TX1</th>
                      <th className="px-3 py-4 font-bold border-r border-slate-100 text-[10px] uppercase text-slate-400">TX2</th>
                      <th className="px-3 py-4 font-bold border-r border-slate-100 text-[10px] uppercase text-slate-400">TX3</th>
                      <th className="px-3 py-4 font-bold border-r border-slate-100 text-[10px] uppercase text-slate-400">TX4</th>
                      <th className="px-3 py-4 font-bold border-r border-slate-100 text-[10px] uppercase text-slate-400">TX5</th>
                      <th className="px-3 py-4 font-bold border-r border-slate-100 text-[10px] uppercase text-slate-400">Giữa kỳ</th>
                      <th className="px-3 py-4 font-bold border-r border-slate-100 text-[10px] uppercase text-slate-400">Cuối kỳ</th>
                      <th className="px-4 py-4 font-bold bg-slate-50/50">TB học phần</th>
                      {isEditable && <th className="px-4 py-4 font-bold">Hành động</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {(grouped[activeTab] || []).map((g, i) => {
                      const isSaving = savingId === (g?.student_id || g?.id);
                      const currentEdits = localEdits[g?.id || i] || {};
                      
                      const statusIcon = g?.blockchainStatus === 'Valid' 
                        ? <ShieldCheck size={14} className="text-emerald-500" title="Blockchain Verified" /> 
                        : g?.blockchainStatus === 'Revoked'
                          ? <Ban size={14} className="text-orange-500" title="Revoked by Issuer" />
                          : <AlertTriangle size={14} className="text-rose-500" title="Data Integrity Compromised" />;
                          
                      const sigIcon = g?.signatureVerified 
                        ? <Shield size={14} className="text-indigo-500" title="RSA Digital Signature Valid" />
                        : null;

                      return (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-4 py-4 text-left sticky left-0 bg-white group-hover:bg-slate-50/50 z-10 border-r border-slate-200">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-slate-800">{g.subject}</span>
                                <div className="flex gap-1">
                                  {statusIcon}
                                  {sigIcon}
                                </div>
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono tracking-tighter uppercase">
                                {g?.hash ? `#${g.hash.substring(0, 12)}...` : 'Chưa được hash'}
                              </span>
                            </div>
                          </td>
                          
                          {/* Score Cells */}
                          {['tx1', 'tx2', 'tx3', 'tx4', 'tx5', 'gk', 'ck'].map(field => (
                            <td key={field} className="px-3 py-4 border-r border-slate-100 font-medium">
                              {isEditable ? (
                                <input 
                                  type="number" step="0.1" max="10" min="0"
                                  className="w-12 h-8 text-center bg-transparent border border-transparent hover:border-slate-200 focus:border-indigo-500 focus:bg-white rounded outline-none transition-all"
                                  value={currentEdits[field] ?? g[field] ?? ''}
                                  onChange={(e) => handleInputChange(g.id || i, field, e.target.value)}
                                />
                              ) : (
                                <span className={g?.[field] != null ? 'text-slate-700' : 'text-slate-200'}>
                                  {g?.[field] != null ? parseFloat(g[field]).toFixed(1) : '-'}
                                </span>
                              )}
                            </td>
                          ))}

                          <td className="px-4 py-4 font-black bg-slate-50/30">
                            <span className={`text-base ${parseFloat(g?.score || g?.tb || 0) >= 5 ? 'text-emerald-600' : 'text-rose-500'}`}>
                              {g?.tb != null ? parseFloat(g.tb).toFixed(2) : (g?.score ? parseFloat(g.score).toFixed(2) : '-')}
                            </span>
                          </td>

                          {isEditable && (
                            <td className="px-4 py-4">
                               <button 
                                 onClick={() => onSave(g, currentEdits)}
                                 disabled={isSaving}
                                 className="btn-sm btn-primary py-1 px-3"
                               >
                                 {isSaving ? <Loader2 size={12} className="animate-spin" /> : 'Lưu'}
                               </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Note about abbreviations */}
            <div className="mt-4 flex flex-wrap gap-4 px-2">
              <LegendItem icon={<Info size={12} className="text-slate-400" />} label="TX: Điểm thường xuyên" />
              <LegendItem icon={<Info size={12} className="text-slate-400" />} label="Giữa kỳ: Trọng số 2" />
              <LegendItem icon={<Info size={12} className="text-slate-400" />} label="Cuối kỳ: Trọng số 3" />
              <LegendItem icon={<ShieldCheck size={12} className="text-emerald-500" />} label="Dữ liệu đã mã hóa SHA-256" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LegendItem({ icon, label }) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
      {icon} {label}
    </div>
  );
}
