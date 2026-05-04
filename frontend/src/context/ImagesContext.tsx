import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { type StoredImage, saveImage, getAllImages, deleteImage, clearAllImages } from '../utils/imageStorage';

interface ImagesContextType {
  images: StoredImage[];
  addImage: (image: StoredImage) => Promise<void>;
  removeImage: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  isLoading: boolean;
}

const ImagesContext = createContext<ImagesContextType | undefined>(undefined);

export const ImagesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [images, setImages] = useState<StoredImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getAllImages()
      .then(setImages)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const addImage = useCallback(async (image: StoredImage) => {
    await saveImage(image);
    setImages(prev => [image, ...prev]);
  }, []);

  const removeImage = useCallback(async (id: string) => {
    await deleteImage(id);
    setImages(prev => prev.filter(img => img.id !== id));
  }, []);

  const clearAll = useCallback(async () => {
    await clearAllImages();
    setImages([]);
  }, []);

  return (
    <ImagesContext.Provider value={{ images, addImage, removeImage, clearAll, isLoading }}>
      {children}
    </ImagesContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useImages = () => {
  const context = useContext(ImagesContext);
  if (context === undefined) {
    throw new Error('useImages must be used within an ImagesProvider');
  }
  return context;
};
