export interface DetectedPackage {
  trackingNumber: string;
  carrierId: CarrierId;
  carrierName: string;
  carrierUrl: string;
  emailLinkUrl?: string;
  fallbackUrl: string;
  statusHint?: 'DELIVERED' | 'OUT_FOR_DELIVERY' | 'IN_TRANSIT' | 'SHIPPED' | 'LABEL_CREATED';
  estimatedDelivery?: string;
}

export type CarrierId =
  | 'ups'
  | 'fedex'
  | 'usps'
  | 'dhl'
  | 'amazon'
  | 'ontrac'
  | 'yunexpress'
  | 'dpd'
  | 'royalmail'
  | 'alza'
  | 'packeta'
  | 'chinapost'
  | 'sps'
  | 'postal_international'
  | 'unknown';

interface CarrierConfig {
  id: CarrierId;
  name: string;
  buildUrl: (num: string) => string;
}

const CARRIER_CONFIGS: Record<CarrierId, CarrierConfig> = {
  ups: {
    id: 'ups',
    name: 'UPS',
    buildUrl: (num: string) => `https://www.ups.com/track?tracknum=${encodeURIComponent(num)}`,
  },
  fedex: {
    id: 'fedex',
    name: 'FedEx',
    buildUrl: (num: string) => `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(num)}`,
  },
  usps: {
    id: 'usps',
    name: 'USPS',
    buildUrl: (num: string) => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(num)}`,
  },
  dhl: {
    id: 'dhl',
    name: 'DHL Express',
    buildUrl: (num: string) => `https://www.dhl.com/en/express/tracking.html?AWB=${encodeURIComponent(num)}`,
  },
  amazon: {
    id: 'amazon',
    name: 'Amazon Logistics',
    buildUrl: (num: string) => `https://www.amazon.com/progress-tracker/package/ref=ord_cart_shr?trackingId=${encodeURIComponent(num)}`,
  },
  ontrac: {
    id: 'ontrac',
    name: 'OnTrac',
    buildUrl: (num: string) => `https://www.ontrac.com/tracking/?number=${encodeURIComponent(num)}`,
  },
  yunexpress: {
    id: 'yunexpress',
    name: 'YunExpress',
    buildUrl: (num: string) => `https://www.yuntrack.com/Track/Detail/${encodeURIComponent(num)}`,
  },
  dpd: {
    id: 'dpd',
    name: 'DPD Express',
    buildUrl: (num: string) => `https://www.dpdgroup.com/sk/mydpd/my-parcels/search?parcelNumber=${encodeURIComponent(num)}`,
  },
  royalmail: {
    id: 'royalmail',
    name: 'Royal Mail',
    buildUrl: (num: string) => `https://www.royalmail.com/track-your-item#/${encodeURIComponent(num)}`,
  },
  alza: {
    id: 'alza',
    name: 'Alza.sk',
    buildUrl: (num: string) => `https://www.alza.sk/moje-alza/moje-objednavky.htm?id=${encodeURIComponent(num)}`,
  },
  packeta: {
    id: 'packeta',
    name: 'Packeta (Zásielkovňa)',
    buildUrl: (num: string) => `https://tracking.packeta.com/cs_CZ/?id=${encodeURIComponent(num)}`,
  },
  chinapost: {
    id: 'chinapost',
    name: 'China Post / EMS',
    buildUrl: (num: string) => `https://www.17track.net/en/track#nums=${encodeURIComponent(num)}`,
  },
  sps: {
    id: 'sps',
    name: 'Slovak Parcel Service (SPS)',
    buildUrl: (num: string) => `https://tracking.sps-slovakia.sk/?pass=${encodeURIComponent(num)}`,
  },
  postal_international: {
    id: 'postal_international',
    name: 'International Postal / EMS',
    buildUrl: (num: string) => `https://www.17track.net/en/track#nums=${encodeURIComponent(num)}`,
  },
  unknown: {
    id: 'unknown',
    name: 'Package Express',
    buildUrl: (num: string) => `https://www.17track.net/en/track#nums=${encodeURIComponent(num)}`,
  },
};

export function getFallbackTrackingUrl(trackingNumber: string): string {
  return `https://www.17track.net/en/track#nums=${encodeURIComponent(trackingNumber)}`;
}

