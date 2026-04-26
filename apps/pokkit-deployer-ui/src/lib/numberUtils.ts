export function formatPositiveNegativeNumber(amount: number): string {
  const internationalisedAmount = new Intl.NumberFormat("en-US").format(Math.abs(amount));

  return `${amount >= 0 ? "+" : "-"}${internationalisedAmount}`;
}
