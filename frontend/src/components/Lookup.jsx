import React, { useState, useRef } from 'react';
import axios from 'axios';
import API_URL from '../config';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { 
  Search, Loader2, ArrowRight, ShieldCheck, CheckCircle2, 
  AlertTriangle, User, Scroll, ChevronRight,
  Lock, Globe, Zap, Shield, Clock, Database, Download,
  Upload, FileCheck, X, FileJson, QrCode, ClipboardCheck
} from 'lucide-react';
import GradeTable from './GradeTable';


export default function Lookup() {
  const [query, setQuery]     = useState('');
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [activeTab, setActiveTab] = useState('summary');

  // JSON verify modal states
  const [verifyModal, setVerifyModal]     = useState(false);
  const [verifyResult, setVerifyResult]   = useState(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError]     = useState('');
  const [dragOver, setDragOver]           = useState(false);
  const fileInputRef = useRef(null);
  const qrCanvasRef  = useRef(null);
  const printTemplateRef = useRef(null);

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true); setError(''); setResult(null); setActiveTab('summary');
    try {
      const { data } = await axios.get(`${API_URL}/api/public/lookup/${query.trim()}`);
      setResult(data);
      // Scroll to result
      setTimeout(() => {
        document.getElementById('search-result')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    } catch (err) {
      setError(err.response?.data?.error || 'Không tìm thấy sinh viên.');
    } finally { setLoading(false); }
  };

  const downloadBlockcert = (item, type) => {
    const certData = {
      "@context": [
        "https://w3id.org/openbadges/v2",
        "https://w3id.org/blockcerts/v3"
      ],
      "type": "Assertion",
      "id": `urn:uuid:${item.hash}`,
      "badge": {
        "id": "urn:uuid:security-academy-badge",
        "type": "BadgeClass",
        "name": type === 'grade' ? `Bảng điểm môn: ${item.subject}` : `Chứng chỉ: ${item.cert_name}`,
        "issuer": {
          "id": "https://security-academy.edu.vn",
          "type": "Profile",
          "name": "Security Academy",
          "publicKey": "${API_URL}/api/public/config"
        }
      },
      "recipient": {
        "type": "email",
        "identity": `${result?.name || 'Unknown'} (${result?.class_name || 'N/A'})`,
        "hashed": false
      },
      "verification": {
        "type": "HostedPRS",
        "dataString": item.dataString,
        "signature": item.signature,
        "hash": item.hash
      },
      "issuedOn": new Date().toISOString()
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(certData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `blockcert_${type}_${item.hash ? item.hash.substring(0,8) : 'invalid'}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const exportPDF = async () => {
    if (!result) return;
    const studentId = result?.student_id || query.toUpperCase();
    
    // Show loading state or Toast if needed
    console.log("Starting high-quality PDF export...");
    
    try {
      const { default: html2pdf } = await import('html2pdf.js');
      const element = printTemplateRef.current;
      
      const opt = {
        margin: 0,
        filename: `BangDiem_${studentId}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 3, // Higher scale for extreme clarity
          useCORS: true, 
          letterRendering: true,
          scrollX: 0,
          scrollY: 0,
          windowWidth: document.documentElement.offsetWidth
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      // Generate PDF
      await html2pdf().set(opt).from(element).save();
      console.log("PDF generated successfully.");
    } catch (err) {
      console.error("PDF Export Error:", err);
      alert("Lỗi khi xuất PDF. Vui lòng thử lại: " + err.message);
    }
  };

  // ── Tải QR Code thành file ảnh PNG ──────────────────────────────────────────
  const downloadQRCode = () => {
    const canvas = qrCanvasRef.current;
    if (!canvas || canvas.tagName !== 'CANVAS') {
      alert("Dữ liệu bảng điểm quá lớn để tạo Mã QR. Vui lòng sử dụng tính năng 'Xuất JSON Điểm' hoặc 'Tải Bảng Điểm (PDF)'.");
      return;
    }
    
    try {
      const pngUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      const studentId = result?.student_id || "SV";
      downloadLink.download = `QRCode_${studentId}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } catch (err) {
      console.error("QR Download Error:", err);
      alert("Không thể tải ảnh QR Code.");
    }
  };

  // ── Export bảng điểm cá nhân thành JSON có chữ ký blockchain ────────────────
  const exportGradeJSON = () => {
    if (!result) return;
    const studentId = result.student_id || query.toUpperCase();
    const payload = {
      "@context": "https://security-academy.edu.vn/schema/grade-transcript/v1",
      "type": "GradeTranscript",
      "issuedOn": new Date().toISOString(),
      "issuer": { "name": "Security Academy", "url": "https://security-academy.edu.vn" },
      "student": {
        "student_id": studentId,
        "name": result.name,
        "class_name": result.class_name
      },
      "grades": result.grades.map(g => ({
        "subject": g.subject,
        "semester": g.semester,
        "scores": {
          "tx1": g.tx1 ?? null, "tx2": g.tx2 ?? null, "tx3": g.tx3 ?? null,
          "tx4": g.tx4 ?? null, "tx5": g.tx5 ?? null,
          "gk":  g.gk  ?? null, "ck":  g.ck  ?? null, "tb":  g.tb  ?? g.score ?? null
        },
        "verification": {
          "dataString": g.dataString,
          "signature":  g.signature,
          "hash":       g.hash
        }
      }))
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `BangDiem_${studentId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Xác minh file JSON điểm được tải lên ────────────────────────────────────
  const handleVerifyFile = async (file) => {
    if (!file || !file.name.endsWith('.json')) {
      setVerifyError('Vui lòng chọn file .json hợp lệ!'); setVerifyModal(true); return;
    }
    setVerifyLoading(true); setVerifyError(''); setVerifyResult(null); setVerifyModal(true);
    try {
      const text = await file.text();
      const json = JSON.parse(text);

      if (json.type !== 'GradeTranscript' || !Array.isArray(json.grades)) {
        throw new Error('File không đúng định dạng GradeTranscript của Security Academy.');
      }

      const results = await Promise.all(json.grades.map(async (g) => {
        const { dataString, signature, hash } = g.verification || {};
        if (!dataString || !signature || !hash) {
          return { subject: g.subject, scores: g.scores, authenticityValid: false, integrityValid: false, error: 'Thiếu dữ liệu xác minh' };
        }
        try {
          const { data } = await axios.post('${API_URL}/api/public/verify', { dataString, signature, hash });
          return { subject: g.subject, scores: g.scores, ...data };
        } catch {
          return { subject: g.subject, scores: g.scores, authenticityValid: false, integrityValid: false, error: 'Lỗi kết nối server' };
        }
      }));

      setVerifyResult({ student: json.student, issuedOn: json.issuedOn, grades: results });
    } catch (err) {
      setVerifyError(err.message || 'File không hợp lệ hoặc bị hỏng.');
    } finally {
      setVerifyLoading(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* ── Hero Section ── */}
      <section className="landing-section flex flex-col items-center justify-center text-center px-6 min-h-[90vh] relative pt-0">
        {/* Background Decor */}
        <div className="orb w-[500px] h-[500px] bg-brand-400 left-[-10%] top-[-10%]" />
        <div className="orb w-[400px] h-[400px] bg-violet-400 right-[-5%] bottom-[10%]" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-50 text-brand-700 rounded-full text-xs font-bold uppercase tracking-widest border border-brand-100 mb-8">
            <Lock size={12} className="animate-pulse" /> Nền tảng xác thực Blockchain mới
          </span>
          <h2 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight mb-6 leading-[1.1]">
            HỆ THỐNG QUẢN LÝ <br />
            <span className="gradient-text">HỒ SƠ HỌC TẬP</span>
          </h2>
          <p className="text-slate-500 text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed">
            Security Academy cung cấp giải pháp lưu trữ và xác thực kết quả học tập phi tập trung, 
            đảm bảo tính toàn vẹn và minh bạch tuyệt đối thông qua công nghệ Blockchain.
          </p>

          {/* Search Integrated in Hero */}
          <div className="max-w-2xl mx-auto">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 card-glass p-2.5 shadow-2xl shadow-brand-100/50">
              <div className="flex-1 flex items-center gap-3 px-4 py-2">
                <Search size={22} className="text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Nhập mã số sinh viên (VD: SV001)..."
                  className="flex-1 bg-transparent text-base font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="btn-lg btn-primary shadow-xl shadow-brand-500/30 px-8 whitespace-nowrap"
              >
                {loading
                  ? <Loader2 size={20} className="animate-spin" />
                  : <>Tra cứu ngay <ArrowRight size={20} /></>
                }
              </button>
            </form>
            <p className="text-xs text-slate-400 mt-4 font-medium flex items-center justify-center gap-2">
              <Globe size={12} /> Truy cập công khai 24/7 • <ShieldCheck size={12} /> Bảo mật bởi SHA-256
            </p>
          </div>
        </motion.div>
      </section>

      {/* ── Search Result Scroll Target ── */}
      <div id="search-result" className="scroll-mt-24">
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-2xl mx-auto px-6 mb-20"
            >
              <div className="card border-red-100 bg-red-50/50 p-8 text-center">
                <AlertTriangle size={40} className="text-red-400 mx-auto mb-4" />
                <h3 className="font-bold text-red-800 text-lg mb-1">{error}</h3>
                <p className="text-sm text-red-600/70">Mã sinh viên này không tồn tại hoặc dữ liệu chưa được đồng bộ.</p>
              </div>
            </motion.div>
          )}

          {result && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto px-6 mb-24 space-y-6"
            >
              {/* Profile Card */}
              <div className="card p-8 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-bl-full -z-0" />
                <div className="w-20 h-20 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-3xl font-bold shrink-0 shadow-xl relative z-10">
                  {result.name?.[0]}
                </div>
                <div className="flex-1 text-center md:text-left relative z-10">
                  <h2 className="text-3xl font-extrabold text-slate-900 mb-2">{result?.name || 'Không xác định'}</h2>
                  <div className="flex flex-wrap justify-center md:justify-start gap-3">
                    <span className="badge badge-blue px-4 py-1.5 text-xs">{result?.class_name || 'Không rõ lớp'}</span>
                    <span className="badge badge-slate px-4 py-1.5 text-xs">{result?.record_count || 0} bản ghi Blockchain</span>
                  </div>
                </div>
                <div className={`flex items-center gap-2 px-6 py-3 rounded-2xl border-2 font-bold relative z-10 ${
                  result.blockchain_verified
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                    : 'bg-red-50 text-red-600 border-red-100'
                }`}>
                  {result.blockchain_verified
                    ? <><CheckCircle2 size={20} /> VERIFIED</>
                    : <><AlertTriangle size={20} /> ALERT</>
                  }
                </div>
              </div>

              {/* Certificates Section (Primary Focus) */}
              <div className="space-y-6">
                <div className="flex items-center justify-between px-1">
                  <SectionTitle title="Danh sách chứng chỉ đã cấp" icon={<Scroll size={20} />} />
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">
                    {result.certs?.length || 0} Chứng chỉ
                  </span>
                </div>

                {result.certs && result.certs.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {result.certs.map((c, i) => (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="group relative"
                      >
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-500 to-brand-600 rounded-3xl opacity-0 group-hover:opacity-10 blur transition duration-300" />
                        <div className="card p-6 relative flex flex-col h-full hover:border-brand-100 transition-all">
                          <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-brand-50 rounded-2xl text-brand-600">
                              <Scroll size={24} />
                            </div>
                            <StatusBadge status={c.blockchainStatus} />
                          </div>
                          <h4 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-brand-700 transition-colors">
                            {c.cert_name}
                          </h4>
                          <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                            <div className="flex items-center gap-1.5">
                              <Clock size={12} />
                              Ngày cấp: {c.issue_date}
                            </div>
                            <div className="flex items-center gap-1 text-emerald-600 font-bold">
                              <ShieldCheck size={12} /> Secured
                              {c.signatureVerified && <span className="ml-2 flex items-center gap-1 text-blue-600"><Shield size={12} /> RSA</span>}
                            </div>
                          </div>
                          {c.blockchainStatus === 'Valid' && c.signatureVerified && (
                            <button onClick={() => downloadBlockcert(c, 'cert')} className="mt-4 w-full flex items-center justify-center gap-2 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-colors">
                              <Download size={16} /> Export JSON
                            </button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="card p-12 text-center border-dashed border-2 border-slate-100 bg-slate-50/50">
                    <p className="text-slate-400 font-medium italic">Chưa có chứng chỉ nào được ghi nhận trên Blockchain.</p>
                  </div>
                )}
              </div>

              {/* Academic Transcript (Secondary Focus) */}
              {result.grades?.length > 0 && (
                <div className="space-y-6 pt-8" id="transcript-container">
                  <div className="flex flex-col sm:flex-row justify-between items-end gap-6 mb-2">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                           <div className="w-2 h-8 bg-brand-600 rounded-full" />
                           <h3 className="text-2xl font-black text-slate-900">Bảng điểm chi tiết</h3>
                        </div>
                        <p className="text-slate-500 text-xs font-medium max-w-md">
                          Dữ liệu học thuật được truy xuất trực tiếp từ sổ cái Blockchain. 
                          Mọi thay đổi trái phép sẽ bị phát hiện bởi thuật toán SHA-256.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <button data-html2canvas-ignore onClick={exportGradeJSON}
                        className="px-4 py-2.5 bg-indigo-600 hover:bg-slate-900 text-white rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all text-xs">
                        <FileJson size={14} /> JSON
                      </button>
                      <button data-html2canvas-ignore onClick={exportPDF}
                        className="px-4 py-2.5 bg-rose-500 hover:bg-slate-900 text-white rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-rose-100 transition-all text-xs">
                        <Download size={14} /> PDF
                      </button>
                      <button data-html2canvas-ignore onClick={downloadQRCode}
                        className="px-4 py-2.5 bg-amber-500 hover:bg-slate-900 text-white rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-amber-100 transition-all text-xs">
                        <QrCode size={14} /> QR Code
                      </button>
                    </div>
                  </div>
                  
                  <GradeTable 
                    grades={result.grades} 
                    isPublicView={true}
                    studentInfo={{
                      student_id: result.student_id || query.toUpperCase(),
                      name: result.name,
                      class_name: result.class_name
                    }}
                  />
                </div>
              )}

              {/* Technical Journey */}
              <div className="pt-12">
                <div className="card p-10 bg-slate-900 text-white relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl opacity-50 group-hover:bg-brand-500/20 transition-all duration-500" />
                  
                  <div className="relative z-10">
                    <h4 className="text-sm font-black uppercase tracking-[0.3em] mb-8 text-brand-400 text-center">Protocol Transparency</h4>
                    <div className="flex flex-col md:flex-row items-center gap-8 md:gap-4">
                      {[
                        { icon: <User />, title: 'Entry' },
                        { icon: <Lock />, title: 'Encrypt' },
                        { icon: <Database />, title: 'Ledger' },
                        { icon: <Shield />, title: 'Verified' },
                      ].map((s, i, a) => (
                        <React.Fragment key={i}>
                          <div className="flex flex-col items-center flex-1">
                            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-3 text-white/50 group-hover:text-white group-hover:border-white/20 transition-all">
                              {React.cloneElement(s.icon, { size: 20 })}
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">{s.title}</span>
                          </div>
                          {i < a.length - 1 && (
                            <ChevronRight className="hidden md:block text-white/10" size={16} />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Upload & Verify JSON Section ── */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-widest border border-indigo-100 mb-4">
            <FileCheck size={12} /> Xác minh bảng điểm
          </span>
          <h2 className="text-3xl font-black text-slate-900 mb-3">Kiểm tra tính xác thực JSON Điểm</h2>
          <p className="text-slate-500 text-sm max-w-xl mx-auto">Tải lên file <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">BangDiem_*.json</code> được xuất từ hệ thống — blockchain sẽ xác minh từng môn học tự động.</p>
        </div>

        <div
          className={`relative border-2 border-dashed rounded-3xl p-12 text-center transition-all cursor-pointer ${
            dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if(f) handleVerifyFile(f); }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input ref={fileInputRef} type="file" accept=".json" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if(f) handleVerifyFile(f); e.target.value=''; }} />
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Upload size={32} />
          </div>
          <h3 className="font-bold text-slate-800 text-lg mb-1">Kéo thả file JSON vào đây</h3>
          <p className="text-slate-400 text-sm">hoặc <span className="text-indigo-600 font-bold">nhấp để chọn file</span></p>
        </div>
      </section>

      {/* ── Verify Result Modal ── */}
      <AnimatePresence>
        {verifyModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) => { if(e.target === e.currentTarget) setVerifyModal(false); }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                    <FileCheck size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-lg">Kết quả xác minh Blockchain</h3>
                    {verifyResult && <p className="text-xs text-slate-400">Xuất ngày: {new Date(verifyResult.issuedOn).toLocaleString('vi-VN')}</p>}
                  </div>
                </div>
                <button onClick={() => setVerifyModal(false)}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                  <X size={16} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="overflow-y-auto flex-1 px-8 py-6">
                {verifyLoading && (
                  <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <Loader2 size={40} className="text-indigo-500 animate-spin" />
                    <p className="text-slate-500 font-medium">Blockchain đang xác minh từng môn học...</p>
                  </div>
                )}

                {verifyError && (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <AlertTriangle size={40} className="text-red-400" />
                    <p className="text-red-700 font-bold text-center">{verifyError}</p>
                    <p className="text-slate-400 text-sm">Chỉ chấp nhận file xuất từ Security Academy.</p>
                  </div>
                )}

                {verifyResult && !verifyLoading && (() => {
                  const allValid = verifyResult.grades.every(g => g.authenticityValid && g.integrityValid);
                  return (
                    <div className="space-y-6">
                      {/* Summary banner */}
                      <div className={`rounded-2xl p-5 flex items-center gap-4 ${
                        allValid ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100'
                      }`}>
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          allValid ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'
                        }`}>
                          {allValid ? <ShieldCheck size={24} /> : <AlertTriangle size={24} />}
                        </div>
                        <div>
                          <p className={`font-black text-lg ${ allValid ? 'text-emerald-700' : 'text-red-700'}`}>
                            {allValid ? '✅ Bảng điểm hợp lệ — Không có dấu hiệu gian lận' : '⚠️ Phát hiện can thiệp — Bảng điểm không hợp lệ'}
                          </p>
                          <p className="text-sm text-slate-500">
                            {verifyResult.student.name} • {verifyResult.student.student_id} • {verifyResult.student.class_name}
                          </p>
                        </div>
                      </div>

                      {/* Grade table */}
                      <div className="card overflow-hidden border border-slate-200">
                        <table className="w-full text-center text-sm border-collapse">
                          <thead className="bg-slate-800 text-white">
                            <tr>
                              <th className="px-4 py-3 text-left">Môn học</th>
                              <th className="px-3 py-3">TX1</th><th className="px-3 py-3">TX2</th>
                              <th className="px-3 py-3">TX3</th><th className="px-3 py-3">TX4</th>
                              <th className="px-3 py-3">TX5</th><th className="px-3 py-3">GK</th>
                              <th className="px-3 py-3">CK</th><th className="px-3 py-3">TB</th>
                              <th className="px-4 py-3">Trạng thái</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {verifyResult.grades.map((g, i) => {
                              const ok = g.authenticityValid && g.integrityValid;
                              const s  = g.scores || {};
                              return (
                                <tr key={i} className={ok ? 'hover:bg-slate-50' : 'bg-red-50'}>
                                  <td className="px-4 py-3 text-left font-medium text-slate-800">{g.subject}</td>
                                  <td className="px-3 py-3 text-slate-600">{s.tx1 ?? ''}</td>
                                  <td className="px-3 py-3 text-slate-600">{s.tx2 ?? ''}</td>
                                  <td className="px-3 py-3 text-slate-600">{s.tx3 ?? ''}</td>
                                  <td className="px-3 py-3 text-slate-600">{s.tx4 ?? ''}</td>
                                  <td className="px-3 py-3 text-slate-600">{s.tx5 ?? ''}</td>
                                  <td className="px-3 py-3 text-slate-600">{s.gk  ?? ''}</td>
                                  <td className="px-3 py-3 text-slate-600">{s.ck  ?? ''}</td>
                                  <td className="px-3 py-3 font-bold text-emerald-600">{s.tb ?? ''}</td>
                                  <td className="px-4 py-3">
                                    {ok ? (
                                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                                        <CheckCircle2 size={12} /> Hợp lệ
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                                        <AlertTriangle size={12} /> Gian lận
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <p className="text-xs text-slate-400 text-center">
                        Xác minh lúc {new Date().toLocaleString('vi-VN')} • Security Academy Blockchain Ledger
                      </p>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Features Grid ── */}
      <section id="features" className="landing-section bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="section-heading">Sức mạnh của <span className="gradient-text">Blockchain</span></h2>
            <p className="section-subheading">Tại Security Academy, chúng tôi sử dụng những công nghệ tiên tiến nhất để bảo vệ giá trị học thuật của bạn.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Shield size={32} />} 
              title="Tính bất biến" 
              desc="Khi điểm số đã được ghi vào Blockchain, không ai (kể cả quản trị viên) có thể thay đổi dữ liệu mà không để lại dấu vết."
            />
            <FeatureCard 
              icon={<Zap size={32} />} 
              title="Xác thực tức thì" 
              desc="Bỏ qua quy trình xác minh giấy tờ chậm chạp. Nhà tuyển dụng có thể kiểm tra tính thực của bằng cấp chỉ trong 1 giây."
            />
            <FeatureCard 
              icon={<Globe size={32} />} 
              title="Minh bạch tuyệt đối" 
              desc="Số cái công khai cho phép mọi người truy cập dữ liệu đã được cấp phép, đảm bảo sự công bằng và minh bạch trong giáo dục."
            />
          </div>
        </div>
      </section>

      {/* ── Tech Section ── */}
      <section id="tech" className="landing-section bg-slate-900 text-white overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-16">
            <div className="flex-1">
              <h2 className="text-4xl md:text-5xl font-black mb-8 leading-tight">
                Tiêu chuẩn bảo mật <br />
                <span className="text-brand-400">Cấp độ Ngân hàng</span>
              </h2>
              <div className="space-y-6">
                <TechItem 
                  title="Mã hóa SHA-256" 
                  desc="Mỗi bản ghi được chuyển đổi thành chuỗi 64 ký tự duy nhất. Chỉ một thay đổi nhỏ ở dữ liệu sẽ làm hỏng toàn bộ chữ ký."
                />
                <TechItem 
                  title="Cấu trúc Layer-2" 
                  desc="Hệ thống được thiết kế để xử lý hàng triệu bản ghi mỗi giây với chi phí năng lượng tối thiểu."
                />
                <TechItem 
                  title="Truy xuất Phi tập trung" 
                  desc="Dữ liệu được phân tán, loại bỏ hoàn toàn rủi ro Single Point of Failure (SPOF)."
                />
              </div>
            </div>
            <div className="flex-1 relative">
              <div className="w-full aspect-square bg-brand-500/10 rounded-full flex items-center justify-center animate-pulse">
                <div className="w-3/4 aspect-square bg-brand-500/20 rounded-full flex items-center justify-center">
                  <div className="w-1/2 aspect-square bg-brand-500/30 rounded-full flex items-center justify-center">
                    <Shield size={100} className="text-brand-400 animate-float" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-12 border-t border-slate-100 bg-white">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <ShieldCheck size={18} className="text-white" />
            </div>
            <span className="font-extrabold text-slate-800 text-lg uppercase tracking-tight">Security Academy</span>
          </div>
          <p className="text-sm text-slate-400">© 2026 Security Academy. Hệ thống quản lý học thuật Blockchain.</p>
          <div className="flex gap-6 text-sm font-bold text-slate-600">
            <a href="#" className="hover:text-brand-600 transition-colors">Điều khoản</a>
            <a href="#" className="hover:text-brand-600 transition-colors">Bảo mật</a>
            <a href="#" className="hover:text-brand-600 transition-colors">Liên hệ 0707.552.307 </a>
          </div>
        </div>
      </footer>

      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
        <div ref={printTemplateRef} style={{ width: '210mm', minHeight: '297mm', padding: '15mm', boxSizing: 'border-box', color: '#0f172a', backgroundColor: '#ffffff', fontFamily: 'Inter, system-ui, sans-serif' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', paddingBottom: '24px', borderBottom: '1.5px solid #0f172a' }}>
            <div style={{ flex: '1' }}>
              <div style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '-0.025em', marginBottom: '4px', textTransform: 'uppercase', color: '#0f172a' }}>BẢNG ĐIỂM TỔNG QUÁT</div>
              <div style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b' }}>Security Academy — Blockchain Academic Record System</div>
            </div>
            <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
              <div style={{ fontSize: '18px', fontWeight: '900', color: '#4f46e5' }}>SECURITY ACADEMY</div>
              <div style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>Verified Official Transcript</div>
            </div>
          </div>

          {/* Student & Overall Summary Banner */}
          <div style={{ display: 'flex', gap: '24px', marginBottom: '40px' }}>
            <div style={{ flex: '1' }}>
              {[
                { label: 'Họ tên sinh viên', value: result?.name },
                { label: 'Mã số sinh viên', value: result?.student_id || query.toUpperCase() },
                { label: 'Lớp sinh hoạt', value: result?.class_name },
              ].map((item, idx) => (
                <div key={idx} style={{ marginBottom: idx < 2 ? '12px' : '0' }}>
                  <div style={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2px', color: '#94a3b8' }}>{item.label}</div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>{item.value || 'N/A'}</div>
                </div>
              ))}
            </div>
            <div style={{ flex: '1.2', borderRadius: '16px', padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#0f172a', color: '#ffffff', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)' }}>
              <div>
                <div style={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px', color: '#94a3b8', opacity: 0.8 }}>GPA TOÀN KHÓA</div>
                <div style={{ fontSize: '36px', fontWeight: '900', color: '#818cf8' }}>
                  {result?.grades?.length > 0 
                    ? (result.grades.reduce((sum, g) => sum + parseFloat(g?.tb || g?.score || 0), 0) / result.grades.length).toFixed(2)
                    : '0.00'}
                </div>
              </div>
              <div style={{ textAlign: 'right', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '24px' }}>
                <div style={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px', color: '#94a3b8', opacity: 0.8 }}>TỔNG HỌC PHẦN</div>
                <div style={{ fontSize: '20px', fontWeight: '700' }}>{result?.grades?.length || 0} môn</div>
              </div>
            </div>
          </div>

          {/* Detailed Grades By Semester */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
             {result && result.grades && (() => {
               const gBySem = result.grades.reduce((acc, g) => {
                 const s = g.semester || 'Khác';
                 if (!acc[s]) acc[s] = [];
                 acc[s].push(g);
                 return acc;
               }, {});
               
               return Object.keys(gBySem).sort().map(sem => {
                 const semGrades = gBySem[sem] || [];
                 const semGPA = semGrades.length > 0 ? (semGrades.reduce((sum, g) => sum + parseFloat(g?.tb || g?.score || 0), 0) / semGrades.length).toFixed(2) : '0.00';
                 return (
                   <div key={sem} style={{ pageBreakInside: 'avoid' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px', paddingRight: '4px', paddingLeft: '16px', paddingTop: '6px', paddingBottom: '6px', borderLeft: '4px solid #4f46e5', backgroundColor: '#f8fafc' }}>
                       <div>
                         <div style={{ fontSize: '16px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '-0.025em', color: '#0f172a' }}>{sem}</div>
                         <div style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8' }}>{semGrades.length} môn học đã hoàn thành</div>
                       </div>
                       <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                         <span style={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '2px', color: '#94a3b8' }}>GPA Học kỳ</span>
                         <span style={{ fontSize: '16px', fontWeight: '900', color: '#4f46e5' }}>{semGPA}</span>
                       </div>
                     </div>
                     <table style={{ width: '100%', textAlign: 'center', borderCollapse: 'collapse', fontSize: '10px' }}>
                       <thead style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>
                         <tr style={{ textTransform: 'uppercase', fontWeight: '900', letterSpacing: '0.1em' }}>
                           <th style={{ padding: '10px 12px', textAlign: 'left', width: '8%' }}>STT</th>
                           <th style={{ padding: '10px 12px', textAlign: 'left', width: '52%' }}>Môn học</th>
                           <th style={{ padding: '10px 12px', width: '13.33%' }}>Giữa kỳ</th>
                           <th style={{ padding: '10px 12px', width: '13.33%' }}>Cuối kỳ</th>
                           <th style={{ padding: '10px 12px', width: '13.33%' }}>Trung bình</th>
                         </tr>
                       </thead>
                       <tbody style={{ borderBottom: '1px solid #f1f5f9' }}>
                         {semGrades.map((g, i) => (
                           <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                             <td style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '700', color: '#94a3b8' }}>{String(i + 1).padStart(2, '0')}</td>
                             <td style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '700', color: '#1e293b' }}>{g?.subject || '-'}</td>
                             <td style={{ padding: '10px 12px', color: '#475569' }}>{g?.gk || '-'}</td>
                             <td style={{ padding: '10px 12px', color: '#475569' }}>{g?.ck || '-'}</td>
                             <td style={{ padding: '10px 12px', fontWeight: '900', color: (parseFloat(g?.tb || g?.score || 0) >= 5 ? '#059669' : '#dc2626') }}>{g?.tb || g?.score || '-'}</td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                 );
               });
             })()}
          </div>

          {/* Verification Footer */}
          <div style={{ marginTop: '80px', paddingTop: '32px', borderTop: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div style={{ maxWidth: '120mm' }}>
                <div style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', color: '#0f172a' }}>Blockchain Security Authentication</div>
                <div style={{ fontSize: '9px', lineHeight: '1.5', fontWeight: '500', color: '#64748b' }}>
                  Tài liệu học thuật này được trích xuất trực tiếp từ mạng lưới Blockchain phi tập trung của Security Academy. 
                  Mọi điểm số đều được đính kèm chữ ký điện tử SHA-256 xác thực từ hội đồng học thuật. 
                  Sự thay đổi trái phép ở bất kỳ một byte dữ liệu nào sẽ làm mất giá trị xác thực của toàn bộ văn bản.
                </div>
                <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '8px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8' }}>TRÍCH XUẤT NGÀY</div>
                    <div style={{ fontSize: '10px', fontWeight: '700' }}>{new Date().toLocaleDateString('vi-VN')}</div>
                  </div>
                  <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '16px' }}>
                    <div style={{ fontSize: '8px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8' }}>BLOCKCHAIN ID (CRC)</div>
                    <div style={{ fontSize: '8px', fontFamily: 'monospace', color: '#64748b' }}>{result?.grades?.[0]?.hash?.substring(0, 32)}...</div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexShrink: 0 }}>
                {/* Integrated QR Code */}
                {result && Array.isArray(result.grades) && result.grades.length > 0 && result.grades.length < 15 && (
                  <div style={{ padding: '6px', border: '1px solid #f1f5f9', borderRadius: '10px', backgroundColor: '#ffffff', textAlign: 'center' }}>
                    <QRCodeCanvas
                      value={JSON.stringify({
                        "v": "SA-G-1.0",
                        "sid": result.student_id || 'N/A',
                        "n": result.name || 'Unknown',
                        "c": result.class_name || 'N/A',
                        "io": new Date().toISOString(),
                        "gs": (result?.grades || []).slice(0, 12).map(g => ({
                          "s": g?.subject || 'Unknown',
                          "sc": { "gk": g?.gk, "ck": g?.ck, "tb": g?.tb ?? g?.score },
                          "v": { "h": g?.hash?.substring(0, 32) }
                        }))
                      })}
                      size={80}
                      level="L"
                      includeMargin={false}
                    />
                    <div style={{ fontSize: '7px', fontWeight: '900', color: '#94a3b8', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Verify Integrity</div>
                  </div>
                )}

                <div style={{ textAlign: 'right' }}>
                  <div style={{ display: 'inline-block', position: 'relative', marginBottom: '12px' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '4px solid #f1f5f9', backgroundColor: '#ffffff' }}>
                      <div style={{ width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #eef2ff' }}>
                          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1-1z"/><path d="m9 12 2 2 4-4"/></svg>
                      </div>
                    </div>
                    <div style={{ position: 'absolute', bottom: '-8px', right: '-8px', backgroundColor: '#10b981', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '4px solid #ffffff' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
                    </div>
                  </div>
                  <div style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '-0.025em', color: '#0f172a' }}>Immutable Protocol</div>
                  <div style={{ fontSize: '8px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', fontStyle: 'italic', color: '#94a3b8' }}>verified digital record</div>
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'center', marginTop: '48px', fontSize: '7px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.6em', color: '#cbd5e1' }}>
              Security Academy Academic Infrastructure — Decentralized Governance
            </div>
          </div>
        </div>
      </div>

      {/* Hidden QR Canvas for high-res download - optimized payload */}
      <div style={{ display: 'none' }}>
        {result && Array.isArray(result.grades) && result.grades.length > 0 && result.grades.length < 15 ? (
          <QRCodeCanvas
            ref={qrCanvasRef}
            value={JSON.stringify({
              "v": "SA-G-1.0",
              "sid": result.student_id || 'N/A',
              "n": result.name || 'Unknown',
              "c": result.class_name || 'N/A',
              "io": new Date().toISOString(),
              "gs": (result?.grades || []).slice(0, 12).map(g => ({
                "s": g?.subject || 'Unknown',
                "sc": { "1": g?.tx1, "gk": g?.gk, "ck": g?.ck, "tb": g?.tb ?? g?.score },
                "v": { "h": g?.hash?.substring(0, 32) }
              }))
            })}
            size={1024}
            level="L"
            includeMargin={true}
          />
        ) : (
          <div ref={qrCanvasRef}>Dữ liệu không khả dụng hoặc quá lớn để tạo QR</div>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ title, icon }) {
  return (
    <div className="flex items-center gap-2 px-1">
      <div className="w-8 h-8 bg-brand-50 text-brand-600 rounded-lg flex items-center justify-center">
        {icon}
      </div>
      <h3 className="font-bold text-slate-800 uppercase tracking-wider text-xs">{title}</h3>
    </div>
  );
}

function StatusBadge({ status }) {
  const isValid = status === 'Valid';
  return (
    <span className={`badge ${isValid ? 'badge-green' : 'badge-red'} px-3 py-1`}>
      {isValid ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />}
      {isValid ? 'Hợp lệ' : 'Bị can thiệp'}
    </span>
  );
}

function FeatureCard({ icon, title, desc }) {
  return (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      className="feature-card"
    >
      <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-500 leading-relaxed text-sm">{desc}</p>
    </motion.div>
  );
}

function TechItem({ title, desc }) {
  return (
    <div className="flex gap-4">
      <div className="mt-1">
        <CheckCircle2 className="text-brand-400" size={20} />
      </div>
      <div>
        <h4 className="font-bold text-lg mb-1">{title}</h4>
        <p className="text-slate-400 text-sm">{desc}</p>
      </div>
    </div>
  );
}