export function detectPackageTrackingNumbers(
  subject: string,
  bodyText: string,
  bodyHtml?: string
): DetectedPackage[] {
  const combinedContent = `${subject || ''}\n${bodyText || ''}`;
  const foundMap = new Map<string, DetectedPackage>();

  // 1. UPS Detection: 1Z[0-9A-Z]{16}
  const upsMatches = combinedContent.match(/\b(1Z[0-9A-Z]{16})\b/gi);
  if (upsMatches) {
    upsMatches.forEach((raw) => {
      const num = raw.toUpperCase();
      if (!foundMap.has(num)) {
        foundMap.set(num, createDetectedPackage(num, 'ups', combinedContent, bodyHtml, bodyText));
      }
    });
  }

  // 2. Packeta (Zásielkovňa): Z\d{9,11}
  const packetaMatches = combinedContent.match(/\b(Z\d{9,11})\b/gi);
  if (packetaMatches) {
    packetaMatches.forEach((raw) => {
      const num = raw.toUpperCase();
      if (!foundMap.has(num)) {
        foundMap.set(num, createDetectedPackage(num, 'packeta', combinedContent, bodyHtml, bodyText));
      }
    });
  }

  // 3. China Post / EMS: [A-Z]{2}\d{9}CN
  const chinaPostMatches = combinedContent.match(/\b([A-Z]{2}\d{9}CN)\b/gi);
  if (chinaPostMatches) {
    chinaPostMatches.forEach((raw) => {
      const num = raw.toUpperCase();
      if (!foundMap.has(num)) {
        foundMap.set(num, createDetectedPackage(num, 'chinapost', combinedContent, bodyHtml, bodyText));
      }
    });
  }

  // 4. Slovak Parcel Service (SPS): SPS\d{8,12} or 703\d{8,10} or 7\d{10,12} when SPS context
  const spsMatches = combinedContent.match(/\b(SPS\d{8,12}|703\d{8,10})\b/gi);
  if (spsMatches) {
    spsMatches.forEach((raw) => {
      const num = raw.toUpperCase();
      if (!foundMap.has(num)) {
        foundMap.set(num, createDetectedPackage(num, 'sps', combinedContent, bodyHtml, bodyText));
      }
    });
  } else if (/sps|slovak parcel service/i.test(combinedContent)) {
    const spsNumMatches = combinedContent.match(/\b(7\d{10,12})\b/g);
    if (spsNumMatches) {
      spsNumMatches.forEach((num) => {
        if (!foundMap.has(num)) {
          foundMap.set(num, createDetectedPackage(num, 'sps', combinedContent, bodyHtml, bodyText));
        }
      });
    }
  }

  // 5. Alza.sk Order / Package Tracking: ALZ\d{7,12} or Order # when Alza context
  const alzaMatches = combinedContent.match(/\b(ALZ\d{7,12})\b/gi);
  if (alzaMatches) {
    alzaMatches.forEach((raw) => {
      const num = raw.toUpperCase();
      if (!foundMap.has(num)) {
        foundMap.set(num, createDetectedPackage(num, 'alza', combinedContent, bodyHtml, bodyText));
      }
    });
  } else if (/alza/i.test(combinedContent)) {
    const alzaNumMatches = combinedContent.match(/\b(\d{9,10})\b/g);
    if (alzaNumMatches) {
      alzaNumMatches.forEach((num) => {
        if (!foundMap.has(num)) {
          foundMap.set(num, createDetectedPackage(num, 'alza', combinedContent, bodyHtml, bodyText));
        }
      });
    }
  }

  // 6. Amazon Logistics Detection: TBA[0-9]{12,15}
  const amazonMatches = combinedContent.match(/\b(TBA[0-9]{12,15})\b/gi);
  if (amazonMatches) {
    amazonMatches.forEach((raw) => {
      const num = raw.toUpperCase();
      if (!foundMap.has(num)) {
        foundMap.set(num, createDetectedPackage(num, 'amazon', combinedContent, bodyHtml, bodyText));
      }
    });
  }

  // 7. USPS 20-22 digit starting with 9 (or 420...)
  const uspsMatches = combinedContent.match(/\b(9[2345]\d{18,21}|420\d{27})\b/g);
  if (uspsMatches) {
    uspsMatches.forEach((num) => {
      if (!foundMap.has(num)) {
        foundMap.set(num, createDetectedPackage(num, 'usps', combinedContent, bodyHtml, bodyText));
      }
    });
  }

  // 8. International Postal / EMS: [A-Z]{2}\d{9}[A-Z]{2}
  const intlMatches = combinedContent.match(/\b([A-Z]{2}\d{9}[A-Z]{2})\b/gi);
  if (intlMatches) {
    intlMatches.forEach((raw) => {
      const num = raw.toUpperCase();
      if (!foundMap.has(num)) {
        let carrier: CarrierId = 'postal_international';
        if (num.endsWith('US')) carrier = 'usps';
        else if (num.endsWith('GB')) carrier = 'royalmail';
        else if (num.endsWith('CN')) carrier = 'chinapost';
        foundMap.set(num, createDetectedPackage(num, carrier, combinedContent, bodyHtml, bodyText));
      }
    });
  }

  // 9. FedEx 12, 15, or 20 digit numbers
  const isFedExContext = /fedex|federal express/i.test(combinedContent);
  if (isFedExContext) {
    const fedexMatches = combinedContent.match(/\b(\d{12}|\d{15}|96\d{20})\b/g);
    if (fedexMatches) {
      fedexMatches.forEach((num) => {
        if (!foundMap.has(num)) {
          foundMap.set(num, createDetectedPackage(num, 'fedex', combinedContent, bodyHtml, bodyText));
        }
      });
    }
  }

  // 10. DHL
  const isDhlContext = /dhl/i.test(combinedContent);
  const dhlMatches = combinedContent.match(/\b(JD\d{18}|JJD\d{16}|JVGL\d{16})\b/gi);
  if (dhlMatches) {
    dhlMatches.forEach((raw) => {
      const num = raw.toUpperCase();
      if (!foundMap.has(num)) {
        foundMap.set(num, createDetectedPackage(num, 'dhl', combinedContent, bodyHtml, bodyText));
      }
    });
  } else if (isDhlContext) {
    const dhlAwbMatches = combinedContent.match(/\b(\d{10})\b/g);
    if (dhlAwbMatches) {
      dhlAwbMatches.forEach((num) => {
        if (!foundMap.has(num)) {
          foundMap.set(num, createDetectedPackage(num, 'dhl', combinedContent, bodyHtml, bodyText));
        }
      });
    }
  }

  // 11. DPD
  const dpdMatches = combinedContent.match(/\b(05[23]\d{11})\b/g);
  if (dpdMatches) {
    dpdMatches.forEach((num) => {
      if (!foundMap.has(num)) {
        foundMap.set(num, createDetectedPackage(num, 'dpd', combinedContent, bodyHtml, bodyText));
      }
    });
  } else if (/dpd/i.test(combinedContent)) {
    const dpdNumMatches = combinedContent.match(/\b(\d{14}|\d{12})\b/g);
    if (dpdNumMatches) {
      dpdNumMatches.forEach((num) => {
        if (!foundMap.has(num)) {
          foundMap.set(num, createDetectedPackage(num, 'dpd', combinedContent, bodyHtml, bodyText));
        }
      });
    }
  }

  // 12. Parse HTML body links
  if (bodyHtml) {
    extractTrackingFromHtmlLinks(bodyHtml, foundMap, combinedContent, bodyText);
  }

  return Array.from(foundMap.values());
}

