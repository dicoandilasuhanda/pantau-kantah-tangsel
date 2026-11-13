import { createPortal } from 'react-dom';

export default function CloseReasonModal({
  isOpen,
  title,
  description,
  reason,
  onReasonChange,
  placeholder,
  onCancel,
  onConfirm,
  maxWidth = '400px',
}) {
  if (!isOpen) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <div className="glass-panel" style={{ width: maxWidth, padding: '2rem' }}>
        <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>{title}</h3>
        <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>{description}</p>
        <textarea
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: '100%',
            minHeight: '100px',
            padding: '0.75rem',
            marginBottom: '1.5rem',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            background: 'var(--input-bg)',
            color: 'var(--text-main)',
            resize: 'vertical',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button
            className="secondary"
            onClick={onCancel}
            style={{ width: 'auto', padding: '0.5rem 1rem' }}
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            style={{ width: 'auto', padding: '0.5rem 1rem', background: 'var(--warning-color)' }}
          >
            Konfirmasi Tutup
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
