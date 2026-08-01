import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const localesDir = path.join(__dirname, 'locales');

// Helper to get nested property value
function getNestedProperty(obj, keyPath) {
  const parts = keyPath.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === null || typeof current !== 'object') {
      return undefined;
    }
    current = current[part];
  }
  return current;
}

// Helper to set nested property value
function setNestedProperty(obj, keyPath, value) {
  const parts = keyPath.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || typeof current[part] !== 'object' || current[part] === null) {
      current[part] = {};
    }
    current = current[part];
  }
  current[parts[parts.length - 1]] = value;
}

// Helper to get all leaf keys and values of an object recursively
function getLeafKeys(obj, prefix = '') {
  let leafKeys = [];
  for (const k in obj) {
    const keyPath = prefix ? `${prefix}.${k}` : k;
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
      leafKeys = leafKeys.concat(getLeafKeys(obj[k], keyPath));
    } else {
      leafKeys.push({ path: keyPath, value: obj[k] });
    }
  }
  return leafKeys;
}

async function run() {
  // 1. Get all languages and load existing translations
  if (!fs.existsSync(localesDir)) {
    console.error(`Locales directory not found at: ${localesDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.js'));
  const allLocales = {};

  console.log('Loading existing translations...');
  for (const file of files) {
    const lang = file.replace('.js', '');
    const fileUrl = new URL(`./locales/${file}`, import.meta.url).toString();
    const { default: data } = await import(fileUrl);
    // Deep clone to ensure mutability
    allLocales[lang] = JSON.parse(JSON.stringify(data));
  }

  const otherLangs = Object.keys(allLocales).filter(lang => lang !== 'en');

  // Check for --batch argument or automatically apply pending keys if any
  // format
    //   "aquila.noCharacters": {
    //   "cs": "Žádné informace o postavách", "de": "Keine Charakterinformationen verfügbar", "en": "No character information available", "es": "No hay información de personajes disponible", "fi": "Ei hahmo-tietoja saatavilla", "ja": "キャラクター情報はありません", "ko": "캐릭터 정보가 없습니다", "ms": "Tiada maklumat watak tersedia", "no": "Ingen karakterinformasjon tilgjengelig", "pl": "Brak dostępnych informacji o postaciach", "ru": "Информация о персонажах отсутствует", "th": "ไม่มีข้อมูลตัวละคร", "tr": "Karakter bilgisi bulunmuyor", "vi": "Không có thông tin nhân vật", "zh-CN": "暂无角色信息", "zh-TW": "暫無角色資訊"
    // }
  const batchData = {

  };

  const isBatchRun = process.argv.includes('--batch');
  if (isBatchRun) {
    console.log('Running batch translation update for pending keys...');
    for (const [keyPath, langValues] of Object.entries(batchData)) {
      for (const [lang, val] of Object.entries(langValues)) {
        if (allLocales[lang]) {
          setNestedProperty(allLocales[lang], keyPath, val);
        }
      }
    }

    console.log('\nWriting changes to locale files (.js in rrScripts/locales)...');
    for (const lang of Object.keys(allLocales)) {
      const filePath = path.join(localesDir, `${lang}.js`);
      const fileContent = `export default ${JSON.stringify(allLocales[lang], null, 2)};\n`;
      fs.writeFileSync(filePath, fileContent, 'utf8');
    }
    console.log('All JS locale files updated successfully.');

    console.log('\nRunning locale generation and validation...');
    try {
      execSync('node generate-locales.js', { stdio: 'inherit', cwd: __dirname });
      execSync('node check-locales.js', { stdio: 'inherit', cwd: __dirname });
      console.log('\n🎉 Batch append completed successfully.');
    } catch (error) {
      console.error('\n❌ Locale validation or generation failed.');
      process.exit(1);
    }
    return;
  }

  let addMore = true;

  // 2. Prompt loop
  while (addMore) {
    console.log('\n--- Add New Translation Key ---');

    const prompts = (await import('prompts')).default;
    // Prompt for key
    const keyResp = await prompts({
      type: 'text',
      name: 'key',
      message: 'Enter the translation key path (e.g. constellationBuilder.myNewKey):',
      validate: val => val.trim().length > 0 ? true : 'Key is required.'
    });

    if (keyResp.key === undefined) {
      console.log('\nAborted. No changes saved.');
      process.exit(0);
    }

    const keyPath = keyResp.key.trim();

    // Check if key already exists in English
    const existingVal = getNestedProperty(allLocales['en'], keyPath);
    if (existingVal !== undefined) {
      const overwriteResp = await prompts({
        type: 'confirm',
        name: 'overwrite',
        message: `Key "${keyPath}" already exists with value: ${JSON.stringify(existingVal)}. Overwrite it?`,
        initial: false
      });

      if (overwriteResp.overwrite === undefined) {
        console.log('\nAborted. No changes saved.');
        process.exit(0);
      }

      if (!overwriteResp.overwrite) {
        console.log('Skipping this key.');
        continue;
      }
    }

    // Prompt for English value
    const enValResp = await prompts({
      type: 'text',
      name: 'value',
      message: `Enter English value for "${keyPath}" (accepts JSON string for nested keys):`,
      validate: val => val.trim().length > 0 ? true : 'Value is required.'
    });

    if (enValResp.value === undefined) {
      console.log('\nAborted. No changes saved.');
      process.exit(0);
    }

    const rawEnValue = enValResp.value.trim();
    let finalEnValue = rawEnValue;
    let isNested = false;

    // Detect and parse JSON structure if entered
    if (rawEnValue.startsWith('{') || rawEnValue.startsWith('[')) {
      try {
        finalEnValue = JSON.parse(rawEnValue);
        isNested = typeof finalEnValue === 'object' && finalEnValue !== null;
      } catch (e) {
        // Not valid JSON, treat as standard string
      }
    }

    // Determine the list of leaf keys/values to prompt translation for
    let leafKeysToTranslate = [];
    if (isNested) {
      console.log('-> Detected nested JSON structure. Finding sub-keys to translate...');
      const relativeLeafs = getLeafKeys(finalEnValue);
      leafKeysToTranslate = relativeLeafs.map(leaf => ({
        fullPath: `${keyPath}.${leaf.path}`,
        relPath: leaf.path,
        enValue: leaf.value
      }));
    } else {
      leafKeysToTranslate = [{
        fullPath: keyPath,
        relPath: '',
        enValue: finalEnValue
      }];
    }

    // Prepare translation mapping for other languages
    const translations = {};
    for (const lang of otherLangs) {
      translations[lang] = {};
      console.log(`\nTranslating for [${lang}]:`);

      for (const item of leafKeysToTranslate) {
        const promptMsg = isNested 
          ? `  [${lang}] Value for sub-key "${item.relPath}" (English: "${item.enValue}"):`
          : `  [${lang}] Value (English: "${item.enValue}"):`;

        const transResp = await prompts({
          type: 'text',
          name: 'value',
          message: promptMsg,
          validate: val => val.trim().length > 0 ? true : 'Translation is required.'
        });

        if (transResp.value === undefined) {
          console.log('\nAborted. No changes saved.');
          process.exit(0);
        }

        translations[lang][item.fullPath] = transResp.value.trim();
      }
    }

    // Apply translations in-memory
    // Set English values
    setNestedProperty(allLocales['en'], keyPath, finalEnValue);

    // Set other languages values
    for (const lang of otherLangs) {
      for (const item of leafKeysToTranslate) {
        setNestedProperty(allLocales[lang], item.fullPath, translations[lang][item.fullPath]);
      }
    }

    console.log(`\nSuccessfully added key(s) in-memory.`);

    // Ask if adding another key
    const moreResp = await prompts({
      type: 'confirm',
      name: 'more',
      message: 'Would you like to add another key?',
      initial: false
    });

    if (moreResp.more === undefined) {
      console.log('\nAborted. No changes saved.');
      process.exit(0);
    }

    addMore = moreResp.more;
  }

  // 3. Write modified locales back to files
  console.log('\nWriting changes to locale files...');
  for (const lang of Object.keys(allLocales)) {
    const filePath = path.join(localesDir, `${lang}.js`);
    const fileContent = `export default ${JSON.stringify(allLocales[lang], null, 2)};\n`;
    fs.writeFileSync(filePath, fileContent, 'utf8');
  }
  console.log('All files updated successfully.');

  // 4. Run post-run hooks: generate-locales.js and check-locales.js
  console.log('\nRunning locale generation and validation...');
  try {
    execSync('node generate-locales.js', { stdio: 'inherit', cwd: __dirname });
    execSync('node check-locales.js', { stdio: 'inherit', cwd: __dirname });
    console.log('\n🎉 Done! All translations generated and validated successfully.');
  } catch (error) {
    console.error('\n❌ Locale validation or generation failed. Please see errors above.');
  }
}

run().catch(err => {
  console.error('An unexpected error occurred:', err);
  process.exit(1);
});
