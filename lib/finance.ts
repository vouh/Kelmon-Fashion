/**
 * The money maths for the admin Finance page, in one place so every row,
 * inventory and page total agrees.
 *
 *   profit per piece   = sell price − buy price
 *   invested           = buy price × quantity bought
 *   expected revenue   = sell price × quantity bought
 *   expected profit    = profit per piece × quantity bought
 *   revenue (actual)   = sell price × pieces sold
 *   profit (actual)    = profit per piece × pieces sold
 *   net cash           = revenue − invested (negative until the stock pays for itself)
 *   stock value left   = buy price × pieces still unsold
 */

export interface PricedLine {
  buy_price: number;
  sell_price: number;
  quantity: number;
  sold: number;
}

export interface FinanceTotals {
  invested: number;
  expectedRevenue: number;
  expectedProfit: number;
  revenue: number;
  profit: number;
  netCash: number;
  stockValueLeft: number;
  pieces: number;
  sold: number;
}

export function lineTotals(line: PricedLine): FinanceTotals {
  const perPiece = line.sell_price - line.buy_price;
  const invested = line.buy_price * line.quantity;
  const revenue = line.sell_price * line.sold;
  return {
    invested,
    expectedRevenue: line.sell_price * line.quantity,
    expectedProfit: perPiece * line.quantity,
    revenue,
    profit: perPiece * line.sold,
    netCash: revenue - invested,
    stockValueLeft: line.buy_price * (line.quantity - line.sold),
    pieces: line.quantity,
    sold: line.sold,
  };
}

export const EMPTY_TOTALS: FinanceTotals = {
  invested: 0,
  expectedRevenue: 0,
  expectedProfit: 0,
  revenue: 0,
  profit: 0,
  netCash: 0,
  stockValueLeft: 0,
  pieces: 0,
  sold: 0,
};

export function sumTotals(lines: PricedLine[]): FinanceTotals {
  return lines.map(lineTotals).reduce(
    (sum, t) => ({
      invested: sum.invested + t.invested,
      expectedRevenue: sum.expectedRevenue + t.expectedRevenue,
      expectedProfit: sum.expectedProfit + t.expectedProfit,
      revenue: sum.revenue + t.revenue,
      profit: sum.profit + t.profit,
      netCash: sum.netCash + t.netCash,
      stockValueLeft: sum.stockValueLeft + t.stockValueLeft,
      pieces: sum.pieces + t.pieces,
      sold: sum.sold + t.sold,
    }),
    EMPTY_TOTALS
  );
}

/** Profit as a share of the money put in, e.g. 40 for 40%. */
export function marginPercent(profit: number, invested: number): number | null {
  return invested > 0 ? Math.round((profit / invested) * 100) : null;
}

/** Default inventory name from its purchase day: "Monday 15 May 2026". */
export function inventoryNameFor(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const weekday = date.toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" });
  const rest = date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return `${weekday} ${rest}`;
}
