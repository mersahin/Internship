import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';
  const fullName = process.env.SEED_ADMIN_NAME || 'Admin';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`User already exists: ${email} — skipping seed.`);
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      fullName,
      role: 'ADMIN',
      skills: [],
    },
  });

  console.log(`Created ADMIN user: ${email}`);
  console.log('Sign in at /auth/signin with this email and SEED_ADMIN_PASSWORD (or default ChangeMe123!).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
