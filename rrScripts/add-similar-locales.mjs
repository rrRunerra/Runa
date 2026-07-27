import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const localesSrcDir = path.join(__dirname, 'locales');
const frontendSrcLocales = path.join(__dirname, '../apps/frontend/src/locales');
const frontendPublicLocales = path.join(__dirname, '../apps/frontend/public/locales');

const newTranslations = {
  en: {
    similar: 'Similar',
    similarSeries: 'Similar Series',
    searchSimilarPlaceholder: 'Search similar entries or base titles...',
    includeItemsInList: 'Include items in list',
    noSimilarFound: 'No Similar Entries Found',
    noSimilarFoundDesc: 'No matching similar entries were found for current list filters. Try toggling "Include items in list" or clearing filter terms.',
    loginRequired: 'Please log in to add items to your list',
    addedToPlanning: 'Added to Planning',
    failedAddToList: 'Failed to add to list',
    quickAdd: 'Quick Add',
  },
  ja: {
    similar: '類似作品',
    similarSeries: '類似シリーズ',
    searchSimilarPlaceholder: '類似作品または元タイトルを検索...',
    includeItemsInList: 'リスト内の項目を含める',
    noSimilarFound: '類似作品が見つかりません',
    noSimilarFoundDesc: '現在のフィルター条件に一致する類似作品が見つかりませんでした。',
    loginRequired: 'リストに追加するにはログインしてください',
    addedToPlanning: '視聴予定に追加しました',
    failedAddToList: 'リストへの追加に失敗しました',
    quickAdd: 'クイック追加',
  },
  ko: {
    similar: '유사 작품',
    similarSeries: '유사 시리즈',
    searchSimilarPlaceholder: '유사 작품 또는 원작 타이틀 검색...',
    includeItemsInList: '목록에 있는 항목 포함',
    noSimilarFound: '유사 작품을 찾을 수 없습니다',
    noSimilarFoundDesc: '현재 필터 조건에 일치하는 유사 작품이 없습니다.',
    loginRequired: '목록에 추가하려면 로그인하세요',
    addedToPlanning: '볼 예정 목록에 추가됨',
    failedAddToList: '목록 추가 실패',
    quickAdd: '빠른 추가',
  },
  'zh-CN': {
    similar: '相似作品',
    similarSeries: '相似系列',
    searchSimilarPlaceholder: '搜索相似作品或原标题...',
    includeItemsInList: '包含列表中的项目',
    noSimilarFound: '未找到相似作品',
    noSimilarFoundDesc: '当前筛选条件下未找到匹配的相似作品。',
    loginRequired: '请登录以添加项目到列表',
    addedToPlanning: '已添加到计划观看',
    failedAddToList: '添加到列表失败',
    quickAdd: '快速添加',
  },
  'zh-TW': {
    similar: '相似作品',
    similarSeries: '相似系列',
    searchSimilarPlaceholder: '搜尋相似作品或原標題...',
    includeItemsInList: '包含清單中的項目',
    noSimilarFound: '未找到相似作品',
    noSimilarFoundDesc: '目前篩選條件下未找到匹配的相似作品。',
    loginRequired: '請登入以新增項目至清單',
    addedToPlanning: '已新增至計劃觀看',
    failedAddToList: '新增至清單失敗',
    quickAdd: '快速新增',
  },
  pl: {
    similar: 'Podobne',
    similarSeries: 'Podobne serie',
    searchSimilarPlaceholder: 'Szukaj podobnych tytułów...',
    includeItemsInList: 'Uwzględnij pozycje z listy',
    noSimilarFound: 'Nie znaleziono podobnych tytułów',
    noSimilarFoundDesc: 'Brak podobnych pozycji spełniających kryteria wyszukiwania.',
    loginRequired: 'Zaloguj się, aby dodać pozycje do listy',
    addedToPlanning: 'Dodano do planowanych',
    failedAddToList: 'Nie udało się dodać do listy',
    quickAdd: 'Szybkie dodanie',
  },
  ru: {
    similar: 'Похожие',
    similarSeries: 'Похожие серии',
    searchSimilarPlaceholder: 'Поиск похожих тайтлов...',
    includeItemsInList: 'Включая элементы из списка',
    noSimilarFound: 'Похожие тайтлы не найдены',
    noSimilarFoundDesc: 'По вашему запросу похожих тайтлов не найдено.',
    loginRequired: 'Войдите, чтобы добавить в список',
    addedToPlanning: 'Добавлено в планах',
    failedAddToList: 'Ошибка добавления в список',
  },
  de: {
    similar: 'Ähnlich',
    similarSeries: 'Ähnliche Serien',
    searchSimilarPlaceholder: 'Ähnliche Titel suchen...',
    includeItemsInList: 'Einträge aus der Liste einschließen',
    noSimilarFound: 'Keine ähnlichen Einträge gefunden',
    noSimilarFoundDesc: 'Es wurden keine passenden ähnlichen Einträge gefunden.',
    loginRequired: 'Bitte melden Sie sich an',
    addedToPlanning: 'Zu Geplant hinzugefügt',
    failedAddToList: 'Hinzufügen fehlgeschlagen',
  },
  es: {
    similar: 'Similares',
    similarSeries: 'Series similares',
    searchSimilarPlaceholder: 'Buscar títulos similares...',
    includeItemsInList: 'Incluir elementos de la lista',
    noSimilarFound: 'No se encontraron títulos similares',
    noSimilarFoundDesc: 'No hay entradas similares que coincidan con los filtros.',
    loginRequired: 'Inicia sesión para añadir elementos',
    addedToPlanning: 'Añadido a Planeados',
    failedAddToList: 'Error al añadir a la lista',
  },
  cs: {
    similar: 'Podobné',
    similarSeries: 'Podobné série',
    searchSimilarPlaceholder: 'Hledat podobné tituly...',
    includeItemsInList: 'Zahrnout položky ze seznamu',
    noSimilarFound: 'Nenalezeny žádné podobné tituly',
    noSimilarFoundDesc: 'Nenalezeny žádné odpovídající podobné tituly.',
    loginRequired: 'Přihlaste se pro přidání do seznamu',
    addedToPlanning: 'Přidáno do plánovaných',
    failedAddToList: 'Přidání do seznamu selhalo',
  },
  fi: {
    similar: 'Samankaltaiset',
    similarSeries: 'Samankaltaiset sarjat',
    searchSimilarPlaceholder: 'Etsi samankaltaisia nimikkeitä...',
    includeItemsInList: 'Sisällytä listalla olevat',
    noSimilarFound: 'Ei samankaltaisia nimikkeitä',
    noSimilarFoundDesc: 'Ei hakuehtoja vastaavia samankaltaisia nimikkeitä.',
    loginRequired: 'Kirjaudu sisään lisätäksesi listalle',
    addedToPlanning: 'Lisätty suunniteltuihin',
    failedAddToList: 'Lisääminen epäonnistui',
  },
  no: {
    similar: 'Lignende',
    similarSeries: 'Lignende serier',
    searchSimilarPlaceholder: 'Søk etter lignende titler...',
    includeItemsInList: 'Inkluder elementer i listen',
    noSimilarFound: 'Ingen lignende titler funnet',
    noSimilarFoundDesc: 'Ingen lignende titler som passer filteret.',
    loginRequired: 'Logg inn for å legge til',
    addedToPlanning: 'Lagt til i planlagt',
    failedAddToList: 'Kunne ikke legge til',
  },
  tr: {
    similar: 'Benzerler',
    similarSeries: 'Benzer Seriler',
    searchSimilarPlaceholder: 'Benzer başlıkları ara...',
    includeItemsInList: 'Listedeki öğeleri dahil et',
    noSimilarFound: 'Benzer başlık bulunamadı',
    noSimilarFoundDesc: 'Filtrelere uygun benzer başlık bulunamadı.',
    loginRequired: 'Eklemek için giriş yapın',
    addedToPlanning: 'Planlananlara eklendi',
    failedAddToList: 'Listeye ekleme başarısız',
  },
  vi: {
    similar: 'Tương tự',
    similarSeries: 'Series tương tự',
    searchSimilarPlaceholder: 'Tìm kiếm tác phẩm tương tự...',
    includeItemsInList: 'Bao gồm mục trong danh sách',
    noSimilarFound: 'Không tìm thấy tác phẩm tương tự',
    noSimilarFoundDesc: 'Không có tác phẩm tương tự phù hợp với bộ lọc.',
    loginRequired: 'Vui lòng đăng nhập',
    addedToPlanning: 'Đã thêm vào kế hoạch',
    failedAddToList: 'Thêm vào danh sách thất bại',
  },
  th: {
    similar: 'ที่คล้ายกัน',
    similarSeries: 'ซีรีส์ที่คล้ายกัน',
    searchSimilarPlaceholder: 'ค้นหารายการที่คล้ายกัน...',
    includeItemsInList: 'รวมรายการในลิสต์',
    noSimilarFound: 'ไม่พบรายการที่คล้ายกัน',
    noSimilarFoundDesc: 'ไม่พบรายการที่คล้ายกันตรงกับเงื่อนไขการค้นหา',
    loginRequired: 'กรุณาเข้าสู่ระบบก่อน',
    addedToPlanning: 'เพิ่มในแผนแล้ว',
    failedAddToList: 'เพิ่มในลิสต์ไม่สำเร็จ',
  },
  ms: {
    similar: 'Serupa',
    similarSeries: 'Siri Serupa',
    searchSimilarPlaceholder: 'Cari tajuk serupa...',
    includeItemsInList: 'Sertakan item dalam senarai',
    noSimilarFound: 'Tiada tajuk serupa ditemui',
    noSimilarFoundDesc: 'Tiada carian serupa yang sepadanกับ penapis.',
    loginRequired: 'Sila log masuk untuk menambah',
    addedToPlanning: 'Ditambah ke Perancangan',
    failedAddToList: 'Gagal menambah ke senarai',
  },
};


