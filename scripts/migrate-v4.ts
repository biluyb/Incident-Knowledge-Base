/**
 * Migration v4: Reorganize to 8 official groups with 30 subgroups.
 * Reclassifies all 237 incidents using pre-classified data from Excel v4.
 * 
 * Usage: npx tsx scripts/migrate-v4.ts
 */

import { Pool } from 'pg';
import * as XLSX from 'xlsx';
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

const GROUPS = [
  {
    code: 'G01', name: 'COB & Batch Processing',
    description: 'Issues in COB, EOD/SOD, batch jobs, COB module crashes, hangs, and batch performance.',
    legacyCodes: ['A', 'B', 'C', 'COB-BATCH'],
    subgroups: [
      { code: 'G01-SG01', name: 'AA.CREATE.NAU.ACTIVITIES Failures', description: 'COB failures/hangs centered on AA.CREATE.NAU.ACTIVITIES and NAU activity creation.' },
      { code: 'G01-SG02', name: 'COB Module & EOD Failures', description: 'Failures in AA.SERVICE.PROCESS and specialized EOD/COB modules.' },
      { code: 'G01-SG03', name: 'Start/End of Day Processing', description: 'Start-of-day/end-of-day stage failures or account movement problems tied to COB stages.' },
      { code: 'G01-SG04', name: 'COB Performance & Batch Processing', description: 'Slow COB, long-running batch jobs, IHLD-related performance and batch processing delays.' },
      { code: 'G01-SG05', name: 'COB Processing Issues', description: 'Other direct COB processing issues not fitting a narrower failure subtype.' },
    ],
  },
  {
    code: 'G02', name: 'Account & Arrangement Lifecycle',
    description: 'Customer/account/arrangement creation, status, closure, migration, product and arrangement activity management.',
    legacyCodes: ['ACCT-LIFECYCLE'],
    subgroups: [
      { code: 'G02-SG01', name: 'Arrangement Lifecycle & Closure', description: 'Arrangement suspension, closure, pending-closure and lifecycle transitions.' },
      { code: 'G02-SG02', name: 'Account & Arrangement Management', description: 'General account/arrangement operational and data management.' },
      { code: 'G02-SG03', name: 'Account Access, Status & Data', description: 'Account lookup, availability, status, balance/data and missing-record problems.' },
      { code: 'G02-SG04', name: 'Product & Arrangement Configuration', description: 'AA product setup, new product configuration and arrangement product conditions.' },
      { code: 'G02-SG05', name: 'Account & Company Migration', description: 'Customer/account/company migration and company lifecycle operations.' },
      { code: 'G02-SG06', name: 'Arrangement Activities & Repayment', description: 'AA arrangement activities, repayment and related authorization/activity processing.' },
    ],
  },
  {
    code: 'G03', name: 'Interest, Loans & Accruals',
    description: 'Interest calculation, accrual, capitalization, payout, lending, loans, and profit-related processing.',
    legacyCodes: ['D', 'F', 'INTEREST-LOANS'],
    subgroups: [
      { code: 'G03-SG01', name: 'Interest Accrual & Capitalization', description: 'Interest accrual, capitalization, maturity accrual and schedule-related interest issues.' },
      { code: 'G03-SG02', name: 'Interest Payout & Settlement', description: 'Interest payout, settlement, PAYCRINTEREST and related posting behavior.' },
      { code: 'G03-SG03', name: 'Loans & Lending', description: 'Loan/lending, lending arrangements, penalties and loan-specific processing.' },
      { code: 'G03-SG04', name: 'Interest & Profit Processing', description: 'Other interest/profit calculations and maturity bonus processing.' },
    ],
  },
  {
    code: 'G04', name: 'Payments, Transfers, FX & GL',
    description: 'Funds transfers, payment orders, FX, SWIFT, GL, accounting entries, charges, taxes and posting.',
    legacyCodes: ['G', 'PAYMENTS-FX'],
    subgroups: [
      { code: 'G04-SG01', name: 'Payments & Transfers', description: 'Funds transfers, payment orders and general payment processing.' },
      { code: 'G04-SG02', name: 'FX & International Payments', description: 'FX, SWIFT, MT103 and foreign-currency payment processing.' },
      { code: 'G04-SG03', name: 'GL, Accounting & Posting', description: 'GL, accounting entries, tax/charge posting, report categories and financial entries.' },
      { code: 'G04-SG04', name: 'Account Sweep & Funds Movement', description: 'Account sweep and automated funds movement.' },
    ],
  },
  {
    code: 'G05', name: 'Teller, Cash, Cheque & Branch Operations',
    description: 'Branch/teller cash, vault, cheque and clearing operations.',
    legacyCodes: ['H', 'TELLER-BRANCH'],
    subgroups: [
      { code: 'G05-SG01', name: 'Teller & Cash Operations', description: 'Teller, cashier and vault transactions.' },
      { code: 'G05-SG02', name: 'Cheque & Clearing Operations', description: 'Cheque issuance, clearing, reversal and cheque-related account activity.' },
      { code: 'G05-SG03', name: 'Branch Operations', description: 'Branch-specific operational workflows.' },
    ],
  },
  {
    code: 'G06', name: 'Compliance, FCM & AML',
    description: 'Financial crime management, screening, watchlists, profiling and related compliance functions.',
    legacyCodes: ['I', 'COMPLIANCE'],
    subgroups: [
      { code: 'G06-SG01', name: 'FCM & Screening', description: 'FCM, screening, watchlist, profiling and financial-crime checks.' },
    ],
  },
  {
    code: 'G07', name: 'Limits, Overdrafts & Restrictions',
    description: 'Limits, overdraft, working-balance checks, amount blocks and transaction/activity restrictions.',
    legacyCodes: ['D2', 'E2', 'E4'],
    subgroups: [
      { code: 'G07-SG01', name: 'Overdraft & Working Balance', description: 'Overdraw, working balance and unauthorized overdraft behavior.' },
      { code: 'G07-SG02', name: 'Transaction & Activity Restrictions', description: 'Time-bound or transaction/activity restrictions and amount blocks.' },
      { code: 'G07-SG03', name: 'Limits & Limit Validation', description: 'Limit records, limit expiry, limit excess and limit-check validation.' },
    ],
  },
  {
    code: 'G08', name: 'System Administration, Configuration & Platform',
    description: 'Platform, deployment, environment, access, utilities, system configuration and technical administration.',
    legacyCodes: ['J', 'SYS-ADMIN'],
    subgroups: [
      { code: 'G08-SG01', name: 'System Administration & Configuration', description: 'General platform/system configuration and administration.' },
      { code: 'G08-SG02', name: 'System Access, Tools & Utilities', description: 'Browser/login, menus, reports, scripts, enquiry/tools and system utilities.' },
      { code: 'G08-SG03', name: 'Platform, Deployment & Environment', description: 'Docker, Oracle, servlet, image/build and environment/deployment issues.' },
    ],
  },
];