function findEmailLinkForTrackingNumber(
  html?: string,
  text?: string,
  trackingNumber?: string
): string | undefined {
  if (!trackingNumber) return undefined;
  if (html) {
    const anchorRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match: RegExpExecArray | null;
    while ((match = anchorRegex.exec(html)) !== null) {
      const url = match[1];
      const linkText = match[2] || "";
      if (url && (url.includes(trackingNumber) || linkText.includes(trackingNumber))) {
        return url;
      }
    }
    const linkRegex = /href=["']([^"']+)["']/gi;
    while ((match = linkRegex.exec(html)) !== null) {
      const url = match[1];
      if (url && url.includes(trackingNumber)) {
        return url;
      }
    }
  }
  if (text) {
    const urlMatches = text.match(/https?:\/\/[^\s<"']+/gi);
    if (urlMatches) {
      for (const url of urlMatches) {
        if (url.includes(trackingNumber)) {
          return url;
        }
      }
    }
  }
  return undefined;
}

function extractTrackingFromHtmlLinks(
  html: string,
  foundMap: Map<string, DetectedPackage>,
  content: string,
  bodyText?: string
): void {
  const linkRegex = /href=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(html)) !== null) {
    const url = match[1];
    if (!url) continue;

    // Check Packeta / Zasilkovna link
    if (/packeta|zasilkovna/i.test(url)) {
      const trkMatch = url.match(/(?:id=|tracking\/)([Z0-9A-Z]+)/i);
      const trk = trkMatch ? trkMatch[1] : undefined;
      if (trk && !foundMap.has(trk)) {
        foundMap.set(trk, createDetectedPackage(trk, 'packeta', content, html, bodyText, url));
      }
    }
    // Check Alza link
    if (/alza\.sk|alza\.cz/i.test(url)) {
      const trkMatch = url.match(/(?:id=|order=|\/)([0-9A-Z]{8,12})/i);
      const trk = trkMatch ? trkMatch[1] : undefined;
      if (trk && !foundMap.has(trk)) {
        foundMap.set(trk, createDetectedPackage(trk, 'alza', content, html, bodyText, url));
      }
    }
    // Check SPS link
    if (/sps-slovakia/i.test(url)) {
      const trkMatch = url.match(/(?:pass=|id=|\/)([0-9A-Z]{8,12})/i);
      const trk = trkMatch ? trkMatch[1] : undefined;
      if (trk && !foundMap.has(trk)) {
        foundMap.set(trk, createDetectedPackage(trk, 'sps', content, html, bodyText, url));
      }
    }
    // Check DPD link
    if (/dpd/i.test(url)) {
      const trkMatch = url.match(/(?:parcelNumber=|reference=|\/)([0-9A-Z]{12,14})/i);
      const trk = trkMatch ? trkMatch[1] : undefined;
      if (trk && !foundMap.has(trk)) {
        foundMap.set(trk, createDetectedPackage(trk, 'dpd', content, html, bodyText, url));
      }
    }
    // Check FedEx link
    if (/fedex\.com.*trknbr=([0-9a-z]+)/i.test(url)) {
      const trk = RegExp.$1.toUpperCase();
      if (trk && !foundMap.has(trk)) {
        foundMap.set(trk, createDetectedPackage(trk, 'fedex', content, html, bodyText, url));
      }
    }
    // Check UPS link
    if (/ups\.com.*tracknum=([0-9a-z]+)/i.test(url)) {
      const trk = RegExp.$1.toUpperCase();
      if (trk && !foundMap.has(trk)) {
        foundMap.set(trk, createDetectedPackage(trk, 'ups', content, html, bodyText, url));
      }
    }
    // Check USPS link
    if (/usps\.com.*tLabels=([0-9a-z]+)/i.test(url)) {
      const trk = RegExp.$1.toUpperCase();
      if (trk && !foundMap.has(trk)) {
        foundMap.set(trk, createDetectedPackage(trk, 'usps', content, html, bodyText, url));
      }
    }
    // Check DHL link
    if (/dhl\.com.*AWB=([0-9a-z]+)/i.test(url)) {
      const trk = RegExp.$1.toUpperCase();
      if (trk && !foundMap.has(trk)) {
        foundMap.set(trk, createDetectedPackage(trk, 'dhl', content, html, bodyText, url));
      }
    }
  }
}

