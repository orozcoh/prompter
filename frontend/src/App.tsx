import { useState, useEffect, useCallback } from 'react';
import { ImageUpload } from './components/ImageUpload';
import { PromptGallery } from './components/PromptGallery';
import { StatusIndicator, type GenerationStatus } from './components/StatusIndicator';
import { PaywallModal } from './components/PaywallModal';
import { WalletSelectionModal } from './components/WalletSelectionModal';
import Header from './components/Header';
import { useWallet, WalletProvider } from './context/WalletContext';
import { extractImageUrl } from './utils/extractImageUrl';
import './App.css';

interface Prompt {
  id: string;
  name: string;
  prompt: string;
  imageUrl: string;
}

interface GeneratedResult {
  imageUrl: string;
  promptId: string;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787';

const AppContent = () => {
  const [referenceImage, setReferenceImage] = useState<string>('');
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>('idle');
  const [result, setResult] = useState<GeneratedResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // x402 payment hook from context
  const {
    isPaying,
    isPaid,
    isConnecting,
    isConnected,
    isVerifying,
    error: paymentError,
    paymentRequired,
    walletAddress,
    txHash,
    connectWallet,
    signAndSendTransaction,
    verifyPayment,
    parsePaymentRequired,
    resetPayment,
    disconnectWallet,
  } = useWallet();

  // Track selected prompt for payment
  const [selectedPromptForPayment, setSelectedPromptForPayment] = useState<Prompt | null>(null);

  // Track wallet selection modal
  const [showWalletSelection, setShowWalletSelection] = useState(false);
  const [hasInjectedWallet, setHasInjectedWallet] = useState(false);

  // Detect injected wallet on mount
  useEffect(() => {
    setHasInjectedWallet(!!(typeof window !== 'undefined' && (window as any).ethereum));
  }, []);

  // Fetch prompts on mount
  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    try {
      const response = await fetch(`${API_BASE}/prompts`);
      const data = await response.json();
      setPrompts(data.prompts || []);
    } catch (err) {
      setError('Failed to load prompts');
    }
  };

