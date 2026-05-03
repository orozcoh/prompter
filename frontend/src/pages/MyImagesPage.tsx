import { useState } from 'react';
import { useImages } from '../context/ImagesContext';
import { ImageModal } from '../components/ImageModal';
import type { StoredImage } from '../utils/imageStorage';

const MyImagesPage = () => {
  const { images, removeImage, isLoading } = useImages();
  const [selectedImage, setSelectedImage] = useState<StoredImage | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = (image: StoredImage) => {
    setSelectedImage(image);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedImage(null);
  };

  if (isLoading) {
    return (
      <div className="page-placeholder">
        <h2>My AI Images</h2>
        <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
      </div>
    );
  }

  return (
    <main className="app-main">
      <div className="my-images-page">
       {/*  <div className="my-images-header">
          <h2>My AI Images</h2>
        </div> */}

        {images.length === 0 ? (
          <div className="my-images-empty">
            <p>Your generated images will appear here.</p>
            <p className="my-images-hint">Generate an image from the main page to get started.</p>
          </div>
        ) : (
          <div className="gallery-grid">
            {images.map(image => (
              <div key={image.id} className="gallery-item my-image-card">
                <div className="gallery-image" onClick={() => openModal(image)}>
                  <img src={image.imageUrl} alt={image.promptName || 'Generated'} loading="lazy" />
                </div>
                <div className="gallery-info">
                  <h4>{image.fileName}</h4>
                  <p className="gallery-prompt">
                    {new Date(image.timestamp).toLocaleDateString()}
                    {/* {image.cost && ` · $${image.cost}`} */}
                  </p>
                </div>
                <button
                  className="my-image-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(image.id);
                  }}
                  aria-label="Delete image"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <ImageModal image={selectedImage} isOpen={isModalOpen} onClose={closeModal} />
    </main>
  );
};

export default MyImagesPage;
