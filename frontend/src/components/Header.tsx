import React from 'react';
import BurgerButton from './BurgerButton';
import './Header.css';
import favicon from '/favicon.svg';

interface HeaderProps {
  onMenuClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  return (
    <header className="app-header">
      <div className="header-left">
        <img src={favicon} alt="Prompter Logo" className="header-logo" />
      </div>
      
      <div className="header-center">
        <h1 className="header-title">Prompter</h1>
      </div>
      
      <div className="header-right">
        <BurgerButton onClick={onMenuClick} />
      </div>
    </header>
  );
};

export default Header;