  const handleGenerate = useCallback(async (prompt: Prompt) => {
    setGenerationStatus('generating');
    setError(null);
    setSelectedPromptForPayment(prompt);

    try {
      // First attempt without payment - only send promptId to get payment info
      const response = await fetch(`${API_BASE}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptId: prompt.id,
        }),
      });

      // Check if payment is required (402 status)
      if (response.status === 402) {
        const paymentReq = await parsePaymentRequired(response);
        if (paymentReq) {
          setGenerationStatus('payment_required');
          return; // Show paywall modal
        } else {
          throw new Error('Payment required but could not parse payment details');
        }
      }

      // Process successful response
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Generation failed');
      }

      // Extract image URL from API response
      const imageUrl = extractImageUrl(data.apiResponse);
      if (!imageUrl) {
        throw new Error('No image found in API response');
      }

      setResult({
        imageUrl,
        promptId: prompt.id,
      });

      setGenerationStatus('completed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
      setGenerationStatus('error');
    }
  }, [referenceImage, parsePaymentRequired]);

  const handleGenerateWithPayment = useCallback(async () => {
    if (!paymentRequired || !selectedPromptForPayment) return;

    try {
      // Get payment details from the scheme
      const scheme = paymentRequired.schemes[0];
      if (!scheme || !scheme.payTo || !scheme.amount) {
        throw new Error('Invalid payment details');
      }

      // Sign and send USDC transfer transaction
      const hash = await signAndSendTransaction({
        payTo: scheme.payTo,
        amount: scheme.amount,
      });

      // Verify payment with worker and generate image
      const response = await verifyPayment(
        hash,
        selectedPromptForPayment.id,
        referenceImage
      );

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Generation failed');
      }

      // Extract image URL from API response
      const imageUrl = extractImageUrl(data.apiResponse);
      if (!imageUrl) {
        throw new Error('No image found in API response');
      }

      setResult({
        imageUrl,
        promptId: selectedPromptForPayment.id,
      });

      setGenerationStatus('completed');
      resetPayment();
      setSelectedPromptForPayment(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment/Generation failed');
      setGenerationStatus('error');
    }
  }, [paymentRequired, selectedPromptForPayment, referenceImage, signAndSendTransaction, verifyPayment, resetPayment, extractImageUrl]);

  const handleClosePaywall = useCallback(() => {
    resetPayment();
    setSelectedPromptForPayment(null);
    setSelectedPrompt(null);
    setGenerationStatus('idle');
  }, [resetPayment]);

  const handleConnectWallet = async () => {
    // Show wallet selection modal
    setShowWalletSelection(true);
  };

  const handleStatusBarClick = () => {
    if (!isConnected) {
      setShowWalletSelection(true);
    }
  };

  const handleSelectWallet = async (type: 'injected' | 'walletconnect') => {
    try {
      // For injected wallets, we can close the selection modal immediately
      if (type === 'injected') {
        setShowWalletSelection(false);
      }
      
      // For WalletConnect, we keep the selection modal open (or in loading state)
      // until the WalletConnect QR modal is triggered.
      await connectWallet(type);
      
      // Close modal on success for injected wallets
      if (type === 'injected') {
        setShowWalletSelection(false);
      }
    } catch (err) {
      // Error is handled in the hook - keep modal open for retry
      console.error('Wallet connection failed:', err);
    }
  };

  const handleCloseWalletSelection = useCallback(() => {
    setShowWalletSelection(false);
  }, []);

  const downloadImage = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `generated-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      // Silently ignore download errors
    }
  };

  const handleSelectPrompt = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    handleGenerate(prompt);
  };

  const handleReset = () => {
    setResult(null);
    setGenerationStatus('idle');
    setError(null);
    resetPayment();
    setSelectedPromptForPayment(null);
    setSelectedPrompt(null);
  };

  return (
    <div className="app">
      <Header onMenuClick={() => console.log('Menu clicked')} onConnectClick={handleStatusBarClick} />

      <main className="app-main">
        <div className="upload-section">
          <ImageUpload onImageSelect={setReferenceImage} />
        </div>

        <div className="gallery-section">
          <PromptGallery
            prompts={prompts}
            selectedPrompt={selectedPrompt}
            onSelectPrompt={handleSelectPrompt}
          />
        </div>

        <div className="status-section">
          <StatusIndicator status={generationStatus} error={error} />
        </div>

        {result && (
          <div className="result-section">
            <h3>Generated Image</h3>
            <img src={result.imageUrl} alt="Generated result" />
            <div className="result-actions">
              <button className="button primary" onClick={() => downloadImage(result.imageUrl)}>
                <svg className="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Download
              </button>
              <button className="button secondary" onClick={handleReset}>
                Generate Another
              </button>
            </div>
          </div>
        )}

        {/* Paywall Modal */}
        <PaywallModal
          isOpen={generationStatus === 'payment_required'}
          paymentRequired={paymentRequired}
          isConnecting={isConnecting}
          isPaying={isPaying}
          isConnected={isConnected}
          isPaid={isPaid}
          isVerifying={isVerifying}
          walletAddress={walletAddress}
          txHash={txHash}
          error={paymentError}
          onConnectWallet={handleConnectWallet}
          onPayAndGenerate={handleGenerateWithPayment}
          onClose={handleClosePaywall}
        />

        {/* Wallet Selection Modal */}
        <WalletSelectionModal
          isOpen={showWalletSelection}
          isConnecting={isConnecting}
          hasInjectedWallet={hasInjectedWallet}
          onSelectWallet={handleSelectWallet}
          onClose={handleCloseWalletSelection}
        />
      </main>
    </div>
  );
}

function App() {
  return (
    <WalletProvider>
      <AppContent />
    </WalletProvider>
  );
}

export default App;