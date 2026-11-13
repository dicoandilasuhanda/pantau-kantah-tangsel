import { CheckCircle, Lock, Trash2 } from 'lucide-react';

export default function RecordRowActions({ isLocked, onComplete, onClose, onDelete }) {
  return (
    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', flexWrap: 'wrap' }}>
      <button
        onClick={onComplete}
        disabled={isLocked}
        style={{
          padding: '0.3rem 0.6rem',
          fontSize: '0.7rem',
          background: isLocked ? 'rgba(255,255,255,0.1)' : 'rgba(16, 185, 129, 0.1)',
          color: isLocked ? 'var(--text-muted)' : 'var(--accent-color)',
          border: `1px solid ${isLocked ? 'transparent' : 'var(--accent-color)'}`,
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.3rem',
          cursor: isLocked ? 'not-allowed' : 'pointer',
          flex: '1 1 auto',
        }}
      >
        <CheckCircle size={12} /> Selesai
      </button>

      <button
        onClick={onClose}
        disabled={isLocked}
        style={{
          padding: '0.3rem 0.6rem',
          fontSize: '0.7rem',
          background: isLocked ? 'rgba(255,255,255,0.1)' : 'rgba(245, 158, 11, 0.1)',
          color: isLocked ? 'var(--text-muted)' : 'var(--warning-color)',
          border: `1px solid ${isLocked ? 'transparent' : 'var(--warning-color)'}`,
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.3rem',
          cursor: isLocked ? 'not-allowed' : 'pointer',
          flex: '1 1 auto',
        }}
      >
        <Lock size={12} /> Tutup
      </button>

      <button
        onClick={onDelete}
        style={{
          padding: '0.3rem 0.6rem',
          fontSize: '0.7rem',
          background: 'rgba(239, 68, 68, 0.1)',
          color: 'var(--error-color)',
          border: '1px solid var(--error-color)',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.3rem',
          cursor: 'pointer',
          flex: '1 1 auto',
        }}
      >
        <Trash2 size={12} /> Hapus
      </button>
    </div>
  );
}
