CREATE TABLE IF NOT EXISTS public.contract_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id TEXT NOT NULL REFERENCES public."Contract"(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('customer_payment', 'wholesaler_payment')),
  concept TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  date DATE,
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'pagado')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.transaction_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.contract_transactions(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  size INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contract_transactions_contract_id_idx
  ON public.contract_transactions(contract_id);

CREATE INDEX IF NOT EXISTS transaction_attachments_transaction_id_idx
  ON public.transaction_attachments(transaction_id);

CREATE OR REPLACE FUNCTION public.set_contract_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_contract_transactions_updated_at
  ON public.contract_transactions;

CREATE TRIGGER set_contract_transactions_updated_at
BEFORE UPDATE ON public.contract_transactions
FOR EACH ROW
EXECUTE FUNCTION public.set_contract_transactions_updated_at();

INSERT INTO storage.buckets (id, name, public)
VALUES ('transaction-receipts', 'transaction-receipts', false)
ON CONFLICT (id) DO UPDATE SET public = false;
