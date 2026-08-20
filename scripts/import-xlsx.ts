/**
 * Excel Import Script
 * Usage: npx tsx scripts/import-xlsx.ts /path/to/Incident_Knowledge_Base_v3.xlsx
 */

import * as XLSX from 'xlsx';
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
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      process.env[key] = value;
    }
  }
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ============================================================
// Helper functions
// ============================================================

function cellStr(row: Record<string, any>, col: string): string {
  const val = row[col];
  if (val === undefined || val === null) return '';
  return String(val).trim();
}

function parseDate(val: any): string | null {
  if (!val) return null;
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }
  const str = String(val).trim();
  if (!str || str === 'N/A' || str === 'n/a') return null;
  // Try ISO format
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }
  return null;
}

function isPlaceholder(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return (
    lower.includes('fill in') ||
    lower.includes('[sub-type') ||
    lower.includes('placeholder') ||
    lower.includes('todo') ||
    lower.includes('tbd')
  );
}

// ============================================================
// Import functions
// ============================================================

async function importGroups(sheet: any[]): Promise<Map<string, number>> {
  const groupMap = new Map<string, number>();

  for (const row of sheet) {
    const code = cellStr(row, 'Group') || cellStr(row, 'Code') || cellStr(row, 'Group Code');
    const name = cellStr(row, 'Name') || cellStr(row, 'Group Name') || cellStr(row, 'Area');
    const desc = cellStr(row, 'Description');

    if (!code || !name) continue;

    const result = await pool.query(
      `INSERT INTO groups (code, name, description)
       VALUES ($1, $2, $3)
       ON CONFLICT (code) DO UPDATE SET name = $2, description = $3, updated_at = NOW()
       RETURNING id`,
      [code.toUpperCase(), name, desc || null]
    );
    groupMap.set(code.toUpperCase(), result.rows[0].id);
  }

  console.log(`  ✓ Imported ${groupMap.size} groups`);
  return groupMap;
}

async function importTickets(sheet: any[], groupMap: Map<string, number>): Promise<number> {
  let count = 0;
  let errors = 0;

  for (const row of sheet) {
    const reference = cellStr(row, 'Reference') || cellStr(row, 'TSR');
    if (!reference) { errors++; continue; }

    const summary = cellStr(row, 'Summary');
    const status = cellStr(row, 'Status');
    const requester = cellStr(row, 'Requester');
    const createdAt = parseDate(row['Created'] || row['Created Date'] || row['Created date']);
    const resolvedAt = parseDate(row['Resolved'] || row['Resolved Date'] || row['Resolved date']);
    const permClosedAt = parseDate(row['Permanently Closed'] || row['Permanently Closed date']);
    const rootCause = cellStr(row, 'Root Cause Category') || cellStr(row, 'Root Cause');
    const priority = cellStr(row, 'Priority');
    const severity = cellStr(row, 'Severity');
    const groupCode = (cellStr(row, 'Group') || cellStr(row, 'Assigned Group')).toUpperCase();

    const groupId = groupMap.get(groupCode) || null;

    try {
      await pool.query(
        `INSERT INTO tickets (reference, summary, status, requester, created_at_ticket, resolved_at, permanently_closed_at, root_cause_category, priority, severity, group_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (reference) DO UPDATE SET
           summary = $2, status = $3, requester = $4, created_at_ticket = $5,
           resolved_at = $6, permanently_closed_at = $7, root_cause_category = $8,
           priority = $9, severity = $10, group_id = $11, updated_at = NOW()`,
        [reference, summary || null, status || null, requester || null, createdAt, resolvedAt, permClosedAt, rootCause || null, priority || null, severity || null, groupId]
      );
      count++;
    } catch (err: any) {
      console.error(`  ✗ Error importing ticket ${reference}: ${err.message}`);
      errors++;
    }
  }

  console.log(`  ✓ Imported ${count} tickets (${errors} errors)`);
  return count;
}

async function importKeywords(sheet: any[], groupMap: Map<string, number>): Promise<number> {
  let count = 0;

  for (const row of sheet) {
    const keyword = cellStr(row, 'Keyword') || cellStr(row, 'Keywords') || cellStr(row, 'Search Term');
    if (!keyword) continue;

    const groupName = (cellStr(row, 'Group') || cellStr(row, 'Target Group')).toUpperCase();
    const groupId = groupMap.get(groupName) || null;
    const weight = parseInt(cellStr(row, 'Weight') || '1') || 1;

    try {
      await pool.query(
        `INSERT INTO keywords (keyword, group_id, weight)
         VALUES ($1, $2, $3)`,
        [keyword, groupId, weight]
      );
      count++;
    } catch (err: any) {
      console.error(`  ✗ Error importing keyword "${keyword}": ${err.message}`);
    }
  }

  console.log(`  ✓ Imported ${count} keywords`);
  return count;
}

