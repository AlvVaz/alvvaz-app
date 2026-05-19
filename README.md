This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Admin Payments

- `/admin/contratos` can optionally create or replace an admin-only payment plan when a contract is saved; due dates are generated from reservation date through trip liquidation date.
- `/admin/pagos` shows read-only payment-plan alerts from the Alertas button: overdue cuotas, cuotas due tomorrow, and pending cuotas within the next 7 days. Alert rows include contract links and WhatsApp links when a usable phone is available.
- Payment plans are stored in Supabase tables `payment_plans` and `payment_installments`; overdue status is calculated at runtime and is not persisted. Admins can edit individual cuota dates and amounts before saving a plan, as long as the cuota total matches the balance. Saving a plan from `/admin/pagos` also backfills the contract payment summary so the contract editor shows the plan instead of `Sin plan`; `/admin/contratos` also hydrates existing contracts from the payment-plan tables. Deleting a payment plan removes scheduled cuotas and clears that contract plan summary, but keeps registered transactions and cost fields.
- Linking a cuota from the customer transaction modal marks it paid only when the cobro is saved as `pagado` and the amount matches the selected cuota.
- If a linked customer transaction is deleted, changed away from `pagado`, or changed to a different amount, the related cuota is returned to `pendiente`.
- Vercel Cron calls `/api/admin/payment-reminders/daily` daily at 8 AM Mexico City time to send the admin Telegram summary. Required env vars: `CRON_SECRET`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
