import { Test, TestingModule } from '@nestjs/testing';
import { GameQueueService } from './game-queue.service';
import { GameRepository } from '../repositories/game.repository';

describe('GameQueueService', () => {
  let service: GameQueueService;
  let repository: GameRepository;

  const mockGameRepository = {
    upsert: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    process.env.RAWG_API_KEY = 'mock-rawg-key';

    jest.spyOn(global, 'setTimeout').mockImplementation((cb: any) => {
      if (typeof cb === 'function') {
        cb();
      }
      return {} as any;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameQueueService,
        { provide: GameRepository, useValue: mockGameRepository },
      ],
    }).compile();

    service = module.get<GameQueueService>(GameQueueService);
    repository = module.get<GameRepository>(GameRepository);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addJob and queue execution', () => {
    it('should fetch game from RAWG and upsert to repository', async () => {
      const mockGameDetail = {
        id: 456,
        name: 'Queue Game',
        background_image: 'bg-url',
        released: '2026-06-19',
        developers: [],
        genres: [{ name: 'Action' }],
        platforms: [{ platform: { name: 'PS5' } }],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockGameDetail),
      });

      mockGameRepository.upsert.mockResolvedValue({});

      service.onModuleInit();
      service.addJob(456);

      await new Promise((resolve) => process.nextTick(resolve));

      expect(global.fetch).toHaveBeenCalledWith('https://api.rawg.io/api/games/456?key=mock-rawg-key');
      expect(repository.upsert).toHaveBeenCalledWith(456, expect.objectContaining({
        rawgId: 456,
        titleString: 'Queue Game',
      }));
    });
  });
});
