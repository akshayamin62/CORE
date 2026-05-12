import crypto from 'crypto';
import CaptchaStore from '../models/CaptchaStore';

/**
 * Generate a simple math captcha challenge.
 * Stores the challenge in MongoDB (TTL-indexed) so it works across multiple server instances.
 * Returns a token (to identify the challenge) and the question string.
 */
export async function generateCaptchaChallenge(): Promise<{ token: string; question: string }> {
  const operators = ['+', '-', '×'] as const;
  const op = operators[Math.floor(Math.random() * operators.length)];

  let a: number, b: number, answer: number;

  switch (op) {
    case '+':
      a = Math.floor(Math.random() * 50) + 1;  // 1-50
      b = Math.floor(Math.random() * 50) + 1;  // 1-50
      answer = a + b;
      break;
    case '-':
      a = Math.floor(Math.random() * 50) + 10; // 10-59
      b = Math.floor(Math.random() * a);        // 0 to a-1 (result always positive)
      answer = a - b;
      break;
    case '×':
      a = Math.floor(Math.random() * 9) + 2;  // 2-10
      b = Math.floor(Math.random() * 9) + 2;  // 2-10
      answer = a * b;
      break;
    default:
      a = 1; b = 1; answer = 2;
  }

  const question = `${a} ${op} ${b} = ?`;
  const token = crypto.randomBytes(16).toString('hex');

  await CaptchaStore.create({
    token,
    answer,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
  });

  return { token, question };
}

/**
 * Verify a captcha answer against a stored challenge.
 * Single-use: the document is atomically deleted on first verification attempt.
 */
export async function verifyCaptcha(token: string, userAnswer: number): Promise<boolean> {
  // findOneAndDelete is atomic — prevents replay attacks even under concurrent requests
  const doc = await CaptchaStore.findOneAndDelete({
    token,
    expiresAt: { $gt: new Date() },
  });

  if (!doc) return false;
  return (doc as any).answer === userAnswer;
}
