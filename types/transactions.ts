export type TransactionType = "customer_payment" | "wholesaler_payment";

export type TransactionStatus = "pendiente" | "pagado";

export type TransactionAttachment = {
  id: string;
  transactionId: string;
  storagePath: string;
  fileName: string;
  mimeType: string | null;
  size: number | null;
  createdAt: string | null;
};

export type ContractTransaction = {
  id: string;
  contractId: string;
  type: TransactionType;
  concept: string;
  amount: string;
  date: string | null;
  status: TransactionStatus;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  attachments: TransactionAttachment[];
};

export type TransactionsByType = {
  customer_payment: ContractTransaction[];
  wholesaler_payment: ContractTransaction[];
};
