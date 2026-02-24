#!/usr/bin/env bash
set -euo pipefail

if ! command -v stripe >/dev/null 2>&1; then
  echo "Stripe CLI não encontrado. Instale em https://stripe.com/docs/stripe-cli"
  exit 1
fi

echo "==> Disparando checkout.session.completed"
stripe trigger checkout.session.completed

echo "==> Disparando invoice.paid"
stripe trigger invoice.paid

echo "==> Disparando customer.subscription.deleted"
stripe trigger customer.subscription.deleted

echo "✅ Eventos disparados. Verifique logs do endpoint /api/webhooks/stripe."
