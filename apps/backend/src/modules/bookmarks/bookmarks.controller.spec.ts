import { Test, TestingModule } from '@nestjs/testing';
import { BookmarksController } from './bookmarks.controller';
import { BookmarksService } from './bookmarks.service';
import { AuthGuard } from '../../common/guards/auth/auth.guard';
import { Reflector } from '@nestjs/core';

describe('BookmarksController', () => {
  let controller: BookmarksController;
  let service: BookmarksService;

  const mockBookmarksService = {
    createOrUpdateBookmark: jest.fn(),
    getBookmarks: jest.fn(),
    deleteBookmark: jest.fn(),
  };

  const mockAuthGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookmarksController],
      providers: [
        { provide: BookmarksService, useValue: mockBookmarksService },
        Reflector,
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .compile();

    controller = module.get<BookmarksController>(BookmarksController);
    service = module.get<BookmarksService>(BookmarksService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createOrUpdateBookmark', () => {
    const dto = {
      name: 'Bookmark Name',
      description: 'Desc',
      redirect: 'https://example.com',
      stars: [5],
      connections: [] as number[][],
    };

    it('should create or update bookmark with session authenticated user', async () => {
      const mockReq = { user: { id: 'user-123', authType: 'session' } };
      mockBookmarksService.createOrUpdateBookmark.mockResolvedValue({
        id: 'b-1',
        ...dto,
      });

      const result = await controller.createOrUpdateBookmark(mockReq, dto);

      expect(service.createOrUpdateBookmark).toHaveBeenCalledWith('user-123', dto);
      expect(result.id).toBe('b-1');
    });

    it('should fail (throw TypeError) if req.user is undefined (unauthenticated)', async () => {
      const mockReq = {} as any;
      await expect(
        controller.createOrUpdateBookmark(mockReq, dto),
      ).rejects.toThrow(TypeError);
    });
  });

  describe('getBookmarks', () => {
    it('should get bookmarks with authenticated user', async () => {
      const mockReq = { user: { id: 'user-123', authType: 'session' } };
      mockBookmarksService.getBookmarks.mockResolvedValue([]);

      const result = await controller.getBookmarks(mockReq);

      expect(service.getBookmarks).toHaveBeenCalledWith('user-123');
      expect(result).toEqual([]);
    });

    it('should fail (throw TypeError) if req.user is undefined', async () => {
      const mockReq = {} as any;
      await expect(controller.getBookmarks(mockReq)).rejects.toThrow(TypeError);
    });
  });

  describe('deleteBookmark', () => {
    it('should delete bookmark with authenticated user', async () => {
      const mockReq = { user: { id: 'user-123', authType: 'session' } };
      mockBookmarksService.deleteBookmark.mockResolvedValue({ success: true });

      const result = await controller.deleteBookmark(mockReq, 'b-1');

      expect(service.deleteBookmark).toHaveBeenCalledWith('user-123', 'b-1');
      expect(result).toEqual({ success: true });
    });

    it('should fail (throw TypeError) if req.user is undefined', async () => {
      const mockReq = {} as any;
      await expect(controller.deleteBookmark(mockReq, 'b-1')).rejects.toThrow(
        TypeError,
      );
    });
  });
});
