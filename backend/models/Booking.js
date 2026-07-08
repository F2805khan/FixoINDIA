import { SupabaseModel } from "./SupabaseModel.js";

export const bookingStatuses = [
  "Confirmed",
  "Professional Assigned",
  "On The Way",
  "Service In Progress",
  "Completed",
  "Cancelled"
];

class Booking extends SupabaseModel {
  static get tableName() {
    return "bookings";
  }

  /**
   * Map app-code column names → original DB column names.
   */
  static get columnMap() {
    return {
      bookingId: "booking_number",
      userId: "user_id",
      serviceId: "service_id",
      serviceName: "service_name",
      customerName: "customer_name",
      phone: "customer_phone",
      address: "customer_address",
      date: "booking_date",
      time: "booking_time",
      subtotalAmount: "subtotal_amount",
      discountAmount: "discount_amount",
      couponCode: "coupon_code",
      paymentMethod: "payment_method",
      paymentStatus: "payment_status",
      bookingStatus: "booking_status",
      professionalName: "technician_name",
      professionalPhoto: "technician_image",
      estimatedArrival: "estimated_arrival",
      salonName: "vendor_name",
      professionalPhone: "vendor_phone"
    };
  }
}

export default Booking;
