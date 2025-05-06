import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';
import sharp from 'sharp';
import { Buffer } from 'buffer';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { reportId, imageUrl } = await request.json();

    if (!reportId || !imageUrl) {
      return NextResponse.json(
        { error: 'Missing required fields (reportId, imageUrl)' },
        { status: 400 },
      );
    }

    // Fetch the image from the URL
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    // Optimize image using Sharp
    const optimizedImageBuffer = await sharp(imageBuffer)
      .resize(768, 768, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: 80 })
      .toBuffer();

    // --- START: HuggingFace Image Classification ---
    let classificationData = null;
    const maxRetries = 3;
    let retryCount = 0;
    let lastError = null;

    while (retryCount < maxRetries) {
      try {
        const base64Image = optimizedImageBuffer.toString('base64');
        const response = await fetch(process.env.HUGGINGFACE_API_URL!, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ inputs: base64Image }),
        });

        if (response.status === 503) {
          console.log('HuggingFace API is waking up, retrying in 5 seconds...');
          await new Promise(resolve => setTimeout(resolve, 5000));
          retryCount++;
          continue;
        }

        if (!response.ok) {
          throw new Error(`HuggingFace API error: ${response.status} ${response.statusText}`);
        }

        classificationData = await response.json();
        console.log('HuggingFace classification successful:', classificationData);
        break;
      } catch (error) {
        lastError = error;
        console.error(`HuggingFace classification attempt ${retryCount + 1} failed:`, error);
        retryCount++;
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    }

    if (!classificationData && lastError) {
      console.warn('Classification failed after all retries:', lastError);
      return NextResponse.json(
        { error: 'Classification failed', details: lastError instanceof Error ? lastError.message : String(lastError) },
        { status: 500 },
      );
    }

    // Update the report with classification data
    const { error: updateError } = await supabase
      .from('reports')
      .update({
        v1_classification_results: classificationData,
      })
      .eq('id', reportId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Failed to update report with classification data:', updateError);
      return NextResponse.json(
        { error: 'Failed to update report', details: updateError.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { success: true, classificationData },
      { status: 200 },
    );

  } catch (err) {
    console.error('Unexpected error in POST /api/reports/classify:', err);
    return NextResponse.json(
      { error: 'Unexpected error', details: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
} 