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
    {
      name: "Classic Manicure",
      description: "Shape, buff and polish",
      image: "https://images.unsplash.com/photo-1610992015732-2449b76344bc?auto=format&fit=crop&w=1200&q=80",
      duration: 30,
      price: 20,
      category: "Manicure",
    },
    {
      name: "Gel Manicure",
      description: "Long-lasting gel colour",
      image: "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?auto=format&fit=crop&w=1200&q=80",
      duration: 45,
      price: 30,
      category: "Manicure",
    },
    {
      name: "Acrylic Full Set",
      description: "Full acrylic nail set",
      image: "https://images.unsplash.com/photo-1571290274554-6a2f77c0a35f?auto=format&fit=crop&w=1200&q=80",
      duration: 75,
      price: 45,
      category: "Acrylic",
    },
    {
      name: "Classic Pedicure",
      description: "Soak, trim and polish",
      image: "https://images.unsplash.com/photo-1519014816548-1f8c43d6c0a6?auto=format&fit=crop&w=1200&q=80",
      duration: 45,
      price: 28,
      category: "Pedicure",
    },
    {
      name: "Spa Pedicure",
      description: "Relaxing foot soak and massage",
      image: "https://images.unsplash.com/photo-1519014816548-1f8c43d6c0a6?auto=format&fit=crop&w=1200&q=80",
      duration: 60,
      price: 35,
      category: "Pedicure",
    },
    {
      name: "Nail Art (per nail)",
      description: "Custom nail art designs",
      image: "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=1200&q=80",
      duration: 10,
      price: 5,
      category: "Nail Art",
    },
    {
      name: "French Tips",
      description: "Clean and elegant French finish",
      image: "https://images.unsplash.com/photo-1607457561906-3a0f4e0f9e1d?auto=format&fit=crop&w=1200&q=80",
      duration: 40,
      price: 32,
      category: "Manicure",
    },
    {
      name: "Builder Gel Overlay",
      description: "Strengthen natural nails with builder gel",
      image: "https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=1200&q=80",
      duration: 60,
      price: 38,
      category: "Gel",
    },
    {
      name: "Removal Only",
      description: "Safe removal of gel or acrylic",
      image: "https://images.unsplash.com/photo-1595476360903-9c5bfb3b0b19?auto=format&fit=crop&w=1200&q=80",
      duration: 20,
      price: 15,
      category: "Removal",
    },
    {
      name: "Luxury Combo",
      description: "Manicure and pedicure combo package",
      image: "https://images.unsplash.com/photo-1560072810-1cffb09f5d05?auto=format&fit=crop&w=1200&q=80",
      duration: 90,
      price: 55,
      category: "Package",
    },
  ];

  for (const s of services) {
    const id = s.name.toLowerCase().replace(/ /g, "-").replace(/[()]/g, "");
    await prisma.service.upsert({
      where: { id },
      update: s,
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
