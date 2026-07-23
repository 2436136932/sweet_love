import { prisma } from '../db.js'

const PRESET_COUPONS = [
  {
    key: 'massage',
    name: '一次按摩券',
    category: 'reward',
    description: '凭此券可获得一次贴心按摩服务',
    price: 50,
    expiryDays: 30
  },
  {
    key: 'no-dishes',
    name: '免洗碗券',
    category: 'reward',
    description: '凭此券可免除一次洗碗任务',
    price: 30,
    expiryDays: 30
  },
  {
    key: 'movie-night',
    name: '电影之夜券',
    category: 'activity',
    description: '凭此券可要求对方陪你看一场电影',
    price: 80,
    expiryDays: 60
  },
  {
    key: 'breakfast-in-bed',
    name: '早餐送到床边券',
    category: 'reward',
    description: '凭此券可获得一次床边早餐服务',
    price: 60,
    expiryDays: 30
  },
  {
    key: 'apology',
    name: '认错券',
    category: 'punishment',
    description: '凭此券要求对方真诚认错一次',
    price: 20,
    expiryDays: 30
  },
  {
    key: 'back-hug',
    name: '背后抱抱券',
    category: 'reward',
    description: '凭此券可获得一个温暖的背后抱抱',
    price: 10,
    expiryDays: 30
  }
]

export async function ensureCouple(userId: string) {
  const couple = await prisma.couple.findFirst({
    where: { OR: [{ userAId: userId }, { userBId: userId }] }
  })
  return couple
}

export function getPartnerId(
  couple: { userAId: string; userBId: string },
  userId: string
) {
  return couple.userAId === userId ? couple.userBId : couple.userAId
}

export async function ensurePointSettings(coupleId: string) {
  return prisma.couplePointSettings.upsert({
    where: { coupleId },
    update: {},
    create: { coupleId }
  })
}

export async function ensurePointBalance(userId: string, coupleId: string) {
  return prisma.pointBalance.upsert({
    where: { userId_coupleId: { userId, coupleId } },
    update: {},
    create: { userId, coupleId }
  })
}

export function todayDate() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function calculateLongestStreak(dates: Date[]): number {
  if (dates.length === 0) return 0
  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime())
  let longestStreak = 1
  let tempStreak = 1
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const curr = sorted[i]
    if (addDays(prev, 1).getTime() === curr.getTime()) {
      tempStreak += 1
    } else {
      tempStreak = 1
    }
    longestStreak = Math.max(longestStreak, tempStreak)
  }
  return longestStreak
}

export function calculateCheckInPoints(
  consecutiveDays: number,
  baseScore: number
): number {
  return Math.max(1, consecutiveDays) * Math.max(1, baseScore)
}

export function canTransfer(
  balance: number,
  amount: number
): { ok: boolean; reason?: string } {
  if (!Number.isInteger(amount) || amount <= 0) {
    return { ok: false, reason: '转账积分必须为正整数' }
  }
  if (balance < amount) {
    return { ok: false, reason: '积分不足' }
  }
  return { ok: true }
}

export function resolveCouponStatus(
  currentStatus: string,
  now: Date,
  expiresAt?: Date | null,
  usedAt?: Date | null
): string {
  if (currentStatus === 'used' || usedAt) return 'used'
  if (currentStatus === 'expired') return 'expired'
  if (expiresAt && expiresAt < now) return 'expired'
  return 'unused'
}

export async function getCheckInStatus(userId: string, coupleId: string) {
  const today = todayDate()
  const [todayCheckIn, yesterdayCheckIn, allCheckIns] = await Promise.all([
    prisma.checkIn.findFirst({
      where: { userId, coupleId, date: today }
    }),
    prisma.checkIn.findFirst({
      where: { userId, coupleId, date: addDays(today, -1) }
    }),
    prisma.checkIn.findMany({
      where: { userId, coupleId },
      orderBy: { date: 'desc' }
    })
  ])

  let currentStreak = 0
  if (todayCheckIn) {
    currentStreak = todayCheckIn.consecutiveDays
  } else if (yesterdayCheckIn) {
    currentStreak = yesterdayCheckIn.consecutiveDays
  }

  const longestStreak = calculateLongestStreak(allCheckIns.map((ci) => ci.date))

  return {
    todayChecked: Boolean(todayCheckIn),
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
    checkedDates: allCheckIns.map((ci) => ci.date.toISOString().split('T')[0])
  }
}

