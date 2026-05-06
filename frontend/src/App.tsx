import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Header from './components/Header';
import Footer from './components/Footer';
import SidePanel from './components/SidePanel';
import { WalletSelectionModal } from './components/WalletSelectionModal';
import { useWallet, WalletProvider } from './context/WalletContext';
import { ImagesProvider } from './context/ImagesContext';
import HomePage from './pages/HomePage';
import MyImagesPage from './pages/MyImagesPage';
import ConfigPage from './pages/ConfigPage';
import AboutPage from './pages/AboutPage';
import { useRegisterSW } from 'virtual:pwa-register/react';
import './App.css';

const NotFound = () => (
  <main className="app-main">
    <div className="page-placeholder">
      <h1>404 - Page Not Found</h1>
      <p>The page you're looking for doesn't exist.</p>
    </div>
  </main>
);

const AppShell = () => {
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [showWalletSelection, setShowWalletSelection] = useState(false);
  const [hasInjectedWallet, setHasInjectedWallet] = useState(false);

  const { isConnected, isConnecting, connectWallet } = useWallet();

  useEffect(() => {
    setHasInjectedWallet(!!(typeof window !== 'undefined' && (window as any).ethereum));
  }, []);

  const handleSelectWallet = async (type: 'injected' | 'walletconnect') => {
    try {
      if (type === 'injected') setShowWalletSelection(false);
      await connectWallet(type);
      if (type === 'injected') setShowWalletSelection(false);
    } catch (err) {
      console.error('Wallet connection failed:', err);
    }
  };

  return (
    <div className="app">
      <Header
        isMenuOpen={isSidePanelOpen}
        onMenuClick={() => setIsSidePanelOpen(prev => !prev)}
        onConnectClick={() => !isConnected && setShowWalletSelection(true)}
      />
      <SidePanel isOpen={isSidePanelOpen} onClose={() => setIsSidePanelOpen(false)} />
      <div style={{ flex: 1 }}>
        <Routes>
          <Route
            path="/"
            element={<HomePage onConnectWallet={() => setShowWalletSelection(true)} />}
          />
          <Route path="/myImages" element={<MyImagesPage />} />
          <Route path="/config" element={<ConfigPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      <Footer />
      <WalletSelectionModal
        isOpen={showWalletSelection}
        isConnecting={isConnecting}
        hasInjectedWallet={hasInjectedWallet}
        onSelectWallet={handleSelectWallet}
        onClose={() => setShowWalletSelection(false)}
      />
    </div>
  );
};

function App() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      if (r) {
        setInterval(async () => {
          if (r.installing || !navigator.onLine) return;
          const resp = await fetch(swUrl, { cache: 'no-store' });
          if (resp?.status === 200) await r.update();
        }, 60 * 60 * 1000);
      }
    },
  });

  return (
    <HelmetProvider>
      <WalletProvider>
        <ImagesProvider>
          <BrowserRouter>
            <AppShell />
          {needRefresh && (
            <div className="pwa-update-banner">
              <span>New version available</span>
              <button
                className="button primary"
                onClick={() => updateServiceWorker(true)}
              >
                Refresh
              </button>
              <button
                className="button secondary"
                onClick={() => setNeedRefresh(false)}
              >
                Dismiss
              </button>
            </div>
          )}
        </BrowserRouter>
      </ImagesProvider>
    </WalletProvider>
    </HelmetProvider>
  );
}

export default App;
