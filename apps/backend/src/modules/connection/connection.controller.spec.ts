import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { ConnectionLinkedTo } from '@runa/database';
import { ConnectionController } from './connection.controller';
import { ConnectionService } from './connection.service';
import { AuthGuard } from '../../common/guards/auth/auth.guard';
import { AquilaBitField } from '@runa/permissions';
import { Reflector } from '@nestjs/core';
import { Response } from 'express';

describe('ConnectionController', () => {
  let controller: ConnectionController;
  let service: ConnectionService;

  const mockConnectionService = {
    findAll: jest.fn(),
    upsert: jest.fn(),
    remove: jest.fn(),
    getAuthUrl: jest.fn(),
    handleCallback: jest.fn(),
    startImport: jest.fn(),
    getImportStatus: jest.fn(),
  };

  const mockAuthGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConnectionController],
      providers: [
        { provide: ConnectionService, useValue: mockConnectionService },
        Reflector,
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .compile();

    controller = module.get<ConnectionController>(ConnectionController);
    service = module.get<ConnectionService>(ConnectionService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should find all connections for user', async () => {
      const mockReq = { user: { username: 'testuser' } };
      mockConnectionService.findAll.mockResolvedValue([]);

      const result = await controller.findAll(
        mockReq,
        ConnectionLinkedTo.AQUILA,
        'sync',
      );

      expect(service.findAll).toHaveBeenCalledWith(
        'testuser',
        ConnectionLinkedTo.AQUILA,
        'sync',
      );
      expect(result).toEqual([]);
    });
  });

  describe('save', () => {
    it('should save connection details', async () => {
      const mockReq = { user: { username: 'testuser' } };
      const body = {
        provider: 'anilist',
        linkedUsername: 'linkuser',
        linkedTo: ConnectionLinkedTo.AQUILA,
      };
      mockConnectionService.upsert.mockResolvedValue({ id: 'conn-1' });

      const result = await controller.save(mockReq, body);

      expect(service.upsert).toHaveBeenCalledWith(
        'testuser',
        expect.objectContaining({
          provider: 'anilist',
          linkedUsername: 'linkuser',
        }),
      );
      expect(result).toEqual({ id: 'conn-1' });
    });
  });

  describe('remove', () => {
    it('should remove connection', async () => {
      const mockReq = { user: { username: 'testuser' } };
      mockConnectionService.remove.mockResolvedValue({ success: true });

      const result = await controller.remove(mockReq, 'anilist', {});

      expect(service.remove).toHaveBeenCalledWith('testuser', 'anilist');
      expect(result).toEqual({ success: true });
    });
  });

  describe('connect', () => {
    it('should redirect to connection auth URL', async () => {
      mockConnectionService.getAuthUrl.mockResolvedValue('https://auth.url');
      const mockRes = {
        redirect: jest.fn(),
      } as unknown as Response;

      await controller.connect('anilist', 'token-123', '/redirect', mockRes);

      expect(service.getAuthUrl).toHaveBeenCalledWith(
        'anilist',
        'token-123',
        '/redirect',
      );
      expect(mockRes.redirect).toHaveBeenCalledWith('https://auth.url');
    });
  });

  describe('importList', () => {
    it('should throw ForbiddenException if user lacks IMPORT_LIST permission', async () => {
      const mockReq = { user: { username: 'testuser', permissions: [] } };

      await expect(controller.importList(mockReq, 'anilist')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should start list import if user has permission', async () => {
      const permissions = new AquilaBitField(['IMPORT_LIST']).serialize();
      const mockReq = { user: { username: 'testuser', permissions } };
      mockConnectionService.startImport.mockResolvedValue({ success: true });

      const result = await controller.importList(mockReq, 'anilist', {
        mediaTypes: ['anime'],
      });

      expect(service.startImport).toHaveBeenCalledWith('testuser', 'anilist', [
        'anime',
      ]);
      expect(result).toEqual({ success: true });
    });
  });

  describe('importStatus', () => {
    it('should throw ForbiddenException if user lacks IMPORT_LIST permission', async () => {
      const mockReq = { user: { username: 'testuser', permissions: [] } };

      await expect(controller.importStatus(mockReq, 'anilist')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should return import status if user has permission', async () => {
      const permissions = new AquilaBitField(['IMPORT_LIST']).serialize();
      const mockReq = { user: { username: 'testuser', permissions } };
      mockConnectionService.getImportStatus.mockResolvedValue({
        status: 'running',
      });

      const result = await controller.importStatus(mockReq, 'anilist');

      expect(service.getImportStatus).toHaveBeenCalledWith(
        'testuser',
        'anilist',
      );
      expect(result).toEqual({ status: 'running' });
    });
  });
});
