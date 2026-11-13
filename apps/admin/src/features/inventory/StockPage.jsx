import {
  INVENTORY_CATEGORIES,
  STOCK_MOVEMENT_TYPES,
  formatDate,
  formatTime,
  parsePeso,
  stockStatus,
} from '@icg/shared';
import {
  ITEM_UNITS,
  actions,
  dayOf,
  indexes,
  itemHistory,
  shortName,
  staffName,
} from '@icg/demo-data';
import { useEffect, useId, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Button,
  EmptyState,
  Label,
  PageHeader,
  TextField,
  Toast,
  useToast,
} from '../../components/ui/index.js';
import { isOwner, runAction, useDemoData, useStaff } from '../../lib/demo.js';
import { shake } from '../../lib/motion.js';
import { useToday } from '../../lib/useToday.js';
import { errorFields } from '../members/helpers.js';

const TYPES = {
  in: Object.entries(STOCK_MOVEMENT_TYPES).filter(([, t]) => t.direction > 0),
  out: Object.entries(STOCK_MOVEMENT_TYPES).filter(([, t]) => t.direction < 0),
};
const REMARK = {
  delivery: 'Supplier delivery · DR-',
  sold: 'Sold at front desk',
  used: 'Used by gym',
};

const blankItem = {
  name: '',
  category: INVENTORY_CATEGORIES[0],
  costPrice: '',
  sellingPrice: '',
  unit: 'pcs',
  reorderLevel: '10',
};
const itemForm = (item) =>
  item
    ? {
        name: item.name,
        category: item.category,
        costPrice: String(item.costPrice),
        sellingPrice: item.sellingPrice === null ? '' : String(item.sellingPrice),
        unit: item.unit,
        reorderLevel: String(item.reorderLevel),
      }
    : blankItem;

/**
 * Add Item & Update Stock (docs/design/StockMovement.dc.html): add or edit an item (Owner),
 * Stock In / Stock Out with the stock after saving, and the item's history.
 * Address: ?item=<id>&mode=in|out, ?new=1 for a new item, ?edit=1 to start on the item form.
 */
