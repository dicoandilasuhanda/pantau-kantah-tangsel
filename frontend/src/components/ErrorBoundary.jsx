import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[Pantau Kantah Tangsel] Terdeteksi Uncaught Error:', error, errorInfo);

    // Otomatisasi: Deteksi Chunk Load Error pasca update/deploy
    const errorMsg = (error && error.message) ? error.message.toLowerCase() : '';
    const isChunkError = 
      errorMsg.includes('failed to fetch dynamically imported module') ||
      errorMsg.includes('loading chunk') ||
      errorMsg.includes('chunkloaderror') ||
      errorMsg.includes('importing a module script failed');

    if (isChunkError) {
      const retryKey = 'chunk_error_auto_retried';
      if (!sessionStorage.getItem(retryKey)) {
        sessionStorage.setItem(retryKey, 'true');
        console.warn('[Pantau Kantah Tangsel] Memuat ulang otomatis karena pembaruan chunk modul...');
        const cleanUrl = window.location.origin + window.location.pathname + '?refresh=' + Date.now();
        window.location.replace(cleanUrl);
      }
    }
  }

  handleClearCacheAndReload = async () => {
    try {
      // 1. Bersihkan Cache Storage browser jika didukung
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // 2. Simpan preferensi tema sebelum reset
      const savedTheme = localStorage.getItem('theme');

      // 3. Bersihkan localStorage & sessionStorage
      localStorage.clear();
      sessionStorage.clear();

      if (savedTheme) {
        localStorage.setItem('theme', savedTheme);
      }

      // 4. Force reload dengan cache-buster timestamp
      const targetUrl = window.location.origin + window.location.pathname + '?reset=' + Date.now();
      window.location.href = targetUrl;
    } catch (err) {
      console.error('Gagal membersihkan cache otomatis:', err);
      window.location.reload();
    }
  };

  handleSimpleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const isChunk = 
        this.state.error?.message?.toLowerCase().includes('dynamically imported module') ||
        this.state.error?.message?.toLowerCase().includes('chunk');

      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          backgroundColor: 'var(--bg-color, #F8FAFC)',
          backgroundImage: 'var(--bg-pattern)',
          fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
          color: 'var(--text-main, #0F172A)',
          boxSizing: 'border-box'
        }}>
          <div style={{
            maxWidth: '540px',
            width: '100%',
            backgroundColor: 'var(--surface-card, #FFFFFF)',
            border: '1px solid var(--border-color, #E2E8F0)',
            borderRadius: '16px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            padding: '2rem',
            textAlign: 'center',
            boxSizing: 'border-box'
          }}>
            {/* Header Icon */}
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem auto'
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>

            <h2 style={{
              fontSize: '1.35rem',
              fontWeight: 700,
              margin: '0 0 0.5rem 0',
              color: 'var(--text-main, #0F172A)'
            }}>
              {isChunk ? 'Pembaruan Sistem Terdeteksi' : 'Terjadi Kendala Memuat Tampilan'}
            </h2>

            <p style={{
              fontSize: '0.92rem',
              lineHeight: 1.5,
              color: 'var(--text-muted, #64748B)',
              margin: '0 0 1.75rem 0'
            }}>
              {isChunk 
                ? 'Versi aplikasi telah diperbarui di server. Peramban Anda memerlukan penyegaran berkas agar halaman dapat ditampilkan dengan benar.'
                : 'Sistem mendeteksi adanya data cache atau sesi lama yang tidak sesuai pada peramban Anda. Anda dapat melakukan pemulihan otomatis di bawah ini.'}
            </p>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <button
                onClick={this.handleClearCacheAndReload}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  backgroundColor: '#1D4ED8',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1E40AF'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#1D4ED8'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                  <path d="M21 3v5h-5"></path>
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                  <path d="M8 16H3v5"></path>
                </svg>
                Bersihkan Cache & Pulihkan Otomatis
              </button>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={this.handleSimpleReload}
                  style={{
                    flex: 1,
                    padding: '0.65rem 0.75rem',
                    backgroundColor: 'transparent',
                    color: 'var(--text-main, #0F172A)',
                    border: '1px solid var(--border-color, #E2E8F0)',
                    borderRadius: '10px',
                    fontWeight: 500,
                    fontSize: '0.88rem',
                    cursor: 'pointer'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-hover, #F1F5F9)'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  Muat Ulang Halaman
                </button>
                <button
                  onClick={this.handleGoHome}
                  style={{
                    flex: 1,
                    padding: '0.65rem 0.75rem',
                    backgroundColor: 'transparent',
                    color: 'var(--text-main, #0F172A)',
                    border: '1px solid var(--border-color, #E2E8F0)',
                    borderRadius: '10px',
                    fontWeight: 500,
                    fontSize: '0.88rem',
                    cursor: 'pointer'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-hover, #F1F5F9)'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  Kembali ke Beranda
                </button>
              </div>
            </div>

            {/* Error Details Accordion */}
            <div style={{ borderTop: '1px solid var(--border-color, #E2E8F0)', paddingTop: '0.75rem', textAlign: 'left' }}>
              <button
                onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted, #64748B)',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <span>{this.state.showDetails ? '▼ Sembunyikan' : '▶ Tampilkan'} Informasi Teknis Kendala</span>
              </button>

              {this.state.showDetails && (
                <div style={{
                  marginTop: '0.5rem',
                  padding: '0.75rem',
                  backgroundColor: 'rgba(0, 0, 0, 0.05)',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  fontFamily: 'monospace',
                  overflowX: 'auto',
                  maxHeight: '160px',
                  color: '#EF4444'
                }}>
                  <strong>{this.state.error && this.state.error.toString()}</strong>
                  <pre style={{ margin: '0.5rem 0 0 0', whiteSpace: 'pre-wrap', color: 'var(--text-muted, #64748B)' }}>
                    {this.state.errorInfo && this.state.errorInfo.componentStack}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

