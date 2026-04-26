export const formatCurrency = (p: { currency: string; amountTotal: number }) => {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: p.currency,
  });

  const fractionDigits = formatter.resolvedOptions().maximumFractionDigits ?? 0;

  return formatter.format(p.amountTotal / Math.pow(10, fractionDigits));
};
