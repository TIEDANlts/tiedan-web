import { TripsLibrary } from "@/app/(private)/trips/trips-library";
import { getTripsPageData, type TripSearchParams } from "@/modules/trips/queries";

export const dynamic = "force-dynamic";

export default async function TripsPage({ searchParams }: { searchParams: Promise<TripSearchParams> }) {
  const data = await getTripsPageData(await searchParams);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <TripsLibrary data={data} />
    </main>
  );
}
