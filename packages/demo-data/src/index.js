/**
 * @icg/demo-data — SAMPLE DATA KEPT IN THE BROWSER, NO DATABASE OR API.
 * The admin website and the member portal use this until the API is connected (milestone 8+).
 * See docs/demo-data.md.
 */
export * as actions from './actions.js';
export { DemoError, nextMemberCode, nextTxnNo, walkinMatch } from './actions.js';
export { ITEM_UNITS, STAFF_SEED } from './catalog.js';
export { buildDashboard } from './dashboard.js';
export { memberNotifications, reminderDate } from './notifications.js';
export { dayRecords, monthRevenue, syntheticDay } from './records.js';
export { DATA_VERSION, createSeed, gymTimestamp, periodText } from './seed.js';
export * from './selectors.js';
export { STORAGE_KEY, createDemoStore } from './store.js';
