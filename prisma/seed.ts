import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const courts = [
    { name: "Court 1", description: "Standard Indoor Court 1" },
    { name: "Court 2", description: "Standard Indoor Court 2" },
    { name: "Court 3", description: "Standard Indoor Court 3" },
  ];

  for (const court of courts) {
    await prisma.court.upsert({
      where: { name: court.name },
      update: {},
      create: court,
    });
  }
  console.log("3 Courts seeded successfully.");

  const adminEmail = "admin@badmintonku.com";
  const existingAdmin = await prisma.admin.findUnique({
    where: { email: adminEmail },
  });

  const hashedPassword = await bcrypt.hash("admin123", 10);

  if (!existingAdmin) {
    await prisma.admin.create({
      data: {
        email: adminEmail,
        name: "Super Admin",
        password: hashedPassword,
        role: "ADMIN",
      },
    });
    console.log("Default admin seeded: admin@badmintonku.com / admin123");
  } else {
    await prisma.admin.update({
      where: { email: adminEmail },
      data: { password: hashedPassword },
    });
    console.log("Admin password updated with hash.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
