export const formatCurrency = (p: { currency: string; amount: number }) => {
  try {
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: p.currency,
    });

    const fractionDigits = formatter.resolvedOptions().maximumFractionDigits ?? 0;

    return formatter.format(p.amount / Math.pow(10, fractionDigits));
  } catch (error) {
    console.log(`currencyUtils.ts:${/*LL*/ 12}`, error);
    return;
  }
};
