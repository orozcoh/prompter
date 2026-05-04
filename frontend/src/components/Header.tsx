import React from 'react';
import { Link } from 'react-router-dom';
import BurgerButton from './BurgerButton';
import { StatusBar } from './StatusBar';
import './Header.css';
import favicon from '/favicon.svg';

interface HeaderProps {
  isMenuOpen?: boolean;
  onMenuClick?: () => void;
  onConnectClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ isMenuOpen, onMenuClick, onConnectClick }) => {
  return (
  <header className="app-header">
    <div className="header-left">
      <Link to="/" className="header-logo-link">
        <img src={favicon} alt="Prompter Logo" className="header-logo" />
      </Link>
    </div>
    
    <div className="header-center">
      <h1 className="header-title glitch-hover" data-text="Prompter">Prompter</h1>
    </div>
    
    <div className="header-right">
      <StatusBar onConnectClick={onConnectClick} />
      <BurgerButton isOpen={isMenuOpen ?? false} onClick={onMenuClick} />
    </div>
  </header>
);
};

export default Header;
