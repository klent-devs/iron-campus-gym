import { computeChange, formatPeso, parsePeso } from '@icg/shared';
import { useId } from 'react';
import { Label, OptionGroup, TextField } from '../../../components/ui/index.js';
import { isOwner, useDemoData, useStaff } from '../../../lib/demo.js';

export const METHOD_ICONS = Object.freeze({
  cash: 'cash',
  gcash: 'phone',
  bank_transfer: 'bank',
  card: 'card',
});

/** Payment methods the owner has turned on (Settings → Payment Methods). */
export function useEnabledMethods() {
  return useDemoData().paymentMethods.filter((m) => m.enabled);
}

/** Starting values for <PaymentFields>. */
export const emptyPayment = (method = 'cash') => ({ method, received: '', referenceNo: '' });

/**
 * What the action needs: `{ paymentMethodCode, amount, amountReceived, referenceNo }`.
 * An empty "Amount received" means the exact amount.
 */
export function paymentInput(value, amount) {
  const received = value.received.trim() === '' ? amount : parsePeso(value.received);
  return {
    paymentMethodCode: value.method,
    amount,
    amountReceived: value.method === 'cash' ? (Number.isNaN(received) ? -1 : received) : undefined,
    referenceNo: value.method === 'cash' ? null : value.referenceNo.trim() || null,
  };
}

/**
 * Payment method buttons, then "Amount received" with the change to give (cash) or the reference
 * number (GCash, bank transfer, card). Bank transfers wait for the owner to confirm.
 * @param {{ value: { method, received, referenceNo }, onChange: (v) => void, amount: number,
 *           errors?: object }} props
 */
export function PaymentFields({ value, onChange, amount, errors = {} }) {
  const ids = { method: useId(), received: useId(), ref: useId() };
  const methods = useEnabledMethods();
  const owner = isOwner(useStaff());
  const method = methods.find((m) => m.code === value.method) ?? methods[0];
  const set = (patch) => onChange({ ...value, ...patch });
  const received = value.received.trim() === '' ? amount : parsePeso(value.received);
  const change = Number.isNaN(received) ? 0 : computeChange(amount, received);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label id={ids.method}>Payment Method</Label>
        <OptionGroup
          labelId={ids.method}
          value={method?.code}
          onChange={(code) => set({ method: code })}
          options={methods.map((m) => ({
            value: m.code,
            label: m.name,
            icon: METHOD_ICONS[m.code] ?? 'wallet',
          }))}
        />
      </div>
      {method?.code === 'cash' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            id={ids.received}
            label="Amount Received (₱)"
            inputMode="decimal"
            placeholder={amount.toFixed(2)}
            value={value.received}
            onChange={(e) => set({ received: e.target.value })}
            error={errors.amountReceived}
          />
          <div className="flex flex-col justify-end">
            <div className="flex h-[50px] items-center justify-between rounded-btn bg-card-2 px-4">
              <span className="text-ink-soft">Change to give</span>
              <b className="font-heading text-[20px] text-success-text">{formatPeso(change)}</b>
            </div>
          </div>
        </div>
      ) : (
        method && (
          <div>
            <TextField
              id={ids.ref}
              label={`${method.name} Reference No.`}
              hint={method.requiresReference ? undefined : '(optional)'}
              placeholder={
                method.code === 'gcash'
                  ? '13-digit reference from the customer’s screen'
                  : 'Reference number'
              }
              value={value.referenceNo}
              onChange={(e) => set({ referenceNo: e.target.value })}
              error={errors.referenceNo}
              className="max-w-[420px]"
            />
            {method.needsOwnerConfirmation && !owner && (
              <p className="mt-2 rounded-btn border border-warning/35 bg-warning/[0.08] px-3.5 py-2.5 text-sm text-ink-soft">
                Saved as <b className="text-warning-text">Pending</b> until the Owner checks the
                transfer. The membership starts once it is confirmed.
              </p>
            )}
          </div>
        )
      )}
    </div>
  );
}
