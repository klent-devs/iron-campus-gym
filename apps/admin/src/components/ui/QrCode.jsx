import qrcode from 'qrcode-generator';
import { useMemo } from 'react';
import { buildQrPayload } from '@icg/shared';

/**
 * A member's QR code: black squares on white, readable by the scanner (camera or USB).
 * It holds only `ICG:<token>`, never personal data (CLAUDE.md gym rule).
 * @param {{ token: string, size?: number, title?: string }} props
 */
export function QrCode({ token, size = 160, title = 'Member QR code' }) {
  const path = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(buildQrPayload(token));
    qr.make();
    const n = qr.getModuleCount();
    let d = '';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
    }
    return { d, n };
  }, [token]);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`-2 -2 ${path.n + 4} ${path.n + 4}`}
      role="img"
      aria-label={title}
      shapeRendering="crispEdges"
      className="block rounded-[4px] bg-white"
    >
      <rect x="-2" y="-2" width={path.n + 4} height={path.n + 4} fill="#fff" />
      <path d={path.d} fill="#090A0C" />
    </svg>
  );
}
