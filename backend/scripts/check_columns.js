import "../config/env.js";
import { supabase } from "../config/supabase.js";

// payments — need to find all columns
const { data: p, error: pe } = await supabase.from("payments").insert([{
  booking_number: "PROBE-PAY",
  amount: 0,
  payment_method: "UPI",
  transaction_id: "test_probe",
  payment_status: "Pending"
}]).select();

if (pe) {
  console.log("payments FAIL:", pe.message);
} else {
  console.log("payments COLUMNS:", Object.keys(p[0]).join(", "));
  if (p[0]?.id) await supabase.from("payments").delete().eq("id", p[0].id);
}
