import { z } from 'zod';
import { INVENTORY_CATEGORIES, STOCK_MOVEMENT_TYPE_LIST } from '../constants/inventory.js';
import { isoDate, money, optionalText, uuid } from './common.js';

export const inventoryItemSchema = z.object({
  name: z.string().trim().min(2, 'Item name is required').max(120),
  category: z.enum(INVENTORY_CATEGORIES),
  unit: z.string().trim().min(1).max(20).default('pcs'),
  costPrice: money,
  sellingPrice: money.nullable().optional(),
  reorderLevel: z.coerce.number().int().min(0).default(0),
});

export const stockMovementSchema = z.object({
  itemId: uuid,
  type: z.enum(STOCK_MOVEMENT_TYPE_LIST),
  quantity: z.coerce.number().int().positive('Quantity must be at least 1'),
  movementDate: isoDate,
  remarks: optionalText(255),
});
