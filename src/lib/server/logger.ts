import { prisma } from './db';

export async function logAction(userId: number, action: string, details?: string) {
  try {
    await prisma.log.create({
      data: {
        userId,
        action,
        details: details || null
      }
    });
  } catch (err) {
    console.error('Failed to log action:', err);
  }
}