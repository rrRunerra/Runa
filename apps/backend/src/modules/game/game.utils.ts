export function filterByGameType<
  T extends {
    name?: string;
    titlePrimary?: string;
    title?: string;
    game_type?: number | { id: number; type: string };
    category?: number;
  },
>(items: T[], query?: string): T[] {
  if (!items || items.length === 0) return [];

  // 1. Filter by Game Type ID
  // Allowed: 0 (Main Game / default), 2 (Expansion), 8 (Remake), 9 (Remaster), 10 (Expanded Game)
  // Excluded: 1 (DLC), 3 (Bundle), 4 (Standalone Expansion), 5 (Mod), 6 (Episode), 7 (Season), 11 (Port), 12 (Fork), 13 (Pack), 14 (Update)
  let filtered = items.filter((item) => {
    let typeId: number | undefined;

    if (typeof item.game_type === 'number') {
      typeId = item.game_type;
    } else if (
      typeof item.game_type === 'object' &&
      item.game_type !== null &&
      'id' in item.game_type
    ) {
      typeId = (item.game_type as any).id;
    } else if (typeof item.category === 'number') {
      typeId = item.category;
    }

    if (typeId === undefined || typeId === null) {
      return true;
    }

    return [0, 2, 8, 9, 10].includes(typeId);
  });

  // 2. Filter out Special Edition, Collector's Edition, GOTY, Day One Edition, etc. unless explicitly searched
  const cleanQuery = (query || '').toLowerCase().trim();
  const userExplicitlyAskedForEdition =
    /collector|special|ultimate|goty|day\s*one|deluxe/i.test(cleanQuery);

  if (!userExplicitlyAskedForEdition) {
    const editionRegex =
      /[:\-]\s*(ultimate|collector'?s?|day\s*one|special|digital\s*deluxe|deluxe|limited|game\s*of\s*the\s*year|goty|vincent\s*sin|collector'?s?\s*box)\b/i;

    const containsEditionKeywords =
      /\b(ultimate\s+edition|collector'?s?\s+(edition|box)|day\s+one\s+edition|special\s+edition|deluxe\s+edition|game\s+of\s+the\s+year|goty)\b/i;

    const withoutEditions = filtered.filter((item) => {
      const title = item.title || item.titlePrimary || item.name || '';
      if (editionRegex.test(title)) return false;
      if (containsEditionKeywords.test(title) && !containsEditionKeywords.test(cleanQuery)) {
        return false;
      }
      return true;
    });

    if (withoutEditions.length > 0) {
      filtered = withoutEditions;
    }
  }

  // 3. Deduplicate by title
  const seenTitles = new Set<string>();
  const deduplicated: T[] = [];
  for (const item of filtered) {
    const title = (item.title || item.titlePrimary || item.name || '').toLowerCase().trim();
    if (!title) continue;
    if (!seenTitles.has(title)) {
      seenTitles.add(title);
      deduplicated.push(item);
    }
  }

  return deduplicated;
}

export function filterMainGameEntities<
  T extends {
    name?: string;
    titlePrimary?: string;
    title?: string;
    game_type?: number | { id: number; type: string };
    category?: number;
  },
>(items: T[], query?: string): T[] {
  return filterByGameType(items, query);
}