async function main() {
  const files = fs.readdirSync(localesSrcDir).filter((f) => f.endsWith('.js'));
  const allLocales = {};

  for (const file of files) {
    const lang = file.replace('.js', '');
    const fileUrl = new URL(`./locales/${file}`, import.meta.url).toString();
    const { default: data } = await import(fileUrl);

    if (!data.aquila) data.aquila = {};

    const sourceKeys = newTranslations[lang] || newTranslations.en;
    Object.assign(data.aquila, sourceKeys);

    // Re-serialize JS file
    const jsContent = `export default ${JSON.stringify(data, null, 2)};\n`;
    fs.writeFileSync(path.join(localesSrcDir, file), jsContent, 'utf8');

    allLocales[lang] = data;
  }

  // Sync src/locales/*.json
  if (!fs.existsSync(frontendSrcLocales)) {
    fs.mkdirSync(frontendSrcLocales, { recursive: true });
  }
  Object.keys(allLocales).forEach((lang) => {
    fs.writeFileSync(
      path.join(frontendSrcLocales, `${lang}.json`),
      JSON.stringify(allLocales[lang], null, 2),
      'utf8'
    );
  });

  // Sync public/locales/{lang}/translation.json
  Object.keys(allLocales).forEach((lang) => {
    const langDir = path.join(frontendPublicLocales, lang);
    if (!fs.existsSync(langDir)) fs.mkdirSync(langDir, { recursive: true });
    fs.writeFileSync(
      path.join(langDir, 'translation.json'),
      JSON.stringify(allLocales[lang], null, 2),
      'utf8'
    );
  });

  console.log('Successfully updated and synchronized all locale files!');
}

main().catch(console.error);
