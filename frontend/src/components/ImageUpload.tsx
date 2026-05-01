import { useState, useCallback, useRef } from 'react';

interface ImageUploadProps {
  onImageSelect: (imageData: string, fileName?: string) => void;
  acceptedTypes?: string[];
  defaultPreviewUrl?: string;
}

type ImageCategory = 'front-face' | 'full-body' | 'others';

export function ImageUpload({ onImageSelect, acceptedTypes = ['image/png', 'image/jpeg', 'image/webp'], defaultPreviewUrl }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(defaultPreviewUrl || null);
  const [category, setCategory] = useState<ImageCategory>('front-face');
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

      <div className="category-selector">
        <label>
          <input
            type="radio"
            value="front-face"
            checked={category === 'front-face'}
            onChange={(e) => setCategory(e.target.value as ImageCategory)}
          />
          Front Face
        </label>
        <label>
          <input
            type="radio"
            value="full-body"
            checked={category === 'full-body'}
            onChange={(e) => setCategory(e.target.value as ImageCategory)}
          />
          Full Body
        </label>
        <label>
          <input
            type="radio"
            value="others"
            checked={category === 'others'}
            onChange={(e) => setCategory(e.target.value as ImageCategory)}
          />
          Others
        </label>
      </div>

      <div
        className={`drop-zone ${isDragOver ? 'drag-over' : ''} ${preview ? 'has-preview' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => {
          // When showing the default preview, clicking anywhere opens the file picker
          if (isDefaultPreview) {
            fileInputRef.current?.click();
          }
        }}
        style={{ cursor: isDefaultPreview ? 'pointer' : undefined }}
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
          // Clear preview to reveal the upload UI (drag & drop + Choose File)
          setPreview(null);
          onImageSelect('', '');
        }}>
          {isDefaultPreview ? 'Use your own image' : 'Remove Image'}
        </button>
      )}
    </div>
  );
}
