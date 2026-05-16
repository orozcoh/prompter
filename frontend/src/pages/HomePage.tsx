import { useState, useEffect, useCallback } from 'react';
import { Download } from 'lucide-react';
import { ImageUpload } from '../components/ImageUpload';
import { PromptGallery } from '../components/PromptGallery';
import { StatusIndicator, type GenerationStatus } from '../components/StatusIndicator';
import { PaywallModal } from '../components/PaywallModal';
import { SEO } from '../components/SEO';
import { useWallet } from '../context/WalletContext';
import { useImages } from '../context/ImagesContext';
import { extractImageUrl } from '../utils/extractImageUrl';
import { urlToBase64 } from '../utils/imageStorage';

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

interface HomePageProps {
  onConnectWallet: () => void;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787';

const HomePage = ({ onConnectWallet }: HomePageProps) => {
  const [referenceImage, setReferenceImage] = useState<string>('');
  const [originalFileName, setOriginalFileName] = useState<string>('');
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>('idle');
  const [result, setResult] = useState<GeneratedResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    signAndSendTransaction,
    verifyPayment,
    parsePaymentRequired,
    resetPayment,
  } = useWallet();

  const { addImage } = useImages();

  const [selectedPromptForPayment, setSelectedPromptForPayment] = useState<Prompt | null>(null);

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
      const response = await fetch(`${API_BASE}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptId: prompt.id,
        }),
      });

      if (response.status === 402) {
        const paymentReq = await parsePaymentRequired(response);
        if (paymentReq) {
          setGenerationStatus('payment_required');
          return;
        } else {
          throw new Error('Payment required but could not parse payment details');
        }
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Generation failed');
      }

      const imageUrl = extractImageUrl(data.apiResponse);
      if (!imageUrl) {
        throw new Error('No image found in API response');
      }

      urlToBase64(imageUrl).then(base64Url => {
        let fileName = `generated-${Date.now()}.png`;
        if (originalFileName) {
          const baseName = originalFileName.replace(/\.[^.]+$/, '');
          const sanitizedPromptName = prompt.name
            .replace(/\s+/g, '-')
            .replace(/[^a-zA-Z0-9_-]/g, '');
          fileName = `${baseName}_${sanitizedPromptName}.png`;
        }
        addImage({
          id: crypto.randomUUID(),
          imageUrl: base64Url,
          promptId: prompt.id,
          promptName: prompt.name,
          fileName,
          timestamp: Date.now(),
          cost: data.cost,
          model: data.model,
        });
      }).catch(console.error);

      setResult({
        imageUrl,
        promptId: prompt.id,
      });

      setGenerationStatus('completed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
      setGenerationStatus('error');
    }
  }, [referenceImage, parsePaymentRequired, addImage]);

  const handleGenerateWithPayment = useCallback(async () => {
    if (!paymentRequired || !selectedPromptForPayment) return;

    try {
      const scheme = paymentRequired.schemes[0];
      if (!scheme || !scheme.payTo || !scheme.amount) {
        throw new Error('Invalid payment details');
      }

      const hash = await signAndSendTransaction({
        payTo: scheme.payTo,
        amount: scheme.amount,
      });

      const response = await verifyPayment(
        hash,
        selectedPromptForPayment.id,
        referenceImage
      );

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Generation failed');
      }

      const imageUrl = extractImageUrl(data.apiResponse);
      if (!imageUrl) {
        throw new Error('No image found in API response');
      }

      urlToBase64(imageUrl).then(base64Url => {
        let fileName = `generated-${Date.now()}.png`;
        if (originalFileName) {
          const baseName = originalFileName.replace(/\.[^.]+$/, '');
          const sanitizedPromptName = selectedPromptForPayment.name
            .replace(/\s+/g, '-')
            .replace(/[^a-zA-Z0-9_-]/g, '');
          fileName = `${baseName}_${sanitizedPromptName}.png`;
        }
        addImage({
          id: crypto.randomUUID(),
          imageUrl: base64Url,
          promptId: selectedPromptForPayment.id,
          promptName: selectedPromptForPayment.name,
          fileName,
          timestamp: Date.now(),
          txHash: data.txHash || hash,
          cost: data.cost,
          model: data.model,
        });
      }).catch(console.error);

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
  }, [paymentRequired, selectedPromptForPayment, referenceImage, signAndSendTransaction, verifyPayment, resetPayment, addImage]);

  const handleClosePaywall = useCallback(() => {
    resetPayment();
    setSelectedPromptForPayment(null);
    setSelectedPrompt(null);
    setGenerationStatus('idle');
  }, [resetPayment]);

  const downloadImage = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;

      let downloadName = `generated-${Date.now()}.png`;
      if (originalFileName && selectedPrompt) {
        const baseName = originalFileName.replace(/\.[^.]+$/, '');
        const sanitizedPromptName = selectedPrompt.name
          .replace(/\s+/g, '-')
          .replace(/[^a-zA-Z0-9_-]/g, '');
        downloadName = `${baseName}_${sanitizedPromptName}.png`;
      }
      link.download = downloadName;

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
    <main className="app-main">
      <SEO
        title="AI Image Generation"
        description="Upload a reference image, choose a prompt style, and generate AI art. Pay per generation with USDC on Base via x402."
        path="/"
      />
      <h1 className="sr-only">Prompter - AI Image Generation</h1>
      <div className="upload-section">
        <ImageUpload
          defaultPreviewUrl="/prompt-sample/prompter-ref-low.jpg"
          onImageSelect={(data, name) => {
            setReferenceImage(data);
            if (name) setOriginalFileName(name);
          }}
        />
      </div>

      <div className="gallery-section">
        <PromptGallery
          prompts={prompts}
          selectedPrompt={selectedPrompt}
          onSelectPrompt={handleSelectPrompt}
          generationDisabled={!referenceImage}
        />
      </div>

      <div className="status-section">
        <StatusIndicator status={generationStatus} error={error} />
      </div>

      {result && (
        <div className="result-section">
          <h2>Generated Image</h2>
          <img src={result.imageUrl} alt="Generated result" loading="lazy" />
          <div className="result-actions">
            <button className="button primary" onClick={() => downloadImage(result.imageUrl)}>
              <Download size={16} />
              Download
            </button>
            <button className="button secondary" onClick={handleReset}>
              Generate Another
            </button>
          </div>
        </div>
      )}

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
        onConnectWallet={onConnectWallet}
        onPayAndGenerate={handleGenerateWithPayment}
        onClose={handleClosePaywall}
      />
    </main>
  );
};

export default HomePage;
