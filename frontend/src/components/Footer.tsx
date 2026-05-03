import './Footer.css';

const Footer = () => {
  return (
    <footer className="app-footer">
      <span className="footer-text">
        &copy; 2026 -{' '}
        <a
          href="https://digitalerror.xyz"
          className="footer-link"
        >
          DigitalError.xyz
        </a>
      </span>
    </footer>
  );
};

export default Footer;
