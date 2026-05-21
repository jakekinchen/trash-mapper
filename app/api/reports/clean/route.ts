import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';
import { Buffer } from 'buffer';
import { optimizeImage } from '@/lib/imageServer'

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const form = await request.formData();
    const reportId = form.get('reportId') as string | null;
    const image = form.get('image') as File | null;

    if (!reportId || !image) {
      return NextResponse.json(
        { error: 'Missing required fields (reportId, image)' },
        { status: 400 },
      );
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ];
    if (!allowedTypes.includes(image.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload a JPEG, PNG, or WebP image.' },
        { status: 400 },
      );
    }

    // Optimize image and ensure it's under 3MB
    const imageBuffer = Buffer.from(await image.arrayBuffer());
    const optimizedImageBuffer = await optimizeImage(imageBuffer);

    // 1. Upload optimized "cleaned" image
    // Use a slightly different naming convention or path
    const fileName = `${user.id}/cleaned/${Date.now()}-${image.name.replace(/[^a-z0-9.]/gi, '_')}.webp`;
    const { error: uploadError } = await supabase.storage
      .from('report-images') // Assuming same bucket, adjust if different
      .upload(
        fileName,
        optimizedImageBuffer,
        { contentType: 'image/webp' },
      );

    if (uploadError) {
      console.error('Supabase upload error (clean proof):', uploadError);
      return NextResponse.json({ error: 'Clean proof image upload failed' }, { status: 500 });
    }

    const publicUrl =
      supabase.storage.from('report-images').getPublicUrl(fileName).data.publicUrl;

    // 2. Mark the report clean. The RPC only changes cleanup columns and bumps
    // reporter stats, so authenticated clients do not need broad report updates.
    const { data: updatedRows, error: updateErr } = await supabase
      .rpc('mark_report_clean', {
        p_report_id: reportId,
        p_cleaned_image_url: publicUrl,
      });

    if (updateErr || !updatedRows?.length) {
      console.error('Supabase report update error (clean):', updateErr);
      // Attempt to clean up the uploaded image if update fails
      try {
        await supabase.storage.from('report-images').remove([fileName]);
      } catch (cleanupErr) {
        console.error('Failed to cleanup orphaned clean proof image:', cleanupErr);
      }
      const message = updateErr?.message || 'Report not found or already cleaned.';
      return NextResponse.json(
        { error: 'Failed to mark report as cleaned', details: message },
        { status: updateErr ? 500 : 404 }, // 404 if not found/already cleaned
      );
    }

    // Send success response
    console.log('Report marked as cleaned successfully:', reportId);
    return NextResponse.json(
      { success: true },
      { status: 200 },
    );

  } catch (err) {
    console.error('Unexpected error in POST /api/reports/clean:', err);
    return NextResponse.json(
      { error: 'Unexpected error', details: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
