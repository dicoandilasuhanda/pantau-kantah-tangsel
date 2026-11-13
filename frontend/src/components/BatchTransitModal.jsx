import { Send, X, Loader2 } from 'lucide-react';

export default function BatchTransitModal({
  isOpen,
  sendableSelected,
  usersList,
  batchTransitTarget,
  onSelectTarget,
  batchTransitSearch,
  onSearchChange,
  batchProcessing,
  onClose,
  onSubmit,
}) {
  if (!isOpen) return null;

  const query = batchTransitSearch.toLowerCase();
  const filteredUsers = usersList.filter(
    (u) =>
      (u.full_name || u.username).toLowerCase().includes(query) ||
      (u.role || '').toLowerCase().includes(query)
  );

  return (
    <div
      onClick={() => !batchProcessing && onClose()}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '1.5rem',
          width: '100%',
          maxWidth: '480px',
          boxShadow: '0 20px 40px -10px rgba(0,0,0,0.4)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Send size={20} color="#1D4ED8" />
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>
              Kirim Berkas Secara Batch ({sendableSelected.length} Berkas)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={batchProcessing}
            style={{
              width: 'auto',
              background: 'transparent',
              border: 'none',
              padding: '0.25rem',
              margin: 0,
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div
          style={{
            background: 'var(--surface-subtle, rgba(29, 78, 216, 0.06))',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '0.6rem 0.85rem',
            marginBottom: '0.9rem',
            maxHeight: '110px',
            overflowY: 'auto',
            fontSize: '0.8rem',
            color: 'var(--text-main)',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '0.3rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            Daftar berkas yang akan dikirim:
          </div>
          {sendableSelected.map((f) => (
            <div key={f.qr_code} style={{ padding: '0.15rem 0', display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
              <strong>{f.nomor_berkas}/{f.tahun_berkas}</strong>
              <span style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {f.nama_pemohon}
              </span>
            </div>
          ))}
        </div>

        <p style={{ margin: '0 0 0.45rem 0', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
          Pilih Petugas Tujuan:
        </p>
        <input
          type="text"
          placeholder="Cari nama atau jabatan petugas..."
          value={batchTransitSearch}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{
            width: '100%',
            marginBottom: '0.6rem',
            padding: '0.6rem 0.85rem',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-color)',
            color: 'var(--text-main)',
            fontSize: '0.85rem',
          }}
        />

        <div
          style={{
            maxHeight: '210px',
            overflowY: 'auto',
            marginBottom: '1.1rem',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            background: 'var(--bg-color)',
          }}
        >
          {filteredUsers.map((u) => {
            const isChosen = batchTransitTarget === u.username;
            return (
              <div
                key={u.username}
                onClick={() => onSelectTarget(u.username)}
                style={{
                  padding: '0.7rem 0.9rem',
                  cursor: 'pointer',
                  background: isChosen ? '#1D4ED8' : 'transparent',
                  color: isChosen ? '#ffffff' : 'var(--text-main)',
                  borderBottom: '1px solid var(--border-color)',
                  transition: 'background 0.15s',
                }}
              >
                <div style={{ fontSize: '0.88rem', fontWeight: isChosen ? 700 : 600 }}>
                  {u.full_name || u.username}
                </div>
                <div style={{ fontSize: '0.75rem', opacity: isChosen ? 0.92 : 0.7, marginTop: '0.15rem' }}>
                  {u.role}
                </div>
              </div>
            );
          })}
          {filteredUsers.length === 0 && (
            <div style={{ padding: '1rem', fontSize: '0.84rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              Petugas tidak ditemukan
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
          <button
            type="button"
            className="secondary"
            onClick={onClose}
            disabled={batchProcessing}
            style={{ width: 'auto', padding: '0.55rem 1.1rem', fontSize: '0.85rem', margin: 0 }}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={batchProcessing || !batchTransitTarget}
            style={{
              width: 'auto',
              background: '#1D4ED8',
              color: '#fff',
              border: 'none',
              padding: '0.55rem 1.2rem',
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              margin: 0,
            }}
          >
            {batchProcessing ? <Loader2 size={15} className="spin" /> : <Send size={15} />}
            {batchProcessing ? 'Mengirim...' : `Kirim ${sendableSelected.length} Berkas`}
          </button>
        </div>
      </div>
    </div>
  );
}
