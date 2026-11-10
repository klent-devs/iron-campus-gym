export const INVENTORY_CATEGORIES = Object.freeze([
  'Drinks and Beverages',
  'Protein Products',
  'Gym Supplies',
  'Cleaning Materials',
  'Other Products',
]);

/** Positive movements add stock, negative movements remove it. */
export const STOCK_MOVEMENT_TYPES = Object.freeze({
  delivery: { label: 'Delivery from supplier', direction: 1 },
  return: { label: 'Returned by customer', direction: 1 },
  count_add: { label: 'Count correction (add)', direction: 1 },
  sold: { label: 'Sold', direction: -1 },
  used: { label: 'Used by gym', direction: -1 },
  damaged: { label: 'Damaged / expired', direction: -1 },
  count_remove: { label: 'Count correction (remove)', direction: -1 },
});

export const STOCK_MOVEMENT_TYPE_LIST = Object.keys(STOCK_MOVEMENT_TYPES);

export const STOCK_STATUS = Object.freeze({
  IN_STOCK: 'in_stock',
  LOW_STOCK: 'low_stock',
  OUT_OF_STOCK: 'out_of_stock',
});

export const STOCK_STATUS_LABELS = Object.freeze({
  in_stock: 'In Stock',
  low_stock: 'Low Stock',
  out_of_stock: 'Out of Stock',
});
