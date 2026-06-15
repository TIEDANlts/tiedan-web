"use client";

import dynamic from "next/dynamic";

import type { FootprintMapProps, TripMapProps } from "@/modules/trips/map-types";

export const DynamicTripMap = dynamic<TripMapProps>(
  () => import("./trip-map").then((mod) => mod.TripMap),
  {
    ssr: false,
    loading: () => <div className="flex min-h-[24rem] items-center justify-center bg-surface-2 text-sm text-ink-2">地图加载中...</div>,
  },
);

export const DynamicFootprintMap = dynamic<FootprintMapProps>(
  () => import("./footprint/footprint-map").then((mod) => mod.FootprintMap),
  {
    ssr: false,
    loading: () => <div className="flex min-h-[28rem] items-center justify-center bg-surface-2 text-sm text-ink-2">地图加载中...</div>,
  },
);
