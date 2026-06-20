import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  recordPostView: vi.fn(),
}));

vi.mock("@/modules/posts/view", () => ({
  recordPostView: mocks.recordPostView,
}));

describe("POST /api/posts/view", () => {
  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.TRUST_PROXY_HEADERS;
  });

  it("does not trust spoofed X-Forwarded-For by default", async () => {
    const { POST } = await import("./route");
    mocks.recordPostView.mockResolvedValue({ counted: true });

    await POST({
      json: async () => ({ slug: "hello" }),
      headers: new Headers({
        "x-forwarded-for": "198.51.100.10",
        "x-real-ip": "203.0.113.20",
      }),
    } as never);

    expect(mocks.recordPostView).toHaveBeenCalledWith("hello", "203.0.113.20");
  });

  it("uses X-Forwarded-For only when proxy headers are explicitly trusted", async () => {
    const { POST } = await import("./route");
    process.env.TRUST_PROXY_HEADERS = "1";
    mocks.recordPostView.mockResolvedValue({ counted: true });

    await POST({
      json: async () => ({ slug: "hello" }),
      headers: new Headers({
        "x-forwarded-for": "198.51.100.10, 203.0.113.20",
        "x-real-ip": "203.0.113.20",
      }),
    } as never);

    expect(mocks.recordPostView).toHaveBeenCalledWith("hello", "198.51.100.10");
  });
});
