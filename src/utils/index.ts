// Frontend utility functions placeholder

export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num);
}
