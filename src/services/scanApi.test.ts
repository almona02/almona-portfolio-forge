import { afterEach, describe, expect, it, vi } from "vitest";
import { scanProfileImage } from "./scanApi";
import type { ProfileScanResult } from "@/types/scan";

// Mock the global fetch
global.fetch = vi.fn();

const createFetchResponse = (data: any, ok: boolean) => ({
  ok,
  json: () => Promise.resolve(data),
});

describe("scanProfileImage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls fetch with correct headers and form data", async () => {
    const mockFile = new File(["dummy"], "profile.png", { type: "image/png" });
    const mockToken = "test-token-123";
    const mockResponse: ProfileScanResult = {
      svgPath: "M 10 10",
      dimensions: {
        width_px: 100,
        height_px: 100,
        aspect_ratio: 1,
        width_mm: null,
        height_mm: null,
      },
      bbox: { x: 0, y: 0, width: 100, height: 100 },
      quality: {},
      vectorizer: "potrace",
      scale_mm_per_px: null,
      storage: { original_url: null, svg_url: "" },
    };

    (fetch as any).mockResolvedValue(createFetchResponse(mockResponse, true));

    await scanProfileImage(mockFile, { authToken: mockToken });

    expect(fetch).toHaveBeenCalledWith(
      "/api/v2/scan/profile",
      expect.objectContaining({
        method: "POST",
      })
    );

    const fetchCall = (fetch as any).mock.calls[0];
    const headers = fetchCall[1].headers;
    const formData: FormData = fetchCall[1].body;

    expect(headers.Authorization).toBe(`Bearer ${mockToken}`);
    expect(formData.get("file")).toEqual(mockFile);
  });

  it("throws when the request fails", async () => {
    const mockFile = new File([""], "fail.png");
    (fetch as any).mockResolvedValue(
      createFetchResponse({ detail: "Scan failed" }, false)
    );

    await expect(scanProfileImage(mockFile, "token")).rejects.toThrow(
      "Scan failed"
    );
  });
});

