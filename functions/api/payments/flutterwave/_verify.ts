import type { Env } from '../../../_shared'

export async function verifyFlutterwaveTransaction(env: Env, transactionId: string, expectedRef: string) {
  if (!env.FLW_SECRET_KEY) throw new Error('Flutterwave is not configured.')

  const response = await fetch(
    `https://api.flutterwave.com/v3/transactions/${encodeURIComponent(transactionId)}/verify`,
    {
      headers: {
        Authorization: `Bearer ${env.FLW_SECRET_KEY}`,
        Accept: 'application/json'
      }
    }
  )

  const payload = await response.json().catch(() => null) as any

  if (!response.ok || payload?.status !== 'success' || !payload?.data) {
    throw new Error('Flutterwave could not verify this transaction.')
  }

  const tx = payload.data

  if (String(tx.tx_ref) !== expectedRef) {
    throw new Error('The transaction reference does not match this order.')
  }

  if (String(tx.status).toLowerCase() !== 'successful') {
    throw new Error('Flutterwave has not confirmed a successful payment.')
  }

  if (String(tx.currency).toUpperCase() !== 'NGN') {
    throw new Error('The payment currency does not match NGN.')
  }

  return tx
}

export async function settleFlutterwavePayment(env: Env, transactionId: string, txRef: string) {
  const record = await env.DB.prepare(`
    SELECT
      pt.id,
      pt.order_id AS orderId,
      pt.amount_ngn AS amount,
      pt.status AS transactionStatus,
      pt.provider_transaction_id AS providerTransactionId,
      o.total_ngn AS orderTotal,
      o.status AS orderStatus,
      o.payment_status AS paymentStatus,
      o.payment_method AS paymentMethod
    FROM payment_transactions pt
    JOIN orders o ON o.id = pt.order_id
    WHERE pt.tx_ref = ? AND pt.provider = 'flutterwave'
  `).bind(txRef).first<any>()

  if (!record) throw new Error('Payment reference not found.')

  const providerId = String(transactionId)

  // Allow a retry only when this exact transaction was already settled.
  if (record.transactionStatus === 'Successful') {
    if (
      record.providerTransactionId === providerId &&
      record.paymentStatus === 'Paid'
    ) {
      return {
        orderId: record.orderId,
        amount: Number(record.amount),
        currency: 'NGN',
        reference: txRef,
        status: 'Paid'
      }
    }

    throw new Error('This payment transaction has already been processed.')
  }

  if (record.transactionStatus !== 'Pending') {
    throw new Error('This payment transaction is no longer pending.')
  }

  if (record.orderStatus === 'Cancelled') {
    throw new Error('This order has been cancelled. Contact Eat2Smile before attempting payment.')
  }

  if (record.paymentStatus === 'Refunded') {
    throw new Error('This order has been refunded and cannot be marked as paid.')
  }

  if (record.paymentStatus === 'Paid') {
    throw new Error('This order is already marked as paid.')
  }

  if (record.paymentMethod !== 'Online') {
    throw new Error('This order was not created for online payment.')
  }

  const tx = await verifyFlutterwaveTransaction(env, providerId, txRef)
  const paidAmount = Number(tx.amount)
  const chargedAmount = Number(tx.charged_amount ?? tx.amount)

  if (
    !Number.isFinite(paidAmount) ||
    paidAmount !== Number(record.amount) ||
    Number(record.amount) !== Number(record.orderTotal) ||
    !Number.isFinite(chargedAmount) ||
    chargedAmount < Number(record.amount)
  ) {
    throw new Error('The verified payment amount does not exactly match the order total.')
  }

  const now = new Date().toISOString()

  // D1 executes batch statements transactionally. Both updates are guarded
  // so a stale or concurrent verification cannot overwrite a later state.
  const results = await env.DB.batch([
    env.DB.prepare(`
      UPDATE payment_transactions
      SET
        provider_transaction_id = ?,
        provider_reference = ?,
        payment_type = ?,
        status = 'Successful',
        failure_reason = NULL,
        verified_at = ?,
        updated_at = ?
      WHERE id = ?
        AND status = 'Pending'
        AND EXISTS (
          SELECT 1
          FROM orders o
          WHERE o.id = payment_transactions.order_id
            AND o.status <> 'Cancelled'
            AND o.payment_method = 'Online'
            AND o.payment_status NOT IN ('Paid', 'Refunded')
            AND o.total_ngn = payment_transactions.amount_ngn
        )
    `).bind(
      providerId,
      String(tx.flw_ref || ''),
      String(tx.payment_type || ''),
      now,
      now,
      record.id
    ),

    env.DB.prepare(`
      UPDATE orders
      SET payment_status = 'Paid', updated_at = datetime('now')
      WHERE id = ?
        AND payment_method = 'Online'
        AND status <> 'Cancelled'
        AND payment_status NOT IN ('Paid', 'Refunded')
        AND EXISTS (
          SELECT 1
          FROM payment_transactions pt
          WHERE pt.id = ?
            AND pt.order_id = orders.id
            AND pt.status = 'Successful'
            AND pt.provider_transaction_id = ?
            AND pt.amount_ngn = orders.total_ngn
        )
    `).bind(record.orderId, record.id, providerId)
  ])

  if (results[0]?.meta?.changes !== 1 || results[1]?.meta?.changes !== 1) {
    throw new Error('Payment state changed during verification. Please verify the order status before retrying.')
  }

  return {
    orderId: record.orderId,
    amount: paidAmount,
    currency: 'NGN',
    reference: txRef,
    status: 'Paid'
  }
}
