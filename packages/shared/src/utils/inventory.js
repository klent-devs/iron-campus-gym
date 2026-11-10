import { STOCK_STATUS } from '../constants/inventory.js';

/**
 * Stock badge for an item: out of stock at 0, low at or below its reorder level.
 * @param {number} quantity
 * @param {number} reorderLevel
 */
export function stockStatus(quantity, reorderLevel) {
  if (quantity <= 0) return STOCK_STATUS.OUT_OF_STOCK;
  if (quantity <= reorderLevel) return STOCK_STATUS.LOW_STOCK;
  return STOCK_STATUS.IN_STOCK;
}
