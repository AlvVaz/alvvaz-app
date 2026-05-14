CREATE TABLE IF NOT EXISTS public.payment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id TEXT NOT NULL REFERENCES public."Contract"(id) ON DELETE CASCADE,
  total_amount NUMERIC(12,2) NOT NULL,
  deposit_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('contado', 'semanal', 'quincenal', 'mensual')),
  installment_count INTEGER NOT NULL CHECK (installment_count > 0),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (contract_id)
);

CREATE TABLE IF NOT EXISTS public.payment_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.payment_plans(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL CHECK (installment_number > 0),
  due_date DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'pagado')),
  transaction_id UUID REFERENCES public.contract_transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (plan_id, installment_number)
);

CREATE INDEX IF NOT EXISTS payment_plans_contract_id_idx
  ON public.payment_plans(contract_id);

CREATE INDEX IF NOT EXISTS payment_installments_plan_id_idx
  ON public.payment_installments(plan_id);

CREATE INDEX IF NOT EXISTS payment_installments_due_date_idx
  ON public.payment_installments(due_date);

CREATE OR REPLACE FUNCTION public.set_payment_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_payment_plans_updated_at
  ON public.payment_plans;

CREATE TRIGGER set_payment_plans_updated_at
BEFORE UPDATE ON public.payment_plans
FOR EACH ROW
EXECUTE FUNCTION public.set_payment_plans_updated_at();

DROP TRIGGER IF EXISTS set_payment_installments_updated_at
  ON public.payment_installments;

CREATE TRIGGER set_payment_installments_updated_at
BEFORE UPDATE ON public.payment_installments
FOR EACH ROW
EXECUTE FUNCTION public.set_payment_plans_updated_at();

