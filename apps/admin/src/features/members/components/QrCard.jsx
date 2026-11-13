import { LogoMark } from '../../../assets/Logo.jsx';
import { QrCode } from '../../../components/ui/index.js';

/**
 * Printed member card (ID-card size, 85.6 × 54 mm): logo, name, Member ID and the QR code.
 * Print with usePrint(): `print(<QrCardPrint member={m} />, QR_CARD_PAGE)`.
 */
export function QrCardPrint({ member, gymName = 'IRON CAMPUS GYM' }) {
  return (
    <div
      style={{
        width: '85.6mm',
        height: '54mm',
        boxSizing: 'border-box',
        border: '1px solid #bbb',
        borderRadius: '3mm',
        padding: '4mm',
        display: 'flex',
        gap: '4mm',
        alignItems: 'center',
        fontFamily: 'Inter, sans-serif',
        color: '#090A0C',
        background: '#fff',
      }}
    >
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2mm' }}>
          <LogoMark size={22} bar="#090A0C" />
          <b style={{ font: '800 10px Poppins, sans-serif', letterSpacing: '0.04em' }}>{gymName}</b>
        </div>
        <div style={{ flex: 1 }} />
        <b style={{ font: '700 13px Poppins, sans-serif', display: 'block' }}>{member.name}</b>
        <div style={{ font: '11px ui-monospace, Menlo, monospace', marginTop: '1mm' }}>
          {member.code}
        </div>
        <div style={{ fontSize: 8, color: '#52525B', marginTop: '2mm' }}>
          Show this code at the front desk when you come in and when you leave.
        </div>
      </div>
      <QrCode token={member.qrToken} size={150} title={`QR code for ${member.name}`} />
    </div>
  );
}

export const QR_CARD_PAGE = { page: 'A4', margin: '15mm' };
