import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Trash2, Pencil, Info } from 'lucide-react';

const MessageBox = ({ dialogOptions, onResolve }) => {
  const { type = 'alert', title, desc, defaultValue = '', confirmLabel, cancelLabel = 'Hủy' } = dialogOptions;
  const [open, setOpen] = useState(true);
  const [val, setVal] = useState(defaultValue);

  const handleClose = (result) => {
    setOpen(false);
    setTimeout(() => onResolve(result), 250); // wait for exit animation
  };

  const handleConfirm = () => handleClose(type === 'prompt' ? val : true);
  const handleCancel = () => handleClose(type === 'prompt' ? null : false);

  let icon = <Info size={22} style={{ color: '#3b82f6' }} />;
  let iconBg = '#eff6ff';
  let confColor = '#3b82f6';
  let defLabel = 'OK';

  if (type === 'confirm') {
    icon = <Trash2 size={22} style={{ color: '#ef4444' }} />;
    iconBg = '#fef2f2';
    confColor = '#ef4444';
    defLabel = 'Xác nhận';
  } else if (type === 'prompt') {
    icon = <Pencil size={22} style={{ color: '#8b5cf6' }} />;
    iconBg = '#f5f3ff';
    confColor = '#8b5cf6';
    defLabel = 'Đồng ý';
  } else if (type === 'alert') {
    icon = <AlertCircle size={22} style={{ color: '#eab308' }} />;
    iconBg = '#fefce8';
    confColor = '#eab308';
  }

  const actLabel = confirmLabel || defLabel;

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={handleCancel}
        >
          <motion.div initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }}
            onClick={e => e.stopPropagation()} className="card"
            style={{ padding: '1.5rem', maxWidth: '24rem', width: '100%', background: '#fff', overflow: 'hidden' }}
          >
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ width: '3rem', height: '3rem', background: iconBg, borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {icon}
              </div>
              <div style={{ flex: 1, paddingTop: '0.25rem' }}>
                <h3 style={{ fontWeight: 700, fontSize: '1.05rem', color: '#0f172a', marginBottom: '0.35rem' }}>{title}</h3>
                <p style={{ fontSize: '0.875rem', color: '#475569', marginBottom: '1.25rem', lineHeight: 1.5 }}>{desc}</p>

                {type === 'prompt' && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <input 
                      type="text" autoFocus
                      className="input" 
                      value={val} onChange={e => setVal(e.target.value)} 
                      style={{ width: '100%' }}
                      onKeyDown={e => e.key === 'Enter' && handleConfirm()}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  {type !== 'alert' && (
                    <button onClick={handleCancel} className="btn-md" style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}>
                      {cancelLabel}
                    </button>
                  )}
                  <button onClick={handleConfirm} className="btn-md" style={{ background: confColor, color: '#fff', border: `1px solid ${confColor}` }}>
                    {actLabel}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const showMessageBox = (options) => {
  return new Promise((resolve) => {
    const div = document.createElement('div');
    document.body.appendChild(div);
    const root = createRoot(div);

    const onResolve = (result) => {
      root.unmount();
      if (div.parentNode) div.parentNode.removeChild(div);
      resolve(result);
    };

    root.render(<MessageBox dialogOptions={options} onResolve={onResolve} />);
  });
};
