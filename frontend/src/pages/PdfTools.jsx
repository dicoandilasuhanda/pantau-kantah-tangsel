import { useState } from 'react';
import { Layers, Scissors, Minimize2, Image as ImageIcon, RotateCw, Info } from 'lucide-react';
import MergePdfTab from '../components/pdf/MergePdfTab';
import SplitPdfTab from '../components/pdf/SplitPdfTab';
import CompressPdfTab from '../components/pdf/CompressPdfTab';
import ImageToPdfTab from '../components/pdf/ImageToPdfTab';
import RotatePdfTab from '../components/pdf/RotatePdfTab';
import PdfZoomModal from '../components/pdf/PdfZoomModal';

const PDF_TABS = [
  { id: 'merge', label: 'Gabung PDF', Icon: Layers },
  { id: 'split', label: 'Pisah PDF', Icon: Scissors },
  { id: 'compress', label: 'Kompres PDF', Icon: Minimize2 },
  { id: 'image-to-pdf', label: 'Gambar ke PDF', Icon: ImageIcon },
  { id: 'rotate', label: 'Putar PDF', Icon: RotateCw },
];

export default function PdfTools() {
  const [activeTab, setActiveTab] = useState('merge');
  const [processing, setProcessing] = useState(false);
  const [zoomPreviewUrl, setZoomPreviewUrl] = useState(null);
  const [zoomPreviewTitle, setZoomPreviewTitle] = useState('');

  const handleZoomPreview = (url, title) => {
    setZoomPreviewUrl(url);
    setZoomPreviewTitle(title);
  };

  return (
    <div className="container animate-fade-in" style={{ maxWidth: '1100px', margin: '0 auto', padding: '1.5rem 1.5rem 5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--surface-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '0.85rem 1.25rem', marginBottom: '2rem', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
        <Info size={20} color="#1D4ED8" style={{ flexShrink: 0 }} />
        <div>
          <strong style={{ color: 'var(--text-main)' }}>Jaminan Keamanan Dokumen Dinas:</strong> Pratinjau dan pemrosesan berkas PDF dirender 100% secara lokal di peramban Anda. Dokumen tidak pernah diunggah ke internet atau server luar.
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '1.75rem', borderBottom: '1px solid var(--border-color)' }}>
        {PDF_TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={activeTab === id ? '' : 'secondary'}
            style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.1rem', fontSize: '0.875rem' }}
          >
            <Icon size={17} /> {label}
          </button>
        ))}
      </div>

      <MergePdfTab
        isActive={activeTab === 'merge'}
        processing={processing}
        setProcessing={setProcessing}
        onZoomPreview={handleZoomPreview}
      />
      <SplitPdfTab
        isActive={activeTab === 'split'}
        processing={processing}
        setProcessing={setProcessing}
        onZoomPreview={handleZoomPreview}
      />
      <CompressPdfTab
        isActive={activeTab === 'compress'}
        processing={processing}
        setProcessing={setProcessing}
        onZoomPreview={handleZoomPreview}
      />
      <ImageToPdfTab
        isActive={activeTab === 'image-to-pdf'}
        processing={processing}
        setProcessing={setProcessing}
        onZoomPreview={handleZoomPreview}
      />
      <RotatePdfTab
        isActive={activeTab === 'rotate'}
        processing={processing}
        setProcessing={setProcessing}
        onZoomPreview={handleZoomPreview}
      />

      <PdfZoomModal
        previewUrl={zoomPreviewUrl}
        previewTitle={zoomPreviewTitle}
        onClose={() => setZoomPreviewUrl(null)}
      />
    </div>
  );
}
