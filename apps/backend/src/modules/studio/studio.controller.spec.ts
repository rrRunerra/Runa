import { Test, TestingModule } from '@nestjs/testing';
import { StudioController } from './studio.controller';
import { StudioService } from './studio.service';
import { StudioDetailEntity, StudioSearchEntity } from './studio.entities';

describe('StudioController', () => {
  let controller: StudioController;
  let service: jest.Mocked<Partial<StudioService>>;

  const mockStudioDetail: StudioDetailEntity = {
    id: 1,
    anilistId: 10,
    malId: 20,
    aniDBId: null,
    tvDBId: null,
    bangumiId: null,
    name: 'Kyoto Animation',
    isAnimationStudio: true,
    siteUrl: 'http://www.kyotoanimation.co.jp/',
    favorites: 500,
    alFavorites: 1000,
    releases: [],
  };

  const mockStudioSearch: StudioSearchEntity[] = [
    {
      id: 1,
      anilistId: 10,
      malId: 20,
      title: 'Kyoto Animation',
      secondaryTitle: null,
      coverImage: null,
      isAnimationStudio: true,
    },
  ];

  beforeEach(async () => {
    service = {
      getStudio: jest.fn(),
      search: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudioController],
      providers: [{ provide: StudioService, useValue: service }],
    }).compile();

    controller = module.get<StudioController>(StudioController);
  });

  describe('getStudio', () => {
    it('should delegate to studioService.getStudio', async () => {
      // Arrange
      (service.getStudio as jest.Mock).mockResolvedValue(mockStudioDetail);

      // Act
      const result = await controller.getStudio({ id: 1 });

      // Assert
      expect(result).toEqual(mockStudioDetail);
      expect(service.getStudio).toHaveBeenCalledWith(1);
    });
  });

  describe('searchStudio', () => {
    it('should delegate to studioService.search', async () => {
      // Arrange
      (service.search as jest.Mock).mockResolvedValue(mockStudioSearch);

      // Act
      const result = await controller.searchStudio('Kyoto');

      // Assert
      expect(result).toEqual(mockStudioSearch);
      expect(service.search).toHaveBeenCalledWith('Kyoto');
    });
  });
});
