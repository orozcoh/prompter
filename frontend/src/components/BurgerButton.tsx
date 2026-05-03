import React from 'react';
import './BurgerButton.css';

interface BurgerButtonProps {
  isOpen: boolean;
  onClick?: () => void;
}

const BurgerButton: React.FC<BurgerButtonProps> = ({ isOpen, onClick }) => {
  return (
    <button
      className={`burger-button${isOpen ? ' open' : ''}`}
      onClick={onClick}
      aria-label={isOpen ? 'Close menu' : 'Open menu'}
      aria-expanded={isOpen}
    >
      <div className="burger-icon">
        <span className="line"></span>
        <span className="line"></span>
        <span className="line"></span>
      </div>
    </button>
  );
};

export default BurgerButton;
