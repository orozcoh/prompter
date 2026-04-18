import React from 'react';
import BurgerButton from './BurgerButton';
import { StatusBar } from './StatusBar';
import './Header.css';
import favicon from '/favicon.svg';

interface HeaderProps {
  onMenuClick?: () => void;
  onConnectClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, onConnectClick }) => {
  return (
    <header className="app-header">
<div className="header-left">
  <img src={favicon} alt="Prompter Logo" className="header-logo" />
</div>
    
    <div className="header-center">
      <h1 className="header-title">Prompter</h1>
    </div>
    
    <div className="header-right">
      <StatusBar onConnectClick={onConnectClick} />
      <BurgerButton onClick={onMenuClick} />
    </div>
  </header>
);
};

export default Header;
