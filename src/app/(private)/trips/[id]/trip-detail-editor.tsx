"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { LeafletTileConfig } from "@/lib/map";
import type { TripDetail } from "@/modules/trips/queries";
import { tripStatusLabels } from "@/modules/trips/utils";
import { DynamicTripMap } from "../leaflet-dynamic";
import { TripChecklistEditor } from "./trip-checklist-editor";
import { TripDayCard } from "./trip-day-card";
import { TripHero } from "./trip-hero";
import { TripOverviewForm } from "./trip-overview-form";

export function TripDetailEditor({ trip, tileConfig }: { trip: TripDetail; tileConfig: LeafletTileConfig }) {
  const [selectedDayId, setSelectedDayId] = useState(trip.days[0]?.id ?? null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const selectedDay = trip.days.find((day) => day.id === selectedDayId) ?? trip.days[0] ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="ghost">
          <Link href="/trips">返回旅行列表</Link>
        </Button>
        <span className="rounded-full bg-module-trips/12 px-3 py-1 text-sm font-medium text-module-trips">{tripStatusLabels[trip.status]}</span>
      </div>
      <TripHero trip={trip} />
      <TripOverviewForm trip={trip} />
      {trip.status === "PLANNED" ? <TripChecklistEditor trip={trip} /> : null}

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(28rem,0.95fr)] lg:items-start">
        <div className="space-y-4">
          {trip.days.map((day) => (
            <TripDayCard
              key={day.id}
              day={day}
              active={selectedDay?.id === day.id}
              selectedLocationId={selectedLocationId}
              onSelectDay={() => setSelectedDayId(day.id)}
              onSelectLocation={setSelectedLocationId}
            />
          ))}
        </div>
        <div className="sticky top-4 overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
          <DynamicTripMap
            tileConfig={tileConfig}
            day={selectedDay}
            selectedLocationId={selectedLocationId}
            onSelectLocation={setSelectedLocationId}
          />
        </div>
      </section>
    </div>
  );
}
