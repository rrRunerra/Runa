export interface GbooksVolume {
  id: string;
  volumeInfo: {
    title: string;
    subtitle?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    pageCount?: number;
    categories?: string[];
    averageRating?: number;
    ratingsCount?: number;
    maturityRating?: string;
    language?: string;
    imageLinks?: {
      smallThumbnail?: string;
      thumbnail?: string;
      medium?: string;
      large?: string;
      extraLarge?: string;
    };
    industryIdentifiers?: { type: string; identifier: string }[];
    previewLink?: string;
    infoLink?: string;
  };
  saleInfo?: {
    buyLink?: string;
    retailPrice?: { amount: number; currencyCode: string };
  };
}

export interface GbooksSearchResponse {
  items?: GbooksVolume[];
  totalItems: number;
}
