/**
 * Order numbers.
 *
 * New orders: `P001-20260930-01` — the priciest item's product code, the date
 * (Nairobi, YYYYMMDD) and that day's running number, made by the
 * next_order_id() database function. Orders from before product codes keep
 * their `KM-XXXXXX` numbers, so both shapes are valid everywhere.
 */
export const ORDER_ID_PATTERN = /^(?:KM-[A-Z0-9]{4,20}|[A-Z]{1,3}[0-9]{0,7}-[0-9]{8}-[0-9]{2,5})$/;

export function isOrderId(value: unknown): value is string {
  return typeof value === "string" && ORDER_ID_PATTERN.test(value);
}
