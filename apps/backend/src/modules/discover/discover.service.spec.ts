import { DiscoverService } from './discover.service';
import { DiscoverRepository } from './discover.repository';
import { CacheService } from '../../providers/cache/cache.service';
import { CalendarQueryDto } from './discover.dto';
import { CalendarItemEntity } from './discover.entity';

describe('DiscoverService', () => {
  let service: DiscoverService;
  let repository: jest.Mocked<DiscoverRepository>;
  let cacheService: jest.Mocked<CacheService>;

  beforeEach(() => {
    repository = {
      getCalendar: jest.fn(),
    } as any;

    cacheService = {} as any;

    service = new DiscoverService(repository, cacheService);
  });

  describe('getCalendar', () => {
    it('should query calendar data correctly for given start and end dates', async () => {
      const mockResult: CalendarItemEntity[] = [
        {
          id: 1,
          title: 'Demon Slayer: Swordsmith Village Arc',
          coverImage: 'https://example.com/cover.jpg',
          type: 'anime',
          airDate: '2026-08-05',
          airingAt: 1785926400,
          episode: 1,
          event: 'airing',
        },
      ];

      repository.getCalendar.mockResolvedValue(mockResult);

      const query: CalendarQueryDto = {
        start: '2026-08-01',
        end: '2026-08-07',
      };

      const result = await service.getCalendar(query);

      expect(repository.getCalendar).toHaveBeenCalledWith(
        new Date('2026-08-01T00:00:00Z'),
        new Date('2026-08-07T23:59:59Z'),
        undefined,
      );
      expect(result).toEqual(mockResult);
    });

    it('should include username when watchlist query is true', async () => {
      const mockResult: CalendarItemEntity[] = [];
      repository.getCalendar.mockResolvedValue(mockResult);

      const query: CalendarQueryDto = {
        start: '2026-08-01',
        end: '2026-08-07',
        watchlist: 'true',
      };

      const result = await service.getCalendar(query, 'testuser');

      expect(repository.getCalendar).toHaveBeenCalledWith(
        new Date('2026-08-01T00:00:00Z'),
        new Date('2026-08-07T23:59:59Z'),
        'testuser',
      );
      expect(result).toEqual(mockResult);
    });
  });
});
