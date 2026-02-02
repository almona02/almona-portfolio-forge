// Removed unused React import
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProfileScannerUploader } from "./ProfileScannerUploader";

describe("ProfileScannerUploader", () => {
  it("renders uploader controls (smoke test)", () => {
    render(<ProfileScannerUploader authToken="dummy-token" />);

    expect(
      screen.getByText("AI-Assisted Engineering Drawing Scanner")
    ).toBeInTheDocument();
    expect(screen.getByText("1. Select Image")).toBeInTheDocument();
  });
});

