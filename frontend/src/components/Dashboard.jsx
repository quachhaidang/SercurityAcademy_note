import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, BookOpen, Scroll, Plus, Trash2, FileUp,
  ShieldCheck, CheckCircle2, XCircle, RefreshCw,
  Loader2, Database, AlertCircle, Pencil, Ban
} from 'lucide-react';
import { showMessageBox } from './MessageBox';
import API_URL from '../config';

const API = API_URL;

export default function Dashboard({ userToken, userRole }) {
  const [tab, setTab] = useState('students');
  const [students, setStudents] = useState([]);
  const [grades, setGrades] = useState([]);
  const [certs, setCerts] = useState([]);
  const [catClasses, setCatClasses] = useState([]);
  const [catSubjects, setCatSubjects] = useState([]);
  const [catAcademicYears, setCatAcademicYears] = useState([]);
  const [catMajors, setCatMajors] = useState([]);
  const [catBatches, setCatBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${userToken}`,
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const resp = await Promise.allSettled([
        axios.get(`${API}/api/students`, { headers }),
        axios.get(`${API}/api/grades`, { headers }),
        axios.get(`${API}/api/certificates`, { headers }),
        axios.get(`${API}/api/classes`, { headers }),
        axios.get(`${API}/api/subjects`, { headers }),
        axios.get(`${API}/api/academic-years`, { headers }),
        axios.get(`${API}/api/majors`, { headers }),
        axios.get(`${API}/api/batches`, { headers }),
      ]);
      if (resp[0].status === 'fulfilled') setStudents(resp[0].value.data);
      if (resp[1].status === 'fulfilled') setGrades(resp[1].value.data);
      if (resp[2].status === 'fulfilled') setCerts(resp[2].value.data);
      if (resp[3].status === 'fulfilled') setCatClasses(resp[3].value.data.map(c => c.class_name));
      if (resp[4].status === 'fulfilled') setCatSubjects(resp[4].value.data.map(s => s.subject_name));
      if (resp[5].status === 'fulfilled') setCatAcademicYears(resp[5].value.data);
      if (resp[6].status === 'fulfilled') setCatMajors(resp[6].value.data);
      if (resp[7].status === 'fulfilled') setCatBatches(resp[7].value.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const tampered = [...grades, ...certs].filter(x => x.blockchainStatus !== 'Valid').length;

  const TABS = [
    { id: 'students', label: 'Sinh viên', icon: Users },
    { id: 'grades', label: 'Điểm số', icon: BookOpen },
    { id: 'certs', label: 'Chứng chỉ', icon: Scroll },
  ];
  if (userRole === 'admin') {
    TABS.push({ id: 'catalog', label: 'Quản lí lớp học', icon: Database });
  }

  return (
    <div className="page-container">
      {/* ── Stats ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <StatCard label="Tổng sinh viên" value={students.length} icon={<Users size={20} />} change="+2 tuần này" color="blue" loading={loading} />
        <StatCard label="Tổng bản ghi BC" value={grades.length + certs.length} icon={<Database size={20} />} change="SHA-256 hashed" color="indigo" loading={loading} />
        <StatCard label="Cảnh báo tính toàn vẹn" value={tampered} icon={<AlertCircle size={20} />} change={tampered === 0 ? 'Toàn bộ hợp lệ' : 'Cần kiểm tra'} color={tampered === 0 ? 'green' : 'red'} loading={loading} />
      </div>

      {/* ── Tab Bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div className="tab-bar">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} className={`tab-btn ${tab === t.id ? 'tab-btn-active' : ''}`}>
                <Icon size={15} /> {t.label}
              </button>
            );
          })}
        </div>
        <button onClick={fetchAll} className={`btn-sm btn-ghost ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Làm mới
        </button>
      </div>

      {/* ── Content ── */}
      <AnimatePresence mode="wait">
        {loading ? (
          <SkeletonTable key="skeleton" />
        ) : (
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            {tab === 'students' && <StudentTab students={students} catClasses={catClasses} catMajors={catMajors} catBatches={catBatches} headers={headers} refresh={fetchAll} />}
            {tab === 'grades' && <GradeTab grades={grades} students={students} catClasses={catClasses} catSubjects={catSubjects} catAcademicYears={catAcademicYears} headers={headers} refresh={fetchAll} />}
            {tab === 'certs' && <CertTab certs={certs} headers={headers} refresh={fetchAll} />}
            {tab === 'catalog' && <CatalogTab headers={headers} refresh={fetchAll} academicYears={catAcademicYears} majors={catMajors} batches={catBatches} />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────── STAT CARD ── */
function StatCard({ label, value, icon, change, color, loading }) {
  const colors = {
    blue: { bg: '#eff6ff', text: '#2563eb', ring: '#bfdbfe' },
    indigo: { bg: '#eef2ff', text: '#4f46e5', ring: '#c7d2fe' },
    green: { bg: '#ecfdf5', text: '#059669', ring: '#a7f3d0' },
    red: { bg: '#fef2f2', text: '#ef4444', ring: '#fecaca' },
  };
  const c = colors[color] ?? colors.blue;
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
        <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: c.bg, color: c.text, boxShadow: `0 0 0 1px ${c.ring}` }}>
          {icon}
        </div>
      </div>
      {loading
        ? <div className="skeleton" style={{ height: '2.25rem', width: '5rem' }} />
        : <p style={{ fontSize: '1.875rem', fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{value}</p>
      }
      <p style={{ fontSize: '0.75rem', fontWeight: 600, color: c.text }}>{change}</p>
    </div>
  );
}

/* ─────────────────────────────────────── SKELETON ── */
function SkeletonTable() {
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '1rem' }}>
        <div className="skeleton" style={{ height: '2.25rem', width: '8rem' }} />
        <div className="skeleton" style={{ height: '2.25rem', width: '6rem' }} />
      </div>
      {[...Array(5)].map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: '1rem', padding: '1rem 1.5rem', borderBottom: '1px solid #f8fafc' }}>
          <div className="skeleton" style={{ height: '1.25rem', width: '6rem' }} />
          <div className="skeleton" style={{ height: '1.25rem', flex: 1 }} />
          <div className="skeleton" style={{ height: '1.25rem', width: '8rem' }} />
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────── EMPTY STATE ── */
function EmptyState({ icon, title, desc }) {
  return (
    <div style={{ padding: '5rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', color: '#94a3b8' }}>
      <div style={{ width: '3.5rem', height: '3.5rem', background: '#f1f5f9', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>{title}</p>
        <p style={{ fontSize: '0.875rem' }}>{desc}</p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────── ADD FORM ── */
function AddForm({ fields, onSubmit, onCancel, submitLabel = 'Lưu' }) {
  const [values, setValues] = useState(() => {
    return Object.fromEntries(fields.map(f => {
      let initialVal = '';
      if (f.type === 'select' && f.options && f.options.length > 0) {
        initialVal = typeof f.options[0] === 'object' ? f.options[0].value : f.options[0];
      }
      return [f.key, initialVal];
    }));
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setValues(p => ({ ...p, [k]: v }));
  const handle = async () => { setSaving(true); await onSubmit(values); setSaving(false); };

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
      style={{ overflow: 'hidden', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', padding: '1.25rem 1.5rem' }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(11rem, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
        {fields.map(f => (
          <div key={f.key}>
            <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>{f.label}</label>
            {f.type === 'select' ? (
              <select className="input" value={values[f.key]} onChange={e => set(f.key, e.target.value)}>
                {f.options && f.options.map(o => {
                  const isObj = typeof o === 'object';
                  const label = isObj ? o.label : o;
                  const val = isObj ? o.value : o;
                  return <option key={val} value={val}>{label}</option>
                })}
              </select>
            ) : (
              <input type={f.type || 'text'} step={f.step} className="input" placeholder={f.placeholder} value={values[f.key]} onChange={e => set(f.key, e.target.value)} />
            )}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button onClick={handle} disabled={saving} className="btn-sm btn-primary">
          {saving ? <Loader2 size={14} className="animate-spin" /> : submitLabel}
        </button>
        <button onClick={onCancel} className="btn-sm btn-secondary">Hủy</button>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────── MODAL ── */
function ConfirmModal({ onConfirm, onCancel, loading, title, desc, confirmLabel = 'Xóa' }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={onCancel}
    >
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()} className="card"
        style={{ padding: '1.75rem', maxWidth: '22rem', width: '100%' }}
      >
        <div style={{ width: '3rem', height: '3rem', background: '#fef2f2', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
          <Trash2 size={22} style={{ color: '#ef4444' }} />
        </div>
        <h3 style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a', marginBottom: '0.375rem' }}>{title}</h3>
        <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.5rem' }}>{desc}</p>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={onConfirm} disabled={loading} className="btn-md" style={{ flex: 1, background: '#ef4444', color: '#fff' }}>
            {loading ? <Loader2 size={15} className="animate-spin" /> : <><Trash2 size={14} />{confirmLabel}</>}
          </button>
          <button onClick={onCancel} className="btn-md btn-secondary" style={{ flex: 1 }}>Hủy</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─────────────────────────────────────── STUDENT TAB ── */
function StudentTab({ students, catClasses = [], catMajors = [], catBatches = [], headers, refresh }) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const csv = useRef();

  const allIds = students.map(s => s.student_id);
  const allSelected = selected.size > 0 && selected.size === students.length;
  const someSelected = selected.size > 0 && !allSelected;

  const toggleAll = () => allSelected ? setSelected(new Set()) : setSelected(new Set(allIds));
  const toggleOne = id => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const handleAdd = async (v) => {
    try {
      await axios.post(`${API}/api/students`, { student_id: v.id, name: v.name, email: v.email, class_name: v.cls }, { headers });
      setOpen(false); refresh();
    } catch (e) {
      await showMessageBox({ type: 'alert', title: 'Lỗi', desc: e.response?.data?.error || 'Đã có lỗi xảy ra' });
    }
  };

  const downloadCSVTemplate = () => {
    const headers = ['student_id', 'name', 'email', 'class_name'];
    const rows = [
      ['SV001', 'Nguyễn Văn A', 'nva@gmail.com', 'CNTT'],
      ['SV002', 'Trần Thị B', 'ttb@gmail.com', 'CNTT']
    ];
    const content = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'mau_sinh_vien.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCSV = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try {
      let text = await file.text();
      // Remove UTF-8 BOM if present
      text = text.replace(/^\ufeff/, '');
      
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) throw new Error('File CSV không có dữ liệu hoặc sai định dạng.');

      // Detect delimiter (, or ;)
      const firstLine = lines[0];
      const delimiter = firstLine.includes(';') ? ';' : ',';
      
      // Clean headers: remove hidden characters and normalize to lowercase
      const headers_row = firstLine.split(delimiter).map(h => 
        h.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
      );
      
      const required = ['student_id', 'name', 'email', 'class_name'];
      const indices = {};
      required.forEach(col => {
        const idx = headers_row.indexOf(col);
        if (idx === -1) throw new Error(`Thiếu cột bắt buộc: ${col} (Tìm thấy: ${headers_row.join(', ')})`);
        indices[col] = idx;
      });

      const rows = lines.slice(1).map(line => {
        const cols = line.split(delimiter).map(v => v.trim());
        return {
          student_id: cols[indices.student_id],
          name: cols[indices.name],
          email: cols[indices.email],
          class_name: cols[indices.class_name]
        };
      }).filter(r => r.student_id && r.name); // Basic validation

      if (rows.length === 0) throw new Error('Không tìm thấy dữ liệu hợp lệ trong file.');

      const resp = await axios.post(`${API}/api/students/bulk`, { students: rows }, { headers });
      const { message, errors } = resp.data;
      
      if (errors && errors.length > 0) {
        await showMessageBox({ 
          type: 'alert', 
          title: 'Kết quả Import', 
          desc: `${message}. Tuy nhiên có ${errors.length} lỗi: \n${errors.slice(0, 3).join('\n')}${errors.length > 3 ? '\n...' : ''}` 
        });
      } else {
        await showMessageBox({ type: 'alert', title: 'Thành công', desc: message });
      }
      refresh();
    } catch (err) {
      await showMessageBox({ type: 'alert', title: 'Lỗi định dạng', desc: err.message });
    } finally {
      e.target.value = ''; // Reset input
    }
  };

  const startEdit = s => { setEditingId(s.student_id); setEditValues({ name: s.name, email: s.email, cls: s.class_name }); };
  const cancelEdit = () => { setEditingId(null); setEditValues({}); };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/api/students/${editingId}`, { name: editValues.name, email: editValues.email, class_name: editValues.cls }, { headers });
      cancelEdit(); refresh();
    } catch (e) { await showMessageBox({ type: 'alert', title: 'Lỗi', desc: e.response?.data?.error || 'Lỗi khi cập nhật' }); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await axios.delete(`${API}/api/students/${deleteTarget.student_id}`, { headers });
      setDeleteTarget(null); setSelected(new Set()); refresh();
    } catch (e) { await showMessageBox({ type: 'alert', title: 'Lỗi', desc: e.response?.data?.error || 'Lỗi khi xóa' }); }
    finally { setDeleting(false); }
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      await axios.post(`${API}/api/students/delete-bulk`, { studentIds: [...selected] }, { headers });
      setSelected(new Set()); setShowBulkConfirm(false); refresh();
    } catch (e) { await showMessageBox({ type: 'alert', title: 'Lỗi', desc: e.response?.data?.error || 'Lỗi khi xóa hàng loạt' }); }
    finally { setBulkDeleting(false); }
  };

  return (
    <>
      <AnimatePresence>
        {deleteTarget && (
          <ConfirmModal
            title="Xóa sinh viên?"
            desc={<>Sinh viên <strong style={{ color: '#0f172a' }}>{deleteTarget.name}</strong> ({deleteTarget.student_id}) và toàn bộ dữ liệu liên quan sẽ bị xóa vĩnh viễn.</>}
            confirmLabel="Xóa vĩnh viễn"
            loading={deleting}
            onConfirm={handleDelete}
            onCancel={() => setDeleteTarget(null)}
          />
        )}
        {showBulkConfirm && (
          <ConfirmModal
            title={`Xóa ${selected.size} sinh viên?`}
            desc={<>Toàn bộ điểm số và chứng chỉ của <strong style={{ color: '#ef4444' }}>{selected.size} sinh viên</strong> đã chọn sẽ bị xóa vĩnh viễn.</>}
            confirmLabel={`Xóa ${selected.size} sinh viên`}
            loading={bulkDeleting}
            onConfirm={handleBulkDelete}
            onCancel={() => setShowBulkConfirm(false)}
          />
        )}
      </AnimatePresence>

      <div className="card" style={{ overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontWeight: 700, color: '#0f172a' }}>Danh sách Sinh viên</h3>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>{students.length} bản ghi trong hệ thống</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input type="file" ref={csv} onChange={handleCSV} accept=".csv" style={{ display: 'none' }} />
            <button onClick={downloadCSVTemplate} className="btn-sm btn-ghost" style={{ fontSize: '0.75rem', color: '#64748b' }} title="Tải file mẫu CSV">
              Tải mẫu
            </button>
            <button onClick={() => csv.current.click()} className="btn-sm btn-secondary"><FileUp size={14} /> CSV</button>
            <button onClick={() => setOpen(v => !v)} className="btn-sm btn-primary"><Plus size={14} /> Thêm mới</button>
          </div>
        </div>

        {/* Bulk Action Bar */}
        <AnimatePresence>
          {selected.size > 0 && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} style={{ overflow: 'hidden' }}>
              <div style={{ padding: '0.625rem 1.5rem', background: 'linear-gradient(90deg,#eef2ff,#f5f3ff)', borderBottom: '1px solid #e0e7ff', display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#4338ca' }}>✓ Đã chọn {selected.size} sinh viên</span>
                <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
                  <button onClick={() => setSelected(new Set())} className="btn-sm btn-secondary" style={{ fontSize: '0.75rem' }}>Bỏ chọn</button>
                  <button onClick={() => setShowBulkConfirm(true)} className="btn-sm" style={{ background: '#ef4444', color: '#fff', fontSize: '0.75rem' }}>
                    <Trash2 size={13} /> Xóa {selected.size} mục
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add Form */}
        <AnimatePresence>
          {open && <AddForm fields={[
            { key: 'student_id', label: 'MSSV', placeholder: 'SV-001' },
            { key: 'name', label: 'Họ tên', placeholder: 'Nguyễn Văn A' },
            { key: 'email', label: 'Email', placeholder: 'a@university.vn' },
            { key: 'class_name', label: 'Lớp', type: 'select', options: catClasses.length > 0 ? catClasses : ['Không có lớp nào'] },
            { key: 'major_id', label: 'Ngành học', type: 'select', options: catMajors.map(m => ({ label: m.major_name, value: m.id })) },
            { key: 'batch_id', label: 'Khóa học', type: 'select', options: catBatches.map(b => ({ label: `${b.batch_name} (${b.start_year}-${b.end_year})`, value: b.id })) },
          ]} onSubmit={async (v) => {
             // Extract values since AddForm might return labels for select if not careful
             // But my AddForm uses values[f.key]
             await axios.post(`${API}/api/students`, v, { headers });
             setOpen(false); refresh();
          }} onCancel={() => setOpen(false)} />}
        </AnimatePresence>

        {/* Table */}
        {students.length === 0 ? (
          <EmptyState icon={<Users size={24} style={{ color: '#cbd5e1' }} />} title="Chưa có sinh viên" desc="Thêm sinh viên đầu tiên hoặc import CSV." />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: 'rgba(248,250,252,0.7)', borderBottom: '1px solid #f1f5f9' }}>
              <tr>
                <th style={{ padding: '0.75rem 1rem', width: '2.5rem' }}>
                  <input type="checkbox" checked={allSelected} ref={el => { if (el) el.indeterminate = someSelected; }} onChange={toggleAll}
                    style={{ width: '1rem', height: '1rem', accentColor: '#4f46e5', cursor: 'pointer' }} />
                </th>
                {['Sinh viên', 'Email', 'Lớp', 'Trạng thái', 'Hành động'].map(h => (
                  <th key={h} className="table-header-cell">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map(s => {
                const isSel = selected.has(s.student_id);
                const isEdit = editingId === s.student_id;
                return isEdit ? (
                  <tr key={s.student_id} style={{ background: '#eef2ff', borderBottom: '1px solid #e0e7ff' }}>
                    <td style={{ padding: '0.75rem 1rem' }} />
                    <td className="table-body-cell">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <div style={{ width: '1.75rem', height: '1.75rem', borderRadius: '0.375rem', background: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700, flexShrink: 0 }}>{s.student_id}</div>
                        <input className="input" style={{ width: '9rem' }} value={editValues.name} onChange={e => setEditValues(v => ({ ...v, name: e.target.value }))} placeholder="Họ tên" autoFocus />
                      </div>
                    </td>
                    <td className="table-body-cell"><input className="input" style={{ width: '12rem' }} value={editValues.email} onChange={e => setEditValues(v => ({ ...v, email: e.target.value }))} placeholder="Email" /></td>
                    <td className="table-body-cell">
                      {catClasses.length > 0 ? (
                        <select className="input" style={{ width: '7rem' }} value={editValues.cls} onChange={e => setEditValues(v => ({ ...v, cls: e.target.value }))}>
                          {catClasses.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      ) : (
                        <input className="input" style={{ width: '7rem' }} value={editValues.cls} onChange={e => setEditValues(v => ({ ...v, cls: e.target.value }))} placeholder="Lớp" />
                      )}
                    </td>
                    <td className="table-body-cell" colSpan={2}>
                      <div style={{ display: 'flex', gap: '0.375rem' }}>
                        <button onClick={handleSave} disabled={saving} className="btn-sm btn-primary">{saving ? <Loader2 size={13} className="animate-spin" /> : <><CheckCircle2 size={13} />Lưu</>}</button>
                        <button onClick={cancelEdit} className="btn-sm btn-secondary"><XCircle size={13} />Hủy</button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={s.student_id} className="table-row" style={{ background: isSel ? '#f5f3ff' : undefined, verticalAlign: 'middle' }}>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <input type="checkbox" checked={isSel} onChange={() => toggleOne(s.student_id)}
                        style={{ width: '1rem', height: '1rem', accentColor: '#4f46e5', cursor: 'pointer' }} />
                    </td>
                    <td className="table-body-cell">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <div style={{ width: '1.75rem', height: '1.75rem', borderRadius: '0.375rem', background: isSel ? '#ede9fe' : '#eef2ff', color: isSel ? '#7c3aed' : '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700, border: `1px solid ${isSel ? '#ddd6fe' : '#e0e7ff'}`, flexShrink: 0 }}>{s.student_id}</div>
                        <span style={{ fontWeight: 600, color: '#1e293b' }}>{s.name}</span>
                      </div>
                    </td>
                    <td className="table-body-cell" style={{ color: '#64748b' }}>{s.email}</td>
                    <td className="table-body-cell"><span className="badge badge-blue">{s.class_name}</span></td>
                    <td className="table-body-cell"><span className="badge badge-green"><CheckCircle2 size={10} />Đã xác thực</span></td>
                    <td className="table-body-cell">
                      <div style={{ display: 'flex', gap: '0.375rem' }}>
                        <button onClick={() => startEdit(s)} className="btn-sm btn-secondary"><Pencil size={13} />Sửa</button>
                        <button onClick={() => setDeleteTarget(s)} className="btn-sm" style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fee2e2' }}><Trash2 size={13} />Xóa</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

/* ─────────────────────────────────────── GRADE TAB ── */
function GradeTab({ grades, students, catClasses, catSubjects, catAcademicYears = [], headers, refresh }) {
  const classes = catClasses && catClasses.length > 0 ? catClasses : [];
  const subjects = catSubjects && catSubjects.length > 0 ? catSubjects : [];

  const semesters = ['Học kỳ 1', 'Học kỳ 2', 'Học kỳ 3', 'Học kỳ 4'];
  const [selectedClass, setSelectedClass] = useState(classes[0] || '');
  const [subject, setSubject] = useState(subjects[0] || '');
  const [semester, setSemester] = useState(semesters[0]);
  const [academicYear, setAcademicYear] = useState('');
  const [localGrades, setLocalGrades] = useState({});
  const [savingId, setSavingId] = useState(null);

  const academicYears = catAcademicYears || [];
  
  useEffect(() => {
    if (academicYears.length > 0 && !academicYear) {
      setAcademicYear(academicYears[0].year_name);
    }
  }, [academicYears]);

  useEffect(() => {
    setLocalGrades({});
  }, [selectedClass, subject, semester, academicYear]);

  const filteredStudents = students.filter(s => s.class_name === selectedClass);

  const handleInputChange = (studentId, field, value) => {
    setLocalGrades(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [field]: value
      }
    }));
  };

  const getMergedGrade = (studentId) => {
    const savedGrade = grades.find(g => g.student_id === studentId && g.subject === subject && g.semester === semester && g.academic_year === academicYear);
    return { ...(savedGrade || {}), ...(localGrades[studentId] || {}) };
  };

  const getComputedAvg = (studentId) => {
    const g = getMergedGrade(studentId);
    let txSum = 0; let txCount = 0;
    ['tx1', 'tx2', 'tx3', 'tx4', 'tx5'].forEach(k => {
      const v = parseFloat(g[k]);
      if (!isNaN(v)) { txSum += v; txCount++; }
    });
    const gk = parseFloat(g.gk);
    const ck = parseFloat(g.ck);
    let totalWeight = txCount;
    let totalScore = txSum;

    if (!isNaN(gk)) { totalScore += gk * 2; totalWeight += 2; }
    if (!isNaN(ck)) { totalScore += ck * 3; totalWeight += 3; }

    return totalWeight > 0 ? (totalScore / totalWeight).toFixed(1) : '';
  };

  const handleSave = async (studentId) => {
    const score = getComputedAvg(studentId);
    if (!score) return;
    setSavingId(studentId);
    const g = getMergedGrade(studentId);
    try {
      await axios.post(`${API}/api/grades`, { 
        student_id: studentId, subject, semester, academic_year: academicYear, score,
        tx1: g.tx1, tx2: g.tx2, tx3: g.tx3, tx4: g.tx4, tx5: g.tx5, gk: g.gk, ck: g.ck
      }, { headers });
      refresh();
    } catch {
      await showMessageBox({ type: 'alert', title: 'Lỗi', desc: 'Lỗi khi lưu điểm' });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      {/* Thanh công cụ / Khung Filter */}
      <div style={{ padding: '0.75rem 1rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', fontSize: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontWeight: 600, color: '#334155' }}>Lớp:</span>
          <select className="input" style={{ width: '6rem', padding: '0.2rem 0.5rem', height: '2rem' }} value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
            {classes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontWeight: 600, color: '#334155' }}>Năm học:</span>
          <select className="input" style={{ width: '8.5rem', padding: '0.2rem 0.5rem', height: '2rem' }} value={academicYear} onChange={e => setAcademicYear(e.target.value)}>
            {academicYears.map(y => <option key={y.id} value={y.year_name}>{y.year_name}</option>)}
            {academicYears.length === 0 && <option value="">Chưa có năm học</option>}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontWeight: 600, color: '#334155' }}>Học kỳ:</span>
          <select className="input" style={{ width: '7.5rem', padding: '0.2rem 0.5rem', height: '2rem' }} value={semester} onChange={e => setSemester(e.target.value)}>
            {semesters.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontWeight: 600, color: '#334155' }}>Môn:</span>
          <select className="input" style={{ width: '8rem', padding: '0.2rem 0.5rem', height: '2rem' }} value={subject} onChange={e => setSubject(e.target.value)}>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontWeight: 600, color: '#334155' }}>Học kỳ:</span>
          <select className="input" style={{ width: '8rem', padding: '0.2rem 0.5rem', height: '2rem' }} value={semester} onChange={e => setSemester(e.target.value)}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
              <option key={num} value={`Học kỳ ${num}`}>Học kỳ {num}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="p-6 border-b border-slate-100 bg-white">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-2 h-6 bg-rose-500 rounded-full" />
          <h3 className="font-black text-slate-900 uppercase tracking-tight">
            Sổ điểm chi tiết {selectedClass ? `— Lớp ${selectedClass}` : ''} {subject ? `— Môn ${subject}` : ''}
          </h3>
        </div>
        <p className="text-slate-400 text-xs font-medium">
          Hệ thống ghi nhận điểm trực tiếp vào cơ sở dữ liệu và đồng bộ hóa với sổ cái Blockchain. 
          <span className="text-indigo-600 ml-1">Điểm trung bình được tính tự động theo trọng số quy định.</span>
        </p>
      </div>

      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-center text-sm border-collapse min-w-[1000px]">
          <thead className="bg-[#f8fafc] border-b border-slate-200">
            <tr>
              <th rowSpan="2" className="px-4 py-4 font-bold text-slate-400 text-[10px] uppercase border-r border-slate-100">STT</th>
              <th rowSpan="2" className="px-4 py-4 font-bold text-slate-800 border-r border-slate-100 sticky left-0 bg-[#f8fafc] z-10">Mã SV / Họ tên</th>
              <th colSpan="5" className="px-4 py-3 font-bold text-slate-400 text-[10px] uppercase border-b border-slate-100">Điểm thường xuyên (TX)</th>
              <th rowSpan="2" className="px-4 py-4 font-bold text-slate-400 text-[10px] uppercase border-r border-slate-100">Giữa kỳ</th>
              <th rowSpan="2" className="px-4 py-4 font-bold text-slate-400 text-[10px] uppercase border-r border-slate-100">Cuối kỳ</th>
              <th rowSpan="2" className="px-4 py-4 font-bold text-indigo-600 bg-indigo-50/30 border-r border-slate-100">ĐTB</th>
              <th rowSpan="2" className="px-4 py-4 font-bold text-slate-400 text-[10px] uppercase">Hành động</th>
            </tr>
            <tr>
              {['TX1', 'TX2', 'TX3', 'TX4', 'TX5'].map(tx => (
                <th key={tx} className="px-2 py-3 font-bold text-slate-400 text-[10px] border-r border-slate-100">{tx}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredStudents.length === 0 ? (
              <tr><td colSpan="13" className="py-20 text-slate-400 bg-slate-50/50 italic">Không có sinh viên nào trong lớp {selectedClass}.</td></tr>
            ) : filteredStudents.map((s, i) => {
              const savedGrade = grades.find(g => g.student_id === s.student_id && g.subject === subject && g.semester === semester && g.academic_year === academicYear);
              const avg = getComputedAvg(s.student_id);
              const gState = { ...(savedGrade || {}), ...(localGrades[s.student_id] || {}) };
              const isSaving = savingId === s.student_id;

              return (
                <tr key={s.student_id} className="hover:bg-slate-50/30 transition-colors group">
                  <td className="px-4 py-4 border-r border-slate-100 text-slate-400 font-mono text-xs">{String(i + 1).padStart(2, '0')}</td>
                  <td className="px-4 py-4 border-r border-slate-100 text-left sticky left-0 bg-white group-hover:bg-slate-50/50 z-10">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900">{s.name}</span>
                      <span className="text-[10px] font-mono text-slate-400 uppercase">{s.student_id}</span>
                    </div>
                  </td>
                  {['tx1', 'tx2', 'tx3', 'tx4', 'tx5', 'gk', 'ck'].map(k => (
                    <td key={k} className="px-2 py-4 border-r border-slate-100">
                      <GradeInput value={gState[k]} onChange={v => handleInputChange(s.student_id, k, v)} />
                    </td>
                  ))}

                  <td className="px-4 py-4 font-black bg-indigo-50/20 text-indigo-600 text-base border-r border-slate-100">
                    {avg || (savedGrade ? parseFloat(savedGrade.score).toFixed(1) : '-')}
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex gap-2 items-center justify-center">
                      <button onClick={() => handleSave(s.student_id)} disabled={isSaving || !avg} 
                        className="btn-sm btn-primary min-w-[4rem] h-8">
                        {isSaving ? <Loader2 size={12} className="animate-spin" /> : 'Lưu'}
                      </button>
                      {savedGrade && (
                        <div className="flex items-center gap-1">
                          {savedGrade.blockchainStatus === 'Valid' ? (
                            <CheckCircle2 size={16} className="text-emerald-500" title="Đã ghi vào Blockchain" />
                          ) : (
                            <AlertCircle size={16} className="text-rose-500" title="Dữ liệu sai lệch" />
                          )}
                          
                          {savedGrade.hash && savedGrade.blockchainStatus !== 'Revoked' && (
                            <button title="Thu hồi điểm"
                              onClick={async () => {
                                const reason = await showMessageBox({ type: 'prompt', title: 'Thu hồi điểm số', desc: `Lý do thu hồi:`, defaultValue: '' });
                                if (!reason) return;
                                const ok = await showMessageBox({ type: 'confirm', title: 'Xác nhận', desc: `Thu hồi điểm môn ${subject} của ${s.name}?` });
                                if (!ok) return;
                                try {
                                  await axios.post(`${API}/api/admin/revoke`, { hash: savedGrade.hash, reason }, { headers });
                                  refresh();
                                } catch (e) { console.error(e); }
                              }}
                              className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded transition-all">
                              <Ban size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle = { border: '1px solid #cbd5e1', padding: '0.5rem', color: '#1e293b', fontWeight: 600 };
const tdStyle = { border: '1px solid #cbd5e1', padding: '0', height: '2.5rem', verticalAlign: 'middle' };

function GradeInput({ value, onChange }) {
  return (
    <input
      type="number" step="0.1"
      placeholder="-"
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      className="w-12 h-8 text-center bg-transparent border border-transparent hover:border-slate-200 focus:border-indigo-500 focus:bg-white rounded outline-none transition-all font-medium text-slate-700"
    />
  );
}

/* ─────────────────────────────────────── CERT TAB ── */
function CertTab({ certs, headers, refresh }) {
  const [open, setOpen] = useState(false);

  const handleAdd = async (v) => {
    try {
      await axios.post(`${API}/api/certificates`, { student_id: v.id, cert_name: v.name, issue_date: v.date }, { headers });
      setOpen(false); refresh();
    } catch { await showMessageBox({ type: 'alert', title: 'Lỗi', desc: 'Lỗi khi cấp chứng chỉ' }); }
  };

  const handleDelete = async (c) => {
    const ok = await showMessageBox({
      type: 'confirm',
      title: 'Xóa chứng chỉ?',
      desc: `Chứng chỉ "${c.cert_name}" của sinh viên ${c.student_id} sẽ bị xóa vĩnh viễn khỏi cơ sở dữ liệu. Hành động này không thể hoàn tác.`
    });
    if (!ok) return;
    try {
      await axios.delete(`${API}/api/certificates/${c.id}`, { headers });
      await showMessageBox({ type: 'alert', title: 'Đã xóa', desc: `Chứng chỉ "${c.cert_name}" đã được xóa khỏi hệ thống.` });
      refresh();
    } catch (e) {
      await showMessageBox({ type: 'alert', title: 'Lỗi', desc: e.response?.data?.error || 'Lỗi khi xóa chứng chỉ' });
    }
  };

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ fontWeight: 700, color: '#0f172a' }}>Chứng chỉ & Văn bằng</h3>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>Dữ liệu bất biến, toàn vẹn với SHA-256</p>
        </div>
        <button onClick={() => setOpen(v => !v)} className="btn-sm btn-primary"><Plus size={14} /> Cấp văn bằng</button>
      </div>

      <AnimatePresence>
        {open && <AddForm fields={[
          { key: 'id', label: 'MSSV', placeholder: 'SV-001' },
          { key: 'name', label: 'Tên văn bằng', placeholder: 'Bằng tốt nghiệp CNTT' },
          { key: 'date', label: 'Ngày cấp', type: 'date' },
        ]} onSubmit={handleAdd} onCancel={() => setOpen(false)} submitLabel="Ký số SHA-256" />}
      </AnimatePresence>

      {certs.length === 0 ? (
        <EmptyState icon={<Scroll size={24} style={{ color: '#cbd5e1' }} />} title="Chưa có chứng chỉ" desc="Phát hành chứng chỉ đầu tiên được bảo vệ bởi Blockchain." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(18rem, 1fr))', gap: '1rem', padding: '1.5rem' }}>
          {certs.map((c, i) => {
            const valid = c.blockchainStatus === 'Valid';
            return (
              <div key={i} className="card-hover" style={{ padding: '1.25rem', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', right: '-1.5rem', bottom: '-1.5rem', width: '6rem', height: '6rem', background: '#eef2ff', borderRadius: '9999px', opacity: 0.5 }} />
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '2.5rem', height: '2.5rem', background: '#eef2ff', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e0e7ff' }}>
                      <Scroll size={18} style={{ color: '#4f46e5' }} />
                    </div>
                    <div>
                      <p style={{ fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>{c.cert_name}</p>
                      <p style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>Academic Certificate</p>
                    </div>
                  </div>
                  {valid
                    ? <span className="badge badge-green"><CheckCircle2 size={10} />Secure</span>
                    : c.isRevoked
                      ? <span className="badge" style={{ background: '#fff7ed', color: '#f97316', border: '1px solid #fed7aa' }}><Ban size={10} />Revoked</span>
                      : <span className="badge badge-red"><XCircle size={10} />Tampered</span>
                  }
                </div>
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', position: 'relative', zIndex: 1 }}>
                  <CertRow label="Sinh viên" value={c.student_id} />
                  <CertRow label="Ngày cấp" value={c.issue_date} />
                  {valid && c.hash && (
                    <button
                      onClick={async () => {
                        const reason = await showMessageBox({ type: 'prompt', title: 'Thu hồi chứng chỉ', desc: `Nhập lý do thu hồi chứng chỉ "${c.cert_name}":`, defaultValue: '' });
                        if (!reason) return;
                        const ok = await showMessageBox({ type: 'confirm', title: 'Xác nhận thu hồi', desc: `Bạn chắc chắn muốn thu hồi chứng chỉ "${c.cert_name}"? Hành động này không thể hoàn tác.` });
                        if (!ok) return;
                        try {
                          await axios.post(`${API}/api/admin/revoke`, { hash: c.hash, reason }, { headers });
                          await showMessageBox({ type: 'alert', title: 'Thu hồi thành công', desc: `Chứng chỉ "${c.cert_name}" đã được ghi nhận là thu hồi trên Blockchain.` });
                          refresh();
                        } catch (e) { await showMessageBox({ type: 'alert', title: 'Lỗi', desc: e.response?.data?.error || 'Lỗi khi thu hồi chứng chỉ' }); }
                      }}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', padding: '0.375rem 0.75rem', background: '#fff7ed', color: '#f97316', border: '1px solid #fed7aa', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                      <Ban size={12} /> Thu hồi chứng chỉ
                    </button>
                  )}
                  {/* Xóa chứng chỉ khỏi DB */}
                  <button
                    onClick={() => handleDelete(c)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', padding: '0.375rem 0.75rem', background: '#fef2f2', color: '#ef4444', border: '1px solid #fee2e2', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                    <Trash2 size={12} /> Xóa chứng chỉ
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CertRow({ label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
      <span style={{ color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      <span style={{ fontWeight: 700, color: '#334155' }}>{value}</span>
    </div>
  );
}

/* ─────────────────────────────────────── CATALOG TAB ── */
function CatalogTab({ headers, refresh, academicYears = [], majors = [], batches = [] }) {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    axios.get(`${API}/api/classes`, { headers }).then(res => setClasses(res.data)).catch(() => { });
    axios.get(`${API}/api/subjects`, { headers }).then(res => setSubjects(res.data)).catch(() => { });
  }, [refresh]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(20rem, 1fr))', gap: '1.5rem' }}>
      <CatalogPanel title="Quản lý Lớp" endpoint="/api/classes" data={classes} field="class_name" headers={headers} refresh={refresh} />
      <CatalogPanel title="Quản lý Môn" endpoint="/api/subjects" data={subjects} field="subject_name" headers={headers} refresh={refresh} />
      <CatalogPanel title="Quản lý Năm học" endpoint="/api/academic-years" data={academicYears} field="year_name" headers={headers} refresh={refresh} />
      <CatalogPanel title="Quản lý Ngành học" endpoint="/api/majors" data={majors} field="major_name" headers={headers} refresh={refresh} />
      
      {/* Khóa học Panel với các trường mở rộng */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>Quản lý Khóa học</h3>
        <AddBatchForm headers={headers} refresh={refresh} />
        <div style={{ marginTop: '1rem' }}>
          {batches.map(b => (
            <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <span style={{ fontWeight: 600 }}>{b.batch_name}</span>
                <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '0.5rem' }}>({b.start_year} - {b.end_year})</span>
              </div>
              <button onClick={async () => {
                if (confirm('Xóa khóa này?')) {
                   await axios.delete(`${API}/api/batches/${b.id}`, { headers });
                   refresh();
                }
              }} className="btn-sm" style={{ color: '#ef4444', background: '#fef2f2' }}><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      </div>

      <AccountPanel headers={headers} />
    </div>
  );
}

function AddBatchForm({ headers, refresh }) {
  const [val, setVal] = useState({ name: '', start: '', end: '' });
  const handle = async () => {
    if (!val.name || !val.start || !val.end) return;
    try {
      await axios.post(`${API}/api/batches`, { batch_name: val.name, start_year: val.start, end_year: val.end }, { headers });
      setVal({ name: '', start: '', end: '' }); refresh();
    } catch (e) { alert(e.response?.data?.error || 'Lỗi'); }
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <input className="input" value={val.name} onChange={e => setVal({...val, name: e.target.value})} placeholder="Tên khóa (K21...)" />
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input className="input" type="number" value={val.start} onChange={e => setVal({...val, start: e.target.value})} placeholder="Bắt đầu" />
        <input className="input" type="number" value={val.end} onChange={e => setVal({...val, end: e.target.value})} placeholder="Kết thúc" />
      </div>
      <button onClick={handle} className="btn-md btn-primary"><Plus size={14} /> Thêm khóa</button>
    </div>
  );
}

function AccountPanel({ headers }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const handleAdd = async () => {
    if (!username || !password) return;
    try {
      await axios.post(`${API}/api/users/teacher`, { username, password }, { headers });
      setUsername(''); setPassword('');
      await showMessageBox({ type: 'alert', title: 'Thành công', desc: 'Đã tạo tài khoản giáo viên thành công.' });
    } catch (e) {
      await showMessageBox({ type: 'alert', title: 'Lỗi', desc: e.response?.data?.error || 'Lỗi tạo tài khoản' });
    }
  };

  return (
    <div className="card" style={{ padding: '1.5rem' }}>
      <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>Cấp Tài khoản Giáo viên</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <input className="input" value={username} onChange={e => setUsername(e.target.value)} placeholder="Tên đăng nhập..." />
        <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mật khẩu..." />
        <button onClick={handleAdd} className="btn-md btn-primary" style={{ alignSelf: 'flex-start' }}><Plus size={14} /> Tạo tài khoản</button>
      </div>
    </div>
  );
}

function CatalogPanel({ title, endpoint, data, field, headers, refresh }) {
  const [val, setVal] = useState('');
  const handleAdd = async () => {
    if (!val.trim()) return;
    try {
      await axios.post(`${API}${endpoint}`, { [field]: val }, { headers });
      setVal(''); refresh();
    } catch (e) { await showMessageBox({ type: 'alert', title: 'Lỗi', desc: e.response?.data?.error || 'Lỗi thêm mới' }); }
  };
  const handleDelete = async (id) => {
    const ok = await showMessageBox({ type: 'confirm', title: 'Xác nhận xóa', desc: 'Bạn có chắc chắn muốn xóa mục này?' });
    if (ok) {
      try {
        await axios.delete(`${API}${endpoint}/${id}`, { headers });
        refresh();
      } catch (e) { await showMessageBox({ type: 'alert', title: 'Lỗi', desc: e.response?.data?.error || 'Lỗi xóa' }); }
    }
  };
  const handleEdit = async (id, oldVal) => {
    const newVal = await showMessageBox({ type: 'prompt', title: 'Cập nhật', desc: 'Nhập tên mới:', defaultValue: oldVal });
    if (newVal && newVal !== oldVal) {
      try {
        await axios.put(`${API}${endpoint}/${id}`, { [field]: newVal }, { headers });
        refresh();
      } catch (e) { await showMessageBox({ type: 'alert', title: 'Lỗi', desc: e.response?.data?.error || 'Lỗi cập nhật' }); }
    }
  };

  return (
    <div className="card" style={{ padding: '1.5rem' }}>
      <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>{title}</h3>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input className="input" style={{ flex: 1 }} value={val} onChange={e => setVal(e.target.value)} placeholder="Tên..." />
        <button onClick={handleAdd} className="btn-md btn-primary"><Plus size={14} /> Thêm</button>
      </div>
      <div>
        {data.map(item => (
          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ fontWeight: 600 }}>{item[field]}</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => handleEdit(item.id, item[field])} className="btn-sm btn-secondary"><Pencil size={13} /></button>
              <button onClick={() => handleDelete(item.id)} className="btn-sm" style={{ color: '#ef4444', background: '#fef2f2' }}><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
