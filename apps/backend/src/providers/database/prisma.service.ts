import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { prisma, Prisma } from '@runa/database';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

type PaginationMeta = {
  count: number;
  nextCursor: string | null;
  hasMore: boolean;
};

type PaginateInput<TModel> = Prisma.Args<TModel, 'findMany'> & {
  take?: number;
  cursor?: string | number | null;
  cursorField: string;
};

type PaginateOutput<TModel, TArgs extends Prisma.Args<TModel, 'findMany'>> = {
  data: Prisma.Result<TModel, TArgs, 'findMany'>;
  pageInfo: PaginationMeta;
};

type ModelContext<TModel> = {
  findMany: (args?: Prisma.Args<TModel, 'findMany'>) => Promise<unknown[]>;
};

const extendedPrisma = prisma.$extends({
  model: {
    $allModels: {
      async paginate<TModel, TArgs extends Prisma.Args<TModel, 'findMany'>>(
        this: TModel,
        args: PaginateInput<TModel>,
      ): Promise<PaginateOutput<TModel, TArgs>> {
        const context = Prisma.getExtensionContext(
          this,
        ) as unknown as ModelContext<TModel>;

        const { take: rawTake, cursor, cursorField, ...findManyArgs } = args;

        const take = Math.min(
          Math.max(1, rawTake ?? DEFAULT_PAGE_SIZE),
          MAX_PAGE_SIZE,
        );

        const cursorArg: {
          cursor?: Record<string, string | number>;
          skip?: number;
        } =
          cursor === null || cursor === undefined
            ? {}
            : {
                cursor: { [cursorField]: cursor },
                skip: 1,
              };

        const rows = await context.findMany({
          ...(findManyArgs as Prisma.Args<TModel, 'findMany'>),
          take: take + 1,
          ...cursorArg,
        });

        const hasMore = rows.length > take;
        const slicedRows = hasMore ? rows.slice(0, take) : rows;
        const data = slicedRows as Prisma.Result<TModel, TArgs, 'findMany'>;

        const lastRow = slicedRows[slicedRows.length - 1] as
          | Record<string, unknown>
          | undefined;

        const nextCursorValue =
          hasMore && lastRow ? lastRow[cursorField] : null;

        return {
          data,
          pageInfo: {
            count: slicedRows.length,
            nextCursor:
              typeof nextCursorValue === 'string' ||
              typeof nextCursorValue === 'number'
                ? String(nextCursorValue)
                : null,
            hasMore,
          },
        };
      },
    },
  },
});

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  public client = extendedPrisma;

  public async onModuleInit(): Promise<void> {
    this.logger.log('Connecting to database');
    await prisma.$connect().catch((error: unknown) => {
      this.logger.error(error);
    });
    this.logger.log('Connected to database');
  }

  public async onModuleDestroy(): Promise<void> {
    await prisma.$disconnect().catch((error: unknown) => {
      this.logger.error(error);
    });
    this.logger.log('Disconnected from database');
  }
}
