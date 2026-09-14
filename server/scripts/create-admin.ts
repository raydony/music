import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';
import { Prisma, PrismaClient } from '../src/generated/prisma/client.js';

const rawArguments = process.argv.slice(2);
const [usernameArgument, passwordArgument] =
  rawArguments[0] === '--' ? rawArguments.slice(1) : rawArguments;
const username = (usernameArgument ?? process.env.ADMIN_INITIAL_USERNAME ?? '').trim();
const password = passwordArgument ?? process.env.ADMIN_INITIAL_PASSWORD ?? '';

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to create an administrator.');
  }

  if (!username || username.length > 64) {
    throw new Error('Administrator username must contain between 1 and 64 characters.');
  }

  if (password.length < 12 || password.length > 128) {
    throw new Error('Administrator password must contain between 12 and 128 characters.');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });

  try {
    const existing = await prisma.adminUser.findUnique({ where: { username } });
    if (existing) {
      throw new Error(`Administrator "${username}" already exists; no changes were made.`);
    }

    const passwordHash = await hash(password, 12);
    const admin = await prisma.adminUser.create({
      data: { username, passwordHash },
      select: { id: true, username: true, isActive: true, createdAt: true },
    });

    console.info('Administrator created', admin);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new Error(`Administrator "${username}" already exists; no changes were made.`, {
        cause: error,
      });
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Failed to create administrator.');
  process.exitCode = 1;
}
