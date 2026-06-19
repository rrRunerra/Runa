import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { BookService } from './book.service';
import { BookRepository } from './repositories/book.repository';
import { BookQueueService } from './services/book-queue.service';

describe('BookService', () => {
  let service: BookService;
  let repository: BookRepository;
  let queueService: BookQueueService;

  const mockBookRepository = {
    findByOpenLibraryId: jest.fn(),
    toMedia: jest.fn(),
  };

  const mockBookQueueService = {
    addJob: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    global.fetch = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookService,
        { provide: BookRepository, useValue: mockBookRepository },
        { provide: BookQueueService, useValue: mockBookQueueService },
      ],
    }).compile();

    service = module.get<BookService>(BookService);
    repository = module.get<BookRepository>(BookRepository);
    queueService = module.get<BookQueueService>(BookQueueService);
  });

  describe('search', () => {
    it('should query Open Library and return mapped search results', async () => {
      const mockApiResponse = {
        docs: [
          {
            key: '/works/OL123W',
            title: 'Mock Book',
            cover_i: 12345,
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockApiResponse),
      });

      const result = await service.search('Mock');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://openlibrary.org/search.json?q=Mock&limit=20',
      );
      expect(result).toEqual([
        {
          id: 'OL123W',
          title: { romaji: 'Mock Book', english: 'Mock Book' },
          coverImage: { large: 'https://covers.openlibrary.org/b/id/12345-L.jpg' },
          format: 'Book',
          status: 'Published',
          isAdult: false,
        },
      ]);
    });

    it('should return empty list if fetch fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await service.search('Mock');

      expect(result).toEqual([]);
    });
  });

  describe('getBook', () => {
    it('should return media from database on a fresh cache hit without calling fetch', async () => {
      const dbBook = { openLibraryId: 'OL123W', updatedAt: new Date() };
      mockBookRepository.findByOpenLibraryId.mockResolvedValue(dbBook);
      
      const mappedMedia = { id: 'OL123W', title: { romaji: 'Cached Book' } };
      mockBookRepository.toMedia.mockReturnValue(mappedMedia);

      const result = await service.getBook('OL123W');

      expect(repository.findByOpenLibraryId).toHaveBeenCalledWith('OL123W');
      expect(repository.toMedia).toHaveBeenCalledWith(dbBook);
      expect(global.fetch).not.toHaveBeenCalled();
      expect(result).toBe(mappedMedia);
    });

    it('should fetch from Open Library and queue job on cache miss', async () => {
      mockBookRepository.findByOpenLibraryId.mockResolvedValue(null);

      const mockBookDetail = {
        title: 'New Book',
        description: 'This is a description',
        covers: [111],
        created: { value: '2026-01-01' },
        authors: [{ author: { key: '/authors/OL99A' } }],
        subjects: ['Fiction'],
      };

      const mockAuthorDetail = {
        name: 'Author Name',
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(mockBookDetail),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(mockAuthorDetail),
        });

      const result = await service.getBook('OL123W');

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(queueService.addJob).toHaveBeenCalledWith('OL123W');
      expect(result.id).toBe('OL123W');
      expect(result.title.romaji).toBe('New Book');
      expect(result.description).toBe('This is a description');
      expect(result.coverImage.large).toBe('https://covers.openlibrary.org/b/id/111-L.jpg');
      expect(result.genres).toEqual(['Fiction']);
      expect(result.studios).toEqual([{ name: 'Author Name' }]);
    });

    it('should throw BadRequestException for invalid id format', async () => {
      mockBookRepository.findByOpenLibraryId.mockResolvedValue(null);

      await expect(service.getBook('../passwd')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if fetch fails and no record is in database', async () => {
      mockBookRepository.findByOpenLibraryId.mockResolvedValue(null);
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Fetch failed'));

      await expect(service.getBook('OL123W')).rejects.toThrow(NotFoundException);
    });

    it('should fallback to database stale record if fetch fails', async () => {
      const staleBook = { openLibraryId: 'OL123W', updatedAt: new Date(0) }; // Epoch 1970
      mockBookRepository.findByOpenLibraryId.mockResolvedValue(staleBook);

      (global.fetch as jest.Mock).mockRejectedValue(new Error('Fetch failed'));
      
      const mappedMedia = { id: 'OL123W', title: { romaji: 'Stale Book' } };
      mockBookRepository.toMedia.mockReturnValue(mappedMedia);

      const result = await service.getBook('OL123W');

      expect(result).toBe(mappedMedia);
    });
  });
});
