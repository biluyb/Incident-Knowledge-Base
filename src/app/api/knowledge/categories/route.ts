import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Attempt to query knowledge_categories table
    const categories = await query(`
      SELECT id, name, code, description, created_at
      FROM knowledge_categories
      ORDER BY name ASC
    `);

    return NextResponse.json({ categories });
  } catch (err: any) {
    // Graceful fallback to default categories if migration hasn't been executed yet
    const defaultCategories = [
      { id: 1, name: 'Temenos T24 / Transact', code: 'T24', description: 'Core banking transaction processing and setup' },
      { id: 2, name: 'AA / Arrangements', code: 'AA', description: 'Arrangement Architecture accounts, products and conditions' },
      { id: 3, name: 'COB / EOD / SOD', code: 'COB', description: 'Close of Business, End of Day, and Start of Day batches' },
      { id: 4, name: 'TAFJ / JBoss', code: 'TAFJ', description: 'Application framework, runtime, and server configuration' },
      { id: 5, name: 'Oracle Database', code: 'ORACLE', description: 'Database administration, SQL tuning, and tablespaces' },
      { id: 6, name: 'FCM / AML', code: 'FCM', description: 'Financial Crime Mitigation, screening and compliance' },
      { id: 7, name: 'Integration and APIs', code: 'APIS', description: 'Web services, integration adapters, and payment gateways' },
      { id: 8, name: 'Payments and Transfers', code: 'PAYMENTS', description: 'RTGS, ACH, internal transfers, and SWIFT' },
      { id: 9, name: 'Interest and Loans', code: 'LOANS', description: 'Accruals, schedules, disbursements, and loan lifecycles' },
      { id: 10, name: 'System Administration', code: 'SYSADMIN', description: 'Security, permissions, platform maintenance' },
      { id: 11, name: 'Projects and Implementations', code: 'PROJECTS', description: 'Project guides, upgrade procedures, and rollouts' },
      { id: 12, name: 'Troubleshooting and Known Errors', code: 'ERRORS', description: 'Standard error diagnosis and operational fixes' },
    ];
    return NextResponse.json({ categories: defaultCategories });
  }
}

