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
    findByGoogleBookId: jest.fn(),
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
    it('should query Google Books and return mapped search results', async () => {
      const mockApiResponse = {
        items: [
          {
            id: 'GB123',
            volumeInfo: {
              title: 'Mock Book',
              imageLinks: { thumbnail: 'http://covers.google.com/12345.jpg' },
              maturityRating: 'NOT_MATURE',
            },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockApiResponse),
      });

      const result = await service.search('Mock');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://www.googleapis.com/books/v1/volumes?q=Mock&maxResults=20'),
      );
      expect(result).toEqual([
        {
          id: 'GB123',
          title: { romaji: 'Mock Book', english: 'Mock Book' },
          coverImage: { large: 'https://covers.google.com/12345.jpg' },
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
      const dbBook = { googleBookId: 'GB123', updatedAt: new Date() };
      mockBookRepository.findByGoogleBookId.mockResolvedValue(dbBook);
      
      const mappedMedia = { id: 'GB123', title: { romaji: 'Cached Book' } };
      mockBookRepository.toMedia.mockReturnValue(mappedMedia);

      const result = await service.getBook('GB123');

      expect(repository.findByGoogleBookId).toHaveBeenCalledWith('GB123');
      expect(repository.toMedia).toHaveBeenCalledWith(dbBook);
      expect(global.fetch).not.toHaveBeenCalled();
      expect(result).toBe(mappedMedia);
    });

    it('should fetch from Google Books and queue job on cache miss', async () => {
      mockBookRepository.findByGoogleBookId.mockResolvedValue(null);

      const mockBookDetail = {
        volumeInfo: {
          title: 'New Book',
          description: 'This is a description',
          imageLinks: { thumbnail: 'https://covers.google.com/111.jpg' },
          publishedDate: '2026-01-01',
          authors: ['Author Name'],
          categories: ['Fiction'],
          pageCount: 350,
          averageRating: 4.5,
          ratingsCount: 20,
          language: 'en',
          previewLink: 'https://preview.google.com',
          infoLink: 'https://info.google.com',
        },
        saleInfo: {
          buyLink: 'https://buy.google.com',
          retailPrice: {
            amount: 9.99,
            currencyCode: 'USD',
          },
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockBookDetail),
      });

      const result = await service.getBook('GB123');

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(queueService.addJob).toHaveBeenCalledWith('GB123');
      expect(result.id).toBe('GB123');
      expect(result.title.romaji).toBe('New Book');
      expect(result.description).toBe('This is a description');
      expect(result.coverImage.large).toBe('https://covers.google.com/111.jpg');
      expect(result.genres).toEqual(['Fiction']);
      expect(result.staff).toEqual([{ id: 'author-Author Name', name: 'Author Name', role: 'Author' }]);
      expect(result.pages).toBe(350);
      expect(result.averageRating).toBe(4.5);
      expect(result.previewLink).toBe('https://preview.google.com');
      expect(result.buyLink).toBe('https://buy.google.com');
    });

    it('should throw BadRequestException for invalid id format', async () => {
      mockBookRepository.findByGoogleBookId.mockResolvedValue(null);

      await expect(service.getBook('../passwd')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if fetch fails and no record is in database', async () => {
      mockBookRepository.findByGoogleBookId.mockResolvedValue(null);
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Fetch failed'));

      await expect(service.getBook('GB123')).rejects.toThrow(NotFoundException);
    });

    it('should fallback to database stale record if fetch fails', async () => {
      const staleBook = { googleBookId: 'GB123', updatedAt: new Date(0) }; // Epoch 1970
      mockBookRepository.findByGoogleBookId.mockResolvedValue(staleBook);

      (global.fetch as jest.Mock).mockRejectedValue(new Error('Fetch failed'));
      
      const mappedMedia = { id: 'GB123', title: { romaji: 'Stale Book' } };
      mockBookRepository.toMedia.mockReturnValue(mappedMedia);

      const result = await service.getBook('GB123');

      expect(result).toBe(mappedMedia);
    });
  });
});
