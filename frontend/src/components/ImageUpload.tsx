import { useState, useCallback } from 'react';

interface ImageUploadProps {
  onImageSelect: (imageData: string, fileName?: string) => void;
  acceptedTypes?: string[];
}

type ImageCategory = 'front-face' | 'full-body' | 'others';

export function ImageUpload({ onImageSelect, acceptedTypes = ['image/png', 'image/jpeg', 'image/webp'] }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [category, setCategory] = useState<ImageCategory>('front-face');
  const [isDragOver, setIsDragOver] = useState(false);

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
    if (file) processFile(file);
  }, [processFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
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
      >
        {preview ? (
          <img src={preview} alt="Preview" className="preview-image" />
        ) : (
          <div className="drop-placeholder">
            <p>Drag & drop an image here, or</p>
            <label className="file-input-label">
              <input
                type="file"
                accept={acceptedTypes.join(',')}
                onChange={handleFileInput}
                hidden
              />
              <span className="button">Choose File</span>
            </label>
          </div>
        )}
      </div>

      {preview && (
        <button className="button secondary" onClick={() => {
          setPreview(null);
          onImageSelect('', '');
        }}>
          Remove Image
        </button>
      )}
    </div>
  );
}
