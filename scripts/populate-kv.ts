import { writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

async function populateKV() {
  try {
    const promptsFile = Bun.file('prompts.json');
    if (!(await promptsFile.exists())) {
      console.error('❌ prompts.json not found');
      process.exit(1);
    }

    const prompts = await promptsFile.json();
    console.log(`🚀 Starting population of ${prompts.length} prompts to production KV...`);

    for (const prompt of prompts) {
      const key = `prompt-${prompt['prompt-id']}`;
      const value = JSON.stringify({
        name: prompt.name,
        prompt: prompt.prompt,
        category: prompt.category,
        imageUrls: prompt.imageUrls,
      });

      // Use wrangler kv key put to upload to production
      // We use a temporary file for the value to avoid shell escaping issues with complex prompts
      const tempFile = `.temp_${key}.json`;
      writeFileSync(tempFile, value);
      
      try {
       execSync(
        `wrangler kv key put --binding PROMPTS_KV "${key}" --path=${tempFile} --remote`,
        { stdio: 'inherit' }
      );
        console.log(`✅ Uploaded: ${key}`);
      } catch (e) {
        console.error(`❌ Failed to upload ${key}:`, e);
      } finally {
        // Clean up temp file
        try {
          execSync(`rm ${tempFile}`);
        } catch {}
      }
    }

    console.log('\n✨ Successfully populated production KV!');
  } catch (error) {
    console.error('❌ Critical error during population:', error);
    process.exit(1);
  }
}

populateKV();