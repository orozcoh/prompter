const AboutPage = () => {
  return (
    <div className="page-placeholder">
      <h2>About</h2>
      <p style={{ color: 'var(--text-muted, #999)' }}>
        Prompter is an AI image generation platform. Upload a reference image, select a prompt style,
        and receive an AI-generated image. Uses x402 protocol for pay-per-use API calls with on-chain USDC payments on Base.
      </p>
    </div>
  );
};

export default AboutPage;
