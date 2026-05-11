import type {
  ContractTransaction,
  TransactionAttachment,
  TransactionsByType,
  TransactionStatus,
  TransactionType,
} from "@/types/transactions";

export const TRANSACTION_RECEIPTS_BUCKET = "transaction-receipts";

export const transactionTypes: TransactionType[] = [
  "customer_payment",
  "wholesaler_payment",
];

export const transactionStatuses: TransactionStatus[] = ["pendiente", "pagado"];

type AttachmentRow = {
  id: string;
  transaction_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  size: number | null;
  created_at: string | null;
};

export type TransactionRow = {
  id: string;
  contract_id: string;
  type: TransactionType;
  concept: string;
  amount: string | number;
  date: string | null;
  status: TransactionStatus;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  transaction_attachments?: AttachmentRow[] | null;
};

export function mapAttachment(row: AttachmentRow): TransactionAttachment {
  return {
    id: row.id,
    transactionId: row.transaction_id,
    storagePath: row.storage_path,
    fileName: row.file_name,
    mimeType: row.mime_type,
    size: row.size,
    createdAt: row.created_at,
  };
}

export function mapTransaction(row: TransactionRow): ContractTransaction {
  return {
    id: row.id,
    contractId: row.contract_id,
    type: row.type,
    concept: row.concept,
    amount: String(row.amount),
    date: row.date,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    attachments: Array.isArray(row.transaction_attachments)
      ? row.transaction_attachments.map(mapAttachment)
      : [],
  };
}

export function groupTransactions(rows: TransactionRow[]): TransactionsByType {
  const grouped: TransactionsByType = {
    customer_payment: [],
    wholesaler_payment: [],
  };

  rows.map(mapTransaction).forEach((transaction) => {
    grouped[transaction.type].push(transaction);
  });

  return grouped;
}

export function normalizeTransactionType(value: unknown): TransactionType | null {
  const type = String(value ?? "").trim();
  return transactionTypes.includes(type as TransactionType) ? (type as TransactionType) : null;
}

export function normalizeTransactionStatus(value: unknown): TransactionStatus | null {
  const status = String(value ?? "").trim().toLowerCase();
  return transactionStatuses.includes(status as TransactionStatus)
    ? (status as TransactionStatus)
    : null;
}

export function normalizeOptionalDate(value: unknown) {
  const date = String(value ?? "").trim();
  if (!date) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined;
}

export function normalizeAmount(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return null;
  return Number(number.toFixed(2));
}

export function buildEmptyTransactionsByType(): TransactionsByType {
  return {
    customer_payment: [],
    wholesaler_payment: [],
  };
}

export function sanitizeFileName(value: string) {
  return value.trim().replace(/[/\\]/g, "_").replace(/\s+/g, " ");
}
