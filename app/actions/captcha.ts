'use server'

import { generateCaptcha, verifyCaptcha, generateTextCaptcha, verifyTextCaptcha } from '@/lib/captcha'
import { cookies } from 'next/headers'

export interface CaptchaChallengeResponse {
  success: boolean
  data?: {
    question: string
    token: string
  }
  error?: string
}

/**
 * Generate a new captcha challenge
 */
export async function generateCaptchaChallenge(): Promise<CaptchaChallengeResponse> {
  try {
    const captcha = generateCaptcha()

    // Store token in a secure HTTP-only cookie for additional validation
    const cookieStore = await cookies()
    cookieStore.set('captcha_token', captcha.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 600, // 10 minutes
      path: '/',
    })

    return {
      success: true,
      data: {
        question: captcha.question,
        token: captcha.token,
      },
    }
  } catch (error) {
    console.error('Error generating captcha:', error)
    return {
      success: false,
      error: 'Failed to generate captcha',
    }
  }
}

/**
 * Generate a text-based captcha challenge (alternative)
 */
export async function generateTextCaptchaChallenge(): Promise<CaptchaChallengeResponse> {
  try {
    const captcha = generateTextCaptcha()

    const cookieStore = await cookies()
    cookieStore.set('captcha_token', captcha.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 600,
      path: '/',
    })

    return {
      success: true,
      data: {
        question: captcha.question,
        token: captcha.token,
      },
    }
  } catch (error) {
    console.error('Error generating text captcha:', error)
    return {
      success: false,
      error: 'Failed to generate captcha',
    }
  }
}

/**
 * Verify captcha answer
 */
export async function verifyCaptchaAnswer(
  token: string,
  answer: string,
  isTextCaptcha = false
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate cookie token matches provided token
    const cookieStore = await cookies()
    const cookieToken = cookieStore.get('captcha_token')?.value

    if (cookieToken !== token) {
      return {
        success: false,
        error: 'Invalid captcha token',
      }
    }

    const isValid = isTextCaptcha
      ? verifyTextCaptcha(token, answer)
      : verifyCaptcha(token, answer)

    if (!isValid) {
      return {
        success: false,
        error: 'Incorrect captcha answer',
      }
    }

    // Clear the captcha cookie
    cookieStore.delete('captcha_token')

    return { success: true }
  } catch (error) {
    console.error('Error verifying captcha:', error)
    return {
      success: false,
      error: 'Failed to verify captcha',
    }
  }
}
