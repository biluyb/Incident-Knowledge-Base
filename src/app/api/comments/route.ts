import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import * as fs from 'fs';
import * as path from 'path';

export const dynamic = 'force-dynamic';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'image/png', 'image/jpeg', 'image/gif', 'image/webp',
  'application/pdf', 'text/plain', 'text/csv', 'text/xml',
  'application/json', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
];

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get('entity_type');
  const entityId = searchParams.get('entity_id');

  if (!entityType || !entityId) {
    return NextResponse.json({ error: 'entity_type and entity_id are required' }, { status: 400 });
  }

  const validTypes = ['group', 'subtype', 'knowledge'];
  if (!validTypes.includes(entityType)) {
    return NextResponse.json({ error: 'Invalid entity_type' }, { status: 400 });
  }

  try {
    const comments = await query(
      `SELECT id, entity_type, entity_id, author, body, file_name, file_size, file_type, created_at, updated_at
       FROM kb_comments
       WHERE entity_type = $1 AND entity_id = $2
       ORDER BY created_at ASC`,
      [entityType, parseInt(entityId)]
    );
    return NextResponse.json(comments);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    let entityType: string | null = null;
    let entityId: string | null = null;
    let author = 'Anonymous';
    let commentBody = '';
    let file: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      // Handle multipart form data (with file)
      const formData = await request.formData();
      entityType = formData.get('entity_type') as string;
      entityId = formData.get('entity_id') as string;
      author = (formData.get('author') as string) || 'Anonymous';
      commentBody = (formData.get('comment_body') as string) || '';
      file = formData.get('file') as File | null;
    } else {
      // Handle JSON body (without file)
      const body = await request.json();
      entityType = body.entity_type;
      entityId = body.entity_id;
      author = body.author || 'Anonymous';
      commentBody = body.comment_body || '';
    }

    if (!entityType || !entityId || !commentBody?.trim()) {
      return NextResponse.json({ error: 'entity_type, entity_id, and body are required' }, { status: 400 });
    }

    if (!['group', 'subtype', 'knowledge'].includes(entityType)) {
      return NextResponse.json({ error: 'entity_type must be group, subtype, or knowledge' }, { status: 400 });
    }

    // Handle file upload if present
    let fileName: string | null = null;
    let fileStored: string | null = null;
    let fileSize: number | null = null;
    let fileType: string | null = null;

    if (file && file.size > 0) {
      // Validate file size
      if (file.size > MAX_SIZE) {
        return NextResponse.json({ error: `File too large. Maximum size is ${MAX_SIZE / 1024 / 1024}MB.` }, { status: 400 });
      }

      // Validate file type
      const ext = path.extname(file.name).toLowerCase();
      if (!ALLOWED_TYPES.includes(file.type) && !ext.match(/\.(log|sql)$/)) {
        return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });
      }

      // Generate safe filename
      const safeFilename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
      const filepath = path.join(UPLOAD_DIR, safeFilename);

      // Save file
      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(filepath, buffer);

      fileName = file.name;
      fileStored = safeFilename;
      fileSize = file.size;
      fileType = file.type || 'application/octet-stream';
    }

    const result = await queryOne<{ id: number }>(
      `INSERT INTO kb_comments (entity_type, entity_id, author, body, file_name, file_stored, file_size, file_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [entityType, parseInt(entityId), author || 'Anonymous', commentBody.trim(), fileName, fileStored, fileSize, fileType]
    );

    if (!result) {
      return NextResponse.json({ error: 'Failed to post comment' }, { status: 500 });
    }

    return NextResponse.json({ id: result.id, message: 'Comment posted' }, { status: 201 });
  } catch (error: any) {
    console.error('Comment POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const commentId = searchParams.get('id');

  if (!commentId) {
    return NextResponse.json({ error: 'Comment id is required' }, { status: 400 });
  }

  try {
    // Get file info before deleting
    const comment = await queryOne<{ file_stored: string }>(
      'SELECT file_stored FROM kb_comments WHERE id = $1',
      [parseInt(commentId)]
    );

    // Delete file from disk if exists
    if (comment?.file_stored) {
      const filepath = path.join(UPLOAD_DIR, comment.file_stored);
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
    }

    await queryOne('DELETE FROM kb_comments WHERE id = $1', [parseInt(commentId)]);
    return NextResponse.json({ message: 'Comment deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
