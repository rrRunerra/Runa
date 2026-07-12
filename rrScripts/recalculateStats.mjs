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

async function main() {
  console.log("Starting full recalculation of local media statistics...");

  for (const mediaConfig of MEDIA_TYPES) {
    const { type, model, listModel, idField, favType } = mediaConfig;
    console.log(`\nProcessing ${type}...`);

    // Fetch all media items in database
    const mediaItems = await prisma[model].findMany({
      select: { id: true },
    });
    console.log(`Found ${mediaItems.length} ${type} entries.`);

    let count = 0;
    for (const item of mediaItems) {
      const mediaId = item.id;

      // 1. Fetch list entries
      const listEntries = await prisma[listModel].findMany({
        where: { [idField]: mediaId },
      });

      // 2. Count favorites
      const favoritesCount = await prisma.favorite.count({
        where: {
          type: favType,
          mediaId: mediaId.toString(),
        },
      });

      // 3. Compute distributions
      const statusDistribution = {};
      const scoreDistribution = {};
      let totalScoreSum = 0;
      let scoredCount = 0;

      for (const entry of listEntries) {
        // Status
        if (entry.status) {
          statusDistribution[entry.status] = (statusDistribution[entry.status] || 0) + 1;
        }

        // Score (1-10)
        if (entry.score !== null && entry.score !== undefined && entry.score > 0) {
          const scoreStr = entry.score.toString();
          scoreDistribution[scoreStr] = (scoreDistribution[scoreStr] || 0) + 1;
          totalScoreSum += entry.score;
          scoredCount++;
        }
      }

      const averageScore = scoredCount > 0 ? totalScoreSum / scoredCount : 0;
      const popularity = listEntries.length;

      // Update database row
      await prisma[model].update({
        where: { id: mediaId },
        data: {
          localPopularity: popularity,
          localFavoritesCount: favoritesCount,
          localAverageScore: averageScore,
          localStatusDistribution: statusDistribution,
          localScoreDistribution: scoreDistribution,
          localTotalScoreSum: totalScoreSum,
          localScoredCount: scoredCount,
        },
      });

      count++;
      if (count % 100 === 0) {
        console.log(`  Processed ${count}/${mediaItems.length} entries...`);
      }
    }

    console.log(`Finished ${type}. Processed ${count} entries.`);
  }

  console.log("\nAll local media statistics successfully recalculated!");
}

main()
  .catch((e) => {
    console.error("Error running recalculation script:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
