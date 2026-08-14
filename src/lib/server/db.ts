import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
	datasources: {
		db: {
			url: process.env.DIRECT_URL
		}
	}
});

export { prisma };
