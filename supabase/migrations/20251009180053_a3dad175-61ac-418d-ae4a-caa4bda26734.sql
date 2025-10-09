-- Add completed_at timestamp to transactions table to track T+1 settlement
ALTER TABLE public.transactions 
ADD COLUMN completed_at timestamp with time zone;

-- Create index for faster settlement queries
CREATE INDEX idx_transactions_settlement ON public.transactions(user_id, transaction_type, status, completed_at);

-- Update existing completed transactions to have a completed_at timestamp
UPDATE public.transactions 
SET completed_at = created_at 
WHERE status = 'completed' AND completed_at IS NULL;