import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const localesDir = path.join(__dirname, 'locales');

// Helper to get all flat paths/keys in an object
function getKeys(obj, prefix = '') {
  let keys = [];
  for (const k in obj) {
    const keyPath = prefix ? `${prefix}.${k}` : k;
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
      keys = keys.concat(getKeys(obj[k], keyPath));
    } else {
      keys.push(keyPath);
    }
  }
  return keys;
}

async function runCheck() {
  const enFile = path.join(localesDir, 'en.js');
  if (!fs.existsSync(enFile)) {
    console.error('English locale file (en.js) not found!');
    process.exit(1);
  }

  const { default: en } = await import(`./locales/en.js`);
  const enKeys = new Set(getKeys(en));
  console.log(`Checking locales against English (found ${enKeys.size} keys)...`);

  const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.js') && f !== 'en.js');
  let hasErrors = false;

  for (const file of files) {
    const lang = file.replace('.js', '');
    const { default: langData } = await import(`./locales/${file}`);
    const langKeys = getKeys(langData);
    const langKeySet = new Set(langKeys);

    const missingKeys = [];
    enKeys.forEach(k => {
      if (!langKeySet.has(k)) {
        missingKeys.push(k);
      }
    });

    const extraKeys = [];
    langKeys.forEach(k => {
      if (!enKeys.has(k)) {
        extraKeys.push(k);
      }
    });

    if (missingKeys.length > 0 || extraKeys.length > 0) {
      hasErrors = true;
      console.log(`\n❌ [${lang}] failed validation:`);
      if (missingKeys.length > 0) {
        console.log(`  Missing keys (${missingKeys.length}):`);
        missingKeys.forEach(k => console.log(`    - ${k}`));
      }
      if (extraKeys.length > 0) {
        console.log(`  Extra keys (${extraKeys.length}) [not in English]:`);
        extraKeys.forEach(k => console.log(`    - ${k}`));
      }
    } else {
      console.log(`  ✅ [${lang}] passed (360/360 keys match)`);
    }
  }

  if (hasErrors) {
    console.error('\nTranslation check failed. Please fix the missing/extra keys listed above.');
    process.exit(1);
  } else {
    console.log('\nAll languages are 100% in sync with English!');
    process.exit(0);
  }
}

runCheck().catch(err => {
  console.error(err);
  process.exit(1);
});
