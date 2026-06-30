import { Test, TestingModule } from '@nestjs/testing';
import { PolarisController } from './polaris.controller';
import { PolarisService } from './polaris.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { Reflector } from '@nestjs/core';

describe('PolarisController', () => {
  let controller: PolarisController;
  let service: PolarisService;

  const mockPolarisService = {
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
      controllers: [PolarisController],
      providers: [
        { provide: PolarisService, useValue: mockPolarisService },
        Reflector,
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .compile();

    controller = module.get<PolarisController>(PolarisController);
    service = module.get<PolarisService>(PolarisService);
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
      mockPolarisService.createOrUpdateBookmark.mockResolvedValue({
        id: 'b-1',
        ...dto,
      });

      const result = await controller.createOrUpdateBookmark(mockReq, dto);

      expect(service.createOrUpdateBookmark).toHaveBeenCalledWith(
        'user-123',
        dto,
      );
      expect(result.id).toBe('b-1');
    });

    it('should create or update bookmark with API key authenticated user', async () => {
      const mockReq = { user: { id: 'user-123', authType: 'api-key' } };
      mockPolarisService.createOrUpdateBookmark.mockResolvedValue({
        id: 'b-1',
        ...dto,
      });

      const result = await controller.createOrUpdateBookmark(mockReq, dto);

      expect(service.createOrUpdateBookmark).toHaveBeenCalledWith(
        'user-123',
        dto,
      );
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
    it('should get bookmarks with session authenticated user', async () => {
      const mockReq = { user: { id: 'user-123', authType: 'session' } };
      mockPolarisService.getBookmarks.mockResolvedValue([]);

      const result = await controller.getBookmarks(mockReq);

      expect(service.getBookmarks).toHaveBeenCalledWith('user-123');
      expect(result).toEqual([]);
    });

    it('should get bookmarks with API key authenticated user', async () => {
      const mockReq = { user: { id: 'user-123', authType: 'api-key' } };
      mockPolarisService.getBookmarks.mockResolvedValue([]);

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
    it('should delete bookmark with session authenticated user', async () => {
      const mockReq = { user: { id: 'user-123', authType: 'session' } };
      mockPolarisService.deleteBookmark.mockResolvedValue({ success: true });

      const result = await controller.deleteBookmark(mockReq, 'b-1');

      expect(service.deleteBookmark).toHaveBeenCalledWith('user-123', 'b-1');
      expect(result).toEqual({ success: true });
    });

    it('should delete bookmark with API key authenticated user', async () => {
      const mockReq = { user: { id: 'user-123', authType: 'api-key' } };
      mockPolarisService.deleteBookmark.mockResolvedValue({ success: true });

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
