import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Seed admin
  const hashed = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { email: "admin@kingnails.co.uk" },
    update: {},
    create: {
      email: "admin@kingnails.co.uk",
      password: hashed,
      name: "Admin",
      role: "ADMIN",
    },
  });

  // Seed services
  const services = [
    { name: "Classic Manicure", description: "Shape, buff and polish", duration: 30, price: 20, category: "Manicure" },
    { name: "Gel Manicure", description: "Long-lasting gel colour", duration: 45, price: 30, category: "Manicure" },
    { name: "Acrylic Full Set", description: "Full acrylic nail set", duration: 75, price: 45, category: "Acrylic" },
    { name: "Classic Pedicure", description: "Soak, trim and polish", duration: 45, price: 28, category: "Pedicure" },
    { name: "Nail Art (per nail)", description: "Custom nail art designs", duration: 10, price: 5, category: "Nail Art" },
  ];

  for (const s of services) {
    const id = s.name.toLowerCase().replace(/ /g, "-").replace(/[()]/g, "");
    await prisma.service.upsert({
      where: { id },
      update: {},
      create: { id, ...s },
    });
  }

  // Seed staff
  const staff = [
    { name: "Linh Nguyen", email: "linh@kingnails.co.uk", bio: "10 years experience in nail artistry" },
    { name: "Mai Tran", email: "mai@kingnails.co.uk", bio: "Specialist in gel and acrylic" },
  ];

  for (const st of staff) {
    await prisma.staff.upsert({
      where: { email: st.email },
      update: {},
      create: st,
    });
  }

  console.log("✅ Seed complete");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
