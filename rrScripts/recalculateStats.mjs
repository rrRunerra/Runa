import { prisma } from "../packages/database/dist/index.js";

const MEDIA_TYPES = [
  {
    type: "anime",
    model: "aquilaAnime",
    listModel: "aquilaAnimeUserList",
    idField: "animeId",
    favType: "ANIME",
  },
  {
    type: "manga",
    model: "aquilaManga",
    listModel: "aquilaMangaUserList",
    idField: "mangaId",
    favType: "MANGA",
  },
  {
    type: "tv",
    model: "aquilaTv",
    listModel: "aquilaTvUserList",
    idField: "tvId",
    favType: "TV",
  },
  {
    type: "movie",
    model: "aquilaMovie",
    listModel: "aquilaMovieUserList",
    idField: "movieId",
    favType: "MOVIE",
  },
  {
    type: "game",
    model: "aquilaGame",
    listModel: "aquilaGameUserList",
    idField: "gameId",
    favType: "GAME",
  },
  {
    type: "book",
    model: "aquilaBook",
    listModel: "aquilaBookUserList",
    idField: "bookId",
    favType: "BOOK",
  },
];

async function processMediaType(mediaConfig, isDryRun, isVerbose) {
  const { type, model, listModel, idField, favType } = mediaConfig;
  console.log(`\n========================================`);
  console.log(`Processing stats for: ${type.toUpperCase()}`);
  console.log(`========================================`);

  const mediaItems = await prisma[model].findMany({
    select: { id: true },
  });
  console.log(`Found ${mediaItems.length} entries in ${model}.`);
  if (mediaItems.length === 0) return;

  // 1. Group list counts
  const listCountsGroup = await prisma[listModel].groupBy({
    by: [idField],
    _count: { _all: true },
  });
  const listCountsMap = new Map();
  for (const group of listCountsGroup) {
    if (group[idField] != null) {
      listCountsMap.set(group[idField], group._count._all);
    }
  }

  // 2. Group status distributions
  const statusGroup = await prisma[listModel].groupBy({
    by: [idField, "status"],
    _count: { _all: true },
  });
  const statusDistMap = new Map();
  for (const group of statusGroup) {
    const id = group[idField];
    const status = group.status;
    if (id != null && status) {
      if (!statusDistMap.has(id)) statusDistMap.set(id, {});
      statusDistMap.get(id)[String(status)] = group._count._all;
    }
  }

  // 3. Group score distributions
  const scoreGroup = await prisma[listModel].groupBy({
    where: { score: { gt: 0 } },
    by: [idField, "score"],
    _count: { _all: true },
    _sum: { score: true },
  });
  const scoreDistMap = new Map();
  for (const group of scoreGroup) {
    const id = group[idField];
    const score = group.score;
    if (id != null && score) {
      if (!scoreDistMap.has(id)) {
        scoreDistMap.set(id, { dist: {}, totalSum: 0, scoredCount: 0 });
      }
      const item = scoreDistMap.get(id);
      item.dist[String(score)] = group._count._all;
      item.totalSum += group._sum.score || 0;
      item.scoredCount += group._count._all;
    }
  }

  // 4. Group favorites
  const favoriteGroup = await prisma.favorite.groupBy({
    where: { type: favType },
    by: ["mediaId"],
    _count: { _all: true },
  });
  const favoriteCountsMap = new Map();
  for (const group of favoriteGroup) {
    if (group.mediaId) {
      favoriteCountsMap.set(group.mediaId, group._count._all);
    }
  }

  // Build updates
  const updates = [];
  for (const item of mediaItems) {
    const mediaId = item.id;
    const popularity = listCountsMap.get(mediaId) || 0;
    const favoritesCount = favoriteCountsMap.get(String(mediaId)) || 0;
    const statusDist = statusDistMap.get(mediaId) || {};
    const scoreInfo = scoreDistMap.get(mediaId) || { dist: {}, totalSum: 0, scoredCount: 0 };
    const averageScore =
      scoreInfo.scoredCount > 0
        ? parseFloat((scoreInfo.totalSum / scoreInfo.scoredCount).toFixed(2))
        : 0;

    updates.push({
      id: mediaId,
      data: {
        localPopularity: popularity,
        localFavoritesCount: favoritesCount,
        localAverageScore: averageScore,
        localStatusDistribution: statusDist,
        localScoreDistribution: scoreInfo.dist,
        localTotalScoreSum: scoreInfo.totalSum,
        localScoredCount: scoreInfo.scoredCount,
      },
    });

    if (isVerbose) {
      console.log(`[${type.toUpperCase()}] ID ${mediaId} -> Pop: ${popularity}, AvgScore: ${averageScore}`);
    }
  }

  console.log(`Prepared ${updates.length} updates for ${type}.`);
  if (isDryRun) {
    console.log(`[DRY RUN] Skipping database update for ${type}.`);
    return;
  }

  // Execute transactions in batches of 100
  const BATCH_SIZE = 100;
  let count = 0;
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const chunk = updates.slice(i, i + BATCH_SIZE);
    const queries = chunk.map((u) =>
      prisma[model].update({
        where: { id: u.id },
        data: u.data,
      })
    );
    await prisma.$transaction(queries);
    count += chunk.length;
    console.log(`  Updated ${count}/${updates.length} ${type} entries...`);
  }

  console.log(`Finished ${type}. Processed ${count} entries.`);
}

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  const isVerbose = process.argv.includes("--verbose");

  let mediaArg = "all";
  const mediaParam = process.argv.find((arg) => arg.startsWith("--media="));
  if (mediaParam) {
    mediaArg = mediaParam.split("=")[1].toLowerCase();
  }

  console.log("Starting full recalculation of local media statistics...");
  console.log(`Target Media: ${mediaArg.toUpperCase()}`);

  const targets =
    mediaArg === "all"
      ? MEDIA_TYPES
      : MEDIA_TYPES.filter((m) => m.type === mediaArg);

  for (const config of targets) {
    await processMediaType(config, isDryRun, isVerbose);
  }

  console.log("\nAll requested media statistics successfully recalculated!");
}

main()
  .catch((e) => {
    console.error("Error running recalculation script:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
