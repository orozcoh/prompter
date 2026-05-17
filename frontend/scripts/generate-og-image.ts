import satori from 'satori';
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const SCRIPT_DIR = import.meta.dir;
const PUBLIC_DIR = join(SCRIPT_DIR, '..', 'public');
const WIDTH = 1200;
const HEIGHT = 630;

async function fetchFont(family: string, weight: number): Promise<ArrayBuffer> {
  const urlFriendly = family.replace(/ /g, '+');
  const cssUrl = `https://fonts.googleapis.com/css2?family=${urlFriendly}:wght@${weight}`;
  let resp = await fetch(cssUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 AppleWebKit/537.36' },
  });
  if (!resp.ok) {
    throw new Error(`Font CSS fetch failed for ${family}: HTTP ${resp.status}`);
  }
  const css = await resp.text();

  const match = css.match(/url\(([^)]+)\)/);
  if (!match) {
    console.error(`    CSS response for ${family}:`, css.substring(0, 200));
    throw new Error(`Could not find font URL for ${family} wght@${weight}`);
  }
  console.log(`    Font: ${family} ${weight} (${match[1].slice(0, 70)}...)`);
  return fetch(match[1]).then(r => r.arrayBuffer());
}

async function main() {
  console.log('Generating OG image...');

  // 1. Load fonts
  console.log('  [1/4] Loading fonts...');
  const orbitron = await fetchFont('Orbitron', 900);
  const shareTechMono = await fetchFont('Share Tech Mono', 400);

  // 2. Convert favicon.ico to PNG data URI via sips (macOS built-in)
  console.log('  [2/4] Processing favicon...');
  const faviconPath = join(PUBLIC_DIR, 'favicon.ico');
  const { stderr } = Bun.spawnSync([
    'sips', '-s', 'format', 'png', faviconPath, '--out', '/tmp/favicon-og.png',
  ]);
  if (stderr.length > 0) console.error('    sips stderr:', stderr.toString());
  const faviconPng = await sharp('/tmp/favicon-og.png')
    .resize(140, 140, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const faviconDataUri = `data:image/png;base64,${faviconPng.toString('base64')}`;

  // 3. Render SVG with satori
  console.log('  [3/4] Rendering SVG...');
  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#000000',
          position: 'relative',
        },
        children: [
          // CRT scanline overlay
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage:
                  'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,255,0.025) 2px, rgba(0,255,255,0.025) 4px)',
              },
            },
          },
          // Vignette
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage:
                  'radial-gradient(ellipse 70% 80% at center, transparent 30%, rgba(0,0,0,0.65) 100%)',
              },
            },
          },
          // Neon border frame
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                top: '24px',
                left: '24px',
                right: '24px',
                bottom: '24px',
                border: '2px solid rgba(0,255,255,0.18)',
                borderRadius: '8px',
                boxShadow:
                  '0 0 20px rgba(0,255,255,0.1), 0 0 60px rgba(0,255,255,0.05), inset 0 0 20px rgba(0,255,255,0.05)',
              },
            },
          },
          // Content
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px',
                position: 'relative',
              },
              children: [
                // Lightning bolt logo (from favicon)
                {
                  type: 'img',
                  props: {
                    src: faviconDataUri,
                    width: 140,
                    style: {
                      filter: 'drop-shadow(0 0 18px rgba(255,0,170,0.55))',
                    },
                  },
                },
                // Title
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      fontFamily: 'Orbitron',
                      fontWeight: 900,
                      fontSize: '96px',
                      color: '#00ffff',
                      textShadow:
                        '0 0 40px rgba(0,255,255,0.8), 0 0 80px rgba(0,255,255,0.3)',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      marginTop: '28px',
                    },
                    children: 'PROMPTER',
                  },
                },
                // Tagline
                {
                  type: 'div',
                  props: {
                    style: {
                      fontFamily: 'Share Tech Mono',
                      fontSize: '28px',
                      color: '#8899cc',
                      marginTop: '16px',
                      letterSpacing: '0.04em',
                    },
                    children: 'AI Image Generation Platform',
                  },
                },
                // Domain
                {
                  type: 'div',
                  props: {
                    style: {
                      fontFamily: 'Share Tech Mono',
                      fontSize: '18px',
                      color: '#5566aa',
                      marginTop: '36px',
                      opacity: 0.65,
                    },
                    children: 'ai.digitalerror.xyz',
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [
        { name: 'Orbitron', data: orbitron, weight: 900, style: 'normal' },
        { name: 'Share Tech Mono', data: shareTechMono, weight: 400, style: 'normal' },
      ],
    }
  );

  // 4. Convert SVG to PNG
  console.log('  [4/4] Converting to PNG...');
  const png = await sharp(Buffer.from(svg)).png().toBuffer();

  const outputPath = join(PUBLIC_DIR, 'og-image.png');
  writeFileSync(outputPath, png);
  console.log(`  Done: ${outputPath} (${(png.length / 1024).toFixed(1)} KB)`);
}

main().catch(err => {
  console.error('Failed to generate OG image:', err);
  process.exit(1);
});
