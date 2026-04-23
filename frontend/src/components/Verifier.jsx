import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import {
  UploadCloud, CheckCircle, XCircle, ShieldCheck, FileJson,
  Clock, User, Loader2, AlertTriangle, FileCheck, X,
  Camera, CameraOff, Building2, Globe, Key, Ban
} from 'lucide-react';

const API_URL = 'http://localhost:3000';

export default function Verifier() {
  const [file, setFile]                       = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState(null);
  const [dragOver, setDragOver]               = useState(false);
  const [scanMode, setScanMode]               = useState(false); // webcam scanner
  const [scanStatus, setScanStatus]           = useState('');
  const fileInputRef                          = useRef(null);
  const scannerRef                            = useRef(null);
  const html5QrRef                            = useRef(null);

  // ── QR Scanner ───────────────────────────────────────────────────────────────
  const startScanner = async () => {
    setScanMode(true);
    setScanStatus('Đang khởi động camera...');
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('qr-reader');
      html5QrRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          // decodedText is the JSON string embedded in the QR code
          try {
            const json = JSON.parse(decodedText);
            const blob = new Blob([decodedText], { type: 'application/json' });
            const fakeFile = new File([blob], 'qr_scan.json', { type: 'application/json' });
            await stopScanner();
            processFile(fakeFile);
          } catch {
            setScanStatus('⚠ QR không chứa dữ liệu JSON hợp lệ. Thử lại...');
          }
        },
        () => {}
      );
      setScanStatus('📷 Camera đang hoạt động — Đưa mã QR vào khung');
    } catch (err) {
      setScanStatus('❌ Không thể truy cập camera: ' + (err.message || err));
    }
  };

  const stopScanner = async () => {
    if (html5QrRef.current) {
      try { await html5QrRef.current.stop(); await html5QrRef.current.clear(); } catch {}
      html5QrRef.current = null;
    }
    setScanMode(false);
    setScanStatus('');
  };

  useEffect(() => { return () => { stopScanner(); }; }, []);

  // ── File input handlers ─────────────────────────────────────────────────────
  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    if (e.dataTransfer.files?.length > 0) processFile(e.dataTransfer.files[0]);
  };
  const handleFileSelect = (e) => {
    if (e.target.files?.length > 0) processFile(e.target.files[0]);
    e.target.value = '';
  };
  const processFile = (f) => {
    if (!f.name.endsWith('.json')) { setError('Vui lòng chọn file .json hợp lệ!'); return; }
    setError(null); setFile(f); setVerificationResult(null);
  };

  // ── Main verification ───────────────────────────────────────────────────────
  const verifyCertificate = async () => {
    if (!file) return;
    setLoading(true); setError(null); setVerificationResult(null);

    try {
      const text = await file.text();
      const json = JSON.parse(text);

      // ── BRANCH A: GradeTranscript ───────────────────────────────────────────
      if (json.type === 'GradeTranscript') {
        if (!Array.isArray(json.grades) || json.grades.length === 0)
          throw new Error('File GradeTranscript không có dữ liệu điểm.');

        const f = (v) => (v != null && v !== '') ? parseFloat(v).toFixed(1) : '';

        const calculateLocalAvg = (s) => {
          let txSum = 0; let txCount = 0;
          ['tx1', 'tx2', 'tx3', 'tx4', 'tx5'].forEach(k => {
            const v = parseFloat(s[k]);
            if (!isNaN(v)) { txSum += v; txCount++; }
          });
          const gk = parseFloat(s.gk);
          const ck = parseFloat(s.ck);
          let tw = txCount; let ts = txSum;
          if (!isNaN(gk)) { ts += gk * 2; tw += 2; }
          if (!isNaN(ck)) { ts += ck * 3; tw += 3; }
          return tw > 0 ? (ts / tw).toFixed(1) : '0.0';
        };

        const gradeResults = await Promise.all(json.grades.map(async (g) => {
          const { dataString, signature, hash } = g.verification || {};
          if (!dataString || !signature || !hash)
            return { subject: g.subject, scores: g.scores, authenticityValid: false, integrityValid: false, error: 'Thiếu dữ liệu xác minh' };

          const localAvg = calculateLocalAvg(g.scores);
          const sem = g.semester || '';
          const localDataString = `${json.student?.student_id}-${g.subject}-${sem}-${f(g.scores.tx1)}-${f(g.scores.tx2)}-${f(g.scores.tx3)}-${f(g.scores.tx4)}-${f(g.scores.tx5)}-${f(g.scores.gk)}-${f(g.scores.ck)}-${localAvg}`;

          if (localDataString !== dataString) {
            return { subject: g.subject, scores: g.scores, authenticityValid: true, integrityValid: false, isTampered: true };
          }

          try {
            const { data } = await axios.post(`${API_URL}/api/public/verify`, { dataString, signature, hash });
            return {
              subject: g.subject, scores: g.scores,
              authenticityValid: data.authenticityValid,
              integrityValid: data.integrityValid,
              isRevoked: data.isRevoked,
              revocationInfo: data.revocationInfo,
              issuerMetadata: data.issuerMetadata
            };
          } catch {
            return { subject: g.subject, scores: g.scores, authenticityValid: false, integrityValid: false, error: 'Lỗi kết nối server' };
          }
        }));

        // Get issuerMetadata from first successful result
        const issuerMeta = gradeResults.find(g => g.issuerMetadata)?.issuerMetadata;
        const anyRevoked = gradeResults.some(g => g.isRevoked);

        setVerificationResult({
          type:        'GradeTranscript',
          formatValid: true,
          student:     json.student,
          issuedOn:    json.issuedOn,
          grades:      gradeResults,
          allValid:    gradeResults.every(g => g.authenticityValid && g.integrityValid && !g.isRevoked),
          anyRevoked,
          issuerMetadata: issuerMeta
        });
        return;
      }

      // ── BRANCH B: Blockcerts V3 ─────────────────────────────────────────────
      if (!json.verification?.hash || !json.verification?.signature || !json.verification?.dataString)
        throw new Error('Invalid Blockcerts format: Missing Verification Object');

      const { dataString, hash, signature } = json.verification;
      const { data } = await axios.post(`${API_URL}/api/public/verify`, { dataString, signature, hash });

      let integrityFinal = data.integrityValid;
      if (data.trueData) {
        const identity  = json.recipient?.identity || '';
        const badgeName = json.badge?.name         || '';
        if (!identity.includes(data.trueData.studentName) || !badgeName.includes(data.trueData.recordName)) {
          integrityFinal = false;
          throw new Error('Phát hiện gian lận: Tên sinh viên hoặc tên văn bằng trong JSON đã bị chỉnh sửa!');
        }
        if (json.recipient) json.recipient.identity = `${data.trueData.studentName} (${data.trueData.className})`;
        if (json.badge)     json.badge.name         = data.trueData.recordName;
      }

      setVerificationResult({
        type:              'Blockcerts',
        formatValid:       true,
        integrityValid:    integrityFinal,
        authenticityValid: data.authenticityValid,
        isRevoked:         data.isRevoked,
        revocationInfo:    data.revocationInfo,
        issuerMetadata:    data.issuerMetadata,
        details:           json
      });

    } catch (err) {
      setError(err.message || 'Xác minh thất bại.');
      setVerificationResult({ type: 'error', formatValid: false, integrityValid: false, authenticityValid: false });
    } finally {
      setLoading(false);
    }
  };

  // ── UI ──────────────────────────────────────────────────────────────────────
  return (
    <div className="bg-slate-50 min-h-screen py-16 px-6">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <div className="text-center space-y-4">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-50 text-brand-700 rounded-full text-xs font-bold uppercase tracking-widest border border-brand-100">
            <ShieldCheck size={12} /> Universal Verifier
          </span>
          <h1 className="text-4xl font-extrabold text-slate-900">Mạng Lưới Xác Thực Toàn Cầu</h1>
          <p className="text-slate-500 max-w-2xl mx-auto">
            Hỗ trợ <strong>Bảng điểm JSON</strong> (<code className="bg-slate-100 px-1 rounded font-mono text-xs">BangDiem_*.json</code>) và{' '}
            <strong>Chứng chỉ Blockcerts</strong>. Kéo thả, chọn file, hoặc <strong>quét mã QR</strong> bằng camera.
          </p>
        </div>

        {/* QR Scanner Toggle */}
        <div className="flex justify-center gap-3">
          {!scanMode ? (
            <button onClick={startScanner}
              className="flex items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-full text-sm font-bold shadow-lg shadow-violet-500/30 transition-all">
              <Camera size={16} /> Quét mã QR bằng Camera
            </button>
          ) : (
            <button onClick={stopScanner}
              className="flex items-center gap-2 px-6 py-2.5 bg-slate-700 hover:bg-slate-800 text-white rounded-full text-sm font-bold shadow transition-all">
              <CameraOff size={16} /> Dừng camera
            </button>
          )}
        </div>

        {/* QR Scanner View */}
        <AnimatePresence>
          {scanMode && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="rounded-3xl overflow-hidden bg-slate-900 p-6 text-center space-y-4 border border-violet-900">
              <div id="qr-reader" ref={scannerRef} style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }} />
              {scanStatus && (
                <p className="text-sm font-bold text-violet-300">{scanStatus}</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Drop zone */}
        {!scanMode && (
          <div
            className={`border-4 border-dashed rounded-3xl p-16 text-center transition-all bg-white cursor-pointer ${
              dragOver ? 'border-brand-400 bg-brand-50/30' : file ? 'border-brand-500 bg-brand-50/20' : 'border-slate-200 hover:border-slate-300'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" className="hidden" accept=".json" onChange={handleFileSelect} />
            <div className="mx-auto w-24 h-24 bg-slate-50 text-brand-600 rounded-full flex items-center justify-center mb-6">
              {file ? <FileJson size={48} /> : <UploadCloud size={48} />}
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              {file ? file.name : 'Kéo thả tệp JSON vào đây'}
            </h3>
            <p className="text-slate-500 font-medium">Hoặc nhấn vào đây để chọn tệp từ máy tính</p>
            {file && (
              <span className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 bg-brand-100 text-brand-700 rounded-full text-xs font-bold">
                <FileCheck size={12} /> File đã sẵn sàng
              </span>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 flex items-center gap-3">
            <XCircle size={20} /> <span className="font-bold">{error}</span>
          </div>
        )}

        {/* Verify button */}
        {file && !verificationResult && !loading && (
          <div className="flex justify-center">
            <button onClick={verifyCertificate} className="btn-lg btn-primary w-full max-w-sm rounded-full shadow-lg hover:shadow-brand-500/20">
              <ShieldCheck size={20} className="mr-2" /> Tiến hành Xác Thực
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-4">
            <Loader2 size={40} className="animate-spin text-brand-500" />
            <p className="font-bold tracking-widest uppercase text-sm">Blockchain đang xác minh...</p>
          </div>
        )}

        {/* ── Results: GradeTranscript ── */}
        {verificationResult?.type === 'GradeTranscript' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="card p-8 space-y-6 bg-white border-2 border-slate-100">

            {/* Revocation Warning Banner */}
            {verificationResult.anyRevoked && (
              <div className="rounded-2xl p-4 bg-orange-50 border-2 border-orange-200 flex items-center gap-3">
                <Ban size={24} className="text-orange-600 shrink-0" />
                <div>
                  <p className="font-black text-orange-700">⚠️ CẢNH BÁO: Một hoặc nhiều môn học đã bị THU HỒI</p>
                  <p className="text-xs text-orange-600 mt-0.5">Bảng điểm này không còn hiệu lực pháp lý. Liên hệ Security Academy để biết thêm chi tiết.</p>
                </div>
              </div>
            )}

            {/* Banner */}
            <div className={`rounded-2xl p-5 flex items-center gap-4 ${
              verificationResult.allValid ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100'
            }`}>
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                verificationResult.allValid ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'
              }`}>
                {verificationResult.allValid ? <ShieldCheck size={28} /> : <AlertTriangle size={28} />}
              </div>
              <div>
                <p className={`font-black text-xl ${verificationResult.allValid ? 'text-emerald-700' : 'text-red-700'}`}>
                  {verificationResult.allValid
                    ? '✅ Bảng điểm hợp lệ — Không có dấu hiệu gian lận'
                    : '⚠️ Phát hiện can thiệp — Bảng điểm KHÔNG hợp lệ'}
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  {verificationResult.student?.name} • {verificationResult.student?.student_id} • {verificationResult.student?.class_name}
                </p>
              </div>
            </div>

            {/* Issuer Profile */}
            {verificationResult.issuerMetadata && (
              <IssuerProfile meta={verificationResult.issuerMetadata} />
            )}

            {/* Info row */}
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="flex items-center gap-2 text-slate-500">
                <Clock size={14} /> Xuất ngày: {new Date(verificationResult.issuedOn).toLocaleString('vi-VN')}
              </span>
              <span className="flex items-center gap-2 text-slate-500">
                <User size={14} /> {verificationResult.grades.length} môn học
              </span>
            </div>

            {/* Grade table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-sm text-center border-collapse">
                <thead className="bg-slate-800 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left">Môn học / Học kỳ</th>
                    <th className="px-3 py-3">TX1</th><th className="px-3 py-3">TX2</th>
                    <th className="px-3 py-3">TX3</th><th className="px-3 py-3">TX4</th>
                    <th className="px-3 py-3">TX5</th><th className="px-3 py-3">GK</th>
                    <th className="px-3 py-3">CK</th><th className="px-3 py-3">TB</th>
                    <th className="px-4 py-3">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {verificationResult.grades.map((g, i) => {
                    const ok = g.authenticityValid && g.integrityValid && !g.isRevoked;
                    const s  = g.scores || {};
                    return (
                      <tr key={i} className={ok ? 'hover:bg-slate-50' : g.isRevoked ? 'bg-orange-50' : 'bg-red-50'}>
                        <td className="px-4 py-3 text-left font-semibold text-slate-800">
                          <div>{g.subject}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{g.semester || 'Học kỳ 1'}</div>
                        </td>
                        <td className="px-3 py-3 text-slate-600">{s.tx1 ?? ''}</td>
                        <td className="px-3 py-3 text-slate-600">{s.tx2 ?? ''}</td>
                        <td className="px-3 py-3 text-slate-600">{s.tx3 ?? ''}</td>
                        <td className="px-3 py-3 text-slate-600">{s.tx4 ?? ''}</td>
                        <td className="px-3 py-3 text-slate-600">{s.tx5 ?? ''}</td>
                        <td className="px-3 py-3 text-slate-600">{s.gk  ?? ''}</td>
                        <td className="px-3 py-3 text-slate-600">{s.ck  ?? ''}</td>
                        <td className="px-3 py-3 font-bold text-emerald-600">{s.tb ?? ''}</td>
                        <td className="px-4 py-3">
                          {g.isRevoked ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">
                              <Ban size={12} /> Đã thu hồi
                            </span>
                          ) : ok ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                              <CheckCircle size={12} /> Hợp lệ
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                              <XCircle size={12} /> Gian lận
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
          </motion.div>
        )}

        {/* ── Results: Blockcerts ── */}
        {verificationResult?.type === 'Blockcerts' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="card p-8 space-y-8 bg-white border-2 border-slate-100">

            {/* Revocation Warning */}
            {verificationResult.isRevoked && (
              <div className="rounded-2xl p-4 bg-orange-50 border-2 border-orange-200 flex items-center gap-3">
                <Ban size={24} className="text-orange-600 shrink-0" />
                <div>
                  <p className="font-black text-orange-700">🚫 CHỨNG CHỈ NÀY ĐÃ BỊ THU HỒI</p>
                  {verificationResult.revocationInfo && (
                    <p className="text-xs text-orange-600 mt-0.5">
                      Lý do: {verificationResult.revocationInfo.reason} • Thu hồi bởi: {verificationResult.revocationInfo.revokedBy} lúc {new Date(verificationResult.revocationInfo.timestamp).toLocaleString('vi-VN')}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
              <div className="p-4 bg-slate-50 rounded-2xl">
                {verificationResult.authenticityValid && verificationResult.integrityValid && !verificationResult.isRevoked
                  ? <CheckCircle className="text-emerald-500" size={32} />
                  : <XCircle className="text-red-500" size={32} />}
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900">
                  {verificationResult.authenticityValid && verificationResult.integrityValid && !verificationResult.isRevoked
                    ? 'CHỨNG CHỈ HỢP LỆ'
                    : verificationResult.isRevoked ? '🚫 CHỨNG CHỈ ĐÃ BỊ THU HỒI' : 'XÁC THỰC THẤT BẠI'}
                </h3>
                <p className="text-slate-500">Kết quả đối chiếu trên hợp đồng thông minh</p>
              </div>
            </div>

            {/* Issuer Profile */}
            {verificationResult.issuerMetadata && (
              <IssuerProfile meta={verificationResult.issuerMetadata} />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-bold text-slate-400 uppercase text-xs tracking-wider">Thông tin Chứng Chỉ</h4>
                <div className="space-y-3">
                  <InfoRow icon={<ShieldCheck size={16} className="text-emerald-600" />} label="Đơn vị cấp phát" value="Administrator - Security Academy" green />
                  <InfoRow icon={<User size={16} />} label="Người nhận" value={verificationResult.details?.recipient?.identity || 'N/A'} />
                  <InfoRow icon={<FileJson size={16} />} label="Văn bằng" value={verificationResult.details?.badge?.name || 'N/A'} />
                  <InfoRow icon={<Clock size={16} />} label="Thời gian xuất" value={new Date(verificationResult.details?.issuedOn).toLocaleString('vi-VN') || 'N/A'} />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-bold text-slate-400 uppercase text-xs tracking-wider">Hành trình Xác Minh (Log)</h4>
                <div className="space-y-3">
                  <LogStep ok={verificationResult.formatValid}       step="1" title="Định dạng JSON (Format)"     desc="Phân tích cấu trúc chuẩn Blockcerts V3" />
                  <LogStep ok={verificationResult.integrityValid}    step="2" title="Tính toàn vẹn (Integrity)"   desc="Hash cục bộ so với sổ cái blockchain" />
                  <LogStep ok={verificationResult.authenticityValid} step="3" title="Chữ ký xuất xứ (Authenticity)" desc="Thẩm định RSA Public Key của tổ chức" />
                  <LogStep ok={!verificationResult.isRevoked}        step="4" title="Trạng thái thu hồi (Revocation)" desc="Kiểm tra sổ đăng ký thu hồi trên Blockchain" />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Reset button */}
        {verificationResult && (
          <div className="flex justify-center">
            <button onClick={() => { setFile(null); setVerificationResult(null); setError(null); }}
              className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors px-4 py-2 rounded-xl hover:bg-slate-100">
              <X size={16} /> Xác minh file khác
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Issuer Profile Component ───────────────────────────────────────────────────
function IssuerProfile({ meta }) {
  return (
    <div className="rounded-xl p-4 bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 flex flex-wrap items-center gap-4">
      <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0">
        <Building2 size={20} color="white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-black text-indigo-800 text-sm">✅ Đơn vị cấp phát đã được xác minh</p>
        <p className="text-xs text-indigo-600 font-medium">{meta.name} • {meta.country}</p>
      </div>
      <div className="flex gap-3 text-xs flex-wrap">
        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full border border-indigo-100 font-semibold text-slate-700">
          <Globe size={11} className="text-indigo-500" /> {meta.website}
        </span>
        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full border border-indigo-100 font-semibold text-slate-700 font-mono">
          <Key size={11} className="text-violet-500" /> RSA-2048
        </span>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value, green }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl ${green ? 'bg-emerald-50 border border-emerald-100' : 'bg-slate-50'}`}>
      <span className="text-brand-600">{icon}</span>
      <div>
        <p className={`text-xs font-medium ${green ? 'text-emerald-600' : 'text-slate-400'}`}>{label}</p>
        <p className={`font-bold ${green ? 'text-emerald-800' : 'text-slate-700'}`}>{value}</p>
      </div>
    </div>
  );
}

function LogStep({ ok, step, title, desc }) {
  return (
    <div className={`p-4 rounded-xl border ${ok ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
      <div className="flex items-center gap-2 font-bold mb-1">
        {ok ? <CheckCircle size={16} /> : <XCircle size={16} />} {step}. {title}
      </div>
      <p className="text-xs opacity-80">{desc}</p>
    </div>
  );
}
