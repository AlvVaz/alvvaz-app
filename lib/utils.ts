export function cn(...classes: Array<string | undefined | null | false>) {
  return classes.filter(Boolean).join(" ");
}

export function formatPriceMXN(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

export function durationBucket(days: number) {
  if (days <= 5) return "3-5";
  if (days <= 8) return "6-8";
  return "9+";
}
