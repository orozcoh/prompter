import { execSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

// ═══ Configuration ═══
const BUCKET = "prompter-images"; // The R2 bucket name to upload to. Make sure your Wrangler config has the correct bucket and permissions set up.
const DIR = "./generated/low-any"; // local directory containing images to upload
const PREFIX = ""; // optional R2 key prefix, e.g. "low/"
// ════════════════════

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg']);

if (!DIR) {
  console.error('❌ DIR is empty. Set it in the Configuration block at the top of the script.');
  process.exit(1);
}

const absoluteDir = join(process.cwd(), DIR);

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
  const r2Key = PREFIX ? `${PREFIX}${file}` : file;

  try {
    execSync(
      `wrangler r2 object put "${BUCKET}/${r2Key}" --file="${filePath}" --remote`,
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
if (PREFIX) {
  console.log(`R2 URL pattern: https://<your-r2-public-url>/${PREFIX}<filename>`);
}
