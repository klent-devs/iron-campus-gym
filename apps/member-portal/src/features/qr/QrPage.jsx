import { formatDate } from '@icg/shared';
import { Icon } from '../../components/Icon.jsx';
import { MemberQr, Pill, Screen } from '../../components/ui.jsx';
import { STATUS_WORD, useMemberInfo } from '../../lib/useMemberInfo.js';

/** My QR Code (docs/design/MQR.dc.html). Shown to the receptionist at the door. */
export function QrPage() {
  const { info } = useMemberInfo();
  const canEnter = info.status === 'active' || info.status === 'expiring_soon';
  return (
    <Screen title="My QR Code">
      <section className="mt-[18px] flex flex-col items-center rounded-[26px] border border-line bg-card p-[22px]">
        <MemberQr token={info.qrToken} />
        <h2 className="mt-[18px] font-heading text-[22px] font-bold">{info.name}</h2>
        <div className="mt-1 font-mono text-[16px] text-ink-soft">{info.code}</div>
        <Pill tone={info.status} className="mt-2.5 h-[30px] text-sm">
          {STATUS_WORD[info.status]}
          {canEnter && info.endDate ? ` · until ${formatDate(info.endDate)}` : ''}
        </Pill>
      </section>
      {!canEnter && (
        <p
          role="alert"
          className="mt-3.5 rounded-[18px] border border-danger/40 bg-danger/10 p-4 text-[15px] text-ink-soft"
        >
          {info.status === 'suspended'
            ? 'Your membership is suspended, so the code won’t let you in. Please talk to the front desk.'
            : 'Your code won’t let you in until you renew. Renew at the front desk.'}
        </p>
      )}
      <div className="mt-3.5 flex items-start gap-3 rounded-[18px] border border-brand/35 bg-brand/[0.08] p-4">
        <Icon name="info" className="flex-none text-brand-text" />
        <p className="text-[15px] leading-normal">
          Present your QR code to the receptionist when entering or leaving the gym.
        </p>
      </div>
      <p className="mx-1 mt-3 text-[13px] leading-normal text-ink-muted">
        Your code holds a secure ID only — no name, phone number or payment details. If your phone
        is lost, the gym can cancel this code and give you a new one.
      </p>
    </Screen>
  );
}
