// Pure, client-safe expense filtering + sorting (no Node/Prisma imports — the
// pattern of src/lib/invoice-compute.ts / src/lib/tenancy.ts). The SAME logic
// powers the on-screen table and the PDF export route, so they can never drift.
// Money is integer paise; amount inputs are rupees strings from the UI.

export type ExpenseSort = "latest" | "oldest" | "highest" | "lowest";
export type ReceiptFilter = "any" | "yes" | "no";

export type ExpenseFilters = {
  search: string; // matches vendor + notes
  categoryId: string; // "" = all
  subcategoryId: string; // "" = all
  vendor: string; // contains match
  dateFrom: string; // "YYYY-MM-DD" or ""
  dateTo: string; // "YYYY-MM-DD" or ""
  month: string; // "1".."12" or ""
  year: string; // e.g. "2026" or ""
  amountMin: string; // rupees or ""
  amountMax: string; // rupees or ""
  hasReceipt: ReceiptFilter;
  sort: ExpenseSort;
};

export const DEFAULT_FILTERS: ExpenseFilters = {
  search: "",
  categoryId: "",
  subcategoryId: "",
  vendor: "",
  dateFrom: "",
  dateTo: "",
  month: "",
  year: "",
  amountMin: "",
  amountMax: "",
  hasReceipt: "any",
  sort: "latest",
};

// Minimal shape both the serialized client rows and DB rows satisfy.
export type FilterableExpense = {
  amount: number; // paise
  date: Date | string;
  vendor: string | null;
  notes: string | null;
  categoryId: string;
  subcategoryId: string | null;
  receiptKey: string | null;
};

function toDate(d: Date | string): Date {
  return d instanceof Date ? d : new Date(d);
}

function rupeesToPaiseLoose(v: string): number | null {
  const n = Number(v);
  return v.trim() !== "" && Number.isFinite(n) ? Math.round(n * 100) : null;
}

export function filterExpenses<T extends FilterableExpense>(rows: T[], f: ExpenseFilters): T[] {
  const q = f.search.trim().toLowerCase();
  const vendorQ = f.vendor.trim().toLowerCase();
  const from = f.dateFrom ? new Date(`${f.dateFrom}T00:00:00`) : null;
  const to = f.dateTo ? new Date(`${f.dateTo}T23:59:59.999`) : null;
  const month = f.month ? Number(f.month) : null;
  const year = f.year ? Number(f.year) : null;
  const min = rupeesToPaiseLoose(f.amountMin);
  const max = rupeesToPaiseLoose(f.amountMax);

  return rows.filter((e) => {
    if (f.categoryId && e.categoryId !== f.categoryId) return false;
    if (f.subcategoryId && e.subcategoryId !== f.subcategoryId) return false;

    if (q) {
      const hay = `${e.vendor ?? ""} ${e.notes ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (vendorQ && !(e.vendor ?? "").toLowerCase().includes(vendorQ)) return false;

    const d = toDate(e.date);
    if (from && d < from) return false;
    if (to && d > to) return false;
    if (year !== null && d.getFullYear() !== year) return false;
    if (month !== null && d.getMonth() + 1 !== month) return false;

    if (min !== null && e.amount < min) return false;
    if (max !== null && e.amount > max) return false;

    if (f.hasReceipt === "yes" && !e.receiptKey) return false;
    if (f.hasReceipt === "no" && e.receiptKey) return false;

    return true;
  });
}

export function sortExpenses<T extends FilterableExpense>(rows: T[], sort: ExpenseSort): T[] {
  const copy = [...rows];
  switch (sort) {
    case "oldest":
      return copy.sort((a, b) => +toDate(a.date) - +toDate(b.date));
    case "highest":
      return copy.sort((a, b) => b.amount - a.amount);
    case "lowest":
      return copy.sort((a, b) => a.amount - b.amount);
    case "latest":
    default:
      return copy.sort((a, b) => +toDate(b.date) - +toDate(a.date));
  }
}

export function applyExpenseFilters<T extends FilterableExpense>(rows: T[], f: ExpenseFilters): T[] {
  return sortExpenses(filterExpenses(rows, f), f.sort);
}

export function hasActiveFilters(f: ExpenseFilters): boolean {
  return (
    f.search !== "" ||
    f.categoryId !== "" ||
    f.subcategoryId !== "" ||
    f.vendor !== "" ||
    f.dateFrom !== "" ||
    f.dateTo !== "" ||
    f.month !== "" ||
    f.year !== "" ||
    f.amountMin !== "" ||
    f.amountMax !== "" ||
    f.hasReceipt !== "any"
  );
}

// --- URL (de)serialization: only non-default keys, so URLs stay short. ---------
export function filtersToSearchParams(f: ExpenseFilters): URLSearchParams {
  const p = new URLSearchParams();
  (Object.keys(DEFAULT_FILTERS) as (keyof ExpenseFilters)[]).forEach((k) => {
    const value = f[k];
    if (value && value !== DEFAULT_FILTERS[k]) p.set(k, String(value));
  });
  return p;
}

export function filtersFromSearchParams(p: URLSearchParams): ExpenseFilters {
  const get = (k: keyof ExpenseFilters) => p.get(k) ?? DEFAULT_FILTERS[k];
  const sort = get("sort") as ExpenseSort;
  const hasReceipt = get("hasReceipt") as ReceiptFilter;
  return {
    search: get("search"),
    categoryId: get("categoryId"),
    subcategoryId: get("subcategoryId"),
    vendor: get("vendor"),
    dateFrom: get("dateFrom"),
    dateTo: get("dateTo"),
    month: get("month"),
    year: get("year"),
    amountMin: get("amountMin"),
    amountMax: get("amountMax"),
    hasReceipt: ["any", "yes", "no"].includes(hasReceipt) ? hasReceipt : "any",
    sort: ["latest", "oldest", "highest", "lowest"].includes(sort) ? sort : "latest",
  };
}
