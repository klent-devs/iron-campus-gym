import { actions } from '@icg/demo-data';
import { formatTime } from '@icg/shared';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Avatar,
  Button,
  Card,
  CardHeader,
  EmptyState,
  StatusBadge,
} from '../../../components/ui/index.js';
import { runAction } from '../../../lib/demo.js';

/** How many people the card lists; "View all" opens the Attendance page for the rest. */
const SHOWN = 5;

/**
 * Receptionist Dashboard, beside Gym Capacity (in place of Revenue Analytics): members and
 * walk-ins inside right now, newest first, with Check Out. An unpaid walk-in gets Record Payment
 * instead, so nobody leaves without paying.
 * @param {{ inside: object[] }} props  `data.frontDesk.inside` from the Dashboard data
 */
export function InsideNowPanel({ inside }) {
  const [error, setError] = useState('');
  const shown = inside.slice(0, SHOWN);

  function checkOut(person) {
    setError('');
    try {
      if (person.kind === 'member') runAction(actions.checkOut, { checkInId: person.checkInId });
      else runAction(actions.completeVisit, { visitId: person.visitId });
    } catch (err) {
      setError(err.message || `Couldn't check out ${person.name}. Try again.`);
    }
  }

  return (
    <Card className="flex min-w-0 flex-[2.4_1_440px] flex-col" aria-labelledby="inside-now-title">
      <CardHeader
        id="inside-now-title"
        title="Who's Inside Now"
        subtitle={
          inside.length
            ? `Newest first · ${shown.length} of ${inside.length} shown`
            : 'Members and walk-ins in the gym'
        }
        actions={
          <Link
            to="/attendance"
            className="inline-flex min-h-touch items-center text-sm font-semibold text-brand-text hover:text-brand-text/80"
          >
            View all
          </Link>
        }
      />
      {error && (
        <p role="alert" className="mt-2 text-[13px] text-danger-text">
          {error}
        </p>
      )}
      {inside.length === 0 ? (
        <EmptyState
          compact
          className="flex-1"
          icon="users"
          title="Nobody inside yet"
          message="Members and walk-ins show up here when they check in."
        />
      ) : (
        <ul className="mt-2 list-none p-0">
          {shown.map((person) => (
            <li key={person.key} className="flex items-center gap-3.5 border-t border-line py-3">
              <Avatar
                name={person.name}
                size="md"
                className={person.kind === 'walkin' ? '!bg-brand/15 text-brand-text' : ''}
              />
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[15px] font-semibold">{person.name}</b>
                <span className="block truncate text-[13px] text-ink-muted">{person.detail}</span>
              </span>
              {person.unpaid && (
                <StatusBadge tone="bad" size="sm">
                  Unpaid
                </StatusBadge>
              )}
              <span className="w-[76px] whitespace-nowrap text-right text-[13px] text-success-text">
                <span aria-hidden="true">↘ </span>
                {formatTime(person.timeIn)}
              </span>
              {person.unpaid ? (
                <Button to="/walk-ins" size="sm" variant="primary">
                  Record Payment
                </Button>
              ) : (
                <Button size="sm" onClick={() => checkOut(person)}>
                  Check Out
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
