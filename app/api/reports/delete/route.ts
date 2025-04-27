import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let reportId: string | null = null; // Define reportId here to access in catch block

  try {
    const body = await request.json();
    reportId = body.reportId; // Assign here

    if (!reportId) {
      return NextResponse.json({ error: 'Missing reportId' }, { status: 400 });
    }

    // 1. Fetch the report to get image_url and verify ownership
    const { data: reportData, error: fetchError } = await supabase
      .from('reports')
      .select('image_url')
      .eq('id', reportId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !reportData) {
      console.error(`Error fetching report ${reportId} for deletion or report not found/authorized:`, fetchError);
      const errorMessage = fetchError ? fetchError.message : 'Report not found or user not authorized.';
      const status = fetchError && fetchError.code === 'PGRST116' ? 404 : 500; // PGRST116: row not found
      // Distinguish between not found/auth (404) and other fetch errors (500)
      return NextResponse.json({ error: errorMessage }, { status: status === 404 ? 404 : 500 });
    }

    // 2. Delete the associated image from storage, if it exists
    if (reportData.image_url) {
      try {
        // Assuming URL format: https://<project-ref>.supabase.co/storage/v1/object/public/images/<path/to/image.jpg>
        // We need the part after 'images/' which is '<path/to/image.jpg>'
        const imageUrlParts = reportData.image_url.split('/images/');
        if (imageUrlParts.length > 1) {
          const imagePath = imageUrlParts[1];
          console.log(`Attempting to delete image: ${imagePath} for report ${reportId}`);
          const { error: imageDeleteError } = await supabase.storage
            .from('images') // Ensure this is your bucket name
            .remove([imagePath]);

          if (imageDeleteError) {
            // Log image deletion error but proceed with DB record deletion
            console.error(`Failed to delete image ${imagePath} for report ${reportId}:`, imageDeleteError);
          } else {
            console.log(`Successfully deleted image ${imagePath} for report ${reportId}`);
          }
        } else {
             console.warn(`Could not parse image path from URL: ${reportData.image_url} for report ${reportId}`);
        }
      } catch (imgErr) {
           // Catch any unexpected error during image path parsing or deletion call
           console.error(`Unexpected error during image deletion process for report ${reportId}:`, imgErr);
      }
    }

    // 3. Delete the report record from the database
    // Use match for composite key check, should be equivalent to previous .eq().eq()
    const { error: deleteError, count } = await supabase
      .from('reports')
      .delete({ count: 'exact' }) // Keep count for verification if needed
      .match({ id: reportId, user_id: user.id });

    if (deleteError) {
      // Log the specific database deletion error
      console.error(`Supabase delete error for report ${reportId}:`, deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // This check might be redundant if the fetch succeeded, but good as a safeguard
    if (count === 0) {
       console.error(`Report ${reportId} fetched successfully but delete count was 0.`);
       // This case might indicate a race condition or unexpected state, treat as server error.
      return NextResponse.json({ error: 'Report found but failed to delete.' }, { status: 500 });
    }

    console.log(`Successfully deleted report ${reportId} and associated image (if any). Deleted count: ${count}`);
    return NextResponse.json({ success: true, deleted: count });

  } catch (error) {
    // Log any other unexpected errors in the process
    console.error(`Unexpected error in DELETE /api/reports/delete for reportId ${reportId || 'unknown'}:`, error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred during report deletion.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
