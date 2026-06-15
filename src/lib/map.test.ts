import { afterEach, describe, expect, it } from "vitest";

import { getLeafletTileConfig } from "./map";

afterEach(() => {
  delete process.env.TIANDITU_KEY;
});

describe("getLeafletTileConfig", () => {
  it("uses Tianditu vec_w and cva_w layers when key is configured", () => {
    process.env.TIANDITU_KEY = "test-key";

    const config = getLeafletTileConfig();

    expect(config.source).toBe("tianditu");
    expect(config.layers).toHaveLength(2);
    expect(config.layers[0].url).toContain("T=vec_w");
    expect(config.layers[1].url).toContain("T=cva_w");
    expect(config.layers[0].url).toContain("tk=test-key");
    expect(config.layers[0].subdomains).toEqual(["0", "1", "2", "3", "4", "5", "6", "7"]);
    expect(config.attribution).toContain("天地图");
  });

  it("falls back to OSM when Tianditu key is missing", () => {
    const config = getLeafletTileConfig();

    expect(config.source).toBe("osm");
    expect(config.layers).toEqual([
      {
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        subdomains: ["a", "b", "c"],
      },
    ]);
    expect(config.attribution).toContain("OpenStreetMap");
  });
});
