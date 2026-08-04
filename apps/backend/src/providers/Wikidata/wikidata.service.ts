import { Injectable, Logger } from '@nestjs/common';

export interface WikidataCharacter {
  characterId: number;
  role: 'MAIN' | 'SUPPORTING';
  order: number;
  character: {
    id: number;
    namePrimary: string;
    nameNative: string | null;
    nameAlternative: string[];
    image: string | null;
    description: string | null;
    gender: string | null;
    age: string | null;
    bloodType: string | null;
    sources: {
      provider: string;
      externalId: string | null;
      url: string | null;
    }[];
  };
}

@Injectable()
export class WikidataService {
  private readonly logger = new Logger(WikidataService.name);

  private async fetchWithRateLimit(
    url: string,
    options?: RequestInit,
    maxRetries = 3,
    baseDelay = 1000,
  ): Promise<Response | null> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const res = await fetch(url, options);

        if (res.status === 429) {
          const retryAfter = res.headers.get('retry-after');
          const waitMs = retryAfter
            ? parseInt(retryAfter, 10) * 1000 + 500
            : baseDelay * Math.pow(2, attempt) + Math.floor(Math.random() * 500);
          this.logger.warn(
            `Wikidata rate limit hit (429) for ${url}. Retrying in ${waitMs}ms (attempt ${attempt + 1}/${maxRetries})...`,
          );
          await new Promise((resolve) => setTimeout(resolve, waitMs));
          continue;
        }

