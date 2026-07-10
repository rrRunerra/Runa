const ONLYOFFICE_EXTENSIONS = new Set<string>([
  // Documents
  'docx',
  'doc',
  'odt',
  'rtf',
  'html',
  'epub',
  'pages',
  'hwp',
  'hwpx',
  // Spreadsheets
  'xlsx',
  'xls',
  'ods',
  'csv',
  'xlsm',
  'xlsb',
  'numbers',
  // Presentations
  'pptx',
  'ppt',
  'odp',
  'ppsx',
  'potx',
  'keynote',
  'key',
  // PDF and related
  'pdf',
  'xps',
  'djvu',
  'oxps',
  // Diagrams
  'vsdx',
  'vsdm',
  'vssm',
  'vssx',
  'vstm',
  'vstx',
  'vsd',
]);

export function isOnlyOfficeFile(filename: string, mime?: string | null): boolean {
  if (mime) {
    const lowerMime = mime.toLowerCase();
    if (
      lowerMime.includes('document') ||
      lowerMime.includes('word') ||
      lowerMime.includes('odt') ||
      lowerMime.includes('spreadsheet') ||
      lowerMime.includes('sheet') ||
      lowerMime.includes('ods') ||
      lowerMime.includes('presentation') ||
      lowerMime.includes('slide') ||
      lowerMime.includes('odp') ||
      lowerMime.includes('pdf') ||
      lowerMime.includes('xps') ||
      lowerMime.includes('djvu') ||
      lowerMime.includes('diagram')
    ) {
      return true;
    }
  }

  const parts = filename.split('.');
  if (parts.length > 1) {
    const ext = parts.pop()!.toLowerCase();
    return ONLYOFFICE_EXTENSIONS.has(ext);
  }
  return false;
}
