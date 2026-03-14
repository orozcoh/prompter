import { useState, useEffect, useCallback } from 'react';
import { ImageUpload } from './components/ImageUpload';
import { PromptGallery } from './components/PromptGallery';
import { PaymentModal } from './components/PaymentModal';
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

interface PricingConfig {
  baseCostUsdc: string;
  markupPercent: string;
  finalPriceUsdc: string;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787';

function App() {
  const [referenceImage, setReferenceImage] = useState<string>('');
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pricing, setPricing] = useState<PricingConfig | null>(null);

  // Fetch prompts and pricing on mount
  useEffect(() => {
    fetchPrompts();
    fetchPricing();
  }, []);

  const fetchPrompts = async () => {
    try {
      const response = await fetch(`${API_BASE}/prompts`);
      const data = await response.json();
      setPrompts(data.prompts || []);
    } catch (err) {
      setError('Failed to load prompts');
      console.error(err);
    }
  };

  const fetchPricing = async () => {
    try {
      const response = await fetch(`${API_BASE}/pricing`);
      const data = await response.json();
      setPricing(data);
    } catch (err) {
      console.error('Failed to load pricing:', err);
    }
  };

  // Get price in USDC (converts from 6-decimal to decimal string)
  const getPriceInUsdc = (): string => {
    if (!pricing?.finalPriceUsdc) return '1.00';
    // Convert from 6 decimals (e.g., "100000" -> "0.10")
    const value = BigInt(pricing.finalPriceUsdc);
    const divisor = BigInt(1000000);
    const whole = value / divisor;
    const fraction = value % divisor;
    // Pad fraction to 6 digits and remove trailing zeros
    const fractionStr = fraction.toString().padStart(6, '0').replace(/0+$/, '');
    return `${whole}.${fractionStr || '00'}`;
  };

  const handleGenerate = useCallback(async () => {
    if (!selectedPrompt) {
      setError('Please select a prompt style');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // First, complete payment via x402
      const paymentResponse = await fetch(`${API_BASE}/x402/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: pricing?.finalPriceUsdc || '1000000', // Dynamic price from API
          token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
          chainId: 8453, // Base
          payer: await getWalletAddress(),
          signature: await signPayment(),
          nonce: crypto.randomUUID(),
        }),
      });

      const paymentData = await paymentResponse.json();
      if (!paymentData.success) {
        throw new Error('Payment failed');
      }

      // Now generate the image with payment token
      const generateResponse = await fetch(`${API_BASE}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-authorization': `Bearer ${paymentData.paymentToken}`,
        },
        body: JSON.stringify({
          promptId: selectedPrompt.id,
          referenceImage,
        }),
      });

      const generateData = await generateResponse.json();
      if (!generateData.success) {
        throw new Error(generateData.error || 'Generation failed');
      }

      setResult({
        imageUrl: generateData.imageUrl,
        promptId: selectedPrompt.id,
      });

      // Auto-download
      await downloadImage(generateData.imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  }, [selectedPrompt, referenceImage]);

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
      console.error('Download failed:', err);
    }
  };

  const getWalletAddress = async (): Promise<string> => {
    if (typeof window.ethereum !== 'undefined') {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      return accounts[0] || '';
    }
    return '';
  };

  const signPayment = async (): Promise<string> => {
    if (typeof window.ethereum !== 'undefined') {
      const address = await getWalletAddress();
      const message = `Generate image - ${Date.now()}`;
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, address],
      });
      return signature;
    }
    return '0x' + '0'.repeat(130);
  };

  const handleSelectPrompt = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentConfirm = () => {
    setIsPaymentModalOpen(false);
    handleGenerate();
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Prompter</h1>
        <p className="tagline">Transform your images with AI</p>
      </header>

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

        {result && (
          <div className="result-section">
            <h3>Generated Image</h3>
            <img src={result.imageUrl} alt="Generated result" />
          </div>
        )}

        {error && (
          <div className="error-banner">
            {error}
          </div>
        )}
      </main>

      <PaymentModal
        isOpen={isPaymentModalOpen}
        amount={getPriceInUsdc()}
        onConfirm={handlePaymentConfirm}
        onCancel={() => setIsPaymentModalOpen(false)}
        isLoading={isGenerating}
      />
    </div>
  );
}

export default App;
