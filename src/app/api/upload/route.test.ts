import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  save: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: mocks.auth,
}));

vi.mock("@/lib/storage", async () => {
  const actual = await vi.importActual<typeof import("@/lib/storage")>("@/lib/storage");

  return {
    ...actual,
    save: mocks.save,
  };
});

const LOCAL_UPLOAD_LIMIT = 15 * 1024 * 1024;

describe("POST /api/upload", () => {
  it("returns 413 for files larger than the local upload limit without reading the body", async () => {
    const { POST } = await import("./route");
    const file = new File([new Uint8Array(1)], "huge.png", { type: "image/png" });
    const arrayBuffer = vi.fn();
    const formData = new FormData();

    Object.defineProperty(file, "size", { value: LOCAL_UPLOAD_LIMIT + 1 });
    Object.defineProperty(file, "arrayBuffer", { value: arrayBuffer });
    formData.set("file", file);

    mocks.auth.mockResolvedValue({ user: { id: "user-1" } });

    const response = await POST({ formData: async () => formData } as unknown as Request);

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({ error: "图片不能超过 15MB。" });
    expect(arrayBuffer).not.toHaveBeenCalled();
    expect(mocks.save).not.toHaveBeenCalled();
  });
});
