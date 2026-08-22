import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requirePermission, auditLog } from '@/lib/api-auth';
import * as fs from 'fs';
import * as path from 'path';

export const dynamic = 'force-dynamic';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'image/png', 'image/jpeg', 'image/gif', 'image/webp',
  'application/pdf',
  'text/plain', 'text/csv', 'text/xml',
  'application/json',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
];

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ticketId = searchParams.get('ticket_id');

  if (!ticketId) {
    return NextResponse.json({ error: 'ticket_id is required' }, { status: 400 });
  }

  try {
    const files = await query(`
      SELECT * FROM incident_files
      WHERE ticket_id = $1
      ORDER BY created_at DESC
    `, [parseInt(ticketId)]);

    return NextResponse.json(files);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'file.upload');
  if (auth.error) return auth.error;

  try {
    const formData = await request.formData();
    const ticketId = formData.get('ticket_id') as string;
    const file = formData.get('file') as File;

    if (!ticketId || !file) {
      return NextResponse.json({ error: 'ticket_id and file are required' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: `File too large. Maximum size is ${MAX_SIZE / 1024 / 1024}MB.` }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type) && !file.name.endsWith('.log') && !file.name.endsWith('.sql')) {
      return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });
    }

    // Sanitize filename
    const originalName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 255);

    // Verify ticket exists
    const ticket = await queryOne('SELECT id FROM tickets WHERE id = $1', [parseInt(ticketId)]);
    if (!ticket) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    // Generate safe filename
    const ext = path.extname(file.name) || '';
    const safeFilename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
    const filepath = path.join(UPLOAD_DIR, safeFilename);

    // Save file
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filepath, buffer);

    // Save to database
    const result = await queryOne<{ id: number }>(`
      INSERT INTO incident_files (ticket_id, original_name, stored_name, file_size, mime_type)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [
      parseInt(ticketId),
      originalName,
      safeFilename,
      file.size,
      file.type || 'application/octet-stream',
    ]);

    if (!result) {
      return NextResponse.json({ error: 'Failed to save file record' }, { status: 500 });
    }

    await auditLog({
      userId: auth.user.userId,
      action: 'file.upload',
      entityType: 'file',
      entityId: result.id,
      details: `Uploaded ${originalName} to incident ${ticketId}`,
    });

    return NextResponse.json({ id: result.id, message: 'File uploaded' }, { status: 201 });
  } catch (error: any) {
    console.error('File upload error:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
