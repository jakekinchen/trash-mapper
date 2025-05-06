import { NextRequest, NextResponse } from 'next/server';
import OpenAI from "openai";
import { z } from "zod";
import { createClient } from '@/lib/supabaseServer'
import sharp from 'sharp';
import { Buffer } from 'buffer';
import exifParser from 'exif-parser';

const openai = new OpenAI(); // Assumes OPENAI_API_KEY is set in environment

// Define the type based on the Zod schema and usage
interface EnvironmentValidationResult {
  is_valid_environment: boolean;
  reason?: string;
}

// ----- Zod schema for the AI result -----
const EnvironmentValidation = z.object({
    is_valid_environment: z.boolean(),
    reason: z.string().optional(), // Make reason optional as it might not always be provided
})

// Helper function to convert DMS (Degrees, Minutes, Seconds) from EXIF to DD (Decimal Degrees)
function convertDMSToDD(degrees: number, minutes: number, seconds: number, direction: string): number {
    let dd = degrees + minutes / 60 + seconds / (60 * 60);
    if (direction === "S" || direction === "W") {
        dd = dd * -1;
    }
    // Round to 6 decimal places (typical precision for GPS)
    return parseFloat(dd.toFixed(6));
}

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
      // Removed less common types for brevity, add back if needed
    ]
    if (!allowedTypes.includes(image.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload a JPEG, PNG, or WebP image.', isValidationError: true, reason: 'Invalid file type' }, // Add validation context
        { status: 400 },
      )
    }

    // Read image buffer
    const imageBuffer = Buffer.from(await image.arrayBuffer());

    // --- START: EXIF GPS Extraction ---
    let exifLat: number | null = null;
    let exifLon: number | null = null;
    try {
        const parser = exifParser(imageBuffer);
        const result = parser.parse();
        const tags = result.tags;

        if (tags && tags.GPSLatitude && tags.GPSLongitude && tags.GPSLatitudeRef && tags.GPSLongitudeRef) {
            console.log("EXIF GPS Data Found:", { lat: tags.GPSLatitude, lon: tags.GPSLongitude, latRef: tags.GPSLatitudeRef, lonRef: tags.GPSLongitudeRef });
            // EXIF GPS data is often an array [degrees, minutes, seconds]
            // If it's just a number, we assume it's already decimal degrees (less common for photos)
            if (Array.isArray(tags.GPSLatitude) && tags.GPSLatitude.length === 3 &&
                Array.isArray(tags.GPSLongitude) && tags.GPSLongitude.length === 3) {
                 // Assuming DMS format [degrees, minutes, seconds]
                 // Note: exif-parser might already return decimal degrees, check result structure if needed
                exifLat = convertDMSToDD(tags.GPSLatitude[0], tags.GPSLatitude[1], tags.GPSLatitude[2], tags.GPSLatitudeRef);
                exifLon = convertDMSToDD(tags.GPSLongitude[0], tags.GPSLongitude[1], tags.GPSLongitude[2], tags.GPSLongitudeRef);
                console.log(`Converted EXIF DD: Lat=${exifLat}, Lon=${exifLon}`);
            } else if (typeof tags.GPSLatitude === 'number' && typeof tags.GPSLongitude === 'number') {
                 // Handle case where GPS data might already be in decimal degrees
                console.log("EXIF GPS Data appears to be Decimal Degrees.");
                exifLat = parseFloat(tags.GPSLatitude.toFixed(6));
                // Longitude needs to be negative for W reference if it's not already
                exifLon = parseFloat((tags.GPSLongitudeRef === 'W' && tags.GPSLongitude > 0 ? -tags.GPSLongitude : tags.GPSLongitude).toFixed(6));
                console.log(`Using EXIF DD: Lat=${exifLat}, Lon=${exifLon}`);
            }
        } else {
           console.log("No complete EXIF GPS Data found in image.");
        }
    } catch (exifError) {
        console.warn("Could not parse EXIF data:", exifError instanceof Error ? exifError.message : exifError);
        // Continue without EXIF data if parsing fails
    }
    // --- END: EXIF GPS Extraction ---

    // Determine final coordinates (Priority: EXIF > Client > Default)
    let finalLat: number;
    let finalLon: number;
    const defaultLat = 30.2672; // Austin Default
    const defaultLon = -97.7431;

    if (exifLat !== null && exifLon !== null && Number.isFinite(exifLat) && Number.isFinite(exifLon)) {
        finalLat = exifLat;
        finalLon = exifLon;
        console.log("Using EXIF coordinates for report.");
    } else if (Number.isFinite(lat) && Number.isFinite(lon)) {
        finalLat = lat;
        finalLon = lon;
        console.log("Using Client-provided coordinates for report.");
    } else {
        finalLat = defaultLat;
        finalLon = defaultLon;
        console.log("Using Default coordinates for report.");
    }

    // Optimize image using Sharp first
    const optimizedImageBuffer = await sharp(imageBuffer)
      .resize(768, 768, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: 80 })
      .toBuffer();
      
    // --- START: OpenAI Validation --- 
    let environmentValidationResult: EnvironmentValidationResult;
    try {
      const base64Image = optimizedImageBuffer.toString('base64');
      const dataUrl = `data:image/webp;base64,${base64Image}`;

      console.log('Sending image to OpenAI for validation...');
      const resp = await openai.chat.completions.create({
        model: 'gpt-4o-mini', // Or gpt-4-vision-preview or gpt-4o
        messages: [
          { 
            role: 'system', 
            content: `Analyze the attached image. Determine if the image depicts litter/pollution in a physical, outdoor, public (or semi-public like a park) environment suitable for a litter reporting app. Do not approve images that are primarily indoors, screenshots, maps, selfies, faces, or lack clear litter. Respond ONLY with a JSON object containing two fields: "is_valid_environment" (boolean) and "reason" (string, explaining why it's invalid, or "Valid environment" if valid). Example invalid reasons: "Image appears to be indoors.", "No clear litter visible.", "Image is a screenshot.", "Image is not a photo of the environment."` 
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Validate the environment and litter presence in this image.' },
              { type: 'image_url', image_url: { url: dataUrl } }, // Use data URL
            ],
          },
        ],
        response_format: { type: 'json_object' },
      })

      const raw = resp.choices[0]?.message?.content
      if (raw) {
        console.log('Raw AI validation response:', raw)
        const parsed = JSON.parse(raw)
        // Only parse validation for now, severity can be added back if needed
        environmentValidationResult = EnvironmentValidation.parse({
          is_valid_environment: parsed.is_valid_environment,
          reason: parsed.reason || 'No reason provided'
        })
        console.log('Parsed AI validation:', environmentValidationResult)

        // --- Add Conditional Logic Here ---
        if (!environmentValidationResult.is_valid_environment) {
           console.log('OpenAI rejected image environment.');
           return NextResponse.json(
             { 
               error: "Image rejected", 
               reason: environmentValidationResult.reason || 'Image does not show litter in a valid outdoor environment.',
               isValidationError: true // Flag for frontend
             }, 
             { status: 400 }
           );
        }
        // Optional: Parse severity here if needed later for insertion

      } else {
        // Handle case where AI response is empty or malformed - treat as validation failure
        console.error('OpenAI returned empty or malformed response for validation.');
        return NextResponse.json(
             { 
               error: "Validation failed", 
               reason: 'Could not validate image with AI.',
               isValidationError: true
             }, 
             { status: 500 } // Use 500 as it's an unexpected server-side issue
           );
      }
    } catch (e) {
      console.error('OpenAI validation call failed:', e)
       // Handle specific OpenAI errors if needed, otherwise return generic server error
        return NextResponse.json(
             { 
               error: "Validation failed", 
               reason: 'Error occurred during AI image validation.',
               isValidationError: true // Still treat as validation context for frontend
             }, 
             { status: 500 } // Internal server error
           );
    }
    // --- END: OpenAI Validation --- 
    
    // If validation passed, proceed with upload and insert
    console.log('OpenAI validation successful. Proceeding with upload and insert.');

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
      console.error('Supabase upload error:', uploadError)
      return NextResponse.json({ error: 'Image upload failed' }, { status: 500 })
    }

    const publicUrl =
      supabase.storage.from('report-images').getPublicUrl(fileName).data.publicUrl

    // 2. insert report (including validation status)
    const { data: inserted, error: insertErr } = await supabase
      .from('reports') // Ensure this table name is correct
      .insert({
        user_id: user.id,
        geom: `POINT(${finalLat} ${finalLon})`,
        image_url: publicUrl,
        severity: userSeverity, // Use user severity for now, or use AI severity if parsed
        is_valid_environment: true, // Set to true since validation passed
        // cleaned_up: false, // TEST: remove this
        // v1_classification_results: classificationData, // changed to update later
      })
      .select('id')
      .single()

    if (insertErr) {
      console.error('Supabase insert error:', insertErr);
      // Attempt to clean up the uploaded image if insert fails
      try {
        await supabase.storage.from('report-images').remove([fileName]);
      } catch (cleanupErr) {
        console.error('Failed to cleanup orphaned image:', cleanupErr);
      }
      return NextResponse.json(
        { error: 'Failed to save report', details: insertErr.message },
        { status: 500 },
      )
    }

    // Update user stats
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
            reports_submitted: 1,  // First report
            points: 10,           // 10 points for first report
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
            reports_submitted: supabase.rpc('increment_counter', { row_id: existingStats.id, counter_name: 'reports_submitted', increment_by: 1 }),
            points: supabase.rpc('increment_counter', { row_id: existingStats.id, counter_name: 'points', increment_by: 10 })
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

    // Send success response
    console.log('Report created successfully:', inserted.id);
    return NextResponse.json(
      { success: true, reportId: inserted.id, imageUrl: publicUrl },
      { status: 201 }, // Use 201 Created status
    )

    // --- REMOVED: Post-response update logic --- 

  } catch (err) {
    console.error('Unexpected error in POST /api/reports/create:', err)
    return NextResponse.json(
      { error: 'Unexpected error', details: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}