function createDetectedPackage(
  trackingNumber: string,
  carrierId: CarrierId,
  content: string,
  bodyHtml?: string,
  bodyText?: string,
  explicitLinkUrl?: string
): DetectedPackage {
  const cfg = CARRIER_CONFIGS[carrierId] || CARRIER_CONFIGS.unknown;
  const statusHint = extractStatusHint(content);
  const estimatedDelivery = extractEstimatedDelivery(content);

  const emailLinkUrl = explicitLinkUrl || findEmailLinkForTrackingNumber(bodyHtml, bodyText, trackingNumber);

  return {
    trackingNumber,
    carrierId,
    carrierName: cfg.name,
    carrierUrl: emailLinkUrl || cfg.buildUrl(trackingNumber),
    emailLinkUrl,
    fallbackUrl: getFallbackTrackingUrl(trackingNumber),
    statusHint,
    estimatedDelivery,
  };
}

function extractStatusHint(
  content: string
): 'DELIVERED' | 'OUT_FOR_DELIVERY' | 'IN_TRANSIT' | 'SHIPPED' | 'LABEL_CREATED' {
  const lower = content.toLowerCase();

  if (lower.includes('delivered to') || lower.includes('has been delivered') || lower.includes('successfully delivered') || lower.includes('doručené') || lower.includes('doruчена')) {
    return 'DELIVERED';
  }
  if (lower.includes('out for delivery') || lower.includes('arriving today') || lower.includes('na doručenie') || lower.includes('v doručovaní')) {
    return 'OUT_FOR_DELIVERY';
  }
  if (lower.includes('in transit') || lower.includes('shipped') || lower.includes('on its way') || lower.includes('dispatched') || lower.includes('na ceste') || lower.includes('odoslané')) {
    return 'IN_TRANSIT';
  }
  if (lower.includes('label created') || lower.includes('order placed') || lower.includes('tracking info created') || lower.includes('prijaté')) {
    return 'LABEL_CREATED';
  }
  return 'SHIPPED';
}

function extractEstimatedDelivery(content: string): string | undefined {
  const match = content.match(
    /(?:arriving|estimated delivery|expected by|delivery date|deliver by|odhadované doručenie|doručenie)[:\s]+([A-Z][a-z]+,?\s+[A-Z][a-z]+\s+\d{1,2}|\b[A-Z][a-z]+\s+\d{1,2}\b|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b|\b\d{1,2}\.\d{1,2}\.\d{2,4}\b|today|tomorrow|dnes|zajtra)/i
  );
  if (match && match[1]) {
    return match[1].trim();
  }
  return undefined;
}
