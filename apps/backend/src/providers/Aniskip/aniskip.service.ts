import { Injectable, Logger } from '@nestjs/common';

export interface AniSkipTimestamps {
  opStart: number | null;
  opEnd: number | null;
  edStart: number | null;
  edEnd: number | null;
  recapStart: number | null;
  recapEnd: number | null;
  source: string;
}

@Injectable()
export class AniskipService {
  private readonly logger = new Logger(AniskipService.name);

  public async fetchSkipTimestamps(
    malId: number,
    episodeNumber: number,
  ): Promise<AniSkipTimestamps | null> {
    if (!malId) return null;
    try {
      const url = `https://api.aniskip.com/v2/skip-times/${malId}/${episodeNumber}?types=op&types=ed&types=mixed-op&types=mixed-ed&types=recap`;
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 RunaRealm/1.0',
        },
      });
      if (!res.ok) return null;

      const data = await res.json();
      if (data?.found && data?.results) {
        const op =
          data.results.find((r: any) => r.skipType === 'op') ||
          data.results.find((r: any) => r.skipType === 'mixed-op');
        const ed =
          data.results.find((r: any) => r.skipType === 'ed') ||
          data.results.find((r: any) => r.skipType === 'mixed-ed');
        const recap = data.results.find((r: any) => r.skipType === 'recap');
        return {
          opStart:
            typeof op?.interval?.startTime === 'number'
              ? Math.floor(op.interval.startTime)
              : null,
          opEnd:
            typeof op?.interval?.endTime === 'number'
              ? Math.floor(op.interval.endTime)
              : null,
          edStart:
            typeof ed?.interval?.startTime === 'number'
              ? Math.floor(ed.interval.startTime)
              : null,
          edEnd:
            typeof ed?.interval?.endTime === 'number'
              ? Math.floor(ed.interval.endTime)
              : null,
          recapStart:
            typeof recap?.interval?.startTime === 'number'
              ? Math.floor(recap.interval.startTime)
              : null,
          recapEnd:
            typeof recap?.interval?.endTime === 'number'
              ? Math.floor(recap.interval.endTime)
              : null,
          source: 'ANISKIP',
        };
      }
    } catch (err: any) {
      this.logger.warn(
        `AniSkip fetch error for MAL ID ${malId} Ep ${episodeNumber}: ${err.message}`,
      );
    }
    return null;
  }
}
