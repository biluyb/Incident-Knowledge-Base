import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import * as fs from 'fs';
import * as path from 'path';

export const dynamic = 'force-dynamic';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const file = await queryOne(
      'SELECT * FROM incident_files WHERE id = $1',
      [parseInt(id) || 0]
    );

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    return NextResponse.json(file);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const file = await queryOne(
      'SELECT * FROM incident_files WHERE id = $1',
      [parseInt(id) || 0]
    );

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Delete physical file
    const filepath = path.join(UPLOAD_DIR, file.stored_name);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }

    // Delete database record
    await queryOne('DELETE FROM incident_files WHERE id = $1', [parseInt(id) || 0]);

    return NextResponse.json({ message: 'File deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
