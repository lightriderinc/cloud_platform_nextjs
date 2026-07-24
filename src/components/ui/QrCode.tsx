'use client';

import { QRCodeSVG } from 'qrcode.react';

/**
 * Renders a QR code as an inline SVG. Generation happens locally, so no secret
 * ever leaves the browser (unlike an image-API QR).
 *
 * Requires the `qrcode.react` dependency — run `npm install` after pulling.
 */
export default function QrCode({
  value,
  size = 176,
  className = '',
}: {
  value: string;
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={`inline-flex bg-white p-2 default-radius border border-gray-200 ${className}`}
    >
      <QRCodeSVG value={value} size={size} marginSize={0} />
    </div>
  );
}
