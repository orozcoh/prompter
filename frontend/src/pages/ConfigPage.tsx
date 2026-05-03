import { useState, useEffect, useCallback } from 'react';
import { useImages } from '../context/ImagesContext';
import { getStorageSize } from '../utils/imageStorage';
import './ConfigPage.css';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

const ConfigPage = () => {
  const { clearAll } = useImages();
  const [dbSize, setDbSize] = useState<{ bytes: number; count: number } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const refreshSize = useCallback(async () => {
    const size = await getStorageSize();
    setDbSize(size);
  }, []);

  useEffect(() => {
    refreshSize();
  }, [refreshSize]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete all stored images?')) return;
    setDeleting(true);
    try {
      await clearAll();
      await refreshSize();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <main className="app-main">
      <div className="config-page">
        <div className="config-section">
          <h3>Database</h3>
          <p className="config-stat">
            Size: <strong>{dbSize ? formatBytes(dbSize.bytes) : 'Calculating...'}</strong>
          </p>
          <p className="config-stat">
            Images: <strong>{dbSize !== null ? dbSize.count : '...'}</strong>
          </p>
          <button
            className="button danger"
            onClick={handleDelete}
            disabled={deleting || (dbSize !== null && dbSize.count === 0)}
          >
            {deleting ? 'Deleting...' : 'Delete Database'}
          </button>
        </div>
      </div>
    </main>
  );
};

export default ConfigPage;
