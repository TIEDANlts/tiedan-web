import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

type Payload = {
  prefix: string;
};

function parsePayload(): Payload {
  const encoded = process.argv[3] ?? "";
  return JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as Payload;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function dbDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function todayText() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function cleanup(prefix: string) {
  const slugBase = slugify(prefix);
  const trips = await db.trip.findMany({
    where: { title: { contains: prefix } },
    select: { id: true },
  });
  const tripIds = trips.map((trip) => trip.id);

  await db.activity.deleteMany({ where: { title: { contains: prefix } } });
  await db.transaction.deleteMany({
    where: {
      OR: [
        { merchant: { contains: prefix } },
        { item: { contains: prefix } },
        { note: { contains: prefix } },
        { txnNo: { startsWith: slugBase } },
      ],
    },
  });
  await db.importBatch.deleteMany({ where: { filename: { contains: prefix } } });
  await db.trip.deleteMany({ where: { id: { in: tripIds } } });
  await db.todo.deleteMany({ where: { content: { contains: prefix } } });
  await db.specialDay.deleteMany({ where: { title: { contains: prefix } } });
  await db.post.deleteMany({
    where: {
      OR: [{ title: { contains: prefix } }, { slug: { startsWith: slugBase } }],
    },
  });
  await db.link.deleteMany({
    where: {
      OR: [{ title: { contains: prefix } }, { group: { contains: prefix } }],
    },
  });
  await db.game.deleteMany({ where: { name: { contains: prefix } } });
  await db.mediaItem.deleteMany({ where: { title: { contains: prefix } } });
  await db.expenseCategory.deleteMany({ where: { name: { contains: prefix } } });
  await db.setting.deleteMany({ where: { value: { contains: prefix } } });
}

async function seed(prefix: string) {
  await cleanup(prefix);

  const slugBase = slugify(prefix);
  const today = todayText();
  const tomorrow = new Date(`${today}T00:00:00.000Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const tomorrowText = tomorrow.toISOString().slice(0, 10);

  const category = await db.expenseCategory.findFirst({
    where: { direction: "EXPENSE" },
    orderBy: { sort: "asc" },
    select: { id: true },
  });

  await db.link.createMany({
    data: [
      {
        group: `${prefix} 工具`,
        title: `${prefix} 导航 A`,
        url: "https://example.com/a",
        icon: null,
        description: "E2E seeded public navigation link",
        sort: 1,
      },
      {
        group: `${prefix} 工具`,
        title: `${prefix} 导航 B`,
        url: "https://example.com/b",
        icon: null,
        description: "E2E seeded public navigation link",
        sort: 2,
      },
    ],
  });

  const posts = Array.from({ length: 12 }, (_, index) => ({
    title: `${prefix} 文章 ${String(index + 1).padStart(2, "0")}`,
    slug: `${slugBase}-post-${String(index + 1).padStart(2, "0")}`,
    summary: `${prefix} 摘要 ${index + 1}`,
    category: "E2E",
    tags: [prefix, "playwright"],
    status: "PUBLISHED" as const,
    publishedAt: new Date(Date.now() - index * 60_000),
    contentMd:
      `# ${prefix} Markdown\n\n这是一段 **E2E** 正文。\n\n` +
      "```ts\nconst checked: boolean = true;\n```\n",
  }));
  await db.post.createMany({ data: posts });

  await db.todo.createMany({
    data: [
      { content: `${prefix} 今日待办`, date: dbDate(today), priority: 1 },
      { content: `${prefix} 收集箱待办`, date: null, priority: 0 },
      { content: `${prefix} 明日待办`, date: dbDate(tomorrowText), priority: 2 },
    ],
  });

  await db.transaction.createMany({
    data: [
      {
        platform: "manual",
        txnTime: new Date(`${today}T10:00:00.000Z`),
        amount: new Prisma.Decimal("26.80"),
        direction: "EXPENSE",
        categoryId: category?.id ?? null,
        merchant: `${prefix} 咖啡店`,
        item: "拿铁",
        txnNo: `${slugBase}-manual-1`,
        note: `${prefix} seeded transaction`,
      },
      {
        platform: "manual",
        txnTime: new Date(`${today}T11:00:00.000Z`),
        amount: new Prisma.Decimal("128.00"),
        direction: "EXPENSE",
        categoryId: category?.id ?? null,
        merchant: `${prefix} 书店`,
        item: "图书",
        txnNo: `${slugBase}-manual-2`,
        note: `${prefix} seeded transaction`,
      },
    ],
  });

  const media = await db.mediaItem.create({
    data: {
      type: "BOOK",
      title: `${prefix} 书影条目`,
      originalTitle: "E2E Original",
      creator: "Playwright",
      year: 2026,
      status: "DONE",
      rating: 8,
      finishedAt: dbDate(today),
      reviewMd: "E2E review",
      tags: [prefix],
    },
  });

  await db.game.create({
    data: {
      source: "manual",
      name: `${prefix} 游戏条目`,
      platform: "PC",
      status: "PLAYING",
      rating: 7,
      playtimeMin: 180,
      tags: [prefix],
      reviewMd: "E2E seeded game",
    },
  });

  const trip = await db.trip.create({
    data: {
      title: `${prefix} 杭州行程`,
      status: "DONE",
      startDate: dbDate(today),
      endDate: dbDate(tomorrowText),
      destinations: ["杭州", prefix],
      summaryMd: "E2E seeded trip",
      days: {
        create: [
          {
            date: dbDate(today),
            noteMd: "第一天笔记",
            locations: [],
            photos: [],
            locationItems: {
              create: [{ name: `${prefix} 西湖`, lat: new Prisma.Decimal("30.259244"), lng: new Prisma.Decimal("120.137595") }],
            },
          },
          { date: dbDate(tomorrowText), noteMd: "第二天笔记", locations: [], photos: [] },
        ],
      },
    },
  });

  await db.specialDay.create({
    data: {
      title: `${prefix} 纪念日`,
      date: dbDate(today),
      yearlyRepeat: true,
      icon: "*",
      note: "E2E seeded special day",
    },
  });

  await Promise.all([
    db.setting.upsert({
      where: { key: "profile.name" },
      update: { value: `${prefix} 管理员` },
      create: { key: "profile.name", value: `${prefix} 管理员` },
    }),
    db.setting.upsert({
      where: { key: "profile.bio" },
      update: { value: "E2E seeded profile" },
      create: { key: "profile.bio", value: "E2E seeded profile" },
    }),
  ]);

  return {
    slugBase,
    postSlug: posts[0].slug,
    tripId: trip.id,
    mediaId: media.id,
    categoryId: category?.id ?? null,
    today,
  };
}

async function main() {
  const command = process.argv[2];
  const payload = parsePayload();
  if (!payload.prefix) {
    throw new Error("Missing prefix");
  }

  if (command === "cleanup") {
    await cleanup(payload.prefix);
    console.log(JSON.stringify({ ok: true }));
    return;
  }

  if (command === "seed") {
    console.log(JSON.stringify(await seed(payload.prefix)));
    return;
  }

  throw new Error(`Unknown db-admin command: ${command}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