export async function performCheckIn(userId: string, coupleId: string) {
  const today = todayDate()
  const existing = await prisma.checkIn.findFirst({
    where: { userId, coupleId, date: today }
  })
  if (existing) {
    throw new Error('今日已签到')
  }

  const yesterday = addDays(today, -1)
  const yesterdayCheckIn = await prisma.checkIn.findFirst({
    where: { userId, coupleId, date: yesterday }
  })

  const consecutiveDays = yesterdayCheckIn
    ? yesterdayCheckIn.consecutiveDays + 1
    : 1
  const settings = await ensurePointSettings(coupleId)
  const pointsEarned = calculateCheckInPoints(
    consecutiveDays,
    settings.baseScore
  )

  await prisma.$transaction(async (tx) => {
    await tx.checkIn.create({
      data: {
        date: today,
        userId,
        coupleId,
        consecutiveDays,
        pointsEarned
      }
    })

    await tx.pointBalance.upsert({
      where: { userId_coupleId: { userId, coupleId } },
      update: {
        balance: { increment: pointsEarned },
        totalEarned: { increment: pointsEarned }
      },
      create: {
        userId,
        coupleId,
        balance: pointsEarned,
        totalEarned: pointsEarned
      }
    })

    await tx.pointTransaction.create({
      data: {
        userId,
        coupleId,
        amount: pointsEarned,
        type: 'check_in',
        description: `连续签到 ${consecutiveDays} 天`
      }
    })
  })

  return { consecutiveDays, pointsEarned }
}

export async function getPointOverview(userId: string, coupleId: string) {
  const couple = await prisma.couple.findUnique({ where: { id: coupleId } })
  const partnerId = couple
    ? couple.userAId === userId
      ? couple.userBId
      : couple.userAId
    : null

  const [myBalance, partnerBalance, settings, myStatus, partnerStatus] =
    await Promise.all([
      ensurePointBalance(userId, coupleId),
      partnerId ? ensurePointBalance(partnerId, coupleId) : null,
      ensurePointSettings(coupleId),
      getCheckInStatus(userId, coupleId),
      partnerId ? getCheckInStatus(partnerId, coupleId) : null
    ])

  const today = todayDate()
  const todayCheckIn = await prisma.checkIn.findFirst({
    where: { userId, coupleId, date: today }
  })

  return {
    myBalance: myBalance.balance,
    myTotalEarned: myBalance.totalEarned,
    myTotalSpent: myBalance.totalSpent,
    partnerBalance: partnerBalance?.balance ?? 0,
    partnerTotalEarned: partnerBalance?.totalEarned ?? 0,
    partnerTotalSpent: partnerBalance?.totalSpent ?? 0,
    myStreak: myStatus.currentStreak,
    partnerStreak: partnerStatus?.currentStreak ?? 0,
    todayPoints: todayCheckIn?.pointsEarned ?? 0,
    baseScore: settings.baseScore,
    checkInReminder: settings.checkInReminder
  }
}

export async function getTransactions(
  userId: string,
  coupleId: string,
  limit = 50
) {
  return prisma.pointTransaction.findMany({
    where: { userId, coupleId },
    orderBy: { createdAt: 'desc' },
    take: limit
  })
}

