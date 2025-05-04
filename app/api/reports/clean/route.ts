import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';
import sharp from 'sharp';
import { Buffer } from 'buffer';

// Define points awarded for cleaning
const POINTS_FOR_CLEANING = 25;

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

    // Optimize image
    const imageBuffer = Buffer.from(await image.arrayBuffer());
    const optimizedImageBuffer = await sharp(imageBuffer)
      .resize(768, 768, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: 80 })
      .toBuffer();

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

    // 2. Update the report record
    const now = new Date().toISOString();
    const { data: updatedReport, error: updateErr } = await supabase
      .from('reports')
      .update({
        cleaned_up: true,
        cleaned_at: now,
        cleaned_image_url: publicUrl,
      })
      .eq('id', reportId)
      .eq('cleaned_up', false) // Ensure we only update if not already cleaned
      .select('id, user_id') // Select user_id for stats update
      .single();

    if (updateErr || !updatedReport) {
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

    // 3. Update user stats for the user who *submitted* the original report
    // Check if the user marking it clean is the same as the original reporter
    const reporterUserId = updatedReport.user_id;
    const cleaningUserId = user.id; // User performing the clean action

    try {
      // Fetch the existing stats record for the *reporter*
      const { data: existingStats, error: statsFetchError } = await supabase
        .from('user_stats')
        .select('id, reports_cleaned, points') // Select fields needed for update
        .eq('user_id', reporterUserId)
        .single();

      if (statsFetchError && statsFetchError.code !== 'PGRST116') { // Ignore 'No rows found' error
         throw statsFetchError; // Throw other fetch errors
      }

      if (!existingStats) {
        // If the original reporter somehow has no stats record, create one
        console.warn(`User ${reporterUserId} had no stats record. Creating one.`);
        const { error: statsCreateError } = await supabase
          .from('user_stats')
          .insert({
            user_id: reporterUserId,
            reports_submitted: 0, // Assuming they must have submitted >= 1, but start clean count
            reports_cleaned: 1,
            points: POINTS_FOR_CLEANING,
            level: 1, // Default level
          });
        if (statsCreateError) {
          console.error('Failed to create user stats during clean update:', statsCreateError);
          // Log error but don't fail the main request
        }
      } else {
        // Update existing stats for the original reporter
        // Use direct increment for simplicity if RPC is complex/unavailable
        const newCleanCount = (existingStats.reports_cleaned || 0) + 1;
        const newPoints = (existingStats.points || 0) + POINTS_FOR_CLEANING;
        
        const { error: statsUpdateError } = await supabase
          .from('user_stats')
          .update({
            reports_cleaned: newCleanCount,
            points: newPoints
          })
          .eq('user_id', reporterUserId);

        if (statsUpdateError) {
          console.error('Failed to update user stats during clean update:', statsUpdateError);
          // Log error but don't fail the main request
        }
      }

       // Optional: Give points/stats to the user who *marked* it clean, if different
       if (cleaningUserId !== reporterUserId) {
           console.log(`User ${cleaningUserId} cleaned report by ${reporterUserId}. Awarding cleaning points.`);
           // Similar logic to update/create stats for cleaningUserId, perhaps with different point values
           // For simplicity, we'll skip this for now but you can add it here.
        }

    } catch (statsErr) {
      console.error('Error handling user stats during clean update:', statsErr);
      // Log error but don't fail the main request
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

