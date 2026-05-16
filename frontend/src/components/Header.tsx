import React from 'react';
import { Link } from 'react-router-dom';
import BurgerButton from './BurgerButton';
import { StatusBar } from './StatusBar';
import './Header.css';
import favicon from '/bw_icon.ico';

interface HeaderProps {
  isMenuOpen?: boolean;
  onMenuClick?: () => void;
  onConnectClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ isMenuOpen, onMenuClick, onConnectClick }) => {
  return (
  <header className="app-header">
    <div className="header-left">
      <Link to="/" className="header-logo-link" aria-label="Prompter home">
        <img src={favicon} alt="Prompter Logo" className="header-logo" width="32" height="32" />
      </Link>
    </div>
    
    <div className="header-center">
      <div className="header-title glitch-hover" data-text="Prompter">Prompter</div>
    </div>
    
    <div className="header-right">
      <StatusBar onConnectClick={onConnectClick} />
      <BurgerButton isOpen={isMenuOpen ?? false} onClick={onMenuClick} />
    </div>
  </header>
);
};

export default Header;
