import { prisma } from "../packages/database/dist/index.js";

const MEDIA_CONFIGS = [
  {
    type: "anime",
    model: "aquilaAnime",
    statuses: ["PLANNING", "WATCHING", "COMPLETED", "ON_HOLD", "DROPPED"],
  },
  {
    type: "manga",
    model: "aquilaManga",
    statuses: ["PLANNING", "READING", "COMPLETED", "ON_HOLD", "DROPPED"],
  },
  {
    type: "tv",
    model: "aquilaTv",
    statuses: ["PLANNING", "WATCHING", "COMPLETED", "ON_HOLD", "DROPPED"],
  },
  {
    type: "movie",
    model: "aquilaMovie",
    statuses: ["PLANNING", "WATCHING", "COMPLETED", "ON_HOLD", "DROPPED"],
  },
  {
    type: "game",
    model: "aquilaGame",
    statuses: ["PLANNING", "PLAYING", "COMPLETED", "ON_HOLD", "DROPPED"],
  },
  {
    type: "book",
    model: "aquilaBook",
    statuses: ["PLANNING", "READING", "COMPLETED", "ON_HOLD", "DROPPED"],
  },
];

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomScore() {
  const rand = Math.random();
  if (rand < 0.1) return getRandomInt(1, 5);
  if (rand < 0.45) return getRandomInt(6, 7);
  if (rand < 0.85) return getRandomInt(8, 9);
  return 10;
}

function generateRandomDistributions(statuses) {
  const popularity = getRandomInt(15, 350);
  const favoritesCount = getRandomInt(0, Math.floor(popularity * 0.3));
  const statusDist = {};
  let remainingPopularity = popularity;

  for (let i = 0; i < statuses.length; i++) {
    const status = statuses[i];
    if (i === statuses.length - 1) {
      statusDist[status] = remainingPopularity;
    } else {
      const share = getRandomInt(0, Math.floor(remainingPopularity * 0.6));
      statusDist[status] = share;
      remainingPopularity -= share;
    }
  }

  const scoreDist = {};
  const scoredCount = getRandomInt(
    Math.floor(popularity * 0.6),
    Math.floor(popularity * 0.95)
  );

  let totalScoreSum = 0;
  for (let i = 0; i < scoredCount; i++) {
    const score = getRandomScore();
    const scoreStr = String(score);
    scoreDist[scoreStr] = (scoreDist[scoreStr] || 0) + 1;
    totalScoreSum += score;
  }

  const averageScore =
    scoredCount > 0
      ? parseFloat((totalScoreSum / scoredCount).toFixed(2))
      : 0;

  return {
    localPopularity: popularity,
    localFavoritesCount: favoritesCount,
    localAverageScore: averageScore,
    localStatusDistribution: statusDist,
    localScoreDistribution: scoreDist,
    localTotalScoreSum: totalScoreSum,
    localScoredCount: scoredCount,
  };
}

async function main() {
  const nodeEnv = process.env.NODE_ENV || "development";
  if (nodeEnv !== "development") {
    console.error(
      `[SECURITY ERROR] Seeding random stats is strictly allowed ONLY in development mode (NODE_ENV=development). Current NODE_ENV: '${nodeEnv}'`
    );
    process.exit(1);
  }

  const isDryRun = process.argv.includes("--dry-run");
  const isVerbose = process.argv.includes("--verbose");

  let mediaArg = "all";
  const mediaParam = process.argv.find((arg) => arg.startsWith("--media="));
  if (mediaParam) {
    mediaArg = mediaParam.split("=")[1].toLowerCase();
  }

  console.log("--- Starting Standalone Randomized Media Stats Generator Script ---");
  console.log(`Environment: ${nodeEnv}`);
  console.log(`Target Media: ${mediaArg.toUpperCase()}`);

  const targets =
    mediaArg === "all"
      ? MEDIA_CONFIGS
      : MEDIA_CONFIGS.filter((m) => m.type === mediaArg);

  for (const config of targets) {
    const { type, model, statuses } = config;
    const mediaItems = await prisma[model].findMany({ select: { id: true } });
    console.log(`Found ${mediaItems.length} items for ${type}.`);
    if (mediaItems.length === 0) continue;

    const updates = [];
    for (const item of mediaItems) {
      const statsData = generateRandomDistributions(statuses);
      updates.push({ id: item.id, data: statsData });

      if (isVerbose) {
        console.log(`[${type.toUpperCase()}] ID ${item.id} -> Pop: ${statsData.localPopularity}, AvgScore: ${statsData.localAverageScore}`);
      }
    }

    if (isDryRun) {
      console.log(`[DRY RUN] Skipping database update for ${type}.`);
      continue;
    }

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
      console.log(`  Seeded random stats for ${count}/${updates.length} ${type} items...`);
    }

    console.log(`Finished seeding random stats for ${type}. Processed ${count} items.`);
  }

  console.log("\nFinished seeding randomized media stats!");
}

main()
  .catch((e) => {
    console.error("Error running seed script:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
