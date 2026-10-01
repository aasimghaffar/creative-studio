export type PaymentStatus = "paid" | "pending" | "failed";

export interface PaymentRecord {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: PaymentStatus;
  invoiceNo: string;
}

export const mockPaymentHistory: PaymentRecord[] = [
  { id: "p1", date: "2026-07-01T08:00:00", description: "Studio plan — yearly renewal", amount: 288.0, status: "paid", invoiceNo: "INV-2026-0142" },
  { id: "p2", date: "2026-05-14T10:22:00", description: "Credit top-up — 500 credits", amount: 19.0, status: "paid", invoiceNo: "INV-2026-0097" },
  { id: "p3", date: "2026-03-02T09:05:00", description: "Extra seat — March", amount: 24.0, status: "paid", invoiceNo: "INV-2026-0051" },
  { id: "p4", date: "2026-02-27T16:40:00", description: "Credit top-up — 500 credits", amount: 19.0, status: "failed", invoiceNo: "INV-2026-0048" },
];
