import { useState, useEffect, useCallback } from 'react';
import { Download } from 'lucide-react';
import { ImageUpload } from '../components/ImageUpload';
import { PromptGallery } from '../components/PromptGallery';
import { ModelSelector } from '../components/ModelSelector';
import { StatusIndicator, type GenerationStatus } from '../components/StatusIndicator';
import { PaywallModal } from '../components/PaywallModal';
import { SEO } from '../components/SEO';
import { useWallet } from '../context/WalletContext';
import { useImages } from '../context/ImagesContext';
import { extractImageUrl } from '../utils/extractImageUrl';
import { urlToBase64, addPendingGeneration, removePendingGeneration, getPendingGenerations, getImageByGenerationId, type PendingGeneration } from '../utils/imageStorage';

interface Prompt {
  id: string;
  name: string;
  prompt: string;
  imageUrls: { low: string; high: string };
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
  const [modelTier, setModelTier] = useState<string>('low');

  const referencePrompt = prompts.find(p => p.id === 'prompt-ref');
  const defaultPreviewUrl = referencePrompt?.imageUrls?.[modelTier as 'low' | 'high'];

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

  const makeFileName = (promptName: string) => {
    if (originalFileName) {
      const baseName = originalFileName.replace(/\.[^.]+$/, '');
      const sanitized = promptName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9_-]/g, '');
      return `${baseName}_${sanitized}.png`;
    }
    return `generated-${Date.now()}.png`;
  };

  useEffect(() => {
    fetchPrompts();
  }, []);

  useEffect(() => {
    const pending = getPendingGenerations();
    if (pending.length === 0) return;

    const retrievePending = async () => {
      for (const p of pending) {
        try {
          const alreadySaved = await getImageByGenerationId(p.generationId);
          if (alreadySaved) {
            removePendingGeneration(p.generationId);
            continue;
          }

          const res = await fetch(`${API_BASE}/generated-images/${p.generationId}`);
          if (!res.ok) continue;

          const blob = await res.blob();
          const base64Url = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          const metaPromptName = res.headers.get('X-Meta-promptName') || p.promptName;
          const metaPromptId = res.headers.get('X-Meta-promptId') || p.promptId;
          const metaModel = res.headers.get('X-Meta-model') || p.model;
          const metaCost = res.headers.get('X-Meta-cost') || p.cost;
          const metaTxHash = res.headers.get('X-Meta-txHash') || p.txHash;

          addImage({
            id: crypto.randomUUID(),
            imageUrl: base64Url,
            promptId: metaPromptId || '',
            promptName: metaPromptName || 'Unknown',
            fileName: p.fileName || `retrieved-${Date.now()}.png`,
            timestamp: Date.now(),
            model: metaModel,
            cost: metaCost,
            txHash: metaTxHash,
            generationId: p.generationId,
          });
          removePendingGeneration(p.generationId);
        } catch {
          // Retry on next mount or leave for lifecycle cleanup
        }
      }
    };

    retrievePending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const generationId = crypto.randomUUID();
    const pending: PendingGeneration = {
      generationId,
      promptId: prompt.id,
      promptName: prompt.name,
      fileName: makeFileName(prompt.name),
    };
    addPendingGeneration(pending);

    try {
      const response = await fetch(`${API_BASE}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptId: prompt.id,
          modelTier,
          generationId,
        }),
      });

      if (response.status === 402) {
        const paymentReq = await parsePaymentRequired(response);
        if (paymentReq) {
          setGenerationStatus('payment_required');
          removePendingGeneration(generationId);
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
        addImage({
          id: crypto.randomUUID(),
          imageUrl: base64Url,
          promptId: prompt.id,
          promptName: prompt.name,
          fileName: pending.fileName,
          timestamp: Date.now(),
          cost: data.cost,
          model: data.model,
          generationId,
        });
        removePendingGeneration(generationId);
      }).catch(console.error);

      setResult({
        imageUrl,
        promptId: prompt.id,
      });

      setGenerationStatus('completed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
      setGenerationStatus('error');
      removePendingGeneration(generationId);
    }
  }, [referenceImage, parsePaymentRequired, addImage, modelTier]);

  const handleGenerateWithPayment = useCallback(async () => {
    if (!paymentRequired || !selectedPromptForPayment) return;

    const generationId = crypto.randomUUID();
    const pending: PendingGeneration = {
      generationId,
      promptId: selectedPromptForPayment.id,
      promptName: selectedPromptForPayment.name,
      fileName: makeFileName(selectedPromptForPayment.name),
    };
    addPendingGeneration(pending);

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
        referenceImage,
        modelTier,
        generationId
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
        addImage({
          id: crypto.randomUUID(),
          imageUrl: base64Url,
          promptId: selectedPromptForPayment.id,
          promptName: selectedPromptForPayment.name,
          fileName: pending.fileName,
          timestamp: Date.now(),
          txHash: data.txHash || hash,
          cost: data.cost,
          model: data.model,
          generationId,
        });
        removePendingGeneration(generationId);
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
      removePendingGeneration(generationId);
    }
  }, [paymentRequired, selectedPromptForPayment, referenceImage, signAndSendTransaction, verifyPayment, resetPayment, addImage, modelTier]);

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

      link.download = selectedPrompt ? makeFileName(selectedPrompt.name) : `generated-${Date.now()}.png`;

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
          defaultPreviewUrl={defaultPreviewUrl}
          onImageSelect={(data, name) => {
            setReferenceImage(data);
            if (name) setOriginalFileName(name);
          }}
        />
        <ModelSelector selectedTier={modelTier} onSelectTier={setModelTier} />
      </div>

      <div className="gallery-section">
        <PromptGallery
          prompts={prompts.filter(p => p.id !== 'prompt-ref')}
          selectedPrompt={selectedPrompt}
          onSelectPrompt={handleSelectPrompt}
          generationDisabled={!referenceImage}
          modelTier={modelTier}
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
