import Snap from 'midtrans-client';

// ponytail: CJS/ESM compatibility shim for Next.js build
const SnapConstructor = (Snap as unknown as { Snap: new (config: Record<string, unknown>) => unknown }).Snap || Snap;

const snap = new (SnapConstructor as new (config: Record<string, unknown>) => {
  transaction: { notification: (n: Record<string, unknown>) => Promise<Record<string, unknown>> };
  createTransactionToken: (p: Record<string, unknown>) => Promise<string>;
})({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  serverKey: process.env.MIDTRANS_SERVER_KEY || '',
  clientKey: process.env.MIDTRANS_CLIENT_KEY || '',
});

export const midtrans = snap;

export function verifyNotification(notification: Record<string, unknown>): Promise<Record<string, unknown>> {
  return snap.transaction.notification(notification);
}

export async function createSnapToken(booking: {
  id: string;
  totalPrice: number;
  userName: string;
  userPhone: string;
}) {
  const parameter = {
    transaction_details: {
      order_id: booking.id,
      gross_amount: Number(booking.totalPrice),
    },
    customer_details: {
      first_name: booking.userName,
      phone: booking.userPhone,
    },
    credit_card: {
      secure: true,
    },
  };

  return snap.createTransactionToken(parameter);
}