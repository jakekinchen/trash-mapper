import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

const FEEDBACK_EMAIL = process.env.FEEDBACK_EMAIL || 'feedback@trashmapperatx.com'

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { message } = await request.json()
    const userEmail = session.user.email

    // Create a transporter using environment variables
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
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