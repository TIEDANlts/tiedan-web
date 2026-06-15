import type { LeafletTileConfig } from "@/lib/map";
import type { FootprintPoint, TripDayItem } from "@/modules/trips/queries";

export type TripMapProps = {
  tileConfig: LeafletTileConfig;
  day: Pick<TripDayItem, "id" | "date" | "locations"> | null;
  selectedLocationId: string | null;
  onSelectLocation: (locationId: string) => void;
};

export type FootprintMapProps = {
  tileConfig: LeafletTileConfig;
  points: FootprintPoint[];
};
