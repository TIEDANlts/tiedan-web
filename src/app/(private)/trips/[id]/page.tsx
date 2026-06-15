import { getLeafletTileConfig } from "@/lib/map";
import { getTripDetail } from "@/modules/trips/queries";
import { TripDetailEditor } from "./trip-detail-editor";

export const dynamic = "force-dynamic";

export default async function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trip = await getTripDetail(id);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <TripDetailEditor trip={trip} tileConfig={getLeafletTileConfig()} />
    </main>
  );
}