async function main() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Step 1: Load Excel classification data
    console.log('\n📋 Step 1: Loading Excel v4 classification data...');
    const wb = XLSX.readFile('/home/bililign/Downloads/Incident_Knowledge_Base_Classified_v4(1).xlsx');
    const icSheet = wb.Sheets['Incident_Classification'];
    const icData = XLSX.utils.sheet_to_json<any>(icSheet, { header: 1, defval: '' });

    const classificationMap = new Map<string, any>();
    for (let i = 1; i < icData.length; i++) {
      const row = icData[i];
      if (row[0]) {
        classificationMap.set(row[0].trim(), {
          reference: row[0].trim(),
          oldGroup: row[2],
          newGroupId: row[3],
          newGroup: row[4],
          newSubgroup: row[5],
          confidence: row[6],
          note: row[7],
        });
      }
    }
    console.log(`  ✓ Loaded ${classificationMap.size} incident classifications`);

    // Step 2: Add new columns to tickets
    console.log('\n📋 Step 2: Adding new columns to tickets...');
    await client.query(`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS subgroup_id INTEGER`);
    await client.query(`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS classification_confidence VARCHAR(20)`);
    await client.query(`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS classification_note TEXT`);
    await client.query(`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS legacy_group VARCHAR(50)`);
    console.log('  ✓ Columns added');

    // Step 3: Save current group codes as legacy_group
    console.log('\n📋 Step 3: Preserving legacy group codes...');
    await client.query(`
      UPDATE tickets SET legacy_group = g.code 
      FROM groups g WHERE tickets.group_id = g.id AND tickets.legacy_group IS NULL
    `);
    const legacyCount = await client.query('SELECT COUNT(*) FROM tickets WHERE legacy_group IS NOT NULL');
    console.log(`  ✓ Preserved legacy_group for ${legacyCount.rows[0].count} tickets`);

    // Step 4: Disconnect all FK references before deleting groups
    console.log('\n📋 Step 4: Disconnecting FK references...');
    // knowledge_articles.group_id has NOT NULL — need to set a temp value or drop constraint
    // First, make group_id nullable on knowledge_articles
    await client.query(`ALTER TABLE knowledge_articles ALTER COLUMN group_id DROP NOT NULL`);
    await client.query(`ALTER TABLE knowledge_articles ALTER COLUMN subtype_id DROP NOT NULL`);
    await client.query(`UPDATE knowledge_articles SET subtype_id = NULL WHERE subtype_id IS NOT NULL`);
    await client.query(`UPDATE knowledge_articles SET group_id = NULL WHERE group_id IS NOT NULL`);
    console.log('  ✓ Knowledge articles disconnected');
    
    const oldSubtypeCount = await client.query('SELECT COUNT(*) FROM subtypes');
    await client.query('DELETE FROM subtypes');
    console.log(`  ✓ Removed ${oldSubtypeCount.rows[0].count} old subtypes`);

    // Step 5: Delete old groups and create 8 new ones
    console.log('\n📋 Step 5: Creating 8 new groups...');
    // tickets has ON DELETE SET NULL, keywords has ON DELETE CASCADE — safe to delete
    await client.query('DELETE FROM groups');
    
    const groupIdMap = new Map<string, number>();
    for (const g of GROUPS) {
      const result = await client.query(`
        INSERT INTO groups (code, name, description, legacy_code)
        VALUES ($1, $2, $3, $4) RETURNING id
      `, [g.code, g.name, g.description, g.legacyCodes.join(',')]);
      groupIdMap.set(g.code, result.rows[0].id);
      console.log(`  ✓ ${g.code}: ${g.name} (id: ${result.rows[0].id})`);
    }

    // Step 6: Create 30 subgroups
    console.log('\n📋 Step 6: Creating 30 subgroups...');
    const subgroupMap = new Map<string, number>();
    for (const g of GROUPS) {
      const gId = groupIdMap.get(g.code)!;
      for (const sg of g.subgroups) {
        const result = await client.query(`
          INSERT INTO subtypes (code, name, description, group_id)
          VALUES ($1, $2, $3, $4) RETURNING id
        `, [sg.code, sg.name, sg.description, gId]);
        subgroupMap.set(sg.name, result.rows[0].id);
        console.log(`  ✓ ${sg.code}: ${sg.name}`);
      }
    }

    // Step 7: Reclassify all 237 incidents
    console.log('\n📋 Step 7: Reclassifying all incidents...');
    const tickets = await client.query('SELECT id, reference, group_id FROM tickets ORDER BY id');
    let classified = 0;
    let notFound = 0;

    for (const ticket of tickets.rows) {
      const ref = ticket.reference?.trim();
      const classification = classificationMap.get(ref);

      if (classification) {
        const newGroupId = groupIdMap.get(classification.newGroupId);
        const newSubgroupId = subgroupMap.get(classification.newSubgroup);
        if (newGroupId) {
          await client.query(`
            UPDATE tickets SET group_id = $1, subgroup_id = $2,
              classification_confidence = $3, classification_note = $4
            WHERE id = $5
          `, [newGroupId, newSubgroupId || null, classification.confidence, classification.note, ticket.id]);
          classified++;
        }
      } else {
        console.log(`  ⚠️ No classification for ${ref}`);
        notFound++;
      }
    }
    console.log(`  ✓ Classified: ${classified}, Not found: ${notFound}`);

    // Step 8: Add indexes
    console.log('\n📋 Step 8: Adding indexes...');
    await client.query(`CREATE INDEX IF NOT EXISTS idx_tickets_subgroup ON tickets(subgroup_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_tickets_legacy_group ON tickets(legacy_group)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_tickets_class_conf ON tickets(classification_confidence)`);
    console.log('  ✓ Indexes created');

    // Step 9: Verification
    console.log('\n📊 VERIFICATION');
    console.log('='.repeat(100));
    const groupVerify = await client.query(`
      SELECT g.code, g.name, g.legacy_code,
             (SELECT COUNT(*) FROM tickets t WHERE t.group_id = g.id) as ticket_count,
             (SELECT COUNT(*) FROM subtypes s WHERE s.group_id = g.id) as subgroup_count
      FROM groups g ORDER BY g.code
    `);
    let totalT = 0, totalS = 0;
    for (const r of groupVerify.rows) {
      const tc = parseInt(r.ticket_count), sc = parseInt(r.subgroup_count);
      totalT += tc; totalS += sc;
      console.log(`  ${r.code} | ${(r.name as string).padEnd(52)} | ${String(tc).padStart(3)} tickets | ${String(sc).padStart(2)} subgroups | Legacy: ${r.legacy_code}`);
    }
    console.log(`  ${''.padEnd(3)} | ${'TOTAL'.padEnd(52)} | ${String(totalT).padStart(3)} tickets | ${String(totalS).padStart(2)} subgroups`);

    console.log('\n  Subgroup detail:');
    const sgVerify = await client.query(`
      SELECT g.code as gc, s.code as sc, s.name as sn,
             (SELECT COUNT(*) FROM tickets t WHERE t.subgroup_id = s.id) as tc
      FROM subtypes s JOIN groups g ON s.group_id = g.id ORDER BY g.code, s.code
    `);
    for (const r of sgVerify.rows) {
      console.log(`    ${r.gc}/${r.sc} | ${(r.sn as string).padEnd(50)} | ${r.tc} tickets`);
    }

    const orphans = await client.query(`SELECT COUNT(*) as cnt FROM tickets WHERE group_id IS NULL`);
    console.log(`\n  Tickets with no group: ${orphans.rows[0].cnt}`);

    const confDist = await client.query(`
      SELECT classification_confidence, COUNT(*) as cnt FROM tickets 
      WHERE classification_confidence IS NOT NULL GROUP BY classification_confidence
    `);
    console.log('  Confidence:');
    for (const r of confDist.rows) console.log(`    ${r.classification_confidence}: ${r.cnt}`);

    await client.query('COMMIT');
    console.log('\n✅ Migration v4 complete!\n');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => { console.error('❌ Migration failed:', err); process.exit(1); });
