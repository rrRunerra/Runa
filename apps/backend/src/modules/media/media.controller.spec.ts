import { Test, TestingModule } from '@nestjs/testing';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { Response } from 'express';

describe('MediaController', () => {
  let controller: MediaController;
  let service: MediaService;

  beforeEach(async () => {
    const mockMediaService = {
      saveFile: jest.fn(),
      getFileStream: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MediaController],
      providers: [
        {
          provide: MediaService,
          useValue: mockMediaService,
        },
      ],
    }).compile();

    controller = module.get<MediaController>(MediaController);
    service = module.get<MediaService>(MediaService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('uploadFile', () => {
    it('should call mediaService.saveFile with session authenticated username', async () => {
      const mockFile = {} as Express.Multer.File;
      const mockReq = { user: { username: 'john_doe', authType: 'session' } };
      const expectedResult = { id: '123', filename: 'john_doe_123.png', url: '/media/image/john_doe_123.png' };
      jest.spyOn(service, 'saveFile').mockResolvedValue(expectedResult);

      const result = await controller.uploadFile(mockFile, mockReq);

      expect(service.saveFile).toHaveBeenCalledWith(mockFile, 'john_doe');
      expect(result).toEqual(expectedResult);
    });

    it('should call mediaService.saveFile with API key authenticated username', async () => {
      const mockFile = {} as Express.Multer.File;
      const mockReq = { user: { username: 'api_user', authType: 'api-key' } };
      const expectedResult = { id: '123', filename: 'api_user_123.png', url: '/media/image/api_user_123.png' };
      jest.spyOn(service, 'saveFile').mockResolvedValue(expectedResult);

      const result = await controller.uploadFile(mockFile, mockReq);

      expect(service.saveFile).toHaveBeenCalledWith(mockFile, 'api_user');
      expect(result).toEqual(expectedResult);
    });

    it('should fall back to anonymous if user object or username is missing', async () => {
      const mockFile = {} as Express.Multer.File;
      const mockReq = { user: undefined };
      const expectedResult = { id: '123', filename: 'anonymous_123.png', url: '/media/image/anonymous_123.png' };
      jest.spyOn(service, 'saveFile').mockResolvedValue(expectedResult);

      const result = await controller.uploadFile(mockFile, mockReq);

      expect(service.saveFile).toHaveBeenCalledWith(mockFile, 'anonymous');
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getFile', () => {
    it('should set Content-Type header on response and return stream', async () => {
      const mockStream = {} as any;
      jest.spyOn(service, 'getFileStream').mockReturnValue({
        stream: mockStream,
        contentType: 'image/png',
      });

      const mockResponse = {
        set: jest.fn(),
      } as unknown as Response;

      const result = await controller.getFile('john_doe_123.png', mockResponse);

      expect(service.getFileStream).toHaveBeenCalledWith('john_doe_123.png');
      expect(mockResponse.set).toHaveBeenCalledWith({
        'Content-Type': 'image/png',
      });
      expect(result).toBe(mockStream);
    });
  });
});