export function StockPage() {
  const data = useDemoData();
  const staff = useStaff();
  const owner = isOwner(staff);
  const today = useToday();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const ids = {
    name: useId(),
    cat: useId(),
    cost: useId(),
    price: useId(),
    unit: useId(),
    warn: useId(),
    item: useId(),
    type: useId(),
    qty: useId(),
    date: useId(),
    remarks: useId(),
  };
  const ix = indexes(data);
  const isNew = params.get('new') === '1';
  const item = ix.item.get(params.get('item')) ?? (isNew ? null : data.items[0]);
  const [mode, setMode] = useState(params.get('mode') === 'out' ? 'out' : 'in');
  const [type, setType] = useState(TYPES[mode][0][0]);
  const [qty, setQty] = useState(mode === 'in' ? 12 : 1);
  const [date, setDate] = useState(today);
  const [remarks, setRemarks] = useState(REMARK[TYPES[mode][0][0]] ?? '');
  const [moveError, setMoveError] = useState('');
  const [form, setForm] = useState(() => itemForm(isNew ? null : item));
  const [itemErrors, setItemErrors] = useState({});
  const [toast, showToast, hideToast] = useToast();

  useEffect(() => {
    document.title = 'Items & Stock · IRON CAMPUS GYM';
  }, []);
  // A different item (or "new") was picked: refill the item form.
  const itemKey = isNew ? 'new' : item?.id;
  const [formFor, setFormFor] = useState(itemKey);
  if (formFor !== itemKey) {
    setFormFor(itemKey);
    setForm(itemForm(isNew ? null : item));
    setItemErrors({});
  }
  useEffect(() => {
    if (window.location.hash === '#history') document.getElementById('history')?.scrollIntoView();
    if (params.get('edit') === '1' || isNew) document.getElementById(ids.name)?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickItem = (id) => {
    const next = new URLSearchParams(params);
    next.set('item', id);
    next.delete('new');
    setParams(next, { replace: true });
    setMoveError('');
  };
  const switchMode = (m) => {
    setMode(m);
    const first = TYPES[m][0][0];
    setType(first);
    setRemarks(REMARK[first] ?? '');
    setQty(m === 'in' ? 12 : 1);
    setMoveError('');
  };

  const change = (mode === 'in' ? 1 : -1) * (Number(qty) || 0);
  const after = item ? item.quantity + change : 0;
  const tooMany = item && after < 0;

  function saveItem(e) {
    e.preventDefault();
    const num = (v) => {
      const n = parsePeso(v);
      return Number.isNaN(n) ? v : n;
    };
    try {
      const { item: saved } = runAction(actions.saveItem, {
        id: isNew ? undefined : item?.id,
        name: form.name,
        category: form.category,
        unit: form.unit,
        costPrice: num(form.costPrice),
        sellingPrice: form.sellingPrice.trim() === '' ? null : num(form.sellingPrice),
        reorderLevel: form.reorderLevel,
      });
      showToast({
        title: isNew ? 'Item added' : 'Changes saved',
        body: isNew
          ? `${saved.name} starts at 0. Use Stock In to add the delivery.`
          : `${saved.name} is updated.`,
      });
      if (isNew) {
        pickItem(saved.id);
        switchMode('in');
      }
    } catch (err) {
      const f = errorFields(err);
      if (f.costPrice) f.costPrice = 'Enter the cost, like 9.50';
      if (f.sellingPrice) f.sellingPrice = 'Enter the price, or leave it empty if not for sale';
      if (f.reorderLevel) f.reorderLevel = 'Enter a whole number';
      setItemErrors(f);
      shake(document.getElementById(ids.name)?.closest('section'));
    }
  }

  function saveMovement(e) {
    e.preventDefault();
    if (!item) return;
    try {
      const { quantity } = runAction(actions.moveStock, {
        itemId: item.id,
        type,
        quantity: Number(qty),
        movementDate: date,
        remarks,
      });
      setMoveError('');
      showToast({
        title: mode === 'in' ? 'Stock added' : 'Stock removed',
        body: `${item.name}: ${item.quantity} → ${quantity} ${item.unit}.`,
      });
    } catch (err) {
      setMoveError(err.message);
      shake(document.getElementById(ids.qty));
    }
  }

  const history = item ? itemHistory(data, item.id) : [];
  const afterTone = tooMany
    ? 'text-danger-text'
    : stockStatus(after, item?.reorderLevel ?? 0) === 'out_of_stock'
      ? 'text-danger-text'
      : stockStatus(after, item?.reorderLevel ?? 0) === 'low_stock'
        ? 'text-[#FF7A50]'
        : 'text-success-text';
  const setF = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (itemErrors[k]) setItemErrors((x) => ({ ...x, [k]: undefined }));
  };

  return (
    <>
      <PageHeader
        title="Add Item & Update Stock"
        crumbs={[{ to: '/inventory', label: 'Inventory' }, { label: 'Items & Stock' }]}
      />
      <div className="flex flex-wrap items-start gap-4">
        <section className="w-full rounded-card border border-line bg-card p-[22px] lg:w-auto lg:flex-[1_1_400px]">
          <h2 className="text-[19px] font-semibold">Add / Edit Item</h2>
          <p className="mb-[18px] mt-1 text-sm text-ink-muted">
            {isNew ? 'New item' : `Editing: ${item?.name ?? '—'}`}
          </p>
          {owner ? (
            <form noValidate onSubmit={saveItem} className="flex flex-col gap-3.5">
              <TextField
                id={ids.name}
                label="Item Name"
                value={form.name}
                onChange={setF('name')}
                error={itemErrors.name}
              />
              <TextField
                id={ids.cat}
                as="select"
                label="Category"
                value={form.category}
                onChange={setF('category')}
              >
                {INVENTORY_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </TextField>
              <div className="grid grid-cols-2 gap-3.5">
                <TextField
                  id={ids.cost}
                  label="Cost Price (₱)"
                  inputMode="decimal"
                  value={form.costPrice}
                  onChange={setF('costPrice')}
                  error={itemErrors.costPrice}
                />
                <TextField
                  id={ids.price}
                  label="Selling Price (₱)"
                  inputMode="decimal"
                  placeholder="Not for sale"
                  value={form.sellingPrice}
                  onChange={setF('sellingPrice')}
                  error={itemErrors.sellingPrice}
                />
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <TextField
                  id={ids.unit}
                  as="select"
                  label="Unit"
                  value={form.unit}
                  onChange={setF('unit')}
                >
                  {[...new Set([...ITEM_UNITS, form.unit])].map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </TextField>
                <TextField
                  id={ids.warn}
                  label="Warn me when below"
                  inputMode="numeric"
                  value={form.reorderLevel}
                  onChange={setF('reorderLevel')}
                  error={itemErrors.reorderLevel}
                />
              </div>
              {itemErrors._ && <p className="text-sm text-danger-text">{itemErrors._}</p>}
              <div className="mt-1 flex flex-wrap justify-end gap-2.5">
                {isNew ? (
                  <Button onClick={() => navigate('/inventory')}>Cancel</Button>
                ) : (
                  <Button
                    onClick={() => {
                      const next = new URLSearchParams(params);
                      next.set('new', '1');
                      next.delete('item');
                      setParams(next, { replace: true });
                    }}
                  >
                    + New Item
                  </Button>
                )}
                <Button type="submit" variant="primary">
                  {isNew ? 'Add Item' : 'Save Changes'}
                </Button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-ink-muted">
              Only the Owner can add items or change prices. You can still add or remove stock on
              the right.
            </p>
          )}
        </section>

        <section className="w-full rounded-card border border-brand bg-card p-[22px] lg:w-auto lg:flex-[1.2_1_440px]">
          <h2 className="text-[19px] font-semibold">Stock In / Stock Out</h2>
          <div
            role="group"
            aria-label="Movement"
            className="mt-4 flex rounded-[14px] border border-line bg-sidebar p-1"
          >
            {[
              ['in', 'Stock In'],
              ['out', 'Stock Out'],
            ].map(([m, label]) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => switchMode(m)}
                className={`h-12 flex-1 rounded-[10px] text-[15px] transition-colors ${
                  mode === m
                    ? 'bg-brand font-bold text-ink'
                    : 'font-semibold text-ink-muted hover:text-ink'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {data.items.length === 0 ? (
            <p className="mt-4 text-sm text-ink-muted">Add an item first.</p>
          ) : (
            <form noValidate onSubmit={saveMovement} className="mt-4 flex flex-col gap-3.5">
              <TextField
                id={ids.item}
                as="select"
                label="Select Item"
                value={item?.id ?? ''}
                onChange={(e) => pickItem(e.target.value)}
              >
                {isNew && <option value="">Pick an item…</option>}
                {[...data.items]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} — {i.quantity} {i.unit} left
                    </option>
                  ))}
              </TextField>
              <TextField
                id={ids.type}
                as="select"
                label="Movement Type"
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  setRemarks(REMARK[e.target.value] ?? '');
                }}
              >
                {TYPES[mode].map(([code, t]) => (
                  <option key={code} value={code}>
                    {t.label}
                  </option>
                ))}
              </TextField>
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div>
                  <Label htmlFor={ids.qty}>Quantity</Label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Decrease"
                      onClick={() => setQty((q) => Math.max(1, (Number(q) || 1) - 1))}
                      className="h-[50px] w-12 flex-none rounded-btn border border-line bg-card-2 text-[20px] font-bold hover:bg-line"
                    >
                      −
                    </button>
                    <input
                      id={ids.qty}
                      inputMode="numeric"
                      value={qty}
                      onChange={(e) => setQty(e.target.value.replace(/\D/g, ''))}
                      className={`h-[50px] w-full min-w-0 rounded-btn border bg-sidebar text-center text-[18px] font-bold outline-none focus-visible:ring-0 focus-visible:ring-offset-0 ${
                        tooMany ? 'border-danger' : 'border-line focus:border-brand'
                      }`}
                    />
                    <button
                      type="button"
                      aria-label="Increase"
                      onClick={() => setQty((q) => (Number(q) || 0) + 1)}
                      className="h-[50px] w-12 flex-none rounded-btn border border-line bg-card-2 text-[20px] font-bold hover:bg-line"
                    >
                      +
                    </button>
                  </div>
                </div>
                <TextField
                  id={ids.date}
                  label="Date"
                  type="date"
                  max={today}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <TextField
                id={ids.remarks}
                label="Remarks"
                hint="(optional)"
                placeholder={
                  mode === 'in' ? 'e.g. Supplier delivery · DR-55821' : 'e.g. Leaking bottles'
                }
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
              {item && (
                <div
                  className={`flex items-center justify-between rounded-btn border bg-card-2 px-4 py-3.5 ${
                    tooMany ? 'border-danger' : 'border-line'
                  }`}
                >
                  <span className="text-[15px] text-ink-soft">Stock after saving</span>
                  <span className="font-heading text-[20px] font-bold">
                    <span className="text-[#FF7A50]">{item.quantity}</span> →{' '}
                    <span className={afterTone}>
                      {tooMany ? '—' : after} {item.unit}
                    </span>
                  </span>
                </div>
              )}
              {(tooMany || moveError) && (
                <p role="alert" className="text-sm text-danger-text">
                  {tooMany
                    ? `You can’t remove more than the ${item.quantity} ${item.unit} in stock.`
                    : moveError}
                </p>
              )}
              <Button
                type="submit"
                variant="primary"
                className="h-[54px] text-[16px]"
                disabled={!item || tooMany}
              >
                {mode === 'in' ? 'Add Stock' : 'Remove Stock'}
              </Button>
            </form>
          )}
        </section>
      </div>

      <section id="history" className="rounded-card border border-line bg-card p-[22px]">
        <h2 className="text-[18px] font-semibold">Stock history · {item?.name ?? '—'}</h2>
        {history.length === 0 ? (
          <EmptyState compact icon="history" title="No stock changes yet" />
        ) : (
          <ul className="mt-3">
            {history.slice(0, 40).map((h) => (
              <li
                key={h.id}
                className="flex flex-wrap items-center gap-x-3.5 gap-y-1 border-t border-line py-3 text-sm"
              >
                <b
                  className={`w-12 font-heading text-[15px] ${
                    h.quantity > 0
                      ? 'text-success-text'
                      : h.quantity < 0
                        ? 'text-danger-text'
                        : 'text-ink-muted'
                  }`}
                >
                  {h.quantity > 0 ? `+${h.quantity}` : h.quantity < 0 ? `−${-h.quantity}` : '±0'}
                </b>
                <span className="min-w-0 flex-1">
                  {STOCK_MOVEMENT_TYPES[h.type]?.label ?? h.type}
                  {h.remarks && <span className="text-ink-muted"> · {h.remarks}</span>}
                </span>
                <span className="text-ink-muted">{shortName(staffName(data, h.staffId))}</span>
                <span className="w-[130px] text-right text-ink-muted">
                  {formatDate(h.date).slice(0, 6)}
                  {dayOf(h.at) === h.date && `, ${formatTime(h.at)}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <Toast toast={toast} onClose={hideToast} />
    </>
  );
}