export async function transferPoints(
  senderId: string,
  coupleId: string,
  amount: number,
  note?: string
) {
  const couple = await prisma.couple.findUnique({ where: { id: coupleId } })
  if (!couple) {
    throw new Error('情侣关系不存在')
  }
  const receiverId =
    couple.userAId === senderId ? couple.userBId : couple.userAId

  await prisma.$transaction(async (tx) => {
    const senderBalance = await tx.pointBalance.findUnique({
      where: { userId_coupleId: { userId: senderId, coupleId } }
    })
    const check = canTransfer(senderBalance?.balance ?? 0, amount)
    if (!check.ok) {
      throw new Error(check.reason)
    }

    await tx.pointBalance.update({
      where: { id: senderBalance.id },
      data: {
        balance: { decrement: amount },
        totalSpent: { increment: amount }
      }
    })

    await tx.pointBalance.upsert({
      where: { userId_coupleId: { userId: receiverId, coupleId } },
      update: {
        balance: { increment: amount },
        totalEarned: { increment: amount }
      },
      create: {
        userId: receiverId,
        coupleId,
        balance: amount,
        totalEarned: amount
      }
    })

    await tx.pointTransaction.create({
      data: {
        userId: senderId,
        coupleId,
        amount: -amount,
        type: 'transfer_out',
        relatedUserId: receiverId,
        description: note || '转账给 TA'
      }
    })

    await tx.pointTransaction.create({
      data: {
        userId: receiverId,
        coupleId,
        amount,
        type: 'transfer_in',
        relatedUserId: senderId,
        description: note || '来自 TA 的转账'
      }
    })
  })

  return { receiverId, amount }
}

export async function ensurePresetCoupons(
  coupleId: string,
  createdById: string
) {
  const existing = await prisma.couponTemplate.findFirst({
    where: { coupleId, isPreset: true }
  })
  if (existing) return

  await prisma.couponTemplate.createMany({
    data: PRESET_COUPONS.map((preset) => ({
      coupleId,
      name: preset.name,
      description: preset.description,
      category: preset.category,
      price: preset.price,
      expiryDays: preset.expiryDays,
      isPreset: true,
      presetKey: preset.key,
      createdById
    }))
  })
}

export async function getStoreTemplates(coupleId: string, createdById: string) {
  await ensurePresetCoupons(coupleId, createdById)
  return prisma.couponTemplate.findMany({
    where: { coupleId, isDeleted: false },
    orderBy: [{ isPreset: 'desc' }, { createdAt: 'desc' }]
  })
}

export async function createCouponTemplate(
  coupleId: string,
  createdById: string,
  data: {
    name: string
    description?: string
    category: string
    price: number
    expiryDays?: number | null
  }
) {
  return prisma.couponTemplate.create({
    data: {
      coupleId,
      createdById,
      name: data.name,
      description: data.description,
      category: data.category,
      price: data.price,
      expiryDays: data.expiryDays ?? null,
      isPreset: false
    }
  })
}

export async function updateCouponTemplate(
  templateId: string,
  coupleId: string,
  data: {
    name?: string
    description?: string
    category?: string
    price?: number
    expiryDays?: number | null
  }
) {
  const template = await prisma.couponTemplate.findFirst({
    where: { id: templateId, coupleId, isDeleted: false }
  })
  if (!template) {
    throw new Error('模板不存在或无法编辑')
  }

  return prisma.couponTemplate.update({
    where: { id: templateId },
    data: {
      name: data.name,
      description: data.description,
      category: data.category,
      price: data.price,
      expiryDays: data.expiryDays ?? null
    }
  })
}

export async function deleteCouponTemplate(
  templateId: string,
  coupleId: string
) {
  const template = await prisma.couponTemplate.findFirst({
    where: { id: templateId, coupleId }
  })
  if (!template) {
    throw new Error('模板不存在或无法删除')
  }

  return prisma.couponTemplate.update({
    where: { id: templateId },
    data: { isDeleted: true }
  })
}

