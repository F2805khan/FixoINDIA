import { SupabaseModel } from "./SupabaseModel.js";

class Payment extends SupabaseModel {
  static get tableName() {
    return "payments";
  }

  /**
   * Map app-code column names → original DB column names.
   * payments table has: booking_id (uuid FK), booking_number, payment_method, transaction_id
   */
  static get columnMap() {
    return {
      bookingId: "booking_number",
      method: "payment_method",
      transactionId: "transaction_id",
      gatewayOrderId: "gateway_order_id"
    };
  }
}

export default Payment;
