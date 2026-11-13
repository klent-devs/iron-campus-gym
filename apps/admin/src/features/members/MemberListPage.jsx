import { formatDate } from '@icg/shared';
import { STATUS_TONE, memberMatches, membersView } from '@icg/demo-data';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Avatar,
  Button,
  EmptyState,
  FilterChips,
  Icon,
  PageHeader,
  Pagination,
  StatusBadge,
} from '../../components/ui/index.js';
import { useDemoData } from '../../lib/demo.js';
import { useToday } from '../../lib/useToday.js';
import { STATUS_FILTERS, formatPhone } from './helpers.js';

const PAGE_SIZE = 25;

/**
 * Member list (docs/design/Members.dc.html): search by name, Member ID or mobile number, filter by
 * status, open a profile or renew. `?status=` and `?q=` in the address set the filters (the
 * Dashboard alerts and the top bar search use them).
 */
export function MemberListPage() {
  const data = useDemoData();
  const today = useToday();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? 'all';
  const [query, setQuery] = useState(params.get('q') ?? '');
  const [page, setPage] = useState(1);

  useEffect(() => {
    document.title = 'Members · IRON CAMPUS GYM';
  }, []);
  // The top bar search can change ?q= while this page is open.
  const urlQuery = params.get('q') ?? '';
  const [queryFromUrl, setQueryFromUrl] = useState(urlQuery);
  if (queryFromUrl !== urlQuery) {
    setQueryFromUrl(urlQuery);
    setQuery(urlQuery);
    setPage(1);
  }

  const members = membersView(data, today);
  const searched = useMemo(() => members.filter((m) => memberMatches(m, query)), [members, query]);
  const counts = useMemo(() => {
    const c = { all: searched.length };
    for (const m of searched) c[m.status] = (c[m.status] ?? 0) + 1;
    return c;
  }, [searched]);
  const rows = status === 'all' ? searched : searched.filter((m) => m.status === status);
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const setStatus = (value) => {
    const next = new URLSearchParams(params);
    if (value === 'all') next.delete('status');
    else next.set('status', value);
    setParams(next, { replace: true });
    setPage(1);
  };

  return (
    <>
      <PageHeader
        title="Members"
        subtitle="Manage your registered gym members."
        actions={
          <>
            <Button to="/members/plans" variant="plain">
              Membership Plans
            </Button>
            <Button to="/members/renew" variant="plain">
              Renew Membership
            </Button>
            <Button to="/members/new" variant="plainPrimary">
              + Add New Member
            </Button>
          </>
        }
      />

      <section className="overflow-hidden rounded-card border border-line bg-card motion-safe:animate-rise">
        <div className="flex flex-wrap items-center gap-3 p-4">
          <label className="flex h-[46px] min-w-0 max-w-[380px] flex-[1_1_280px] items-center gap-2.5 rounded-btn border border-line bg-sidebar px-3.5 text-ink-muted focus-within:border-brand">
            <Icon name="search" size={18} />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              aria-label="Search member"
              placeholder="Search Member — name, ID or mobile no."
              className="min-w-0 flex-1 border-0 bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </label>
          <FilterChips
            label="Filter by membership status"
            value={status}
            onChange={setStatus}
            options={STATUS_FILTERS.map((f) => ({ ...f, count: counts[f.value] ?? 0 }))}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead>
              <tr className="bg-card-2 text-left text-[13px] text-ink-muted">
                <th className="px-4 py-3.5 font-semibold">Member ID</th>
                <th className="px-4 py-3.5 font-semibold">Member Name</th>
                <th className="px-4 py-3.5 font-semibold">Contact Number</th>
                <th className="px-4 py-3.5 font-semibold">Membership Plan</th>
                <th className="px-4 py-3.5 font-semibold">Expiration Date</th>
                <th className="px-4 py-3.5 font-semibold">Status</th>
                <th className="px-4 py-3.5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((m) => (
                <tr key={m.id} className="transition-colors hover:bg-brand/10">
                  <td className="whitespace-nowrap border-t border-line px-4 py-3 font-mono text-[13px] text-ink-soft">
                    {m.code}
                  </td>
                  <td className="border-t border-line px-4 py-3">
                    <Link
                      to={`/members/${m.id}`}
                      className="flex items-center gap-3 hover:text-brand-text"
                    >
                      <Avatar name={m.name} />
                      <b className="font-semibold">{m.name}</b>
                    </Link>
                  </td>
                  <td className="whitespace-nowrap border-t border-line px-4 py-3 text-ink-soft">
                    {formatPhone(m.phone)}
                  </td>
                  <td className="whitespace-nowrap border-t border-line px-4 py-3">{m.plan}</td>
                  <td className="whitespace-nowrap border-t border-line px-4 py-3 text-ink-soft">
                    {formatDate(m.endDate)}
                  </td>
                  <td className="border-t border-line px-4 py-3">
                    <StatusBadge tone={STATUS_TONE[m.status]}>{m.statusLabel}</StatusBadge>
                  </td>
                  <td className="whitespace-nowrap border-t border-line px-4 py-3 text-right">
                    <span className="inline-flex gap-2">
                      <Button size="sm" to={`/members/${m.id}`}>
                        View
                      </Button>
                      <Button size="sm" to={`/members/renew?member=${m.id}`}>
                        Renew
                      </Button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <EmptyState
              icon="users"
              title={query ? 'No members found' : 'No members with this status'}
              message={
                query
                  ? `Nothing matches “${query}”. Check the spelling, or search by Member ID or mobile number.`
                  : 'Try another filter.'
              }
              action={
                query ? (
                  <Button onClick={() => setQuery('')}>Clear Search</Button>
                ) : (
                  <Button onClick={() => setStatus('all')}>Show All</Button>
                )
              }
            />
          )}
        </div>
        {rows.length > 0 && (
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={rows.length}
            onPage={setPage}
            noun="members"
          />
        )}
      </section>
    </>
  );
}
