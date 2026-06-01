import { Test, TestingModule } from '@nestjs/testing';
import { MediaService } from './media.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';

jest.mock('fs', () => {
  const original = jest.requireActual('fs');
  return {
    ...original,
    existsSync: jest.fn(),
    mkdirSync: jest.fn(),
    writeFileSync: jest.fn(),
    createReadStream: jest.fn(),
  };
});

describe('MediaService', () => {
  let service: MediaService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [MediaService],
    }).compile();

    service = module.get<MediaService>(MediaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('saveFile', () => {
    it('should save file successfully and return filename starting with username', async () => {
      const mockFile = {
        fieldname: 'file',
        originalname: 'test.png',
        encoding: '7bit',
        mimetype: 'image/png',
        buffer: Buffer.from('test data'),
        size: 9,
      } as Express.Multer.File;

      (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);

      const username = 'test-user!';
      const result = await service.saveFile(mockFile, username);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.filename).toMatch(/^test-user__/); // test-user! sanitized to test-user_
      expect(result.filename).toContain('.png');
      expect(result.url).toBe(`/media/image/${result.filename}`);
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should throw BadRequestException if file is missing', async () => {
      await expect(service.saveFile(null as any, 'user')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid extensions', async () => {
      const mockFile = {
        originalname: 'malicious.exe',
        buffer: Buffer.from('exe'),
      } as Express.Multer.File;

      await expect(service.saveFile(mockFile, 'user')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getFileStream', () => {
    it('should return a StreamableFile and contentType for existing file', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.createReadStream as jest.Mock).mockReturnValue({} as any);

      const result = service.getFileStream('test-user_123.jpg');

      expect(result).toBeDefined();
      expect(result.contentType).toBe('image/jpeg');
      expect(result.stream).toBeDefined();
    });

    it('should throw NotFoundException if file does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      expect(() => service.getFileStream('nonexistent.png')).toThrow(NotFoundException);
    });

    it('should throw BadRequestException for directory traversal attempt', () => {
      expect(() => service.getFileStream('../../../etc/passwd')).toThrow(BadRequestException);
    });
  });
});
