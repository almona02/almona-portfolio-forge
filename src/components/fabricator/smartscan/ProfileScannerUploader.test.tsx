// Removed unused React import
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProfileScannerUploader } from "./ProfileScannerUploader";

describe("ProfileScannerUploader", () => {
  it("renders uploader controls (smoke test)", () => {
    render(<ProfileScannerUploader authToken="dummy-token" />);

    expect(
      screen.getByText("Profile Scanner (Tier 2 - AI Assisted)")
    ).toBeInTheDocument();
    expect(screen.getByText("Select Image")).toBeInTheDocument();
  });
});

