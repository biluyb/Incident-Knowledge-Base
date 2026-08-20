/**
 * Excel Import Script — v2
 * Properly handles title row + header structure in all 4 sheets.
 *
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
// Helper: parse sheet with title row (row 0) + headers (row 1)
// ============================================================

function parseSheet(workbook: XLSX.WorkBook, sheetName: string): Record<string, string>[] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];

  const raw: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (raw.length < 2) return [];

  // Row 1 = headers
  const headers: string[] = raw[1].map((h: any) => String(h || '').trim());

  // Rows 2+ = data
  const data: Record<string, string>[] = [];
  for (let i = 2; i < raw.length; i++) {
    const row = raw[i];
    const obj: Record<string, string> = {};
    let hasData = false;
    for (let j = 0; j < headers.length; j++) {
      const val = String(row[j] || '').trim();
      obj[headers[j]] = val;
      if (val) hasData = true;
    }
    if (hasData) data.push(obj);
  }
  return data;
}

function cell(row: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    const val = row[k];
    if (val && val.trim()) return val.trim();
  }
  return '';
}

function parseDate(val: string): string | null {
  if (!val || val === 'N/A' || val === 'n/a') return null;
  // Handle "26/May/26 3:45 PM" format
  const d = new Date(val);
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

async function importGroups(sheet: Record<string, string>[]): Promise<Map<string, number>> {
  const groupMap = new Map<string, number>();

  for (const row of sheet) {
    const code = cell(row, 'Group_ID', 'Group', 'Code');
    const name = cell(row, 'Group_Name', 'Name', 'Area');
    const description = cell(row, 'Key_Issues', 'Description');
    const rootCauses = cell(row, 'Common_Root_Causes');
    const typicalPriority = cell(row, 'Typical_Priority');
    const firstResponse = cell(row, 'First_Response_Checklist');

    if (!code || !name) continue;
    // Skip if this looks like a header row
    if (code === 'Group_ID') continue;

    // Build a richer description
    const fullDesc = [
      description ? `Key Issues: ${description}` : '',
      rootCauses ? `Common Root Causes: ${rootCauses}` : '',
      typicalPriority ? `Typical Priority: ${typicalPriority}` : '',
      firstResponse ? `First Response: ${firstResponse}` : '',
    ].filter(Boolean).join('\n\n');

    const result = await pool.query(
      `INSERT INTO groups (code, name, description)
       VALUES ($1, $2, $3)
       ON CONFLICT (code) DO UPDATE SET name = $2, description = $3, updated_at = NOW()
       RETURNING id`,
      [code.toUpperCase(), name, fullDesc || null]
    );
    groupMap.set(code.toUpperCase(), result.rows[0].id);
  }

  console.log(`  ✓ Imported ${groupMap.size} groups`);
  return groupMap;
}

async function importTickets(sheet: Record<string, string>[], groupMap: Map<string, number>): Promise<number> {
  let count = 0;
  let errors = 0;

  for (const row of sheet) {
    const reference = cell(row, 'Reference', 'TSR');
    if (!reference) { errors++; continue; }
    // Skip header row
    if (reference === 'Reference') continue;

    const summary = cell(row, 'Summary');
    const status = cell(row, 'Status');
    const requester = cell(row, 'Requester');
    const createdAt = parseDate(cell(row, 'Created', 'Created Date', 'Created date'));
    const resolvedAt = parseDate(cell(row, 'Resolved', 'Resolved Date', 'Resolved date'));
    const permClosedAt = parseDate(cell(row, 'Permanently Closed', 'Permanently Closed date'));
    const rootCause = cell(row, 'Root Cause Category', 'Root Cause');
    const priority = cell(row, 'Priority');
    const severity = cell(row, 'Severity');
    const groupCode = cell(row, 'Assigned_Group', 'Group', 'Assigned Group').toUpperCase();

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

async function importKeywords(sheet: Record<string, string>[], groupMap: Map<string, number>): Promise<number> {
  let count = 0;

  for (const row of sheet) {
    const keyword = cell(row, 'Keyword / Search Term', 'Keyword', 'Keywords', 'Search Term');
    if (!keyword) continue;
    if (keyword === 'Keyword / Search Term') continue; // skip header

    const groupCode = cell(row, 'Group_ID', 'Group', 'Target Group').toUpperCase();
    const groupId = groupMap.get(groupCode) || null;

    try {
      await pool.query(
        `INSERT INTO keywords (keyword, group_id, weight)
         VALUES ($1, $2, 1)`,
        [keyword, groupId]
      );
      count++;
    } catch (err: any) {
      console.error(`  ✗ Error importing keyword "${keyword}": ${err.message}`);
    }
  }

  console.log(`  ✓ Imported ${count} keywords`);
  return count;
}

async function importSubtypes(sheet: Record<string, string>[], groupMap: Map<string, number>): Promise<{ subtypeMap: Map<string, number>; meta: Map<string, Record<string, string>> }> {
  const subtypeMap = new Map<string, number>();
  const meta = new Map<string, Record<string, string>>();

  for (const row of sheet) {
    const code = cell(row, 'Sub_Type_ID', 'Code', 'Sub-Type', 'Sub-Type Code');
    const name = cell(row, 'Sub_Type_Name', 'Name', 'Sub-Type Name', 'Title');
    const groupCode = cell(row, 'Group_ID', 'Group', 'Group Code').toUpperCase();

    if (!code || !name) continue;
    if (code === 'Sub_Type_ID') continue;
    if (isPlaceholder(name)) continue;

    const groupId = groupMap.get(groupCode);
    if (!groupId) {
      console.error(`  ✗ Skipping subtype ${code}: group ${groupCode} not found`);
      continue;
    }

    const howToIdentify = cell(row, 'How_to_Identify');
    const affectedTsrs = cell(row, 'Affected_TSRs');

    const description = [
      howToIdentify ? `How to Identify:\n${howToIdentify}` : '',
      affectedTsrs ? `Affected TSRs: ${affectedTsrs}` : '',
    ].filter(Boolean).join('\n\n');

    try {
      const result = await pool.query(
        `INSERT INTO subtypes (code, name, description, group_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (code) DO UPDATE SET name = $2, description = $3, group_id = $4, updated_at = NOW()
         RETURNING id`,
        [code, name, description || null, groupId]
      );
      subtypeMap.set(code, result.rows[0].id);

      // Store rich content separately
      meta.set(code, {
        root_cause: cell(row, 'Root_Cause_Technical'),
        diagnostic: cell(row, 'Diagnostic_Data_Required'),
        immediate_fix: cell(row, 'Immediate_Fix_Steps'),
        permanent_fix: cell(row, 'Permanent_Fix_&_Prevention'),
        verification: cell(row, 'Verification_Steps'),
        contact: cell(row, 'Temenos_Engineer_&_Contact'),
        references: cell(row, 'Reference_Links'),
        how_to_identify: howToIdentify,
        affected_tsrs: affectedTsrs,
      });
    } catch (err: any) {
      console.error(`  ✗ Error importing subtype ${code}: ${err.message}`);
    }
  }

  console.log(`  ✓ Imported ${subtypeMap.size} subtypes`);
  return { subtypeMap, meta };
}

async function createKnowledgeArticles(
  subtypeMap: Map<string, number>,
  meta: Map<string, Record<string, string>>,
  groupMap: Map<string, number>
): Promise<number> {
  let count = 0;

  for (const [code, subtypeId] of subtypeMap) {
    // Skip metadata keys
    if (code.includes('__')) continue;

    // Extract group code from subtype code (e.g., ST-E2 -> E)
    const groupLetter = code.replace(/^ST-/i, '').charAt(0).toUpperCase();
    const groupId = groupMap.get(groupLetter);
    if (!groupId) continue;

    // Get rich content from metadata
    const m = meta.get(code) || {};

    const rootCause = m.root_cause || '';
    const diagnosticData = m.diagnostic || '';
    const immediateFix = m.immediate_fix || '';
    const permanentFix = m.permanent_fix || '';
    const verification = m.verification || '';
    const contact = m.contact || '';
    const references = m.references || '';
    const howToIdentify = m.how_to_identify || '';
    const affectedTsrs = m.affected_tsrs || '';

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

      // Determine status: published if has root_cause or immediate_fix content
      const hasContent = (rootCause || immediateFix) && !isPlaceholder(sub.name);
      const status = hasContent ? 'published' : 'draft';

      await pool.query(
        `INSERT INTO knowledge_articles
          (title, group_id, subtype_id, status, symptoms, root_cause, diagnostic_data,
           immediate_fix, permanent_fix, prevention, verification, temenos_contact, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          sub.name,
          groupId,
          subtypeId,
          status,
          howToIdentify || sub.description || null,
          rootCause || null,
          diagnosticData || null,
          immediateFix || null,
          permanentFix || null,
          permanentFix || null, // prevention = same as permanent fix
          verification || null,
          contact || null,
          affectedTsrs ? `Affected TSRs: ${affectedTsrs}` : null,
        ]
      );
      count++;
    } catch (err: any) {
      console.error(`  ✗ Error creating article for ${code}: ${err.message}`);
    }
  }

  console.log(`  ✓ Created ${count} knowledge articles`);
  return count;
}

async function linkTicketsToArticles(): Promise<number> {
  let count = 0;

  // For each knowledge article, find tickets that share the same group and link them
  const articles = await pool.query(`
    SELECT ka.id, ka.group_id, ka.subtype_id
    FROM knowledge_articles ka
    WHERE ka.status = 'published'
  `);

  for (const article of articles.rows) {
    // Find tickets in the same group
    const tickets = await pool.query(
      `SELECT id FROM tickets WHERE group_id = $1`,
      [article.group_id]
    );

    for (const ticket of tickets.rows) {
      try {
        await pool.query(
          `INSERT INTO ticket_articles (ticket_id, article_id)
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [ticket.id, article.id]
        );
        count++;
      } catch {
        // Ignore duplicates
      }
    }
  }

  console.log(`  ✓ Linked ${count} ticket-article relationships`);
  return count;
}

// ============================================================
// Import reference links from Sub_Types sheet
// ============================================================

async function importReferences(
  sheet: Record<string, string>[],
  subtypeMap: Map<string, number>,
  meta: Map<string, Record<string, string>>
): Promise<number> {
  let count = 0;

  for (const [code, subtypeId] of subtypeMap) {
    const m = meta.get(code);
    if (!m || !m.references) continue;

    // Find the article for this subtype
    const articleResult = await pool.query(
      'SELECT id FROM knowledge_articles WHERE subtype_id = $1',
      [subtypeId]
    );
    if (articleResult.rows.length === 0) continue;
    const articleId = articleResult.rows[0].id;

    // Parse references: split by newlines, extract URLs where possible
    const refLines = m.references.split(/\n/).filter(Boolean);
    for (const line of refLines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Extract URL if present
      const urlMatch = trimmed.match(/(https?:\/\/[^\s]+)/);
      const url = urlMatch ? urlMatch[1] : null;
      const title = url ? trimmed.replace(url, '').trim().replace(/^[\-–•]\s*/, '') : trimmed;

      try {
        await pool.query(
          `INSERT INTO references_table (article_id, title, url, reference_type, description)
           VALUES ($1, $2, $3, $4, $5)`,
          [articleId, title || null, url, 'Document', null]
        );
        count++;
      } catch (err: any) {
        console.error(`  ✗ Error adding reference: ${err.message}`);
      }
    }
  }

  console.log(`  ✓ Imported ${count} reference links`);
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
  console.log(`  Sheets found: ${workbook.SheetNames.join(', ')}\n`);

  // Parse sheets (handles title row + header row properly)
  const groupData = parseSheet(workbook, 'Group_Summary');
  const ticketData = parseSheet(workbook, 'All_Tickets_Grouped');
  const lookupData = parseSheet(workbook, 'Quick_Lookup');
  const subtypeData = parseSheet(workbook, 'Sub_Types');

  console.log(`  Group_Summary: ${groupData.length} rows`);
  console.log(`  All_Tickets_Grouped: ${ticketData.length} rows`);
  console.log(`  Quick_Lookup: ${lookupData.length} rows`);
  console.log(`  Sub_Types: ${subtypeData.length} rows`);
  console.log('');

  try {
    // Step 1: Import groups
    console.log('📋 Importing groups...');
    const groupMap = await importGroups(groupData);

    // Step 2: Import tickets
    console.log('\n🎫 Importing tickets...');
    await importTickets(ticketData, groupMap);

    // Step 3: Import keywords
    console.log('\n🔑 Importing keywords...');
    await importKeywords(lookupData, groupMap);

    // Step 4: Import subtypes
    console.log('\n📂 Importing subtypes...');
    const { subtypeMap, meta } = await importSubtypes(subtypeData, groupMap);

    // Step 5: Create knowledge articles from subtypes
    console.log('\n📝 Creating knowledge articles from subtypes...');
    await createKnowledgeArticles(subtypeMap, meta, groupMap);

    // Step 6: Import reference links from subtypes
    console.log('\n📎 Importing reference links...');
    await importReferences(subtypeData, subtypeMap, meta);

    // Step 7: Link tickets to articles
    console.log('\n🔗 Linking tickets to articles...');
    await linkTicketsToArticles();

    // Print summary
    console.log('\n📊 Import Summary:');
    const stats = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM groups) as groups,
        (SELECT COUNT(*) FROM tickets) as tickets,
        (SELECT COUNT(*) FROM keywords) as keywords,
        (SELECT COUNT(*) FROM subtypes) as subtypes,
        (SELECT COUNT(*) FROM knowledge_articles) as articles,
        (SELECT COUNT(*) FROM ticket_articles) as ticket_article_links
    `);
    const s = stats.rows[0];
    console.log(`  Groups:           ${s.groups}`);
    console.log(`  Tickets:          ${s.tickets}`);
    console.log(`  Keywords:         ${s.keywords}`);
    console.log(`  Subtypes:         ${s.subtypes}`);
    console.log(`  Articles:         ${s.articles}`);
    console.log(`  Ticket-Article:   ${s.ticket_article_links}`);

    console.log('\n✅ Import complete!\n');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('❌ Import failed:', err);
  process.exit(1);
});
