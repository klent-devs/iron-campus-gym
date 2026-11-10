import pg from 'pg';

// Keep DATE columns (start_date, end_date, visit_date…) as 'YYYY-MM-DD' strings, the format the
// @icg/shared date helpers use. By default pg turns them into JS Dates at local midnight, which
// shifts the day depending on the PC's timezone.
const PG_DATE_OID = 1082;
pg.types.setTypeParser(PG_DATE_OID, (value) => value);
