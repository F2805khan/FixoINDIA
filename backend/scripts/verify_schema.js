import "../config/env.js";
import { supabase } from "../config/supabase.js";

// Verify using the ACTUAL DB column names (snake_case originals)
const checks = [
  { table: "users", cols: 'full_name,email,phone,username,password,role,provider,otp,otp_expiry,address,city,firebase_uid,status' },
  { table: "bookings", cols: 'booking_number,user_id,service_id,service_name,customer_name,customer_phone,customer_address,booking_date,booking_time,subtotal_amount,discount_amount,coupon_code,amount,payment_method,payment_status,booking_status,technician_name' },
  { table: "payments", cols: 'booking_number,amount,payment_method,status,transaction_id' },
  { table: "auth_events", cols: 'user_id,event_type,provider,email,ip_address,user_agent' },
  { table: "services", cols: 'service_name,price,category,description,image_url,duration,rating,service_area,is_active' },
  { table: "beauty_artists", cols: 'name,specialty,"salonName",region,phone,email,image,bio,rating,services,enabled' },
  { table: "support_messages", cols: '"userId","ticketId",name,email,message,reply,status' },
  { table: "payment_method_settings", cols: 'method,enabled,label,details' },
  { table: "coupons", cols: 'code,discount_type,discount_value,min_order_amount,max_discount,usage_limit,used_count,is_active,expires_at' },
];

let allGood = true;
for (const { table, cols } of checks) {
  const { error } = await supabase.from(table).select(cols).limit(0);
  if (error) {
    console.log(`✗ ${table} — ${error.message}`);
    allGood = false;
  } else {
    console.log(`✓ ${table} — all columns present`);
  }
}

console.log(allGood ? "\n✅ ALL TABLES & COLUMNS VERIFIED!" : "\n⚠ Some columns still missing.");
