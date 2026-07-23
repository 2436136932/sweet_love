/**
 * 一次性脚本：把指定邮箱的用户提升为管理员
 * 运行：npx tsx prisma/seed-admin.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // 首个注册用户自动为 admin，同时支持环境变量指定额外邮箱
  const adminEmail = '2436136932@qq.com'

  if (adminEmail) {
    const user = await prisma.user.findUnique({ where: { email: adminEmail } })
    if (!user) {
      console.warn(`⚠️  邮箱 ${adminEmail} 还未注册，请先注册后再运行本脚本`)
      return
    }
    await prisma.user.update({
      where: { email: adminEmail },
      data: { role: 'admin' }
    })
    console.log(`✅ 已将 ${adminEmail} 设为管理员`)
    return
  }

  // 兜底：没有指定邮箱时，第一个注册用户自动为 admin
  const firstUser = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } })
  if (!firstUser) {
    console.warn('⚠️  数据库中没有任何用户，请先注册后再运行本脚本')
    return
  }
  await prisma.user.update({
    where: { id: firstUser.id },
    data: { role: 'admin' }
  })
  console.log(`✅ 已将首个用户 ${firstUser.email} 设为管理员`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
