import { FileText, X } from 'lucide-react';

export default function PdfZoomModal({ previewUrl, previewTitle, onClose }) {
  if (!previewUrl) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          maxWidth: '850px',
          maxHeight: '90vh',
          width: '100%',
          background: '#0F172A',
          border: '1px solid #334155',
          borderRadius: '16px',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
            paddingBottom: '0.75rem',
            borderBottom: '1px solid #334155',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#F8FAFC',
              fontWeight: 600,
              fontSize: '0.95rem',
            }}
          >
            <FileText size={18} color="#38BDF8" />
            <span
              style={{
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '650px',
              }}
            >
              {previewTitle || 'Pratinjau Dokumen'}
            </span>
          </div>
          <button
            type="button"
            className="secondary"
            onClick={onClose}
            aria-label="Tutup pratinjau"
            style={{
              padding: '0.35rem',
              width: 'auto',
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflow: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(30, 41, 59, 0.75)',
            borderRadius: '8px',
            padding: '0.75rem',
          }}
        >
          <img
            src={previewUrl}
            alt="Pratinjau Besar"
            style={{
              maxWidth: '100%',
              maxHeight: '70vh',
              objectFit: 'contain',
              borderRadius: '4px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            }}
          />
        </div>
      </div>
    </div>
  );
}
