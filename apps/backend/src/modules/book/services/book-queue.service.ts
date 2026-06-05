import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Subject, EMPTY } from 'rxjs';
import { mergeMap, catchError } from 'rxjs/operators';
import { BookRepository } from '../repositories/book.repository';
import type { Media } from '../../../common/types/types';

@Injectable()
export class BookQueueService implements OnModuleInit {
  private readonly logger = new Logger(BookQueueService.name);
  private readonly jobQueue = new Subject<string>();
  private readonly processing = new Set<string>();

  constructor(private readonly bookRepository: BookRepository) {}

  onModuleInit() {
    this.processQueue();
  }

  addJob(id: string) {
    if (!this.processing.has(id)) {
      this.jobQueue.next(id);
    }
  }

  private processQueue() {
    this.jobQueue
      .pipe(
        mergeMap(async (id) => {
          if (this.processing.has(id)) {
            return;
          }

          this.processing.add(id);

          try {
            this.logger.log(`Processing sync job for book ${id}`);
            await this.syncBookFromOpenLibrary(id);
            this.logger.log(`Completed sync job for book ${id}`);
          } catch (error) {
            const message =
              error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to sync book ${id}: ${message}`);
          } finally {
            this.processing.delete(id);
          }
        }, 3),
        catchError((error) => {
          this.logger.error(`Queue error: ${error}`);
          return EMPTY;
        }),
      )
      .subscribe();
  }

  private async syncBookFromOpenLibrary(id: string) {
    const media = await this.fetchFromOpenLibrary(id);
    if (media) {
      await this.bookRepository.upsert(id, {
        openLibraryId: id,
        titleString: media.title.english || media.title.romaji || '',
        coverImage: media.coverImage.large || '',
        description: media.description || '',
        publishYear: media.startDate?.year || null,
        subjects: media.genres || [],
        authors: media.studios?.map((s: any) => s.name) || [],
        publishers: [],
        pages: null,
        chapters: media.chapters || null,
      });
    }
  }

  private async fetchFromOpenLibrary(id: string): Promise<Media | null> {
    const res = await fetch(`https://openlibrary.org/works/${id}.json`);
    if (!res.ok) {
      throw new Error(`Open Library detail fetch failed: ${res.status}`);
    }
    const item = await res.json();

    // Get description text
    let description = '';
    if (typeof item.description === 'string') {
      description = item.description;
    } else if (item.description && typeof item.description.value === 'string') {
      description = item.description.value;
    }

    // Get cover URL
    let coverUrl = '';
    if (item.covers && item.covers.length > 0) {
      coverUrl = `https://covers.openlibrary.org/b/id/${item.covers[0]}-L.jpg`;
    }

    // Get authors
    const authorNames: string[] = [];
    if (item.authors && item.authors.length > 0) {
      for (const authRef of item.authors.slice(0, 2)) {
        const authKey = authRef.author?.key;
        if (authKey) {
          try {
            const authorRes = await fetch(`https://openlibrary.org${authKey}.json`);
            if (authorRes.ok) {
              const authorData = await authorRes.json();
              if (authorData.name) {
                authorNames.push(authorData.name);
              }
            }
          } catch (e) {
            // ignore
          }
        }
      }
    }

    // Get publish year
    let publishYear: number | null = null;
    if (item.created && typeof item.created.value === 'string') {
      const yearMatch = item.created.value.match(/\d{4}/);
      if (yearMatch) {
        publishYear = parseInt(yearMatch[0], 10);
      }
    }

    const subjects = item.subjects || [];

    return {
      id,
      title: {
        romaji: item.title,
        english: item.title,
        native: null,
      },
      coverImage: {
        extraLarge: coverUrl,
        large: coverUrl,
      },
      bannerImage: coverUrl,
      format: 'Book',
      status: 'Published',
      description,
      startDate: publishYear
        ? {
            year: publishYear,
            month: null,
            day: null,
          }
        : undefined,
      genres: subjects,
      studios: authorNames.map((name: string) => ({ name })),
      averageScore: null,
      popularity: null,
      chapters: null,
      volumes: null,
    };
  }
}
