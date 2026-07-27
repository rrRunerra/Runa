import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const localesDir = path.join(__dirname, 'locales');

const trackerTranslations = {
  en: {
    detectedTitle: "Package Tracking Detected",
    multiPackages: "{{count}} packages",
    copyTracking: "Copy tracking number",
    copy: "Copy",
    copied: "Copied!",
    trackOnWeb: "Track Package",
    fetchingDetails: "Fetching live tracking status...",
    status_DELIVERED: "Delivered",
    status_OUT_FOR_DELIVERY: "Out for Delivery",
    status_IN_TRANSIT: "In Transit",
    status_SHIPPED: "Shipped",
    status_LABEL_CREATED: "Label Created",
    stepPlaced: "Placed",
    stepShipped: "Shipped",
    stepInTransit: "In Transit",
    stepDelivered: "Delivered",
    estDelivery: "Estimated Delivery",
    viewDetailedHistory: "Activity History",
    failedLoadDetails: "Unable to load package tracking details."
  },
  ja: {
    detectedTitle: "荷物追跡番号を検出しました",
    multiPackages: "{{count}}個の荷物",
    copyTracking: "追跡番号をコピー",
    copy: "コピー",
    copied: "コピー完了!",
    trackOnWeb: "配送状況を追跡",
    fetchingDetails: "最新の配送状況を取得中...",
    status_DELIVERED: "配達完了",
    status_OUT_FOR_DELIVERY: "配達中",
    status_IN_TRANSIT: "輸送中",
    status_SHIPPED: "発送済み",
    status_LABEL_CREATED: "伝票作成済み",
    stepPlaced: "注文完了",
    stepShipped: "発送",
    stepInTransit: "輸送中",
    stepDelivered: "配達完了",
    estDelivery: "お届け予定日",
    viewDetailedHistory: "詳細な配送履歴",
    failedLoadDetails: "追跡情報を取得できませんでした。"
  },
  ko: {
    detectedTitle: "택배 운송장 번호 감지됨",
    multiPackages: "{{count}}개 소화물",
    copyTracking: "운송장 번호 복사",
    copy: "복사",
    copied: "복사됨!",
    trackOnWeb: "배송 추적",
    fetchingDetails: "실시간 배송 상태 조회 중...",
    status_DELIVERED: "배송 완료",
    status_OUT_FOR_DELIVERY: "배송 출발",
    status_IN_TRANSIT: "이동 중",
    status_SHIPPED: "발송 완료",
    status_LABEL_CREATED: "운송장 생성",
    stepPlaced: "주문 완료",
    stepShipped: "발송",
    stepInTransit: "이동 중",
    stepDelivered: "배송 완료",
    estDelivery: "예상 배송일",
    viewDetailedHistory: "상세 배송 이력",
    failedLoadDetails: "배송 추적 정보를 불러올 수 없습니다."
  },
  "zh-CN": {
    detectedTitle: "检测到包裹追踪单号",
    multiPackages: "{{count}}个包裹",
    copyTracking: "复制运单号",
    copy: "复制",
    copied: "已复制!",
    trackOnWeb: "追踪包裹",
    fetchingDetails: "正在获取实时物流状态...",
    status_DELIVERED: "已送达",
    status_OUT_FOR_DELIVERY: "派送中",
    status_IN_TRANSIT: "运输中",
    status_SHIPPED: "已发货",
    status_LABEL_CREATED: "电子单号已生成",
    stepPlaced: "已下单",
    stepShipped: "已发货",
    stepInTransit: "运输中",
    stepDelivered: "已送达",
    estDelivery: "预计送达",
    viewDetailedHistory: "详细物流轨迹",
    failedLoadDetails: "无法加载包裹追踪详情。"
  },
  "zh-TW": {
    detectedTitle: "偵測到包裹追蹤單號",
    multiPackages: "{{count}}個包裹",
    copyTracking: "複製運單號",
    copy: "複製",
    copied: "已複製!",
    trackOnWeb: "追蹤包裹",
    fetchingDetails: "正在取得即時物流狀態...",
    status_DELIVERED: "已送達",
    status_OUT_FOR_DELIVERY: "外送中",
    status_IN_TRANSIT: "運送中",
    status_SHIPPED: "已出貨",
    status_LABEL_CREATED: "託運單已建立",
    stepPlaced: "已下單",
    stepShipped: "已出貨",
    stepInTransit: "運送中",
    stepDelivered: "已送達",
    estDelivery: "預計送達",
    viewDetailedHistory: "詳細物流履歷",
    failedLoadDetails: "無法載入包裹追蹤詳情。"
  },
  de: {
    detectedTitle: "Paketverfolgungsnummer erkannt",
    multiPackages: "{{count}} Pakete",
    copyTracking: "Sendungsnummer kopieren",
    copy: "Kopieren",
    copied: "Kopiert!",
    trackOnWeb: "Paket verfolgen",
    fetchingDetails: "Live-Sendungsstatus wird abgerufen...",
    status_DELIVERED: "Zugestellt",
    status_OUT_FOR_DELIVERY: "In Zustellung",
    status_IN_TRANSIT: "Unterwegs",
    status_SHIPPED: "Versendet",
    status_LABEL_CREATED: "Sendeetikett erstellt",
    stepPlaced: "Bestellt",
    stepShipped: "Versendet",
    stepInTransit: "Unterwegs",
    stepDelivered: "Zugestellt",
    estDelivery: "Voraussichtliche Lieferung",
    viewDetailedHistory: "Detaillierter Verlauf",
    failedLoadDetails: "Paketverfolgungsdetails konnten nicht geladen werden."
  },
  es: {
    detectedTitle: "Número de seguimiento detectado",
    multiPackages: "{{count}} paquetes",
    copyTracking: "Copiar número de seguimiento",
    copy: "Copiar",
    copied: "¡Copiado!",
    trackOnWeb: "Rastrear paquete",
    fetchingDetails: "Obteniendo estado de seguimiento en vivo...",
    status_DELIVERED: "Entregado",
    status_OUT_FOR_DELIVERY: "En reparto",
    status_IN_TRANSIT: "En tránsito",
    status_SHIPPED: "Enviado",
    status_LABEL_CREATED: "Etiqueta creada",
    stepPlaced: "Pedido",
    stepShipped: "Enviado",
    stepInTransit: "En tránsito",
    stepDelivered: "Entregado",
    estDelivery: "Entrega estimada",
    viewDetailedHistory: "Historial detallado",
    failedLoadDetails: "No se pudieron cargar los detalles del seguimiento."
  },
  cs: {
    detectedTitle: "Zjištěno sledovací číslo zásilky",
    multiPackages: "{{count}} balíky",
    copyTracking: "Kopírovat sledovací číslo",
    copy: "Kopírovat",
    copied: "Zkopírováno!",
    trackOnWeb: "Sledovat zásilku",
    fetchingDetails: "Načítání živého stavu zásilky...",
    status_DELIVERED: "Doručeno",
    status_OUT_FOR_DELIVERY: "Na cestě k doručení",
    status_IN_TRANSIT: "Na cestě",
    status_SHIPPED: "Odesláno",
    status_LABEL_CREATED: "Štítek vytvořen",
    stepPlaced: "Objednáno",
    stepShipped: "Odesláno",
    stepInTransit: "Na cestě",
    stepDelivered: "Doručeno",
    estDelivery: "Odhadované doručení",
    viewDetailedHistory: "Podrobná historie",
    failedLoadDetails: "Nelze načíst podrobnosti o sledování."
  },
  fi: {
    detectedTitle: "Pakettien seurantanumero havaittu",
    multiPackages: "{{count}} pakettia",
    copyTracking: "Kopioi seurantanumero",
    copy: "Kopioi",
    copied: "Kopioitu!",
    trackOnWeb: "Seuraa pakettia",
    fetchingDetails: "Haetaan reaaliaikaista tilaa...",
    status_DELIVERED: "Toimitettu",
    status_OUT_FOR_DELIVERY: "Jakelussa",
    status_IN_TRANSIT: "Kuljetuksessa",
    status_SHIPPED: "Lähetetty",
    status_LABEL_CREATED: "Osoitekortti luotu",
    stepPlaced: "Tilattu",
    stepShipped: "Lähetetty",
    stepInTransit: "Kuljetuksessa",
    stepDelivered: "Toimitettu",
    estDelivery: "Arvioitu toimitus",
    viewDetailedHistory: "Yksityiskohtainen historia",
    failedLoadDetails: "Seurantatietoja ei voitu ladata."
  },
  ms: {
    detectedTitle: "Nombor jejak bungkusan dikesan",
    multiPackages: "{{count}} bungkusan",
    copyTracking: "Salin nombor jejak",
    copy: "Salin",
    copied: "Disalin!",
    trackOnWeb: "Jejak Bungkusan",
    fetchingDetails: "Mengambil status jejak langsung...",
    status_DELIVERED: "Dihantar",
    status_OUT_FOR_DELIVERY: "Dalam penghantaran",
    status_IN_TRANSIT: "Dalam transit",
    status_SHIPPED: "Dihantar keluar",
    status_LABEL_CREATED: "Label dicipta",
    stepPlaced: "Dipesan",
    stepShipped: "Dihantar",
    stepInTransit: "Dalam transit",
    stepDelivered: "Dihantar",
    estDelivery: "Anggaran Penghantaran",
    viewDetailedHistory: "Sejarah Terperinci",
    failedLoadDetails: "Gagal memuatkan butiran jejak bungkusan."
  },
  no: {
    detectedTitle: "Pakkesporingsnummer oppdaget",
    multiPackages: "{{count}} pakker",
    copyTracking: "Kopier sporingsnummer",
    copy: "Kopier",
    copied: "Kopiert!",
    trackOnWeb: "Spor pakke",
    fetchingDetails: "Henter livestatus for sporing...",
    status_DELIVERED: "Levert",
    status_OUT_FOR_DELIVERY: "Ute til levering",
    status_IN_TRANSIT: "I transit",
    status_SHIPPED: "Sendt",
    status_LABEL_CREATED: "Etikett opprettet",
    stepPlaced: "Bestilt",
    stepShipped: "Sendt",
    stepInTransit: "I transit",
    stepDelivered: "Levert",
    estDelivery: "Beregnet levering",
    viewDetailedHistory: "Detaljert historikk",
    failedLoadDetails: "Kunne ikke laste sporingsdetaljer."
  },
  pl: {
    detectedTitle: "Wykryto numer śledzenia przesyłki",
    multiPackages: "{{count}} paczek",
    copyTracking: "Kopiuj numer śledzenia",
    copy: "Kopiuj",
    copied: "Skopiowano!",
    trackOnWeb: "Śledź paczkę",
    fetchingDetails: "Pobieranie statusu na żywo...",
    status_DELIVERED: "Doręczono",
    status_OUT_FOR_DELIVERY: "W doręczeniu",
    status_IN_TRANSIT: "W tranzycie",
    status_SHIPPED: "Wysłano",
    status_LABEL_CREATED: "Etykieta utworzona",
    stepPlaced: "Złożono",
    stepShipped: "Wysłano",
    stepInTransit: "W tranzycie",
    stepDelivered: "Doręczono",
    estDelivery: "Przewidywana dostawa",
    viewDetailedHistory: "Szczegółowa historia",
    failedLoadDetails: "Nie udało się załadować szczegółów śledzenia."
  },
  ru: {
    detectedTitle: "Обнаружен трек-номер посылки",
    multiPackages: "{{count}} посылок",
    copyTracking: "Копировать трек-номер",
    copy: "Копировать",
    copied: "Скопировано!",
    trackOnWeb: "Отследить посылку",
    fetchingDetails: "Загрузка статуса отслеживания...",
    status_DELIVERED: "Доставлено",
    status_OUT_FOR_DELIVERY: "Вручение курьеру",
    status_IN_TRANSIT: "В пути",
    status_SHIPPED: "Отправлено",
    status_LABEL_CREATED: "Создана накладная",
    stepPlaced: "Оформлено",
    stepShipped: "Отправлено",
    stepInTransit: "В пути",
    stepDelivered: "Доставлено",
    estDelivery: "Ожидаемая доставка",
    viewDetailedHistory: "Подробная история",
    failedLoadDetails: "Не удалось загрузить данные отслеживания."
  },
  th: {
    detectedTitle: "ตรวจพบหมายเลขพัสดุ",
    multiPackages: "{{count}} พัสดุ",
    copyTracking: "คัดลอกหมายเลขพัสดุ",
    copy: "คัดลอก",
    copied: "คัดลอกแล้ว!",
    trackOnWeb: "ติดตามพัสดุ",
    fetchingDetails: "กำลังโหลดสถานะติดตามพัสดุ...",
    status_DELIVERED: "จัดส่งสำเร็จ",
    status_OUT_FOR_DELIVERY: "กำลังนำจ่าย",
    status_IN_TRANSIT: "อยู่ระหว่างขนส่ง",
    status_SHIPPED: "จัดส่งแล้ว",
    status_LABEL_CREATED: "สร้างสลากจัดส่งแล้ว",
    stepPlaced: "สั่งซื้อแล้ว",
    stepShipped: "จัดส่งแล้ว",
    stepInTransit: "อยู่ระหว่างขนส่ง",
    stepDelivered: "จัดส่งสำเร็จ",
    estDelivery: "ประมาณการจัดส่ง",
    viewDetailedHistory: "ประวัติการเดินทางโดยละเอียด",
    failedLoadDetails: "ไม่สามารถโหลดข้อมูลการติดตามพัสดุได้"
  },
  tr: {
    detectedTitle: "Kargo takip numarası tespit edildi",
    multiPackages: "{{count}} paket",
    copyTracking: "Takip numarasını kopyala",
    copy: "Kopyala",
    copied: "Kopyalandı!",
    trackOnWeb: "Kargoyu Takip Et",
    fetchingDetails: "Canlı takip durumu alınıyor...",
    status_DELIVERED: "Teslim Edildi",
    status_OUT_FOR_DELIVERY: "Dağıtımda",
    status_IN_TRANSIT: "Transfer Aşamasında",
    status_SHIPPED: "Kargoya Verildi",
    status_LABEL_CREATED: "Barkod Oluşturuldu",
    stepPlaced: "Sipariş Alındı",
    stepShipped: "Kargoda",
    stepInTransit: "Transferde",
    stepDelivered: "Teslim Edildi",
    estDelivery: "Tahmini Teslimat",
    viewDetailedHistory: "Detaylı Geçmiş",
    failedLoadDetails: "Kargo takip detayları yüklenemedi."
  },
  vi: {
    detectedTitle: "Phát hiện mã vận đơn bưu kiện",
    multiPackages: "{{count}} kiện hàng",
    copyTracking: "Sao chép mã vận đơn",
    copy: "Sao chép",
    copied: "Đã sao chép!",
    trackOnWeb: "Theo dõi đơn hàng",
    fetchingDetails: "Đang tải trạng thái vận chuyển...",
    status_DELIVERED: "Đã giao hàng",
    status_OUT_FOR_DELIVERY: "Đang giao hàng",
    status_IN_TRANSIT: "Đang vận chuyển",
    status_SHIPPED: "Đã xuất kho",
    status_LABEL_CREATED: "Đã tạo vận đơn",
    stepPlaced: "Đã đặt hàng",
    stepShipped: "Đã gửi",
    stepInTransit: "Đang vận chuyển",
    stepDelivered: "Đã giao",
    estDelivery: "Dự kiến giao hàng",
    viewDetailedHistory: "Lịch trình chi tiết",
    failedLoadDetails: "Không thể tải thông tin vận đơn."
  }
};

async function main() {
  const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.js'));

  for (const file of files) {
    const lang = file.replace('.js', '');
    const filePath = path.join(localesDir, file);
    const fileUrl = new URL(`./locales/${file}`, import.meta.url).toString();
    const { default: langData } = await import(fileUrl);

    const targetTranslations = trackerTranslations[lang] || trackerTranslations.en;

    if (!langData.pegasus) {
      langData.pegasus = {};
    }
    langData.pegasus.packageTracker = targetTranslations;

    const updatedContent = `export default ${JSON.stringify(langData, null, 2)};\n`;
    fs.writeFileSync(filePath, updatedContent, 'utf8');
    console.log(`Updated ${file} with pegasus.packageTracker translations.`);
  }

  console.log('Generating JSON locale files...');
  execSync('node generate-locales.js', { stdio: 'inherit', cwd: __dirname });
  console.log('Successfully generated all locale files!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
