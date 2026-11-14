/* eslint-disable testing-library/prefer-user-event */
import { fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { useImageUpload } from "../image-upload-context";
import { ImageUpload } from "../index";

function noopRevoke(): void {
  // Empty mock for URL.revokeObjectURL
}

function noopClick(): void {
  // Empty mock for HTMLInputElement.prototype.click
}

describe("imageUpload component", () => {
  const mockFile = new File(["dummy-data-1"], "ramen.jpg", {
    type: "image/jpeg",
  });
  const mockFileTwo = new File(["dummy-data-2"], "sushi.jpg", {
    type: "image/jpeg",
  });

  beforeEach(() => {
    vi.spyOn(URL, "createObjectURL").mockImplementation(
      (blob: Blob | MediaSource) => `blob:http://localhost/${(blob as File).name}`,
    );
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(noopRevoke);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws error outside provider and renders initial state with forwarded attributes", () => {
    expect.assertions(5);
    expect(() => {
      renderHook(() => useImageUpload());
    }).toThrow("useImageUpload must be used within an ImageUpload");

    const { rerender } = render(
      <>
        <label htmlFor="custom-input-id">Custom upload</label>
        <ImageUpload accept="image/png" disabled id="custom-input-id" />
      </>,
    );
    const input = screen.getByLabelText<HTMLInputElement>("Custom upload");
    expect(input.getAttribute("accept")).toBe("image/png");
    expect(screen.getByText("Upload image").hasAttribute("disabled")).toBe(true);

    rerender(
      <>
        <label htmlFor="custom-input-id">Custom upload</label>
        <ImageUpload id="custom-input-id" />
      </>,
    );
    expect(screen.queryByAltText("Image preview")).toBeNull();
    expect(screen.getByText("Upload image").hasAttribute("disabled")).toBe(false);
  });

  it("handles file upload, replacement, removal with focus, and unmount cleanup", () => {
    expect.assertions(5);
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL");
    const onChange = vi.fn<(value: File | string | null) => void>();

    const { unmount } = render(
      <>
        <label htmlFor="upload-lifecycle">Select image</label>
        <ImageUpload id="upload-lifecycle" onChange={onChange} />
      </>,
    );
    const fileInput = screen.getByLabelText<HTMLInputElement>("Select image");

    fireEvent.change(fileInput, { target: { files: [mockFile] } });
    expect(screen.getByAltText<HTMLImageElement>("Image preview").getAttribute("src")).toBe(
      "blob:http://localhost/ramen.jpg",
    );

    fireEvent.change(fileInput, { target: { files: [mockFileTwo] } });
    expect(revokeSpy).toHaveBeenCalledWith("blob:http://localhost/ramen.jpg");

    fireEvent.click(screen.getByLabelText("Remove image"));
    expect(onChange).toHaveBeenCalledWith(null);
    expect(screen.getByText("Upload image").matches(":focus")).toBe(true);

    unmount();
    expect(revokeSpy).toHaveBeenCalledWith("blob:http://localhost/sushi.jpg");
  });

  it("supports controlled mode and isUploading toggle with replace trigger", () => {
    expect.assertions(5);
    const onChange = vi.fn<(value: File | string | null) => void>();
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(noopClick);

    const { rerender } = render(
      <>
        <label htmlFor="controlled-input">Controlled image</label>
        <ImageUpload id="controlled-input" onChange={onChange} value={null} />
      </>,
    );
    const fileInput = screen.getByLabelText<HTMLInputElement>("Controlled image");

    fireEvent.change(fileInput, { target: { files: [] } });
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.change(fileInput, { target: { files: [mockFile] } });
    expect(onChange).toHaveBeenCalledWith(mockFile);

    rerender(
      <>
        <label htmlFor="controlled-input">Controlled image</label>
        <ImageUpload
          id="controlled-input"
          isUploading
          onChange={onChange}
          value="https://example.com/ramen.jpg"
        />
      </>,
    );
    expect(screen.getByLabelText("Uploading image")).toBeDefined();
    expect(screen.getByLabelText("Replace image").hasAttribute("disabled")).toBe(true);

    rerender(
      <>
        <label htmlFor="controlled-input">Controlled image</label>
        <ImageUpload
          id="controlled-input"
          isUploading={false}
          onChange={onChange}
          value="https://example.com/ramen.jpg"
        />
      </>,
    );
    fireEvent.click(screen.getByLabelText("Replace image"));
    expect(clickSpy).toHaveBeenCalledOnce();
  });

  it("forwards aria-invalid to preview container", () => {
    // Arrange
    expect.assertions(1);

    // Act
    render(<ImageUpload aria-invalid defaultValue="https://example.com/ramen.jpg" />);
    const previewContainer = screen.getByRole("group", { name: "Image preview" });

    // Assert
    expect(previewContainer.getAttribute("aria-invalid")).toBe("true");
  });
});
