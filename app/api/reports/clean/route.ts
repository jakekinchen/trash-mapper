import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let reportId: string | null = null;

  try {
    const body = await request.json();
    reportId = body.reportId;

    if (!reportId) {
      return NextResponse.json({ error: 'Missing reportId' }, { status: 400 });
    }

    // 1. Verify the report exists and hasn't been cleaned yet
    const { data: reportData, error: fetchError } = await supabase
      .from('reports')
      .select('cleaned_at, user_id')
      .eq('id', reportId)
      .single();

    if (fetchError) {
      console.error(`Error fetching report ${reportId}:`, fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch report' },
        { status: fetchError.code === 'PGRST116' ? 404 : 500 }
      );
    }

    if (reportData.cleaned_at) {
      return NextResponse.json(
        { error: 'Report has already been marked as cleaned' },
        { status: 400 }
      );
    }

    // 2. Update the report as cleaned
    const { error: updateError } = await supabase
      .from('reports')
      .update({ cleaned_at: new Date().toISOString() })
      .eq('id', reportId);

    if (updateError) {
      console.error(`Error updating report ${reportId} as cleaned:`, updateError);
      return NextResponse.json(
        { error: 'Failed to mark report as cleaned' },
        { status: 500 }
      );
    }

    // 3. Update user stats for the user who cleaned it
    try {
      // First check if user has stats record
      const { data: existingStats } = await supabase
        .from('user_stats')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!existingStats) {
        // Create initial stats record
        const { error: statsCreateError } = await supabase
          .from('user_stats')
          .insert({
            user_id: user.id,
            reports_cleaned: 1,
            points: 15, // More points for cleaning than reporting
          });

        if (statsCreateError) {
          console.error('Failed to create user stats:', statsCreateError);
          // Don't fail the request, just log the error
        }
      } else {
        // Update existing stats
        const { error: statsUpdateError } = await supabase
          .from('user_stats')
          .update({
            reports_cleaned: supabase.rpc('increment_counter', { row_id: existingStats.id, counter_name: 'reports_cleaned', increment_by: 1 }),
            points: supabase.rpc('increment_counter', { row_id: existingStats.id, counter_name: 'points', increment_by: 15 })
          })
          .eq('user_id', user.id);

        if (statsUpdateError) {
          console.error('Failed to update user stats:', statsUpdateError);
          // Don't fail the request, just log the error
        }
      }
    } catch (statsErr) {
      console.error('Error handling user stats:', statsErr);
      // Don't fail the request, just log the error
    }

    // 4. Send success response
    return NextResponse.json(
      { success: true, message: 'Report marked as cleaned' },
      { status: 200 }
    );

  } catch (error) {
    console.error(`Unexpected error in POST /api/reports/clean for reportId ${reportId || 'unknown'}:`, error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred while marking report as cleaned';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