export async function buyCoupon(
  buyerId: string,
  coupleId: string,
  templateId: string,
  note?: string
) {
  const template = await prisma.couponTemplate.findFirst({
    where: { id: templateId, coupleId, isDeleted: false }
  })
  if (!template) {
    throw new Error('商品不存在')
  }

  const balance = await ensurePointBalance(buyerId, coupleId)
  if (balance.balance < template.price) {
    throw new Error('积分不足')
  }

  const expiresAt = template.expiryDays
    ? addDays(todayDate(), template.expiryDays)
    : null

  const userCoupon = await prisma.$transaction(async (tx) => {
    await tx.pointBalance.update({
      where: { id: balance.id },
      data: {
        balance: { decrement: template.price },
        totalSpent: { increment: template.price }
      }
    })

    await tx.pointTransaction.create({
      data: {
        userId: buyerId,
        coupleId,
        amount: -template.price,
        type: 'purchase',
        relatedCouponId: templateId,
        description: `购买「${template.name}」`
      }
    })

    return tx.userCoupon.create({
      data: {
        templateId,
        ownerId: buyerId,
        coupleId,
        status: 'unused',
        expiresAt,
        note
      }
    })
  })

  return userCoupon
}

export async function getMyCoupons(userId: string, coupleId: string) {
  const now = new Date()
  const coupons = await prisma.userCoupon.findMany({
    where: { ownerId: userId, coupleId },
    include: { template: true },
    orderBy: { boughtAt: 'desc' }
  })

  const updated: typeof coupons = []
  for (const coupon of coupons) {
    const resolved = resolveCouponStatus(
      coupon.status,
      now,
      coupon.expiresAt,
      coupon.usedAt
    )
    if (resolved !== coupon.status) {
      await prisma.userCoupon.update({
        where: { id: coupon.id },
        data: { status: resolved }
      })
      coupon.status = resolved
    }
    updated.push(coupon)
  }

  return updated
}

export async function sendCoupon(
  senderId: string,
  coupleId: string,
  couponId: string,
  note?: string
) {
  const couple = await prisma.couple.findUnique({ where: { id: coupleId } })
  if (!couple) {
    throw new Error('情侣关系不存在')
  }
  const receiverId =
    couple.userAId === senderId ? couple.userBId : couple.userAId

  const coupon = await prisma.userCoupon.findFirst({
    where: { id: couponId, ownerId: senderId, coupleId, status: 'unused' },
    include: { template: true }
  })
  if (!coupon) {
    throw new Error('券不存在或已被使用')
  }

  await prisma.$transaction(async (tx) => {
    await tx.userCoupon.update({
      where: { id: couponId },
      data: {
        ownerId: receiverId,
        sentAt: new Date(),
        sentById: senderId,
        note: note || coupon.note
      }
    })

    await tx.pointTransaction.create({
      data: {
        userId: senderId,
        coupleId,
        amount: 0,
        type: 'send',
        relatedUserId: receiverId,
        relatedCouponId: couponId,
        description: `赠送「${coupon.template.name}」给 TA`
      }
    })

    await tx.pointTransaction.create({
      data: {
        userId: receiverId,
        coupleId,
        amount: 0,
        type: 'receive',
        relatedUserId: senderId,
        relatedCouponId: couponId,
        description: `收到 TA 赠送的「${coupon.template.name}」`
      }
    })
  })

  return { receiverId }
}

export async function useCoupon(
  userId: string,
  coupleId: string,
  couponId: string
) {
  const coupon = await prisma.userCoupon.findFirst({
    where: { id: couponId, ownerId: userId, coupleId, status: 'unused' },
    include: { template: true }
  })
  if (!coupon) {
    throw new Error('券不存在或已被使用')
  }

  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    await prisma.userCoupon.update({
      where: { id: couponId },
      data: { status: 'expired' }
    })
    throw new Error('券已过期')
  }

  await prisma.$transaction(async (tx) => {
    await tx.userCoupon.update({
      where: { id: couponId },
      data: { status: 'used', usedAt: new Date() }
    })

    await tx.pointTransaction.create({
      data: {
        userId,
        coupleId,
        amount: 0,
        type: 'use',
        relatedCouponId: couponId,
        description: `使用「${coupon.template.name}」`
      }
    })
  })

  return coupon
}

export async function updatePointSettings(
  coupleId: string,
  data: { baseScore?: number; checkInReminder?: boolean }
) {
  return prisma.couplePointSettings.update({
    where: { coupleId },
    data
  })
}
