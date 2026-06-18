"use client";

import { Check } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import type { TripDayItem } from "@/modules/trips/queries";
import { TripDayNoteEditor } from "./trip-day-note-editor";
import { TripLocationList } from "./trip-location-editor";
import { TripPhotoUploader } from "./trip-photo-uploader";

export function TripDayCard({
  day,
  active,
  selectedLocationId,
  onSelectDay,
  onSelectLocation,
}: {
  day: TripDayItem;
  active: boolean;
  selectedLocationId: string | null;
  onSelectDay: () => void;
  onSelectLocation: (id: string) => void;
}) {
  const [message, setMessage] = useState<string | null>(null);

  return (
    <article className={cn("space-y-4 rounded-xl border bg-surface p-4 shadow-sm", active ? "border-module-trips" : "border-border")}>
      <button type="button" onClick={onSelectDay} className="flex w-full items-center justify-between text-left">
        <span>
          <span className="block font-heading text-xl font-semibold text-ink">{day.date}</span>
          <span className="text-sm text-ink-2">{day.locations.length} 个地点 · {day.photos.length} 张照片</span>
        </span>
        {active ? <Check className="size-5 text-module-trips" /> : null}
      </button>

      <TripLocationList
        day={day}
        selectedLocationId={selectedLocationId}
        onSelectDay={onSelectDay}
        onSelectLocation={onSelectLocation}
        onMessage={setMessage}
      />
      <TripPhotoUploader day={day} onMessage={setMessage} />
      <TripDayNoteEditor day={day} onMessage={setMessage} />
      {message ? <p className="text-xs text-module-trips">{message}</p> : null}
    </article>
  );
}
