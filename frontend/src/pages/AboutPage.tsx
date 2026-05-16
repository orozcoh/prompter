import { SEO } from '../components/SEO';

const AboutPage = () => {
  return (
    <main className="app-main">
      <SEO
        title="About"
        description="Prompter turns your photos into AI-generated art. Learn how it works, payment via x402 + USDC on Base, and our privacy-first approach."
        path="/about"
      />
      <div className="page-placeholder">
        <h1>About Prompter</h1>

        <p>Prompter turns your photos into AI-generated art. You upload an image, pick a style (like "pixel art" or "watercolor painting"), and an AI redraws it in that style.</p>

        <h2>How it works</h2>
        <ol className="about-steps">
          <li>Upload a reference image — a photo, sketch, or anything.</li>
          <li>Browse the prompt catalog and pick a visual style.</li>
          <li>Click the style. The image is sent to an AI model via OpenRouter.</li>
          <li>The AI generates a new image based on your reference and the chosen style.</li>
          <li>Download the result.</li>
        </ol>

        <h2>Payment</h2>
        <p>
          Each generation costs a fraction of a cent in USDC (a digital dollar) on the Base blockchain.
          You connect your wallet, sign a transaction, and pay only when you actually generate — no subscriptions, no accounts.
          This is powered by <strong>x402</strong>, a protocol for paying for API calls on-chain.
        </p>

        <h2>Privacy</h2>
        <p>
          Your reference image is never stored on a server. It is sent directly to the AI model for generation and then discarded.
        </p>

        <h2>Tech stack</h2>
        <p>
          Built with React, Cloudflare Workers, Hono, OpenRouter API (sourceful/riverflow-v2-fast-preview), x402 + USDC on Base for payments.
        </p>
      </div>
    </main>
  );
};

export default AboutPage;
