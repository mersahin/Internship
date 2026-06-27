import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Partner companies / projects from the original spreadsheet.
const SEED_COMPANIES = ['BCS-IT', 'OKAY', 'NFC', 'Abics'];

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';
  const fullName = process.env.SEED_ADMIN_NAME || 'Admin';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`User already exists: ${email} — skipping admin seed.`);
  } else {
    const hashedPassword = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: { email, password: hashedPassword, fullName, role: 'ADMIN', skills: [] },
    });
    console.log(`Created ADMIN user: ${email}`);
  }

  // Idempotent company seed (Company.name is not unique, so check first).
  for (const name of SEED_COMPANIES) {
    const found = await prisma.company.findFirst({ where: { name } });
    if (!found) {
      await prisma.company.create({ data: { name } });
      console.log(`Created company: ${name}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
