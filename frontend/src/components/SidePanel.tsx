import React from 'react';
import { Link } from 'react-router-dom';
import './SidePanel.css';

interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const SidePanel: React.FC<SidePanelProps> = ({ isOpen, onClose }) => {
  return (
    <>
      <div
        className={`side-panel-backdrop${isOpen ? ' open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <nav className={`side-panel${isOpen ? ' open' : ''}`} aria-label="Side menu">
        <Link to="/" onClick={onClose}>Generate Image</Link>
        <Link to="/myImages" onClick={onClose}>My AI Images</Link>
        <Link to="/about" onClick={onClose}>About</Link>
      </nav>
    </>
  );
};

export default SidePanel;