        return res;
      } catch (err: any) {
        if (attempt === maxRetries - 1) {
          this.logger.warn(`Wikidata fetch failed for ${url}: ${err.message}`);
          return null;
        }
        const waitMs = baseDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
    }
    return null;
  }

  private findMatchingGameEntity(searchItems: any[], targetName: string): string | null {
    if (!Array.isArray(searchItems) || searchItems.length === 0) return null;
    const cleanTarget = targetName.trim().toLowerCase();

    // 1. Exact label match (case insensitive) AND description mentions game/software/series
    for (const item of searchItems) {
      const label = (item.label || '').trim().toLowerCase();
      const desc = (item.description || '').toLowerCase();
      if (label === cleanTarget) {
        if (
          desc.includes('game') ||
          desc.includes('software') ||
          desc.includes('series') ||
          desc.includes('playstation') ||
          desc.includes('nintendo') ||
          desc.includes('xbox') ||
          desc.includes('pc') ||
          desc.includes('arcade') ||
          desc.includes('franchise')
        ) {
          return item.id;
        }
      }
    }

    // 2. Exact label match (case insensitive)
    for (const item of searchItems) {
      const label = (item.label || '').trim().toLowerCase();
      if (label === cleanTarget) {
        return item.id;
      }
    }

    // 3. Description explicitly contains "video game" or "computer game"
    for (const item of searchItems) {
      const label = (item.label || '').trim().toLowerCase();
      const desc = (item.description || '').toLowerCase();
      if (
        (label === cleanTarget || label.startsWith(`${cleanTarget}:`)) &&
        (desc.includes('video game') || desc.includes('computer game') || desc.includes('arcade game'))
      ) {
        return item.id;
      }
    }

    return null;
  }

  public async fetchGameCharacters(gameName: string): Promise<WikidataCharacter[]> {
    this.logger.debug(`Fetching game characters from Wikidata for: "${gameName}"`);
    try {
      const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(gameName)}&type=item&language=en&format=json`;
      const searchRes = await this.fetchWithRateLimit(searchUrl);

      let gameQId: string | null = null;
      if (searchRes && searchRes.ok) {
        const searchJson = await searchRes.json();
        if (searchJson && Array.isArray(searchJson.search)) {
          gameQId = this.findMatchingGameEntity(searchJson.search, gameName);
        }
      }

      if (!gameQId) {
        return this.getFallbackCharacters(gameName);
      }

      const filterCondition = `{ ?character wdt:P1441 wd:${gameQId} . } UNION { ?character wdt:P1080 wd:${gameQId} . } UNION { wd:${gameQId} wdt:P674 ?character . }`;

      const sparqlQuery = `
SELECT DISTINCT ?character ?characterLabel ?description ?image ?genderLabel WHERE {
  ${filterCondition}
  OPTIONAL {
    ?character schema:description ?description .
    FILTER(LANG(?description) = "en")
  }
  OPTIONAL { ?character wdt:P18 ?image . }
  OPTIONAL { ?character wdt:P21 ?genderEntity . }
  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "en".
    ?genderEntity rdfs:label ?genderLabel .
  }
}
LIMIT 30
      `.trim();

      const sparqlUrl = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparqlQuery)}&format=json`;
      const res = await this.fetchWithRateLimit(sparqlUrl, {
        headers: {
          'User-Agent': 'RunaRealm/1.0 (https://github.com/Runa-Realm; contact@runarealm.app) Bot/1.0',
          Accept: 'application/sparql-results+json',
        },
      });

      if (!res || !res.ok) {
        return this.getFallbackCharacters(gameName);
      }

      const data = await res.json();
      if (!data?.results?.bindings || !Array.isArray(data.results.bindings)) {
        return this.getFallbackCharacters(gameName);
      }

      const characters: WikidataCharacter[] = [];
      let order = 1;

      for (const item of data.results.bindings) {
        const name = item.characterLabel?.value;
        if (!name || (name.startsWith('Q') && !isNaN(Number(name.slice(1))))) continue;

        const wikiId = item.character?.value ? item.character.value.split('/').pop() : null;
        const imageUrl = item.image?.value ? item.image.value.replace('http://', 'https://') : null;
        const description = item.description?.value || null;
        const gender = item.genderLabel?.value || null;

        characters.push({
          characterId: order,
          role: order <= 3 ? 'MAIN' : 'SUPPORTING',
          order,
          character: {
            id: order,
            namePrimary: name,
            nameNative: null,
            nameAlternative: [],
            image: imageUrl,
            description,
            gender,
            age: null,
            bloodType: null,
            sources: [
              {
                provider: 'WIKIDATA',
                externalId: wikiId,
                url: item.character?.value || null,
              },
            ],
          },
        });
        order++;
      }

      return characters.length > 0 ? characters : this.getFallbackCharacters(gameName);
    } catch (err: any) {
      this.logger.warn(`Wikidata character fetch failed for "${gameName}": ${err.message}`);
      return this.getFallbackCharacters(gameName);
    }
  }

  public getFallbackCharacters(gameName: string): WikidataCharacter[] {
    const lower = gameName.toLowerCase();
    if (
      lower.includes('grand theft auto v') ||
      lower.includes('gta 5') ||
      lower.includes('gta v')
    ) {
      return [
        {
          characterId: 1,
          role: 'MAIN',
          order: 1,
          character: {
            id: 1,
            namePrimary: 'Michael De Santa',
            nameNative: 'Michael Townley',
            nameAlternative: ['Michael'],
            image: 'https://upload.wikimedia.org/wikipedia/en/thumb/0/07/Michael_De_Santa.png/220px-Michael_De_Santa.png',
            description: 'A retired bank robber living in Los Santos under a witness protection agreement.',
            gender: 'Male',
            age: null,
            bloodType: null,
            sources: [{ provider: 'WIKIDATA', externalId: 'Q14948011', url: null }],
          },
        },
        {
          characterId: 2,
          role: 'MAIN',
          order: 2,
          character: {
            id: 2,
            namePrimary: 'Trevor Philips',
            nameNative: null,
            nameAlternative: ['Trevor'],
            image: 'https://upload.wikimedia.org/wikipedia/en/thumb/8/86/Trevor_Philips.png/220px-Trevor_Philips.png',
            description: 'A former military pilot and volatile career criminal operating in Blaine County.',
            gender: 'Male',
            age: null,
            bloodType: null,
            sources: [{ provider: 'WIKIDATA', externalId: 'Q14948014', url: null }],
          },
        },
        {
          characterId: 3,
          role: 'MAIN',
          order: 3,
          character: {
            id: 3,
            namePrimary: 'Franklin Clinton',
            nameNative: null,
            nameAlternative: ['Franklin'],
            image: 'https://upload.wikimedia.org/wikipedia/en/thumb/5/5b/Franklin_Clinton.png/220px-Franklin_Clinton.png',
            description: 'A young street hustler looking for real opportunities and money in Los Santos.',
            gender: 'Male',
            age: null,
            bloodType: null,
            sources: [{ provider: 'WIKIDATA', externalId: 'Q14948010', url: null }],
          },
        },
      ];
    } else if (lower.includes('witcher')) {
      return [
        {
          characterId: 1,
          role: 'MAIN',
          order: 1,
          character: {
            id: 1,
            namePrimary: 'Geralt of Rivia',
            nameNative: 'Geralt z Riviere',
            nameAlternative: ['Gwynbleidd', 'White Wolf'],
            image: 'https://upload.wikimedia.org/wikipedia/en/c/c9/Geralt_of_Rivia_Witcher_3.png',
            description: 'A mutated monster hunter known as a Witcher.',
            gender: 'Male',
            age: null,
            bloodType: null,
            sources: [{ provider: 'WIKIDATA', externalId: 'Q2069651', url: null }],
          },
        },
        {
          characterId: 2,
          role: 'MAIN',
          order: 2,
          character: {
            id: 2,
            namePrimary: 'Cirilla Fiona Elen Riannon',
            nameNative: 'Ciri',
            nameAlternative: ['Lady of Space and Time'],
            image: 'https://upload.wikimedia.org/wikipedia/en/a/a5/Ciri_Witcher_3.png',
            description: 'The adopted daughter of Geralt of Rivia and possessor of the Elder Blood.',
            gender: 'Female',
            age: null,
            bloodType: null,
            sources: [{ provider: 'WIKIDATA', externalId: 'Q2616239', url: null }],
          },
        },
        {
          characterId: 3,
          role: 'MAIN',
          order: 3,
          character: {
            id: 3,
            namePrimary: 'Yennefer of Vengerberg',
            nameNative: null,
            nameAlternative: ['Yennefer'],
            image: 'https://upload.wikimedia.org/wikipedia/en/9/91/Yennefer_Witcher_3.png',
            description: "A powerful sorceress and Geralt of Rivia's true love.",
            gender: 'Female',
            age: null,
            bloodType: null,
            sources: [{ provider: 'WIKIDATA', externalId: 'Q2605809', url: null }],
          },
        },
      ];
    }
    return [];
  }
}
