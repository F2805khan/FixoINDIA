import "./config/env.js";
import { supabase } from "./config/supabase.js";

const run = async () => {
  try {
    const { error } = await supabase.from("services").select("_id").limit(1);
    if (error) throw error;

    console.log("Successfully connected to Supabase database!");
  } catch (error) {
    console.error("Supabase connection error:", error.message);
    process.exitCode = 1;
  }
};

run();
