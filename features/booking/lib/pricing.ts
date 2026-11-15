export const DEFAULT_PRICE_PER_HOUR = 50_000;

export function normalizePricePerHour(value: unknown): number {
  const price = Number(value);
  return Number.isFinite(price) && price > 0 ? price : DEFAULT_PRICE_PER_HOUR;
}

export function calculateTotal(
  startTime: number,
  endTime: number,
  pricePerHour: number
): number {
  if (startTime >= endTime) {
    throw new Error("Jam selesai harus setelah jam mulai");
  }
  return (endTime - startTime) * normalizePricePerHour(pricePerHour);
}
