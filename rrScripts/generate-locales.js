import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const targetDir = path.join(__dirname, '../apps/frontend/src/locales');
const localesSrcDir = path.join(__dirname, 'locales');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

async function generate() {
  const files = fs.readdirSync(localesSrcDir).filter(f => f.endsWith('.js'));
  const allLocales = {};

  for (const file of files) {
    const lang = file.replace('.js', '');
    const fileUrl = new URL(`./locales/${file}`, import.meta.url).toString();
    const { default: data } = await import(fileUrl);
    allLocales[lang] = data;
  }

  // Write to src/locales (used by serverTranslation.ts via static imports)
  Object.keys(allLocales).forEach((lang) => {
    const filePath = path.join(targetDir, `${lang}.json`);
    fs.writeFileSync(filePath, JSON.stringify(allLocales[lang], null, 2), 'utf8');
  });

  // Mirror to public/locales/{lang}/translation.json (served by Next.js, fetched
  // lazily by i18next-http-backend on the client)
  const publicLocalesDir = path.join(__dirname, '../apps/frontend/public/locales');
  Object.keys(allLocales).forEach((lang) => {
    const langDir = path.join(publicLocalesDir, lang);
    if (!fs.existsSync(langDir)) fs.mkdirSync(langDir, { recursive: true });
    const filePath = path.join(langDir, 'translation.json');
    fs.writeFileSync(filePath, JSON.stringify(allLocales[lang], null, 2), 'utf8');
  });

  console.log(`Successfully wrote locale JSON files for ${Object.keys(allLocales).length} languages to src/locales and public/locales.`);
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});

