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
  
  interface SnapResponse {
    token: string;
    redirect_url: string;
  }
  
  class Snap {
    constructor(config: SnapConfig);
    createTransactionToken(parameter: SnapParameter): Promise<SnapResponse>;
    transaction: {
      notification: (notification: Record<string, unknown>) => Promise<Record<string, unknown>>;
    };
  }
  
  export = Snap;
}