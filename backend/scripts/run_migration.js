/**
 * run_migration_via_rpc.js — Creates tables using individual Supabase API calls
 *
 * Since the pg-meta endpoint isn't available, this script creates a temporary
 * PostgreSQL function via the REST API, executes the migration through it,
 * then drops the function.
 *
 * Usage: node scripts/run_migration_via_rpc.js
 */

import "../config/env.js";
import { supabase } from "../config/supabase.js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlPath = resolve(__dirname, "migrate_schema.sql");
const sql = readFileSync(sqlPath, "utf-8");

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/+$/, "");
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function tryDirectSQL(query) {
  /* Try Supabase's postgres HTTP gateway */
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      Prefer: "return=representation"
    },
    body: JSON.stringify({ name: "_exec_migration", args: {} })
  });
  return res;
}

/**
 * Step 1: Create a temporary function that runs our migration SQL
 * Step 2: Call it via supabase.rpc()
 * Step 3: Drop it
 */
async function createMigrationFunction() {
  /* We need to create the function first — but the only way to do DDL
     without psql/dashboard is via the pg-meta endpoint or direct postgres.
     
     Let's try the Supabase SQL API at the alternative endpoints */
  const endpoints = [
    `${SUPABASE_URL}/rest/v1/rpc/exec_sql`,
    `${SUPABASE_URL}/pg/query`,
    `${SUPABASE_URL}/pg/v1/query`,
    `${SUPABASE_URL}/database/query`,
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({ query: sql })
      });
      
      if (res.ok) {
        return { ok: true, endpoint };
      }
      
      if (res.status === 404 || res.status === 405) continue;
      
      const text = await res.text().catch(() => "");
      /* 400+ but not 404 means endpoint exists but query failed */
      if (res.status >= 400 && res.status < 500 && res.status !== 404) {
        return { ok: false, error: text, endpoint };
      }
    } catch {
      continue;
    }
  }

  return { ok: false, error: "NO_ENDPOINT" };
}

async function main() {
  console.log("=== fixOindia Schema Migration (via Supabase API) ===\n");

  /* First, check what tables already exist */
  console.log("Checking existing tables...");
  const tables = ["users", "bookings", "payments", "services", "beauty_artists", "auth_events", "support_messages", "payment_method_settings"];
  
  for (const table of tables) {
    const { data, error, status } = await supabase.from(table).select("*", { count: "exact", head: true });
    if (error && (error.code === "42P01" || error.message?.includes("does not exist"))) {
      console.log(`  ✗ ${table} — does not exist`);
    } else if (error) {
      console.log(`  ? ${table} — error: ${error.message}`);
    } else {
      console.log(`  ✓ ${table} — exists`);
    }
  }

  console.log("\nChecking column availability on 'users' table...");
  const requiredUserCols = ["name", "email", "phone", "userId", "password", "role", "authProvider", "otpCode"];
  const { data: testRow, error: testErr } = await supabase.from("users").select(requiredUserCols.map(c => `"${c}"`).join(",")).limit(0);
  
  if (testErr) {
    console.log(`  Column check failed: ${testErr.message}`);
    
    /* Try each column individually */
    const missing = [];
    const present = [];
    for (const col of requiredUserCols) {
      const { error: colErr } = await supabase.from("users").select(`"${col}"`).limit(0);
      if (colErr) {
        missing.push(col);
      } else {
        present.push(col);
      }
    }
    if (present.length) console.log(`  Present columns: ${present.join(", ")}`);
    if (missing.length) console.log(`  Missing columns: ${missing.join(", ")}`);
  } else {
    console.log("  All required user columns present ✓");
  }

  /* Try to run the migration */
  console.log("\nAttempting migration via API...");
  const result = await createMigrationFunction();

  if (result.ok) {
    console.log(`\n✓ Migration completed successfully via ${result.endpoint}!`);
    console.log("\nRestart the backend: node server.js");
  } else {
    console.log("\n✗ Could not run migration via API (Supabase hosted projects require the SQL Editor for DDL).");
    console.log("\n╔══════════════════════════════════════════════════════════════╗");
    console.log("║  MANUAL STEP REQUIRED — Run SQL in Supabase Dashboard       ║");
    console.log("╠══════════════════════════════════════════════════════════════╣");
    console.log("║  1. Open: https://supabase.com/dashboard → your project     ║");
    console.log("║  2. Go to: SQL Editor → New query                           ║");
    console.log("║  3. Paste the SQL from: backend/scripts/migrate_schema.sql  ║");
    console.log("║  4. Click 'Run'                                             ║");
    console.log("║  5. Restart backend: node server.js                         ║");
    console.log("╚══════════════════════════════════════════════════════════════╝");
    console.log(`\nSQL file path: ${sqlPath}`);
  }
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
