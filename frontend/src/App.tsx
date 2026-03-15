import { useState, useEffect, useCallback } from 'react';
import { ImageUpload } from './components/ImageUpload';
import { PromptGallery } from './components/PromptGallery';
import { StatusIndicator, type GenerationStatus } from './components/StatusIndicator';
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

function App() {
  const [referenceImage, setReferenceImage] = useState<string>('');
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>('idle');
  const [result, setResult] = useState<GeneratedResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      console.error(err);
    }
  };

  const handleGenerate = useCallback(async (prompt: Prompt) => {
    setGenerationStatus('generating');
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptId: prompt.id,
          referenceImage,
        }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Generation failed');
      }

      // Log full API response for debugging
      console.log('OpenRouter API response:', data.apiResponse);

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
      console.error(err);
    }
  }, [referenceImage]);

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

  const handleSelectPrompt = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    handleGenerate(prompt);
  };

  const handleReset = () => {
    setResult(null);
    setGenerationStatus('idle');
    setError(null);
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
      </main>
    </div>
  );
}

export default App;
