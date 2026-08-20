/**
 * Migration: Reorganize groups from legacy A-J codes to descriptive technical domains.
 * Preserves original classification as legacy_code.
 *
 * Usage: npx tsx scripts/migrate-groups.ts
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// Load env
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

// ============================================================
// New group definitions
// Maps legacy A-J codes to new descriptive groups
// ============================================================

const NEW_GROUPS = [
  {
    code: 'COB-BATCH',
    name: 'COB & Batch Processing',
    description: 'COB crashes, hangs, performance issues, batch job failures, Start-of-Day and End-of-Day processing problems.',
    legacyCodes: ['A', 'B', 'C'],
  },
  {
    code: 'ACCT-LIFECYCLE',
    name: 'Account & Arrangement Lifecycle',
    description: 'Account creation, closure, arrangement lifecycle, product configuration, and account management issues.',
    legacyCodes: ['E'],
  },
  {
    code: 'INTEREST-LOANS',
    name: 'Interest, Loans & Accrual',
    description: 'Interest accrual, capitalization, loan processing, catch-all entries, and product account interest issues.',
    legacyCodes: ['D', 'F'],
  },
  {
    code: 'PAYMENTS-FX',
    name: 'Payments, Transfers, FX & GL',
    description: 'Payment processing, FX revaluation, GL differences, currency issues, and financial entry problems.',
    legacyCodes: ['G'],
  },
  {
    code: 'TELLER-BRANCH',
    name: 'Teller & Branch Operations',
    description: 'Teller transactions, vault management, cheque processing, cash operations, and branch-level issues.',
    legacyCodes: ['H'],
  },
  {
    code: 'COMPLIANCE',
    name: 'Compliance, FCM & AML',
    description: 'FCM compliance screening, AML watch lists, customer profiling, and regulatory screening issues.',
    legacyCodes: ['I'],
  },
  {
    code: 'SYS-ADMIN',
    name: 'System Admin & Platform',
    description: 'System administration, platform defects, configuration issues, Docker/Atlas builds, and miscellaneous technical problems.',
    legacyCodes: ['J'],
  },
];

async function main() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Step 1: Add legacy_code column to groups
    console.log('\n📋 Step 1: Adding legacy_code column to groups...');
    await client.query(`
      ALTER TABLE groups ADD COLUMN IF NOT EXISTS legacy_code VARCHAR(50);
    `);
    console.log('  ✓ legacy_code column added');

    // Step 2: Store existing group codes as legacy_code
    console.log('\n📋 Step 2: Preserving original group codes as legacy_code...');
    await client.query(`
      UPDATE groups SET legacy_code = code WHERE legacy_code IS NULL;
    `);
    const preserved = await client.query('SELECT code, legacy_code FROM groups ORDER BY code');
    preserved.rows.forEach((r: any) => {
      console.log(`  ${r.code} → legacy_code: ${r.legacy_code}`);
    });

    // Step 3: Create new groups
    console.log('\n📋 Step 3: Creating new descriptive groups...');
    const newGroupMap = new Map<string, number>(); // code → id
    
    for (const g of NEW_GROUPS) {
      const result = await client.query(`
        INSERT INTO groups (code, name, description, legacy_code)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (code) DO UPDATE SET name = $2, description = $3, updated_at = NOW()
        RETURNING id
      `, [g.code, g.name, g.description, g.legacyCodes.join(',')]);
      newGroupMap.set(g.code, result.rows[0].id);
      console.log(`  ✓ ${g.code}: ${g.name} (id: ${result.rows[0].id})`);
    }

    // Step 4: Map tickets to new groups
    console.log('\n📋 Step 4: Migrating ticket group references...');
    let ticketCount = 0;
    for (const g of NEW_GROUPS) {
      // Get old group IDs for legacy codes
      const oldGroups = await client.query(
        'SELECT id FROM groups WHERE code = ANY($1)',
        [g.legacyCodes]
      );
      const oldIds = oldGroups.rows.map((r: any) => r.id);
      
      if (oldIds.length === 0) continue;
      
      const result = await client.query(`
        UPDATE tickets SET group_id = $1
        WHERE group_id = ANY($2)
      `, [newGroupMap.get(g.code), oldIds]);
      ticketCount += result.rowCount ?? 0;
      console.log(`  ${g.legacyCodes.join(',')} → ${g.code}: ${result.rowCount} tickets`);
    }
    console.log(`  ✓ Total tickets migrated: ${ticketCount}`);

    // Step 5: Map keywords to new groups
    console.log('\n📋 Step 5: Migrating keyword group references...');
    let keywordCount = 0;
    for (const g of NEW_GROUPS) {
      const oldGroups = await client.query(
        'SELECT id FROM groups WHERE code = ANY($1)',
        [g.legacyCodes]
      );
      const oldIds = oldGroups.rows.map((r: any) => r.id);
      
      if (oldIds.length === 0) continue;
      
      const result = await client.query(`
        UPDATE keywords SET group_id = $1
        WHERE group_id = ANY($2)
      `, [newGroupMap.get(g.code), oldIds]);
      keywordCount += result.rowCount ?? 0;
      console.log(`  ${g.legacyCodes.join(',')} → ${g.code}: ${result.rowCount} keywords`);
    }
    console.log(`  ✓ Total keywords migrated: ${keywordCount}`);

    // Step 6: Map knowledge articles to new groups
    console.log('\n📋 Step 6: Migrating knowledge article group references...');
    let articleCount = 0;
    for (const g of NEW_GROUPS) {
      const oldGroups = await client.query(
        'SELECT id FROM groups WHERE code = ANY($1)',
        [g.legacyCodes]
      );
      const oldIds = oldGroups.rows.map((r: any) => r.id);
      
      if (oldIds.length === 0) continue;
      
      const result = await client.query(`
        UPDATE knowledge_articles SET group_id = $1
        WHERE group_id = ANY($2)
      `, [newGroupMap.get(g.code), oldIds]);
      articleCount += result.rowCount ?? 0;
      console.log(`  ${g.legacyCodes.join(',')} → ${g.code}: ${result.rowCount} articles`);
    }
    console.log(`  ✓ Total articles migrated: ${articleCount}`);

    // Step 7: Map subtypes to new groups
    console.log('\n📋 Step 7: Migrating subtype group references...');
    let subtypeCount = 0;
    for (const g of NEW_GROUPS) {
      const oldGroups = await client.query(
        'SELECT id FROM groups WHERE code = ANY($1)',
        [g.legacyCodes]
      );
      const oldIds = oldGroups.rows.map((r: any) => r.id);
      
      if (oldIds.length === 0) continue;
      
      const result = await client.query(`
        UPDATE subtypes SET group_id = $1
        WHERE group_id = ANY($2)
      `, [newGroupMap.get(g.code), oldIds]);
      subtypeCount += result.rowCount ?? 0;
      console.log(`  ${g.legacyCodes.join(',')} → ${g.code}: ${result.rowCount} subtypes`);
    }
    console.log(`  ✓ Total subtypes migrated: ${subtypeCount}`);

    // Step 8: Delete old groups (they're now replaced by new ones)
    console.log('\n📋 Step 8: Removing old legacy groups...');
    const oldGroupCodes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const deleteResult = await client.query(`
      DELETE FROM groups WHERE code = ANY($1)
    `, [oldGroupCodes]);
    console.log(`  ✓ Removed ${deleteResult.rowCount ?? 0} old groups`);

    // Step 9: Verify
    console.log('\n📊 Verification:');
    const verify = await client.query(`
      SELECT g.code, g.name, g.legacy_code,
             (SELECT COUNT(*) FROM tickets t WHERE t.group_id = g.id) as ticket_count,
             (SELECT COUNT(*) FROM knowledge_articles ka WHERE ka.group_id = g.id) as article_count,
             (SELECT COUNT(*) FROM keywords k WHERE k.group_id = g.id) as keyword_count,
             (SELECT COUNT(*) FROM subtypes s WHERE s.group_id = g.id) as subtype_count
      FROM groups g
      ORDER BY g.code
    `);
    
    let totalTickets = 0;
    let totalArticles = 0;
    let totalKeywords = 0;
    let totalSubtypes = 0;
    
    console.log('\n  Code         | Name                                          | Tickets | Articles | Keywords | Subtypes | Legacy');
    console.log('  -------------|-----------------------------------------------|---------|----------|----------|----------|-------');
    for (const r of verify.rows) {
      const ticketCount = parseInt(r.ticket_count);
      const articleCount = parseInt(r.article_count);
      const keywordCount = parseInt(r.keyword_count);
      const subtypeCount = parseInt(r.subtype_count);
      totalTickets += ticketCount;
      totalArticles += articleCount;
      totalKeywords += keywordCount;
      totalSubtypes += subtypeCount;
      console.log(`  ${(r.code as string).padEnd(13)}| ${(r.name as string).padEnd(45)}| ${String(ticketCount).padStart(7)} | ${String(articleCount).padStart(8)} | ${String(keywordCount).padStart(8)} | ${String(subtypeCount).padStart(8)} | ${r.legacy_code}`);
    }
    console.log('  -------------|-----------------------------------------------|---------|----------|----------|----------|-------');
    console.log(`  ${''.padEnd(13)}| ${'TOTAL'.padEnd(45)}| ${String(totalTickets).padStart(7)} | ${String(totalArticles).padStart(8)} | ${String(totalKeywords).padStart(8)} | ${String(totalSubtypes).padStart(8)} |`);

    // Verify no orphaned references
    const orphans = await client.query(`
      SELECT 'tickets' as tbl, COUNT(*) as cnt FROM tickets WHERE group_id IS NOT NULL AND group_id NOT IN (SELECT id FROM groups)
      UNION ALL
      SELECT 'articles', COUNT(*) FROM knowledge_articles WHERE group_id IS NOT NULL AND group_id NOT IN (SELECT id FROM groups)
      UNION ALL
      SELECT 'keywords', COUNT(*) FROM keywords WHERE group_id IS NOT NULL AND group_id NOT IN (SELECT id FROM groups)
      UNION ALL
      SELECT 'subtypes', COUNT(*) FROM subtypes WHERE group_id NOT IN (SELECT id FROM groups)
    `);
    
    const hasOrphans = orphans.rows.some((r: any) => parseInt(r.cnt) > 0);
    if (hasOrphans) {
      console.log('\n⚠️  Orphaned references found:');
      orphans.rows.forEach((r: any) => console.log(`  ${r.tbl}: ${r.cnt}`));
    } else {
      console.log('\n  ✓ No orphaned references');
    }

    await client.query('COMMIT');
    console.log('\n✅ Migration complete!\n');

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
