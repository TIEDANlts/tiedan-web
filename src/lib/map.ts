export type LeafletTileLayerConfig = {
  url: string;
  subdomains: string[];
};

export type LeafletTileConfig = {
  source: "tianditu" | "osm";
  layers: LeafletTileLayerConfig[];
  attribution: string;
};

const TIANDITU_SUBDOMAINS = ["0", "1", "2", "3", "4", "5", "6", "7"];
const OSM_SUBDOMAINS = ["a", "b", "c"];

function tiandituUrl(layer: "vec_w" | "cva_w", key: string) {
  return `https://t{s}.tianditu.gov.cn/DataServer?T=${layer}&x={x}&y={y}&l={z}&tk=${encodeURIComponent(key)}`;
}

export function getLeafletTileConfig(): LeafletTileConfig {
  const key = process.env.TIANDITU_KEY?.trim();

  if (key) {
    return {
      source: "tianditu",
      layers: [
        { url: tiandituUrl("vec_w", key), subdomains: TIANDITU_SUBDOMAINS },
        { url: tiandituUrl("cva_w", key), subdomains: TIANDITU_SUBDOMAINS },
      ],
      attribution: '&copy; <a href="https://www.tianditu.gov.cn/" target="_blank" rel="noreferrer">天地图</a>',
    };
  }

  return {
    source: "osm",
    layers: [{ url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", subdomains: OSM_SUBDOMAINS }],
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
  };
}
