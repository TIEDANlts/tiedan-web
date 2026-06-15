import Link from "next/link";

import { DynamicFootprintMap } from "@/app/(private)/trips/leaflet-dynamic";
import { Button } from "@/components/ui/button";
import { getLeafletTileConfig } from "@/lib/map";
import { getFootprintData } from "@/modules/trips/queries";

export const dynamic = "force-dynamic";

export default async function TripsFootprintPage() {
  const data = await getFootprintData();

  return (
    <main className="w-full px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto mb-5 flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-sm font-medium text-module-trips">旅行足迹</p>
          <h1 className="font-heading text-3xl font-semibold text-ink">走过的地方</h1>
          <div className="mt-3 inline-flex rounded-lg border border-module-trips/35 bg-module-trips/12 px-4 py-2 text-sm font-semibold text-module-trips">
            {data.stats.cities} 个城市 · {data.stats.trips} 次旅行
          </div>
        </div>
        <Button asChild variant="outline">
          <Link href="/trips">返回旅行列表</Link>
        </Button>
      </div>

      {data.points.length === 0 ? (
        <div className="mx-auto max-w-7xl rounded-xl border border-dashed border-border bg-surface px-5 py-14 text-center">
          <h2 className="font-heading text-2xl font-semibold text-ink">还没有完成的旅行足迹。</h2>
          <p className="mt-3 text-sm text-ink-2">把行程标记为已完成后，地图会聚合其中的地点。</p>
        </div>
      ) : (
        <DynamicFootprintMap tileConfig={getLeafletTileConfig()} points={data.points} />
      )}
    </main>
  );
}