async function importSubtypes(sheet: any[], groupMap: Map<string, number>): Promise<Map<string, number>> {
  const subtypeMap = new Map<string, number>();

  for (const row of sheet) {
    const code = cellStr(row, 'Sub-Type Code') || cellStr(row, 'Code') || cellStr(row, 'Sub-Type');
    const name = cellStr(row, 'Name') || cellStr(row, 'Sub-Type Name') || cellStr(row, 'Title');
    const description = cellStr(row, 'Description') || cellStr(row, 'Details');
    const groupCode = (cellStr(row, 'Group') || cellStr(row, 'Group Code')).toUpperCase();

    if (!code || !name) continue;
    if (isPlaceholder(name)) continue; // Skip placeholder entries

    const groupId = groupMap.get(groupCode);
    if (!groupId) {
      console.error(`  ✗ Skipping subtype ${code}: group ${groupCode} not found`);
      continue;
    }

    try {
      const result = await pool.query(
        `INSERT INTO subtypes (code, name, description, group_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (code) DO UPDATE SET name = $2, description = $3, group_id = $4, updated_at = NOW()
         RETURNING id`,
        [code, name, description || null, groupId]
      );
      subtypeMap.set(code, result.rows[0].id);
    } catch (err: any) {
      console.error(`  ✗ Error importing subtype ${code}: ${err.message}`);
    }
  }

  console.log(`  ✓ Imported ${subtypeMap.size} subtypes`);
  return subtypeMap;
}

