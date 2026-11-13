import { INVENTORY_CATEGORIES, STOCK_STATUS, formatPeso } from '@icg/shared';
import { itemsView } from '@icg/demo-data';
import { useEffect, useState } from 'react';
import {
  Button,
  EmptyState,
  FilterChips,
  Icon,
  INPUT,
  PageHeader,
  StatusBadge,
  inputBorder,
} from '../../components/ui/index.js';
import { isOwner, useDemoData, useStaff } from '../../lib/demo.js';

/** "Bottled Water, Whey Sachet and Disinfectant" */
const listNames = (items) => {
  const names = items.map((i) => i.name);
  return names.length <= 1
    ? names.join('')
    : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
};

const QTY_TONE = {
  [STOCK_STATUS.OUT_OF_STOCK]: 'text-danger-text',
  [STOCK_STATUS.LOW_STOCK]: 'text-[#FF7A50]',
  [STOCK_STATUS.IN_STOCK]: 'text-ink',
};

/**
 * Inventory (docs/design/Inventory.dc.html): products and supplies with stock alerts.
 * Gym machines and weights are not tracked here (CLAUDE.md). Quantities only change through
 * Stock In / Stock Out, which keeps a history.
 */
export function InventoryPage() {
  const data = useDemoData();
  const owner = isOwner(useStaff());
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');

  useEffect(() => {
    document.title = 'Inventory · IRON CAMPUS GYM';
  }, []);

  const items = itemsView(data);
  const low = items.filter((i) => i.status === STOCK_STATUS.LOW_STOCK);
  const out = items.filter((i) => i.status === STOCK_STATUS.OUT_OF_STOCK);
  const q = query.trim().toLowerCase();
  const rows = items
    .filter((i) => category === 'All' || i.category === category)
    .filter((i) => !q || i.name.toLowerCase().includes(q))
    .sort((a, b) => {
      const rank = { out_of_stock: 0, low_stock: 1, in_stock: 2 };
      return rank[a.status] - rank[b.status] || a.name.localeCompare(b.name);
    });

  const tile = (label, value, tone = '') => (
    <div
      className={`rounded-card border bg-card px-5 py-[18px] ${
        tone === 'low' ? 'border-brand/50' : tone === 'out' ? 'border-danger/50' : 'border-line'
      }`}
    >
      <span className="text-sm text-ink-muted">{label}</span>
      <b
        className={`mt-1 block font-heading text-[30px] ${
          tone === 'low' ? 'text-[#FF7A50]' : tone === 'out' ? 'text-danger-text' : ''
        }`}
      >
        {value}
      </b>
    </div>
  );

  return (
    <>
      <PageHeader
        title="Inventory"
        subtitle="Drinks, supplements and supplies. Gym machines and weights are not listed here."
        actions={
          <>
            <Button to="/inventory/stock?mode=out" variant="plain" icon="arrowDown">
              Stock Out
            </Button>
            <Button to="/inventory/stock?mode=in" variant="plain" icon="arrowUp">
              Add Stock
            </Button>
            {owner && (
              <Button to="/inventory/stock?new=1" variant="plainPrimary">
                + Add Item
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 min-[1100px]:grid-cols-4">
        {tile('Total Items', items.length)}
        {tile(
          'Available Stock',
          <>
            {items.reduce((s, i) => s + i.quantity, 0).toLocaleString('en-PH')}{' '}
            <span className="font-sans text-[15px] font-medium text-ink-muted">pcs</span>
          </>,
        )}
        {tile('Low Stock', low.length, 'low')}
        {tile('Out of Stock', out.length, 'out')}
      </div>

      {(out.length > 0 || low.length > 0) && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 rounded-[14px] border border-danger/40 bg-danger/[0.08] px-[18px] py-3.5"
        >
          <Icon name="alert" className="text-danger-text" />
          <span className="min-w-0 flex-1 text-[15px]">
            {out.length > 0 && (
              <b className="text-danger-text">
                {listNames(out)} {out.length === 1 ? 'is' : 'are'} out of stock.
              </b>
            )}{' '}
            {low.length > 0 && `${listNames(low)} ${low.length === 1 ? 'is' : 'are'} running low.`}
          </span>
          <Button size="sm" to={`/inventory/stock?mode=in&item=${(out[0] ?? low[0]).id}`}>
            Add Stock
          </Button>
        </div>
      )}

      <section className="overflow-hidden rounded-card border border-line bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
          <FilterChips
            label="Category"
            value={category}
            onChange={setCategory}
            options={['All', ...INVENTORY_CATEGORIES].map((c) => ({ value: c, label: c }))}
          />
          <label className="relative">
            <span className="sr-only">Search items</span>
            <Icon
              name="search"
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search items"
              className={`${INPUT} ${inputBorder()} h-11 w-[220px] pl-9 text-sm`}
            />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-sm">
            <thead>
              <tr className="bg-card-2 text-left text-[13px] text-ink-muted">
                <th className="px-4 py-3.5 font-semibold">Item Name</th>
                <th className="px-4 py-3.5 font-semibold">Category</th>
                <th className="px-4 py-3.5 font-semibold">Quantity</th>
                <th className="px-4 py-3.5 text-right font-semibold">Cost Price</th>
                <th className="px-4 py-3.5 text-right font-semibold">Selling Price</th>
                <th className="px-4 py-3.5 font-semibold">Stock Status</th>
                <th className="px-4 py-3.5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((i) => (
                <tr key={i.id} className="transition-colors hover:bg-brand/10">
                  <td className="border-t border-line px-4 py-3 font-semibold">{i.name}</td>
                  <td className="whitespace-nowrap border-t border-line px-4 py-3 text-ink-soft">
                    {i.category}
                  </td>
                  <td className="whitespace-nowrap border-t border-line px-4 py-3">
                    <b className={`text-[15px] ${QTY_TONE[i.status]}`}>{i.quantity}</b>{' '}
                    <span className="text-ink-muted">{i.unit}</span>
                  </td>
                  <td className="whitespace-nowrap border-t border-line px-4 py-3 text-right text-ink-soft">
                    {formatPeso(i.costPrice)}
                  </td>
                  <td className="whitespace-nowrap border-t border-line px-4 py-3 text-right">
                    {i.sellingPrice === null ? '—' : formatPeso(i.sellingPrice)}
                  </td>
                  <td className="border-t border-line px-4 py-3">
                    <StatusBadge tone={i.tone}>{i.statusLabel}</StatusBadge>
                  </td>
                  <td className="whitespace-nowrap border-t border-line px-4 py-3 text-right">
                    <span className="inline-flex gap-1.5">
                      <Button size="sm" to={`/inventory/stock?mode=in&item=${i.id}`}>
                        Stock In
                      </Button>
                      <Button size="sm" to={`/inventory/stock?mode=out&item=${i.id}`}>
                        Stock Out
                      </Button>
                      {owner && (
                        <Button size="sm" to={`/inventory/stock?edit=1&item=${i.id}`}>
                          Edit
                        </Button>
                      )}
                      <Button size="sm" to={`/inventory/stock?item=${i.id}#history`}>
                        History
                      </Button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <EmptyState
              compact
              icon="box"
              title="No items here"
              message="Try another category or search."
            />
          )}
        </div>
      </section>
    </>
  );
}
