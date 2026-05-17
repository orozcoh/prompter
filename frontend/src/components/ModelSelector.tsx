import { useState, useEffect } from 'react';
import { Sparkles, Zap } from 'lucide-react';
import './ModelSelector.css';

interface ModelTier {
  id: string;
  label: string;
  model: string;
  price: string;
}

interface ModelSelectorProps {
  selectedTier: string;
  onSelectTier: (tier: string) => void;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787';

export function ModelSelector({ selectedTier, onSelectTier }: ModelSelectorProps) {
  const [tiers, setTiers] = useState<ModelTier[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/models`)
      .then((res) => res.json())
      .then((data) => {
        if (data.tiers) setTiers(data.tiers);
      })
      .catch(() => {});
  }, []);

  const getIcon = (id: string) => {
    return id === 'high' ? <Sparkles size={16} /> : <Zap size={16} />;
  };

  return (
    <div className="model-selector-bar">
      <h3>Model Tier</h3>
      <div className="model-tier-options">
        {tiers.map((tier) => (
          <button
            key={tier.id}
            className={`model-tier-btn ${selectedTier === tier.id ? 'active' : ''}`}
            onClick={() => onSelectTier(tier.id)}
            type="button"
          >
            <span className="model-tier-icon">{getIcon(tier.id)}</span>
            <span className="model-tier-label">{tier.label}</span>
            <span className="model-tier-price">${parseFloat(tier.price).toFixed(2)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
