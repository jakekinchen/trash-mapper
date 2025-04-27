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

    // 3. ask OpenAI for severity (after sending response)
    let analysis: z.infer<typeof ReportAnalysis> | null = null
    try {
      const resp = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { 
            role: 'system', 
            content: `Rate the trash severity 1–5 and return JSON. The user rated this ${userSeverity}/5. Consider their rating but make your own assessment.` 
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Rate severity 1–5.' },
              { type: 'image_url', image_url: { url: publicUrl } },
            ],
          },
        ],
        response_format: { type: 'json_object' },
      })

      const raw = resp.choices[0]?.message?.content
      if (raw) analysis = ReportAnalysis.parse(JSON.parse(raw))
    } catch (e) {
      console.error('OpenAI analysis failed:', e)
    }

    // 4. update severity if AI succeeded by averaging with user's rating
    if (analysis) {
      const averageSeverity = Math.round((userSeverity + analysis.severity) / 2)
      const { error: updErr } = await supabase
        .from('reports')
        .update({ severity: averageSeverity })
        .eq('id', inserted.id)
      if (updErr) console.error('Severity update failed:', updErr)
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