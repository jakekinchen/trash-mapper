import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

const FEEDBACK_EMAIL = process.env.FEEDBACK_EMAIL || 'feedback@trashmapperatx.com'

export async function POST(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Get the session from the request headers
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      )
    }

    const token = authHeader.split(' ')[1]
    
    // Verify the session
    const { data: { user }, error: sessionError } = await supabase.auth.getUser(token)
    
    if (sessionError || !user) {
      console.error('Session error:', sessionError)
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      )
    }

    const { message } = await request.json()
    const userEmail = user.email

    // Create a transporter using environment variables
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false, // Set to false to allow non-TLS connections
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
      tls: {
        // Do not fail on invalid certs
        rejectUnauthorized: false
      }
    })

    // Send the email
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: FEEDBACK_EMAIL,
      replyTo: userEmail,
      subject: 'New Feedback from Trash Mapper ATX',
      text: `Feedback from ${userEmail}:\n\n${message}`,
      html: `
        <h2>New Feedback</h2>
        <p><strong>From:</strong> ${userEmail}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending feedback:', error)
    return NextResponse.json(
      { error: 'Failed to send feedback' },
      { status: 500 }
    )
  }
} 