async function createKnowledgeArticles(subtypeMap: Map<string, number>, groupMap: Map<string, number>): Promise<number> {
  let count = 0;

  for (const [code, subtypeId] of subtypeMap) {
    // Extract group code from subtype code (e.g., ST-E2 -> E)
    const groupLetter = code.replace(/^ST-/i, '').charAt(0).toUpperCase();
    const groupId = groupMap.get(groupLetter);
    if (!groupId) continue;

    try {
      // Check if article already exists for this subtype
      const existing = await pool.query(
        `SELECT id FROM knowledge_articles WHERE subtype_id = $1`,
        [subtypeId]
      );
      if (existing.rows.length > 0) continue;

      // Get subtype name for title
      const subResult = await pool.query(
        `SELECT name, description FROM subtypes WHERE id = $1`,
        [subtypeId]
      );
      const sub = subResult.rows[0];
      if (!sub) continue;

      const hasContent = sub.description && !isPlaceholder(sub.description);
      const status = hasContent ? 'published' : 'draft';

      await pool.query(
        `INSERT INTO knowledge_articles (title, group_id, subtype_id, status, symptoms, notes)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [sub.name, groupId, subtypeId, status, sub.description || null, `Auto-generated from subtype ${code}`]
      );
      count++;
    } catch (err: any) {
      console.error(`  ✗ Error creating article for ${code}: ${err.message}`);
    }
  }

  console.log(`  ✓ Created ${count} knowledge articles`);
  return count;
}

// ============================================================
// Main
// ============================================================

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: npx tsx scripts/import-xlsx.ts <path-to-xlsx>');
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  console.log(`\n📂 Reading workbook: ${filePath}\n`);

  const workbook = XLSX.readFile(filePath);
  const sheetNames = workbook.SheetNames;
  console.log(`  Sheets found: ${sheetNames.join(', ')}\n`);

  // Find sheets
  const groupSheetName = sheetNames.find(s => s.toLowerCase().includes('group_summary') || s.toLowerCase().includes('group'));
  const ticketSheetName = sheetNames.find(s => s.toLowerCase().includes('ticket') || s.toLowerCase().includes('all_tickets'));
  const lookupSheetName = sheetNames.find(s => s.toLowerCase().includes('quick_lookup') || s.toLowerCase().includes('lookup'));
  const subtypeSheetName = sheetNames.find(s => s.toLowerCase().includes('sub_type') || s.toLowerCase().includes('subtype'));

  console.log(`  Group sheet: ${groupSheetName || 'NOT FOUND'}`);
  console.log(`  Ticket sheet: ${ticketSheetName || 'NOT FOUND'}`);
  console.log(`  Lookup sheet: ${lookupSheetName || 'NOT FOUND'}`);
  console.log(`  Subtype sheet: ${subtypeSheetName || 'NOT FOUND'}`);
  console.log('');

  try {
    // Step 1: Import groups
    console.log('📋 Importing groups...');
    const groupMap = new Map<string, number>();
    if (groupSheetName) {
      const groupData = XLSX.utils.sheet_to_json(workbook.Sheets[groupSheetName]);
      const importedGroups = await importGroups(groupData);
      importedGroups.forEach((v, k) => groupMap.set(k, v));
    } else {
      // Fallback: create groups A-J
      const defaultGroups = [
        { code: 'A', name: 'COB Crashes & Hangs in AA.CREATE.NAU.ACTIVITIES' },
        { code: 'B', name: 'COB Crashes in AA.SERVICE.PROCESS & Specialized EOD Modules' },
        { code: 'C', name: 'COB Performance Degradation & Start-of-Day Issues' },
        { code: 'D', name: 'Interest Catch-All Entries & New Product Account Issues' },
        { code: 'E', name: 'Overdraft Account Lifecycle & Operations' },
        { code: 'F', name: 'Interest Accrual, Capitalization & Loan Interest Lifecycle' },
        { code: 'G', name: 'FX Revaluation, GL Differences & Payment Entry Issues' },
        { code: 'H', name: 'Teller, Vault, Cheque & Transaction Management' },
        { code: 'I', name: 'FCM Compliance Screening & AML Watch Lists' },
        { code: 'J', name: 'System Administration, Platform Defects & Miscellaneous' },
      ];
      for (const g of defaultGroups) {
        const result = await pool.query(
          `INSERT INTO groups (code, name) VALUES ($1, $2) ON CONFLICT (code) DO UPDATE SET name = $2 RETURNING id`,
          [g.code, g.name]
        );
        groupMap.set(g.code, result.rows[0].id);
      }
      console.log(`  ✓ Created ${defaultGroups.length} default groups`);
    }

    // Step 2: Import tickets
    if (ticketSheetName) {
      console.log('\n🎫 Importing tickets...');
      const ticketData = XLSX.utils.sheet_to_json(workbook.Sheets[ticketSheetName]);
      console.log(`  Found ${ticketData.length} rows`);
      await importTickets(ticketData, groupMap);
    } else {
      console.log('\n⚠️  No ticket sheet found, skipping');
    }

    // Step 3: Import keywords
    if (lookupSheetName) {
      console.log('\n🔑 Importing keywords...');
      const lookupData = XLSX.utils.sheet_to_json(workbook.Sheets[lookupSheetName]);
      console.log(`  Found ${lookupData.length} rows`);
      await importKeywords(lookupData, groupMap);
    } else {
      console.log('\n⚠️  No lookup sheet found, skipping');
    }

    // Step 4: Import subtypes
    let subtypeMap = new Map<string, number>();
    if (subtypeSheetName) {
      console.log('\n📂 Importing subtypes...');
      const subtypeData = XLSX.utils.sheet_to_json(workbook.Sheets[subtypeSheetName]);
      console.log(`  Found ${subtypeData.length} rows`);
      subtypeMap = await importSubtypes(subtypeData, groupMap);
    } else {
      console.log('\n⚠️  No subtype sheet found, skipping');
    }

    // Step 5: Create knowledge articles from subtypes
    console.log('\n📝 Creating knowledge articles from subtypes...');
    await createKnowledgeArticles(subtypeMap, groupMap);

    // Print summary
    console.log('\n📊 Import Summary:');
    const stats = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM groups) as groups,
        (SELECT COUNT(*) FROM tickets) as tickets,
        (SELECT COUNT(*) FROM keywords) as keywords,
        (SELECT COUNT(*) FROM subtypes) as subtypes,
        (SELECT COUNT(*) FROM knowledge_articles) as articles
    `);
    const s = stats.rows[0];
    console.log(`  Groups:  ${s.groups}`);
    console.log(`  Tickets: ${s.tickets}`);
    console.log(`  Keywords: ${s.keywords}`);
    console.log(`  Subtypes: ${s.subtypes}`);
    console.log(`  Articles: ${s.articles}`);

    console.log('\n✅ Import complete!\n');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('❌ Import failed:', err);
  process.exit(1);
});
