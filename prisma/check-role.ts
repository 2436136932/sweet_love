import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: '2436136932@qq.com' },
    select: { id: true, email: true, role: true }
  })
  console.log(JSON.stringify(user))
}

main().finally(() => prisma.$disconnect())