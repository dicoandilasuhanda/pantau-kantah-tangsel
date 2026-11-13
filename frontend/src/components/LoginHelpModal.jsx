import { HelpCircle, X } from 'lucide-react';

export default function LoginHelpModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="bpn-modal-overlay" onClick={onClose}>
      <div className="bpn-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="bpn-modal-header">
          <div className="bpn-modal-title-group">
            <HelpCircle size={20} color="#1D4ED8" />
            <h3>Bantuan &amp; Pemulihan Akun</h3>
          </div>
          <button
            type="button"
            className="bpn-modal-close"
            onClick={onClose}
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>
        <div className="bpn-modal-body">
          <p>
            Untuk reset kata sandi atau kendala akses akun Pantau.Kantah Tangsel, silakan hubungi Administrator IT internal Kantah Kota Tangerang Selatan, Admin Dico :
          </p>
          <div className="bpn-help-box">
            <p>• <strong>Lokasi:</strong> Ruang Server &amp; Pengolahan Data (Lantai 2)</p>
          </div>
        </div>
        <div className="bpn-modal-footer">
          <button
            type="button"
            className="bpn-modal-btn-primary"
            onClick={onClose}
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
