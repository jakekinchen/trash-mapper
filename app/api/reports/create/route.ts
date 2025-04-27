import { NextRequest, NextResponse } from 'next/server';
import OpenAI from "openai";
import { z } from "zod";
import { createClient } from '@/lib/supabaseServer'
import sharp from 'sharp';

const openai = new OpenAI(); // Assumes OPENAI_API_KEY is set in environment

// ----- Zod schema for the AI result -----
const ReportAnalysis = z.object({
    severity: z.number().int().min(1).max(5),
})

const EnvironmentValidation = z.object({
    is_valid_environment: z.boolean(),
    reason: z.string(),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const form = await request.formData()
    const image = form.get('image') as File | null
    const lat   = parseFloat(String(form.get('latitude')  ?? ''))
    const lon   = parseFloat(String(form.get('longitude') ?? ''))
    const userSeverity = parseInt(String(form.get('severity') ?? '3'), 10)

    if (!image || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      return NextResponse.json(
        { error: 'Missing or invalid fields (image, latitude, longitude)' },
        { status: 400 },
      )
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/bmp',
      'image/tiff',
      'image/heic',
      'image/heif',
      'image/avif'
    ]
    if (!allowedTypes.includes(image.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload a JPEG, PNG, WebP, GIF, BMP, TIFF, HEIC, HEIF, or AVIF image.' },
        { status: 400 },
      )
    }

    // Optimize image using Sharp
    const imageBuffer = Buffer.from(await image.arrayBuffer());
    const optimizedImageBuffer = await sharp(imageBuffer)
      .resize(768, 768, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: 80 })
      .toBuffer();

    // 1. upload optimized image
    const fileName = `${user.id}/${Date.now()}-${image.name.replace(/[^a-z0-9.]/gi, '_')}.webp`
    const { error: uploadError } = await supabase.storage
      .from('report-images')
      .upload(
        fileName,
        optimizedImageBuffer,
        { contentType: 'image/webp' },
      )

    if (uploadError) {
      console.error(uploadError)
      return NextResponse.json({ error: 'Image upload failed' }, { status: 500 })
    }

    const publicUrl =
      supabase.storage.from('report-images').getPublicUrl(fileName).data.publicUrl

    // 2. insert initial report with user's severity
    const { data: inserted, error: insertErr } = await supabase
      .from('reports')
      .insert({
        user_id: user.id,
        geom: `POINT(${lon} ${lat})`,
        image_url: publicUrl,
        severity: userSeverity,
        cleaned_up: false,
      })
      .select('id')
      .single()

    if (insertErr) {
      await supabase.storage.from('report-images').remove([fileName])
      return NextResponse.json(
        { error: 'Failed to save report', details: insertErr.message },
        { status: 500 },
      )
    }

    // Send initial success response
    const response = NextResponse.json(
      { success: true, reportId: inserted.id, imageUrl: publicUrl },
      { status: 201 },
    )

    // 3. ask OpenAI for severity and environment validation (after sending response)
    let analysis: z.infer<typeof ReportAnalysis> | null = null
    let environmentValidation: z.infer<typeof EnvironmentValidation> | null = null
    try {
      const resp = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: `Analyze the image and return JSON with two parts:
1. Rate the trash severity 1–5 (the user rated this ${userSeverity}/5, consider their rating but make your own assessment)
2. Determine if this is a valid environment for trash reporting (public space, outdoor area, etc.) vs invalid (personal photos, faces, indoor private spaces, etc.)
Return the result as a JSON object with severity (number) and is_valid_environment (boolean) fields.` 
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Analyze the image for trash severity and environment validity.' },
              { type: 'image_url', image_url: { url: publicUrl } },
            ],
          },
        ],
        response_format: { type: 'json_object' },
      })

      const raw = resp.choices[0]?.message?.content
      if (raw) {
        console.log('Raw AI response:', raw)
        const parsed = JSON.parse(raw)
        analysis = ReportAnalysis.parse({ severity: parsed.severity })
        environmentValidation = EnvironmentValidation.parse({
          is_valid_environment: parsed.is_valid_environment,
          reason: parsed.reason || 'No reason provided'
        })
        console.log('Parsed AI analysis:', {
          severity: analysis.severity,
          is_valid_environment: environmentValidation.is_valid_environment,
          reason: environmentValidation.reason
        })
      }
    } catch (e) {
      console.error('OpenAI analysis failed:', e)
    }

    // 4. update severity and environment validation if AI succeeded
    if (analysis || environmentValidation) {
      const updates: any = {}
      
      if (analysis) {
        const averageSeverity = Math.round((userSeverity + analysis.severity) / 2)
        updates.severity = averageSeverity
      }
      
      if (environmentValidation) {
        updates.is_valid_environment = environmentValidation.is_valid_environment
      }

      console.log('Updating report with:', updates)
      const { error: updErr } = await supabase
        .from('reports')
        .update(updates)
        .eq('id', inserted.id)
      if (updErr) {
        console.error('Report update failed:', updErr)
      } else {
        console.log('Successfully updated report with AI analysis')
      }
    }

    return response
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { error: 'Unexpected error', details: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}