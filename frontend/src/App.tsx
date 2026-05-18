import { useState, useMemo, useCallback } from 'react';
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

  const { isConnected, isConnecting, connectWallet, hasInjectedWallet } = useWallet();

  const isMobile = useMemo(() => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent), []);

  const handleSelectWallet = async (type: 'injected' | 'walletconnect') => {
    try {
      setShowWalletSelection(false);
      await connectWallet(type);
    } catch (err) {
      console.error('Wallet connection failed:', err);
    }
  };

  const handleConnectClick = useCallback(() => {
    if (isConnected) return;
    if (isMobile || !hasInjectedWallet) {
      handleSelectWallet('walletconnect');
    } else {
      setShowWalletSelection(true);
    }
  }, [isConnected, isMobile, hasInjectedWallet]);

  return (
    <div className="app">
      <Header
        isMenuOpen={isSidePanelOpen}
        onMenuClick={() => setIsSidePanelOpen(prev => !prev)}
        onConnectClick={handleConnectClick}
      />
      <SidePanel isOpen={isSidePanelOpen} onClose={() => setIsSidePanelOpen(false)} />
      <div style={{ flex: 1 }}>
        <Routes>
          <Route
            path="/"
            element={<HomePage onConnectWallet={handleConnectClick} />}
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
  return (
    <HelmetProvider>
      <WalletProvider>
        <ImagesProvider>
          <BrowserRouter>
            <AppShell />
          </BrowserRouter>
        </ImagesProvider>
      </WalletProvider>
    </HelmetProvider>
  );
}

export default App;
