"use client";

// Crop/zoom/rotate surface for a picked image, wrapping `react-avatar-editor`.
//
// Deliberately headless about *where* the image comes from and *what* happens
// to the result: it takes a File (or URL) in, and exposes `getCroppedBlob()`
// through a ref so the caller decides when to export and where to send it.
// The crop box is square with the platform's 2px radius so the output matches
// how avatars are rendered everywhere else (account page, header UserCard).

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import ReactAvatarEditor, { type AvatarEditorRef } from "react-avatar-editor";
import {
  MdOutlineRotate90DegreesCcw,
  MdOutlineRotate90DegreesCw,
  MdZoomIn,
  MdZoomOut,
} from "react-icons/md";

import RangeSlider from "@/components/ui/RangeSlider";

export type AvatarEditorHandle = {
  /**
   * Renders the current crop to a square image. Resolves `null` if the canvas
   * isn't ready or the browser refuses to encode it.
   */
  getCroppedBlob: () => Promise<Blob | null>;
};

type Props = {
  image: File | string;
  /** On-screen edge length of the crop box, in px. */
  cropSize?: number;
  /** Edge length of the exported square image, in px. */
  outputSize?: number;
  outputType?: "image/png" | "image/jpeg" | "image/webp";
  /** Only used by the lossy output types. */
  outputQuality?: number;
  onLoadFailure?: () => void;
};

/** Draggable margin around the crop box, in px. */
const BORDER = 24;
const MIN_SCALE = 1;
const MAX_SCALE = 4;
/** Matches `.default-radius` (2px) so the crop reads as square, not circular. */
const CROP_RADIUS = 2;

const AvatarEditor = forwardRef<AvatarEditorHandle, Props>(function AvatarEditor(
  {
    image,
    cropSize = 216,
    outputSize = 512,
    outputType = "image/png",
    outputQuality = 0.92,
    onLoadFailure,
  },
  ref,
) {
  const editorRef = useRef<AvatarEditorRef>(null);
  const [scale, setScale] = useState(MIN_SCALE);
  const [rotate, setRotate] = useState(0);

  useImperativeHandle(
    ref,
    () => ({
      async getCroppedBlob() {
        // getImage() returns the cropped region at the source image's own
        // resolution, which varies wildly between a phone photo and a small
        // PNG. Redraw it onto a fixed square so every avatar we upload is the
        // same size regardless of what the user picked.
        const source = editorRef.current?.getImage();
        if (!source) return null;

        const canvas = document.createElement("canvas");
        canvas.width = outputSize;
        canvas.height = outputSize;

        const ctx = canvas.getContext("2d");
        if (!ctx) return null;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(source, 0, 0, outputSize, outputSize);

        return new Promise<Blob | null>((resolve) => {
          canvas.toBlob((blob) => resolve(blob), outputType, outputQuality);
        });
      },
    }),
    [outputSize, outputType, outputQuality],
  );

  return (
    <div className="flex flex-col items-center">
      <div className="default-radius bg-gray-50 p-2">
        <ReactAvatarEditor
          ref={editorRef}
          image={image}
          width={cropSize}
          height={cropSize}
          border={BORDER}
          borderRadius={CROP_RADIUS}
          // Dim (rather than darken) the area outside the crop, to stay in
          // keeping with the light console theme.
          color={[255, 255, 255, 0.72]}
          scale={scale}
          rotate={rotate}
          onLoadFailure={onLoadFailure}
          // The component renders a bare <canvas> and takes `style`, not
          // `className`. touchAction:none keeps a drag from scrolling the
          // modal on touch devices.
          style={{ cursor: "move", touchAction: "none", display: "block" }}
        />
      </div>

      <p className="mt-2 mb-4 text-xs text-gray-400">
        Drag the image to reposition it.
      </p>

      <RangeSlider
        className="w-full"
        ariaLabel="Zoom"
        value={scale}
        min={MIN_SCALE}
        max={MAX_SCALE}
        step={0.01}
        onChange={setScale}
        leadingIcon={<MdZoomOut />}
        trailingIcon={<MdZoomIn />}
      />

      <div className="mt-3 flex items-center gap-2">
        <RotateButton
          label="Rotate left"
          icon={<MdOutlineRotate90DegreesCcw />}
          onClick={() => setRotate((r) => (r - 90) % 360)}
        />
        <RotateButton
          label="Rotate right"
          icon={<MdOutlineRotate90DegreesCw />}
          onClick={() => setRotate((r) => (r + 90) % 360)}
        />
      </div>
    </div>
  );
});

export default AvatarEditor;

function RotateButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-8 w-8 cursor-pointer items-center justify-center default-radius border border-gray-200 text-gray-500 transition-colors duration-200 hover:bg-gray-50 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]"
    >
      {icon}
    </button>
  );
}
