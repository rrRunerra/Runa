import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const flagMap = {
  en: 'us',
  ja: 'jp',
  ko: 'kr',
  'zh-CN': 'cn',
  'zh-TW': 'tw',
  pl: 'pl',
  ru: 'ru',
  no: 'no',
  fi: 'fi',
  es: 'es',
  de: 'de',
  cs: 'cz',
  tr: 'tr',
  vi: 'vn',
  th: 'th',
  ms: 'my'
};

const outputDir = path.join(__dirname, '../apps/frontend/public/flags');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    function get(requestUrl) {
      https.get(requestUrl, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          get(response.headers.location);
          return;
        }
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download from ${requestUrl}: Status code ${response.statusCode}`));
          return;
        }
        const file = fs.createWriteStream(dest);
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }).on('error', (err) => {
        reject(err);
      });
    }
    get(url);
  });
}

async function run() {
  console.log('Downloading flags...');
  const entries = Object.entries(flagMap);
  for (const [lang, country] of entries) {
    const url = `https://flagcdn.com/${country}.svg`;
    const dest = path.join(outputDir, `${country}.svg`);
    console.log(`Downloading ${lang} flag (${country}) to ${dest}...`);
    try {
      await downloadFile(url, dest);
    } catch (err) {
      console.error(`Failed to download ${country}:`, err.message);
    }
  }
  console.log('Flags download complete!');
}

run();
