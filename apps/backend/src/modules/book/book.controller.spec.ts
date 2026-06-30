import { Test, TestingModule } from '@nestjs/testing';
import { BookController } from './book.controller';
import { BookService } from './book.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { Reflector } from '@nestjs/core';

describe('BookController', () => {
  let controller: BookController;
  let service: BookService;

  const mockBookService = {
    search: jest.fn(),
    getBook: jest.fn(),
  };

  const mockAuthGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookController],
      providers: [
        { provide: BookService, useValue: mockBookService },
        Reflector,
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .compile();

    controller = module.get<BookController>(BookController);
    service = module.get<BookService>(BookService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('search', () => {
    it('should call bookService.search with query string name', async () => {
      const mockResult = [{ id: '1', title: { romaji: 'Sample Book' } } as any];
      mockBookService.search.mockResolvedValue(mockResult);

      const result = await controller.search({ name: 'Sample' });

      expect(service.search).toHaveBeenCalledWith('Sample');
      expect(result).toBe(mockResult);
    });
  });

  describe('getBook', () => {
    it('should call bookService.getBook with work ID string', async () => {
      const mockResult = {
        id: 'OL12345W',
        title: { romaji: 'Detail Book' },
      } as any;
      mockBookService.getBook.mockResolvedValue(mockResult);

      const result = await controller.getBook('OL12345W');

      expect(service.getBook).toHaveBeenCalledWith('OL12345W');
      expect(result).toBe(mockResult);
    });
  });
});
