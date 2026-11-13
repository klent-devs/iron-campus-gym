import { formatDate, formatDuration } from '@icg/shared';
import { useId, useState } from 'react';
import { Button } from '../../../components/ui/Button.jsx';
import { Icon } from '../../../components/ui/Icon.jsx';
import { Modal } from '../../../components/ui/Modal.jsx';
import { shake } from '../../../lib/motion.js';
import { FieldError, INPUT, Label, inputBorder } from '../../../components/ui/formParts.jsx';
import {
  FIX_REASONS,
  checkedInPhrase,
  dayOf,
  gymTimeToIso,
  suggestedTimeOut,
} from '../demoData.js';

/**
 * Fix missed check-out (docs/design/AttendanceRecords.dc.html): staff enter the real time out and
 * pick a reason. The time is on the same day as the check-in.
 * @param {{ checkIn: object, member: object, onClose: () => void,
 *           onSave: (timeOutIso: string, reason: string) => void }} props
 */
export function FixTimeOutModal({ checkIn, member, onClose, onSave }) {
  const ids = { time: useId(), reason: useId() };
  const day = dayOf(checkIn.timeIn);
  const [time, setTime] = useState(() => suggestedTimeOut(checkIn.timeIn));
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState({});

  const timeOutIso = /^\d{2}:\d{2}$/.test(time) ? gymTimeToIso(day, time) : null;
  const validTime = timeOutIso && timeOutIso > checkIn.timeIn && new Date(timeOutIso) <= new Date();

  function save(event) {
    event.preventDefault();
    const next = {};
    if (!timeOutIso) next.time = 'Enter the time they left.';
    else if (timeOutIso <= checkIn.timeIn) next.time = 'The time out must be after the time in.';
    else if (new Date(timeOutIso) > new Date()) next.time = 'The time out can’t be in the future.';
    if (!reason) next.reason = 'Choose a reason.';
    setErrors(next);
    if (next.time) shake(document.getElementById(ids.time));
    if (next.reason) shake(document.getElementById(ids.reason));
    if (Object.keys(next).length) return;
    onSave(timeOutIso, reason);
  }

  return (
    <Modal
      open
      onClose={onClose}
      showClose={false}
      title="Fix missed check-out"
      subtitle={`${member.name} · ${checkedInPhrase(checkIn.timeIn)}`}
    >
      <form noValidate onSubmit={save} className="flex flex-col gap-4 px-6 pb-6 pt-[18px]">
        <div>
          <Label htmlFor={ids.time} hint={`(on ${formatDate(day)})`}>
            Correct time out
          </Label>
          <input
            id={ids.time}
            type="time"
            value={time}
            onChange={(e) => {
              setTime(e.target.value);
              if (errors.time) setErrors((x) => ({ ...x, time: undefined }));
            }}
            aria-invalid={errors.time ? true : undefined}
            aria-describedby={errors.time ? `${ids.time}-err` : undefined}
            className={`${INPUT} ${inputBorder(errors.time)} [color-scheme:dark]`}
          />
          <FieldError id={`${ids.time}-err`}>{errors.time}</FieldError>
          {validTime && !errors.time && (
            <p className="mt-1.5 text-[13px] text-ink-muted">
              Stay: <b className="text-ink">{formatDuration(checkIn.timeIn, timeOutIso)}</b>
            </p>
          )}
        </div>

        <div>
          <Label htmlFor={ids.reason} hint="(required)">
            Reason
          </Label>
          <span className="relative block">
            <select
              id={ids.reason}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (errors.reason) setErrors((x) => ({ ...x, reason: undefined }));
              }}
              aria-invalid={errors.reason ? true : undefined}
              aria-describedby={errors.reason ? `${ids.reason}-err` : undefined}
              className={`${INPUT} ${inputBorder(errors.reason)} appearance-none pr-10 ${
                reason ? '' : 'text-ink-dim'
              }`}
            >
              <option value="" disabled>
                Choose a reason…
              </option>
              {FIX_REASONS.map((r) => (
                <option key={r} value={r} className="text-ink">
                  {r}
                </option>
              ))}
            </select>
            <Icon
              name="chevronDown"
              size={16}
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-soft"
            />
          </span>
          <FieldError id={`${ids.reason}-err`}>{errors.reason}</FieldError>
        </div>

        {/* TODO(auth): show the signed-in staff name; enforce the 48-hour rule on the API. */}
        <p className="text-[13px] text-ink-muted">
          Saved in the audit history under your name. Receptionists can fix the last 48 hours only.
        </p>

        <div className="mt-1 flex flex-wrap justify-end gap-2.5">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary">
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
