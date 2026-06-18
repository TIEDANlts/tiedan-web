"use client";

import { MapPin, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { addTripLocationAction, removeTripLocationAction } from "@/modules/trips/actions";
import type { TripDayItem } from "@/modules/trips/queries";

export function TripLocationForm({ dayId }: { dayId: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ name: string; lat: number; lng: number }>>([]);
  const [name, setName] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [fromGcj02, setFromGcj02] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function search() {
    const keyword = query.trim();
    if (!keyword) {
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/trips/nominatim?q=${encodeURIComponent(keyword)}`);
      const body = (await response.json()) as { results?: Array<{ name: string; lat: number; lng: number }>; error?: string };
      if (!response.ok) {
        setMessage(body.error ?? "地点搜索失败。");
        return;
      }
      setResults(body.results ?? []);
      setMessage((body.results ?? []).length ? null : "没有找到匹配地点，可以手动输入坐标。");
    });
  }

  function addLocation() {
    startTransition(async () => {
      const result = await addTripLocationAction({
        dayId,
        name,
        lat: Number(lat),
        lng: Number(lng),
        fromGcj02,
      });
      setMessage(result.message);
      if (result.ok) {
        setName("");
        setLat("");
        setLng("");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-surface-2 p-3">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索地点，例如 西湖" />
        <Button type="button" variant="outline" onClick={search} disabled={isPending}>
          搜索
        </Button>
      </div>
      {results.length ? (
        <div className="grid gap-2">
          {results.map((result) => (
            <button
              key={`${result.name}-${result.lat}-${result.lng}`}
              type="button"
              onClick={() => {
                setName(result.name);
                setLat(String(result.lat));
                setLng(String(result.lng));
                setFromGcj02(false);
              }}
              className="rounded-md border border-border bg-surface p-2 text-left text-xs text-ink-2 hover:border-module-trips/50"
            >
              <span className="block truncate font-medium text-ink">{result.name}</span>
              {result.lat}, {result.lng}
            </button>
          ))}
        </div>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-3">
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="地点名" />
        <Input value={lat} onChange={(event) => setLat(event.target.value)} placeholder="纬度 lat" inputMode="decimal" />
        <Input value={lng} onChange={(event) => setLng(event.target.value)} placeholder="经度 lng" inputMode="decimal" />
      </div>
      <label className="flex items-center gap-2 text-sm text-ink-2">
        <input type="checkbox" checked={fromGcj02} onChange={(event) => setFromGcj02(event.target.checked)} className="size-4 accent-[var(--module-trips)]" />
        坐标来自国内地图（高德/腾讯）
      </label>
      <Button type="button" onClick={addLocation} disabled={isPending}>
        <MapPin className="size-4" />
        添加地点
      </Button>
      {message ? <p className="text-xs text-ink-2">{message}</p> : null}
    </div>
  );
}

export function TripLocationList({
  day,
  selectedLocationId,
  onSelectDay,
  onSelectLocation,
  onMessage,
}: {
  day: TripDayItem;
  selectedLocationId: string | null;
  onSelectDay: () => void;
  onSelectLocation: (id: string) => void;
  onMessage: (message: string) => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-ink">地点</h3>
      <div className="space-y-2">
        {day.locations.map((location, index) => (
          <button
            key={location.id}
            type="button"
            onClick={() => {
              onSelectDay();
              onSelectLocation(location.id);
            }}
            className={cn(
              "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm",
              selectedLocationId === location.id ? "border-module-trips bg-module-trips/10" : "border-border bg-surface-2",
            )}
          >
            <span className="min-w-0">
              <span className="font-medium text-ink">{index + 1}. {location.name}</span>
              <span className="ml-2 text-xs text-ink-3">{location.lat}, {location.lng}</span>
            </span>
            <Trash2
              className="size-4 text-ink-3"
              onClick={(event) => {
                event.stopPropagation();
                startTransition(async () => {
                  const result = await removeTripLocationAction(day.id, location.id);
                  onMessage(result.message);
                  router.refresh();
                });
              }}
            />
          </button>
        ))}
      </div>
      <TripLocationForm dayId={day.id} />
    </div>
  );
}
