import { Test, TestingModule } from '@nestjs/testing';
import { BookQueueService } from './book-queue.service';
import { BookRepository } from '../repositories/book.repository';

describe('BookQueueService', () => {
  let service: BookQueueService;
  let repository: BookRepository;

  const mockBookRepository = {
    upsert: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    global.fetch = jest.fn();

    jest.spyOn(global, 'setTimeout').mockImplementation((cb: any) => {
      if (typeof cb === 'function') {
        cb();
      }
      return {} as any;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookQueueService,
        { provide: BookRepository, useValue: mockBookRepository },
      ],
    }).compile();

    service = module.get<BookQueueService>(BookQueueService);
    repository = module.get<BookRepository>(BookRepository);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addJob and queue execution', () => {
    it('should fetch book from Open Library and upsert to repository', async () => {
      const mockBookDetail = {
        title: 'Queue Book',
        description: 'Sync desc',
        covers: [222],
        created: { value: '2026-01-01' },
        authors: [],
        subjects: ['Test'],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockBookDetail),
      });

      mockBookRepository.upsert.mockResolvedValue({});

      service.onModuleInit();
      service.addJob('OL_TEST_W');

      await new Promise((resolve) => process.nextTick(resolve));

      expect(global.fetch).toHaveBeenCalledWith('https://openlibrary.org/works/OL_TEST_W.json');
      expect(repository.upsert).toHaveBeenCalledWith('OL_TEST_W', expect.objectContaining({
        openLibraryId: 'OL_TEST_W',
        titleString: 'Queue Book',
        coverImage: 'https://covers.openlibrary.org/b/id/222-L.jpg',
      }));
    });
  });
});
