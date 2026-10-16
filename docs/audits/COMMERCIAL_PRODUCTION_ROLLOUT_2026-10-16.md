# Commercial production rollout for review

Target: Supabase `almona02` (`shfsebdncjnncqqnewfj`). Both listed migrations were applied successfully on 2026-10-16 after the user explicitly approved these two production migrations. Automatic approval review initially required that specific approval. The subsequent support/training storage migration received separate approval and was also applied.

## Exact changes

1. `supabase/migrations/20261016001112_commercial_invoice_payment_read_contract.sql`: creates invoices and payments with currency/amount checks and workshop-customer ownership; creates optional customer-to-login membership; enables RLS; grants clients authorized reads only; grants server writes; adds a complete-account summary RPC.
2. `supabase/migrations/20261016110221_commercial_manual_payment_posting.sql`: adds shipping to invoice totals; adds one-full-invoice-per-order and payment idempotency indexes; adds owner-authorized, locked RPCs for creating an invoice from an existing order and recording manual cash/check/bank-transfer receipts. Browser clients cannot forge provider payments or mark their own invoices paid.

Neither migration modifies existing orders, quotes, customer records or production invoice/payment rows (the two target tables were absent). No historical order will silently become an invoice. Portal links are assigned by a trusted server after verification; membership is not inferred from email or self-editable metadata.

## Staging validation completed

- Workshop owner reads own invoices; another user cannot read them.
- Adding an explicit portal membership grants only the intended customer invoices.
- Client invoice inserts are rejected.
- Summary includes all twelve fixture invoices, beyond the ten-row activity limit.
- Invoice creation is repeatable without creating a duplicate for an order.
- Manual payment retry with the same key returns the same payment.
- Partial receipt sets partial; final receipt sets paid.
- Overpayments and wrong currencies are rejected.
- Linked portal customers cannot record payment receipts.

Fixtures ran inside rolled-back transactions. Staging restored missing baseline customer/ledger structures without copying production customer data.

## Deployment boundaries and rollback

Database migrations should precede deployment of the updated portal/payment code. Existing recurring-invoice browser inserts remain blocked until routed through a reviewed server operation. Stripe/PayPal settlement and customer-invitation delivery are separate server integrations; these migrations do not claim to implement them.

Before production apply, snapshot existing schema definitions/grants and verify tables remain absent. Apply in the listed order, then inspect effective grants and execute read-only/rolled-back authorization checks. Avoid dropping these financial tables after real records are created: rollback application code and fix forward, retaining accounting records. Newly introduced RPC EXECUTE grants can be revoked independently if needed.

Risk: newly strict financial ownership rules can reveal callers that previously assumed customer_id was an auth user ID. The updated portal instead relies on database RLS to resolve workshop ownership and optional portal membership. Production approval must cover these two specific migrations.
