import { GamesLibrary } from "@/app/(private)/games/games-library";
import { getGamesPageData, type GameSearchParams } from "@/modules/games/queries";

export const dynamic = "force-dynamic";

export default async function GamesPage({ searchParams }: { searchParams: Promise<GameSearchParams> }) {
  const data = await getGamesPageData(await searchParams);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <GamesLibrary data={data} />
    </main>
  );
}
