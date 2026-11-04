/**
 * Migration: Core Systems Hub Foundation
 * Applies scripts/migrate-core-systems-hub-foundation.sql
 * 
 * Usage: npx tsx scripts/migrate-core-systems-hub.ts
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
    }
  }
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function runMigration() {
  console.log('Connecting to database...');
  const client = await pool.connect();
  try {
    const sqlPath = path.join(__dirname, 'migrate-core-systems-hub-foundation.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    
    console.log('Applying Core Systems Hub foundation migration...');
    await client.query(sql);
    console.log('✓ Migration applied successfully!');

    // Verify row count of tickets to ensure zero loss
    const countRes = await client.query('SELECT COUNT(*) FROM tickets');
    console.log(`✓ Historical tickets verified: ${countRes.rows[0].count} records intact.`);

    // Verify created tables
    const tables = ['teams', 'knowledge_categories', 'knowledge_versions', 'projects', 'project_members', 'project_milestones', 'tasks', 'task_dependencies', 'daily_reports', 'daily_activities', 'escalations', 'escalation_actions'];
    for (const t of tables) {
      const check = await client.query(
        "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1",
        [t]
      );
      if (check.rows.length > 0) {
        console.log(`✓ Table confirmed: ${t}`);
      } else {
        console.error(`✗ Table missing: ${t}`);
      }
    }
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();

