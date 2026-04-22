import React from 'react';
import './BurgerButton.css';

interface BurgerButtonProps {
  onClick?: () => void;
}

const BurgerButton: React.FC<BurgerButtonProps> = ({ onClick }) => {
  return (
    <button className="burger-button" onClick={onClick} aria-label="Toggle menu">
      <div className="burger-icon">
        <span className="line"></span>
        <span className="line"></span>
        <span className="line"></span>
      </div>
    </button>
  );
};

export default BurgerButton;