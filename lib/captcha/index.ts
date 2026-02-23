// Simple Math Captcha for Guest Posting
// This provides a lightweight captcha solution without external dependencies

import { createHash, randomBytes } from 'crypto'

export interface CaptchaChallenge {
  question: string
  answer: string
  token: string
  expiresAt: number
}

// Store captcha challenges in memory (for server-side validation)
// In production, consider using Redis or a database for distributed systems
const captchaStore = new Map<string, CaptchaChallenge>()

// Clean up expired captchas every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [token, challenge] of captchaStore.entries()) {
      if (challenge.expiresAt < now) {
        captchaStore.delete(token)
      }
    }
  }, 5 * 60 * 1000)
}

/**
 * Generate a math captcha challenge
 */
export function generateCaptcha(): CaptchaChallenge {
  const operators = ['+', '-', '*']
  const operator = operators[Math.floor(Math.random() * operators.length)]

  let num1: number
  let num2: number
  let answer: number

  switch (operator) {
    case '+':
      num1 = Math.floor(Math.random() * 50) + 1
      num2 = Math.floor(Math.random() * 50) + 1
      answer = num1 + num2
      break
    case '-':
      num1 = Math.floor(Math.random() * 50) + 20
      num2 = Math.floor(Math.random() * 20) + 1
      answer = num1 - num2
      break
    case '*':
      num1 = Math.floor(Math.random() * 12) + 1
      num2 = Math.floor(Math.random() * 12) + 1
      answer = num1 * num2
      break
    default:
      num1 = 1
      num2 = 1
      answer = 2
  }

  const question = `${num1} ${operator} ${num2} = ?`
  const answerStr = answer.toString()

  // Generate a secure token
  const token = randomBytes(32).toString('hex')

  // Create hash of answer for verification
  const answerHash = createHash('sha256').update(answerStr).digest('hex')

  const challenge: CaptchaChallenge = {
    question,
    answer: answerHash,
    token,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes expiry
  }

  captchaStore.set(token, challenge)

  return challenge
}

/**
 * Verify captcha answer
 */
export function verifyCaptcha(token: string, userAnswer: string): boolean {
  const challenge = captchaStore.get(token)

  if (!challenge) {
    return false
  }

  // Check if expired
  if (challenge.expiresAt < Date.now()) {
    captchaStore.delete(token)
    return false
  }

  // Hash the user's answer
  const userAnswerHash = createHash('sha256').update(userAnswer.trim()).digest('hex')

  // Compare
  const isValid = challenge.answer === userAnswerHash

  // Remove used captcha (one-time use)
  captchaStore.delete(token)

  return isValid
}

/**
 * Check if captcha token exists (for client-side validation)
 */
export function hasCaptchaToken(token: string): boolean {
  const challenge = captchaStore.get(token)
  return challenge !== undefined && challenge.expiresAt > Date.now()
}

/**
 * Simple text-based captcha alternatives
 */
export const textCaptchas = [
  { question: 'What color is the sky on a clear day?', answers: ['blue', 'sky blue', 'light blue'] },
  { question: 'What is 2 + 2?', answers: ['4', 'four'] },
  { question: 'What is the first letter of the alphabet?', answers: ['a', 'A'] },
  { question: 'How many days in a week?', answers: ['7', 'seven'] },
  { question: 'What season comes after winter?', answers: ['spring', 'Spring'] },
]

/**
 * Generate a simple text captcha (alternative to math captcha)
 */
export function generateTextCaptcha(): CaptchaChallenge {
  const captcha = textCaptchas[Math.floor(Math.random() * textCaptchas.length)]
  const token = randomBytes(32).toString('hex')

  // Hash all valid answers
  const answerHashes = captcha.answers.map(a =>
    createHash('sha256').update(a.toLowerCase()).digest('hex')
  )

  const challenge: CaptchaChallenge = {
    question: captcha.question,
    answer: JSON.stringify(answerHashes), // Store all valid hashes
    token,
    expiresAt: Date.now() + 10 * 60 * 1000,
  }

  captchaStore.set(token, challenge)

  return challenge
}

/**
 * Verify text captcha answer
 */
export function verifyTextCaptcha(token: string, userAnswer: string): boolean {
  const challenge = captchaStore.get(token)

  if (!challenge || challenge.expiresAt < Date.now()) {
    return false
  }

  try {
    const validHashes: string[] = JSON.parse(challenge.answer)
    const userHash = createHash('sha256').update(userAnswer.trim().toLowerCase()).digest('hex')

    const isValid = validHashes.includes(userHash)
    captchaStore.delete(token)

    return isValid
  } catch {
    return false
  }
}
