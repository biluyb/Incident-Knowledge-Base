import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export const dynamic = 'force-dynamic';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fileName = searchParams.get('file');

  if (!fileName) {
    return NextResponse.json({ error: 'File name is required' }, { status: 400 });
  }

  // Prevent path traversal
  const safeName = path.basename(fileName);
  const filepath = path.join(UPLOAD_DIR, safeName);

  if (!fs.existsSync(filepath)) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  try {
    const buffer = fs.readFileSync(filepath);
    const ext = path.extname(safeName).toLowerCase();

    // Determine content type
    const contentTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.txt': 'text/plain',
      '.csv': 'text/csv',
      '.xml': 'text/xml',
      '.json': 'application/json',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.zip': 'application/zip',
      '.log': 'text/plain',
      '.sql': 'text/plain',
    };

    const contentType = contentTypes[ext] || 'application/octet-stream';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${safeName}"`,
        'Content-Length': String(buffer.length),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to read file' }, { status: 500 });
  }
}
