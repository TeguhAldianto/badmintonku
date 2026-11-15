declare module 'midtrans-client' {
  interface SnapConfig {
    isProduction: boolean;
    serverKey: string;
    clientKey: string;
  }

  interface TransactionDetails {
    order_id: string;
    gross_amount: number;
  }

  interface CustomerDetails {
    first_name: string;
    phone: string;
  }

  interface CreditCard {
    secure: boolean;
  }

  interface SnapParameter {
    transaction_details: TransactionDetails;
    customer_details: CustomerDetails;
    credit_card: CreditCard;
  }

  class Snap {
    constructor(config: SnapConfig);
    /** Returns the Snap token (not a URL). */
    createTransactionToken(parameter: SnapParameter): Promise<string>;
    /** Returns the Snap redirect URL. */
    createTransactionRedirectUrl(parameter: SnapParameter): Promise<string>;
    transaction: {
      notification: (notification: Record<string, unknown>) => Promise<Record<string, unknown>>;
      status: (orderId: string) => Promise<Record<string, unknown>>;
    };
  }

  export = Snap;
}
