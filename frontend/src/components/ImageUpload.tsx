import { useState, useCallback, useRef } from 'react';

interface ImageUploadProps {
  onImageSelect: (imageData: string, fileName?: string) => void;
  acceptedTypes?: string[];
  defaultPreviewUrl?: string;
}

export function ImageUpload({ onImageSelect, acceptedTypes = ['image/png', 'image/jpeg', 'image/webp'], defaultPreviewUrl }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(defaultPreviewUrl || null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track whether the current preview is the default sample image or a user upload
  const isDefaultPreview = !!(defaultPreviewUrl && preview === defaultPreviewUrl);

  const processFile = useCallback((file: File) => {
    if (!acceptedTypes.includes(file.type)) {
      alert('Invalid file type. Please upload PNG, JPEG, or WebP images.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setPreview(result);
      onImageSelect(result, file.name);
    };
    reader.readAsDataURL(file);
  }, [acceptedTypes, onImageSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  return (
    <div className="image-upload">
      <h3>Upload Reference Image</h3>

      <div
        className={`drop-zone ${isDragOver ? 'drag-over' : ''} ${preview ? 'has-preview' : ''} ${isDefaultPreview ? 'drop-zone-clickable' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        role="button"
        aria-label={preview ? 'Click to change uploaded image' : 'Upload reference image. Drag and drop or click to choose a file.'}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
        onClick={() => {
          if (isDefaultPreview) {
            fileInputRef.current?.click();
          }
        }}
      >
        {/* Hidden file input is always in the DOM so ref always works */}
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleFileInput}
          hidden
        />
        {preview ? (
          <img src={preview} alt="Preview" className="preview-image" />
        ) : (
          <div className="drop-placeholder">
            <p>Drag & drop an image here, or</p>
            <span className="button file-input-label" onClick={() => fileInputRef.current?.click()}>
              Choose File
            </span>
          </div>
        )}
      </div>

      {preview && (
        <button className="button secondary" onClick={() => {
          setPreview(null);
          onImageSelect('', '');
          if (fileInputRef.current) fileInputRef.current.value = '';
        }}>
          {isDefaultPreview ? 'Use your own image' : 'Remove Image'}
        </button>
      )}
    </div>
  );
}
