"use client";

import type { TripDetail } from "@/modules/trips/queries";
import { tripStatusLabels } from "@/modules/trips/utils";

export function TripHero({ trip }: { trip: TripDetail }) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <div className="relative min-h-[18rem] bg-module-trips/12 md:min-h-[24rem]">
        {trip.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={trip.coverUrl} alt={trip.title} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-module-trips text-7xl font-semibold text-white">
            {trip.title.slice(0, 1)}
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-5 text-white">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-white/18 px-3 py-1">{tripStatusLabels[trip.status]}</span>
            <span>{trip.startDate} - {trip.endDate}</span>
            <span>{trip.daysCount} 天</span>
          </div>
          <h1 className="mt-3 font-heading text-4xl font-semibold">{trip.title}</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            {trip.destinations.map((destination) => (
              <span key={destination} className="rounded-full bg-module-trips px-3 py-1 text-xs font-semibold text-white">
                {destination}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
