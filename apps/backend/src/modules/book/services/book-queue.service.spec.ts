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
    it('should fetch book from Google Books and upsert to repository', async () => {
      const mockBookDetail = {
        volumeInfo: {
          title: 'Queue Book',
          description: 'Sync desc',
          imageLinks: { thumbnail: 'https://covers.google.com/222.jpg' },
          publishedDate: '2026-01-01',
          authors: [],
          categories: ['Test'],
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockBookDetail),
      });

      mockBookRepository.upsert.mockResolvedValue({});

      service.onModuleInit();
      service.addJob('GB_TEST');

      await new Promise((resolve) => process.nextTick(resolve));

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://www.googleapis.com/books/v1/volumes/GB_TEST'),
      );
      expect(repository.upsert).toHaveBeenCalledWith('GB_TEST', expect.objectContaining({
        googleBookId: 'GB_TEST',
        titleString: 'Queue Book',
        coverImage: 'https://covers.google.com/222.jpg',
      }));
    });
  });
});
