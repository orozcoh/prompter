import { execSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join, basename, extname } from 'node:path';

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg']);

function parseArgs() {
  const args: Record<string, string> = {};
  const raw = Bun.argv.slice(2);
  for (let i = 0; i < raw.length; i++) {
    if (raw[i].startsWith('--') && i + 1 < raw.length) {
      args[raw[i]] = raw[i + 1];
      i++;
    }
  }
  return args;
}

const args = parseArgs();
const dir = args['--dir'];
const prefix = args['--prefix'] || '';

if (!dir) {
  console.error('Usage: bun run scripts/upload-reference-images.ts --dir <directory> [--prefix <key-prefix>]');
  console.error('Example: bun run scripts/upload-reference-images.ts --dir ./catalog-images --prefix low/');
  process.exit(1);
}

const absoluteDir = join(process.cwd(), dir);

let files: string[];
try {
  files = readdirSync(absoluteDir);
} catch {
  console.error(`❌ Directory not found: ${absoluteDir}`);
  process.exit(1);
}

const imageFiles = files.filter(f => {
  const ext = extname(f).toLowerCase();
  return IMAGE_EXTENSIONS.has(ext) && statSync(join(absoluteDir, f)).isFile();
});

if (imageFiles.length === 0) {
  console.error('❌ No image files found in directory');
  process.exit(1);
}

console.log(`🚀 Uploading ${imageFiles.length} images to prompter-images...\n`);

let success = 0;
let failed = 0;

for (const file of imageFiles) {
  const filePath = join(absoluteDir, file);
  const r2Key = prefix ? `${prefix}${file}` : file;

  try {
    execSync(
      `wrangler r2 object put "prompter-images/${r2Key}" --file="${filePath}"`,
      { stdio: 'inherit' },
    );
    console.log(`✅ Uploaded: ${r2Key}`);
    success++;
  } catch (e) {
    console.error(`❌ Failed to upload ${r2Key}`);
    failed++;
  }
}

console.log(`\n${'─'.repeat(40)}`);
console.log(`Uploaded: ${success} | Failed: ${failed}`);
if (prefix) {
  console.log(`R2 URL pattern: https://<your-r2-public-url>/${prefix}<filename>`);
}
