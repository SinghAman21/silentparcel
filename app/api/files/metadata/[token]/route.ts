import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Handles GET requests to fetch file or zip metadata and file tree by token
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  console.log('Metadata route: Start GET handler');

  try {
    const { token } = await context.params;

    console.log('Fetching file metadata from zip_file_metadata');
    const fileRecord = await prisma.zip_file_metadata.findFirst({ where: { download_token: token } });
    if (!fileRecord) {
      console.log('File not found or expired');
      return NextResponse.json({ error: 'File not found or expired' }, { status: 404 });
    }
    if (!fileRecord.is_active) {
      console.log('File has been deleted');
      return NextResponse.json({ error: 'File has been deleted' }, { status: 410 });
    }
    if (fileRecord.expiry_date && new Date(fileRecord.expiry_date) < new Date()) {
      console.log('File has expired');
      return NextResponse.json({ error: 'File has expired' }, { status: 410 });
    }

    // Fetch file/folder tree from zip_subfile_metadata
    console.log('Fetching subfile metadata from zip_subfile_metadata');
    let subfiles = [];
    try {
      const rawSubfiles = await prisma.zip_subfile_metadata.findMany({ where: { zip_id: fileRecord.id }, select: { file_name: true, file_path: true, size: true, mime_type: true, file_token: true, extracted: true, downloaded_at: true } });
      // Convert BigInt values to strings for JSON serialization
      subfiles = rawSubfiles.map(file => ({
        ...file,
        size: typeof file.size === 'bigint' ? file.size.toString() : file.size,
      }));
    } catch (err:any) {
      console.log('Failed to fetch file tree', err);
      return NextResponse.json({ error: 'Failed to fetch file tree', details: err?.message }, { status: 500 });
    }

    // Return metadata and file tree
    console.log('Returning file metadata and file tree');
    const metadata = {
      id: fileRecord.id,
      original_name: fileRecord.original_name,
      size: typeof fileRecord.size === 'bigint' ? fileRecord.size.toString() : fileRecord.size,
      type: fileRecord.mime_type,
      uploadDate: fileRecord.uploaded_at ? new Date(fileRecord.uploaded_at).toISOString() : null,
      lastDownloadedAt: fileRecord.last_downloaded_at ? new Date(fileRecord.last_downloaded_at).toISOString() : null,
      downloadCount: typeof fileRecord.download_count === 'bigint' ? (fileRecord.download_count as bigint).toString() : (fileRecord.download_count as number),
      maxDownloads: typeof fileRecord.max_downloads === 'bigint' ? (fileRecord.max_downloads as bigint).toString() : (fileRecord.max_downloads as number),
      expiryDate: fileRecord.expiry_date ? new Date(fileRecord.expiry_date).toISOString() : null,
      isPasswordProtected: !!fileRecord.password,
      virusScanStatus: null,
      appwrite_id: fileRecord.appwrite_id,
      isActive: fileRecord.is_active,
      files: subfiles,
      totalFiles: subfiles.length // Add total files count
    };

    const response = NextResponse.json(metadata);
    
    // Add headers to prevent caching for dynamic content
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error: any) {
    const stack = typeof error === 'object' && error && 'stack' in error ? error.stack : undefined;
    console.error('[Metadata API] Unexpected error:', error, stack);
    return NextResponse.json({ error: 'Failed to fetch metadata' }, { status: 500 });
  }
}
