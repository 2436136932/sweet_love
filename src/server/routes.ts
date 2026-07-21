import express from 'express'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import multer from 'multer'
import fs from 'fs'
import path from 'path'
import { chatWithAi, AiError } from './ai.js'
import { env } from './config.js'
import { prisma } from './db.js'
import { normalizeImageKey, normalizeImageKeyArray } from './imageKey.js'
import { authenticate, type AuthenticatedRequest } from './middleware/auth.js'

const router = express.Router()

const publicUserSelect = {
  id: true,
  username: true,
  email: true,
  avatar: true,
  bio: true,
  momentStatus: true,
  momentStatusText: true,
  momentStatusUpdatedAt: true,
  inviteCode: true,
  partnerId: true
} as const

const publicPartnerSelect = {
  id: true,
  username: true,
  avatar: true,
  bio: true,
  momentStatus: true,
  momentStatusText: true,
  momentStatusUpdatedAt: true
} as const

const MOMENT_STATUS_KEYS = new Set([
  'missing',
  'busy',
  'resting',
  'happy',
  'tired',
  'eating',
  'working'
])
const MOMENT_STATUS_TEXT_MAX_LENGTH = 30

const PRESET_DISHES = [
  {
    id: 'preset-jiachang-1',
    name: '番茄炒蛋',
    category: '家常',
    isPreset: true
  },
  {
    id: 'preset-jiachang-2',
    name: '可乐鸡翅',
    category: '家常',
    isPreset: true
  },
  {
    id: 'preset-jiachang-3',
    name: '土豆牛腩',
    category: '家常',
    isPreset: true
  },
  {
    id: 'preset-chuanxiang-1',
    name: '水煮肉片',
    category: '川湘',
    isPreset: true
  },
  {
    id: 'preset-chuanxiang-2',
    name: '麻婆豆腐',
    category: '川湘',
    isPreset: true
  },
  {
    id: 'preset-chuanxiang-3',
    name: '小炒黄牛肉',
    category: '川湘',
    isPreset: true
  },
  {
    id: 'preset-tianpin-1',
    name: '提拉米苏',
    category: '甜品',
    isPreset: true
  },
  {
    id: 'preset-tianpin-2',
    name: '芋泥麻薯',
    category: '甜品',
    isPreset: true
  },
  { id: 'preset-yinpin-1', name: '柠檬茶', category: '饮品', isPreset: true },
  { id: 'preset-yinpin-2', name: '热可可', category: '饮品', isPreset: true },
  { id: 'preset-yexiao-1', name: '烧烤拼盘', category: '夜宵', isPreset: true },
  { id: 'preset-yexiao-2', name: '海鲜粥', category: '夜宵', isPreset: true },
  {
    id: 'preset-qingshi-1',
    name: '鸡胸肉沙拉',
    category: '轻食',
    isPreset: true
  },
  { id: 'preset-qingshi-2', name: '三明治', category: '轻食', isPreset: true }
]

const MENU_PRESET_DISHES = [
  {
    id: 'preset-jiachang-1',
    name: '番茄炒蛋',
    category: '家常',
    description: '酸甜番茄裹着嫩蛋，简单但永远不会出错。',
    imageUrl:
      'https://images.unsplash.com/photo-1590412200988-a436bb705300?auto=format&fit=crop&w=420&q=80',
    isPreset: true
  },
  {
    id: 'preset-jiachang-2',
    name: '可乐鸡翅',
    category: '家常',
    description: '甜咸入味，适合想吃点快乐的时候。',
    imageUrl:
      'https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&w=420&q=80',
    isPreset: true
  },
  {
    id: 'preset-jiachang-3',
    name: '土豆牛腩',
    category: '家常',
    description: '软糯土豆和浓香牛腩，适合认真吃一顿。',
    imageUrl:
      'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?auto=format&fit=crop&w=420&q=80',
    isPreset: true
  },
  {
    id: 'preset-chuanxiang-1',
    name: '水煮肉片',
    category: '川湘',
    description: '麻辣热烈，今天想吃重口就选它。',
    imageUrl:
      'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=420&q=80',
    isPreset: true
  },
  {
    id: 'preset-chuanxiang-2',
    name: '麻婆豆腐',
    category: '川湘',
    description: '下饭担当，热乎乎拌米饭刚刚好。',
    imageUrl:
      'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=420&q=80',
    isPreset: true
  },
  {
    id: 'preset-chuanxiang-3',
    name: '小炒黄牛肉',
    category: '川湘',
    description: '香辣鲜嫩，适合两个人抢着夹。',
    imageUrl:
      'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=420&q=80',
    isPreset: true
  },
  {
    id: 'preset-tianpin-1',
    name: '提拉米苏',
    category: '甜品',
    description: '饭后一点甜，把今天收得温柔一点。',
    imageUrl:
      'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=420&q=80',
    isPreset: true
  },
  {
    id: 'preset-tianpin-2',
    name: '芋泥麻薯',
    category: '甜品',
    description: '软糯绵密，适合分享也适合独占。',
    imageUrl:
      'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=420&q=80',
    isPreset: true
  },
  {
    id: 'preset-yinpin-1',
    name: '柠檬茶',
    category: '饮品',
    description: '清爽解腻，配任何一餐都很稳。',
    imageUrl:
      'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=420&q=80',
    isPreset: true
  },
  {
    id: 'preset-yinpin-2',
    name: '热可可',
    category: '饮品',
    description: '暖暖一杯，适合晚上慢慢喝。',
    imageUrl:
      'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?auto=format&fit=crop&w=420&q=80',
    isPreset: true
  },
  {
    id: 'preset-yexiao-1',
    name: '烧烤拼盘',
    category: '夜宵',
    description: '夜里嘴馋的标准答案。',
    imageUrl:
      'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=420&q=80',
    isPreset: true
  },
  {
    id: 'preset-yexiao-2',
    name: '海鲜粥',
    category: '夜宵',
    description: '鲜香暖胃，夜宵也可以温柔一点。',
    imageUrl:
      'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=420&q=80',
    isPreset: true
  },
  {
    id: 'preset-qingshi-1',
    name: '鸡胸肉沙拉',
    category: '轻食',
    description: '清爽轻负担，适合想吃得舒服一点。',
    imageUrl:
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=420&q=80',
    isPreset: true
  },
  {
    id: 'preset-qingshi-2',
    name: '三明治',
    category: '轻食',
    description: '快手又饱腹，懒得纠结时很好用。',
    imageUrl:
      'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=420&q=80',
    isPreset: true
  }
]

const KITCHEN_PRESET_RECIPES = [
  {
    id: 'preset-recipe-tomato-egg',
    title: '番茄炒蛋',
    category: '家常快手',
    summary: '酸甜番茄和嫩蛋，十几分钟就能完成的安心晚饭。',
    imageUrl:
      'https://images.unsplash.com/photo-1590412200988-a436bb705300?auto=format&fit=crop&w=720&q=80',
    difficulty: '简单',
    cookTime: 15,
    servings: 2,
    ingredients: [
      { name: '番茄', amount: 3, unit: '个' },
      { name: '鸡蛋', amount: 3, unit: '个' },
      { name: '小葱', amount: 1, unit: '根', note: '可选' },
      { name: '白糖', amount: 1, unit: '小勺' }
    ],
    steps: [
      '番茄切块，鸡蛋加少许盐打散。',
      '热锅炒蛋至刚凝固后盛出。',
      '番茄炒出汁后倒回鸡蛋，调味收汁。'
    ],
    isPreset: true
  },
  {
    id: 'preset-recipe-cola-wing',
    title: '可乐鸡翅',
    category: '下饭硬菜',
    summary: '甜咸浓郁，适合两个人慢慢啃的一道快乐菜。',
    imageUrl:
      'https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&w=720&q=80',
    difficulty: '中等',
    cookTime: 35,
    servings: 2,
    ingredients: [
      { name: '鸡翅中', amount: 10, unit: '个' },
      { name: '可乐', amount: 330, unit: 'ml' },
      { name: '姜片', amount: 4, unit: '片' },
      { name: '生抽', amount: 2, unit: '勺' }
    ],
    steps: [
      '鸡翅划口焯水，擦干备用。',
      '煎至两面微黄，加入姜片、生抽和可乐。',
      '小火焖煮后大火收汁。'
    ],
    isPreset: true
  },
  {
    id: 'preset-recipe-shrimp-pasta',
    title: '奶油虾仁意面',
    category: '约会餐',
    summary: '柔和奶香配弹牙虾仁，适合周末在家做点仪式感。',
    imageUrl:
      'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=720&q=80',
    difficulty: '中等',
    cookTime: 25,
    servings: 2,
    ingredients: [
      { name: '意面', amount: 180, unit: 'g' },
      { name: '虾仁', amount: 200, unit: 'g' },
      { name: '淡奶油', amount: 120, unit: 'ml' },
      { name: '蒜', amount: 3, unit: '瓣' }
    ],
    steps: [
      '意面煮至八九分熟，保留少量面汤。',
      '蒜末炒香后加入虾仁煎熟。',
      '加入淡奶油、意面和面汤拌匀调味。'
    ],
    isPreset: true
  },
  {
    id: 'preset-recipe-lemon-tea',
    title: '手打柠檬茶',
    category: '饮品甜点',
    summary: '清爽解腻，适合配夜宵，也适合边聊天边喝。',
    imageUrl:
      'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=720&q=80',
    difficulty: '简单',
    cookTime: 10,
    servings: 2,
    ingredients: [
      { name: '柠檬', amount: 1, unit: '个' },
      { name: '红茶', amount: 500, unit: 'ml' },
      { name: '冰块', amount: 1, unit: '杯' },
      { name: '蜂蜜', amount: 2, unit: '勺' }
    ],
    steps: [
      '柠檬切片去籽，轻轻捶出香气。',
      '加入红茶、蜂蜜和冰块。',
      '摇匀后试味，按喜好补甜度。'
    ],
    isPreset: true
  }
]

async function serializeUserWithPartner(user: any) {
  const { password: _password, ...publicUser } = user
  const partner = user.partnerId
    ? await prisma.user.findUnique({
        where: { id: user.partnerId },
        select: publicPartnerSelect
      })
    : null
  return { ...publicUser, partner }
}

function serializePublicPartner(user: any) {
  return {
    id: user.id,
    username: user.username,
    avatar: user.avatar ?? undefined,
    bio: user.bio ?? undefined,
    momentStatus: user.momentStatus ?? undefined,
    momentStatusText: user.momentStatusText ?? undefined,
    momentStatusUpdatedAt: formatDateTime(user.momentStatusUpdatedAt)
  }
}

function tokenFor(userId: string) {
  return jwt.sign({ id: userId }, env.jwtSecret, { expiresIn: '7d' })
}

function todayDate() {
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  const parts = formatter.formatToParts(new Date())
  const year = parts.find((p) => p.type === 'year')?.value
  const month = parts.find((p) => p.type === 'month')?.value
  const day = parts.find((p) => p.type === 'day')?.value
  return parseDate(`${year}-${month}-${day}`)
}

function parseDate(value: string) {
  if (value.includes('T') || value.includes(' ')) {
    return new Date(value)
  }
  return new Date(`${value}T00:00:00.000Z`)
}

function formatDate(value?: Date | string | null) {
  if (!value) return undefined
  return new Date(value).toISOString().slice(0, 10)
}

function formatDateTime(value?: Date | string | null) {
  if (!value) return undefined
  return new Date(value).toISOString()
}

function visibleUserIds(user: { id: string; partnerId: string | null }) {
  return [user.id, user.partnerId].filter(Boolean) as string[]
}

function canAccess(
  user: { id: string; partnerId: string | null },
  ownerId: string
) {
  return ownerId === user.id || ownerId === user.partnerId
}

function serializeCouple(couple: any) {
  if (!couple) return null
  return {
    id: couple.id,
    name: couple.name ?? undefined,
    bio: couple.bio ?? undefined,
    coverImage: couple.coverImage ?? undefined,
    coverCarousel: couple.coverCarousel ?? undefined,
    startDate: formatDate(couple.startDate),
    userIds: [couple.userAId, couple.userBId]
  }
}

function serializeAnniversary(item: any) {
  return {
    id: item.id,
    title: item.title,
    date: formatDate(item.date)!,
    isImportant: item.isImportant,
    userId: item.userId
  }
}

function serializeAlbumImage(item: any, currentUserId?: string) {
  return {
    id: item.id,
    src: item.src,
    title: item.title,
    description: item.description ?? undefined,
    mediaType: item.mediaType ?? 'image',
    height: item.height ?? undefined,
    date: formatDateTime(item.date)!,
    category: item.category ?? undefined,
    locationAddress: item.locationAddress ?? undefined,
    lat: item.lat ?? undefined,
    lng: item.lng ?? undefined,
    locationSource: item.locationSource ?? undefined,
    locationAccuracyMeters: item.locationAccuracyMeters ?? undefined,
    locationPoiId: item.locationPoiId ?? undefined,
    locationPoiName: item.locationPoiName ?? undefined,
    locationAdcode: item.locationAdcode ?? undefined,
    locationCoordinateSystem: item.locationCoordinateSystem ?? undefined,
    isFeatured: Boolean(item.isFeatured),
    likeCount: item._count?.likes ?? item.likes?.length ?? 0,
    likedByMe: Array.isArray(item.likes)
      ? item.likes.some((like: any) => like.userId === currentUserId)
      : false,
    commentCount: item._count?.comments ?? item.comments?.length ?? 0,
    comments: Array.isArray(item.comments)
      ? item.comments.map((comment: any) => ({
          id: comment.id,
          content: comment.content,
          userId: comment.userId,
          createdAt: comment.createdAt?.toISOString?.() ?? comment.createdAt,
          user: comment.user ? serializePublicPartner(comment.user) : undefined
        }))
      : [],
    userId: item.userId
  }
}

function serializeAlbumListImage(item: any, currentUserId?: string) {
  const { comments: _comments, ...image } = serializeAlbumImage(
    item,
    currentUserId
  )
  return image
}

const ALBUM_DEFAULT_PAGE_SIZE = 20
const ALBUM_MAX_PAGE_SIZE = 50

function readAlbumCategory(value: unknown) {
  if (typeof value !== 'string') return undefined
  const category = value.trim()
  return category && category !== '全部' ? category : undefined
}

function readAlbumLimit(value: unknown, fallback = ALBUM_DEFAULT_PAGE_SIZE) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(Math.max(Math.floor(parsed), 1), ALBUM_MAX_PAGE_SIZE)
}

function albumWhereFor(
  user: { id: string; partnerId: string | null },
  category?: string,
  startDate?: string,
  endDate?: string
) {
  const dateFilter: any = {}
  if (startDate) dateFilter.gte = parseDate(startDate)
  if (endDate) {
    const end = parseDate(endDate)
    end.setUTCHours(23, 59, 59, 999)
    dateFilter.lte = end
  }

  return {
    userId: { in: visibleUserIds(user) },
    ...(category ? { category } : {}),
    ...(startDate || endDate ? { date: dateFilter } : {})
  }
}

async function albumWhereAfterCursor(
  user: { id: string; partnerId: string | null },
  category: string | undefined,
  cursor: unknown,
  startDate?: string,
  endDate?: string
) {
  const baseWhere = albumWhereFor(user, category, startDate, endDate)
  if (typeof cursor !== 'string' || !cursor.trim()) return baseWhere

  const cursorImage = await prisma.albumImage.findUnique({
    where: { id: cursor.trim() },
    select: { id: true, createdAt: true, userId: true }
  })
  if (!cursorImage || !canAccess(user, cursorImage.userId)) return null

  return {
    ...baseWhere,
    OR: [
      { createdAt: { lt: cursorImage.createdAt } },
      { createdAt: cursorImage.createdAt, id: { lt: cursorImage.id } }
    ]
  }
}

function serializeAlbumPage(
  items: any[],
  currentUserId: string,
  limit: number
) {
  const hasMore = items.length > limit
  const pageItems = hasMore ? items.slice(0, limit) : items
  return {
    items: pageItems.map((image) =>
      serializeAlbumListImage(image, currentUserId)
    ),
    nextCursor: hasMore ? pageItems[pageItems.length - 1]?.id : undefined,
    hasMore
  }
}

function readAlbumLocationPayload(body: any) {
  const hasAddress = Object.prototype.hasOwnProperty.call(
    body,
    'locationAddress'
  )
  const hasLat = Object.prototype.hasOwnProperty.call(body, 'lat')
  const hasLng = Object.prototype.hasOwnProperty.call(body, 'lng')
  const hasLocationMeta = [
    'locationSource',
    'locationAccuracyMeters',
    'locationPoiId',
    'locationPoiName',
    'locationAdcode',
    'locationCoordinateSystem'
  ].some((key) => Object.prototype.hasOwnProperty.call(body, key))

  if (!hasAddress && !hasLat && !hasLng && !hasLocationMeta) return { data: {} }
  if (body.lat === null && body.lng === null) {
    return {
      data: {
        locationAddress: null,
        lat: null,
        lng: null,
        locationSource: null,
        locationAccuracyMeters: null,
        locationPoiId: null,
        locationPoiName: null,
        locationAdcode: null,
        locationCoordinateSystem: null
      }
    }
  }
  if (!hasLat || !hasLng || body.lat === null || body.lng === null) {
    return { error: 'lat and lng must be provided together' }
  }

  const lat = Number(body.lat)
  const lng = Number(body.lng)
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    return { error: 'lat must be a number between -90 and 90' }
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    return { error: 'lng must be a number between -180 and 180' }
  }
  const locationSource =
    typeof body.locationSource === 'string' ? body.locationSource : undefined
  if (
    locationSource &&
    !['exif', 'amap_geolocation', 'amap_poi', 'manual_pin'].includes(
      locationSource
    )
  ) {
    return { error: 'locationSource is invalid' }
  }

  const coordinateSystem =
    typeof body.locationCoordinateSystem === 'string'
      ? body.locationCoordinateSystem
      : 'GCJ02'
  if (coordinateSystem !== 'GCJ02') {
    return { error: 'locationCoordinateSystem must be GCJ02' }
  }

  let locationAccuracyMeters: number | null | undefined
  if (Object.prototype.hasOwnProperty.call(body, 'locationAccuracyMeters')) {
    if (
      body.locationAccuracyMeters === null ||
      body.locationAccuracyMeters === undefined ||
      body.locationAccuracyMeters === ''
    ) {
      locationAccuracyMeters = null
    } else {
      locationAccuracyMeters = Number(body.locationAccuracyMeters)
      if (
        !Number.isFinite(locationAccuracyMeters) ||
        locationAccuracyMeters < 0
      ) {
        return { error: 'locationAccuracyMeters must be a non-negative number' }
      }
    }
  }

  const readText = (value: unknown) =>
    typeof value === 'string' ? value.trim() || null : null

  return {
    data: {
      locationAddress:
        typeof body.locationAddress === 'string'
          ? body.locationAddress.trim() || null
          : null,
      lat,
      lng,
      locationSource: locationSource || null,
      locationAccuracyMeters:
        locationAccuracyMeters !== undefined ? locationAccuracyMeters : null,
      locationPoiId: readText(body.locationPoiId),
      locationPoiName: readText(body.locationPoiName),
      locationAdcode: readText(body.locationAdcode),
      locationCoordinateSystem: 'GCJ02'
    }
  }
}

function serializeDiary(item: any) {
  return {
    id: item.id,
    date: formatDateTime(item.date)!,
    mood: item.mood,
    content: item.content,
    location: item.location ?? undefined,
    images: Array.isArray(item.images) ? item.images : [],
    userId: item.userId
  }
}

function serializeTodo(item: any) {
  return {
    id: item.id,
    title: item.title,
    description: item.description ?? undefined,
    targetDate: formatDateTime(item.targetDate),
    completed: item.completed,
    completedAt: formatDateTime(item.completedAt),
    completedById: item.completedById ?? undefined,
    memoryNote: item.memoryNote ?? undefined,
    memoryImages: Array.isArray(item.memoryImages) ? item.memoryImages : [],
    isFeatured: Boolean(item.isFeatured),
    sortOrder: item.sortOrder ?? 0,
    category: item.category,
    autoSource: item.autoSource ?? undefined,
    autoSourceKey: item.autoSourceKey ?? undefined,
    autoDate: formatDate(item.autoDate),
    userId: item.userId
  }
}

function serializeMessage(item: any, includeReply: boolean = true) {
  return {
    id: item.id,
    senderId: item.senderId,
    content: item.content,
    imageUrl: item.imageUrl ?? undefined,
    timestamp: item.timestamp,
    createdAt: item.createdAt
      ? item.createdAt.toISOString()
      : new Date().toISOString(),
    userId: item.userId,
    replyToId: item.replyToId ?? undefined,
    replyTo:
      includeReply && item.replyTo
        ? serializeMessage(item.replyTo, false)
        : undefined,
    user: item.user
      ? {
          id: item.user.id,
          username: item.user.username,
          avatar: item.user.avatar ?? undefined,
          bio: item.user.bio ?? undefined
        }
      : undefined
  }
}

function serializeRating(item: any) {
  return {
    id: item.id,
    userId: item.userId,
    score: item.score,
    note: item.note ?? undefined,
    date: formatDate(item.date)!
  }
}

function serializePeriodRecord(item: any) {
  return {
    id: item.id,
    startDate: formatDate(item.startDate)!,
    endDate: formatDate(item.endDate),
    flow: item.flow ?? undefined,
    painLevel: item.painLevel ?? undefined,
    symptoms: Array.isArray(item.symptoms) ? item.symptoms : [],
    note: item.note ?? undefined,
    createdById: item.createdById
  }
}

function serializeMenuDish(item: any) {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    description: item.description ?? undefined,
    imageUrl: item.imageUrl ?? undefined,
    isPreset: false,
    userId: item.createdById
  }
}

function serializeMealOrderItem(item: any) {
  return {
    id: item.id,
    date: formatDate(item.date)!,
    dishName: item.dishName,
    category: item.category,
    quantity: item.quantity,
    note: item.note ?? undefined,
    description: item.description ?? undefined,
    imageUrl: item.imageUrl ?? undefined,
    userId: item.createdById,
    user: item.createdBy
      ? {
          id: item.createdBy.id,
          username: item.createdBy.username,
          avatar: item.createdBy.avatar ?? undefined,
          bio: item.createdBy.bio ?? undefined
        }
      : undefined
  }
}

function serializeKitchenRecipe(
  item: any,
  favoriteIds = new Set<string>(),
  favoriteCounts = new Map<string, number>()
) {
  return {
    id: item.id,
    title: item.title,
    category: item.category,
    summary: item.summary ?? undefined,
    imageUrl: item.imageUrl ?? undefined,
    difficulty: item.difficulty ?? undefined,
    cookTime: item.cookTime ?? undefined,
    servings: item.servings ?? undefined,
    ingredients: Array.isArray(item.ingredients) ? item.ingredients : [],
    steps: Array.isArray(item.steps) ? item.steps : [],
    isPreset: Boolean(item.isPreset),
    isFavorite: favoriteIds.has(item.id),
    favoriteCount: favoriteCounts.get(item.id) || 0,
    userId: item.createdById,
    user: item.createdBy
      ? {
          id: item.createdBy.id,
          username: item.createdBy.username,
          avatar: item.createdBy.avatar ?? undefined,
          bio: item.createdBy.bio ?? undefined
        }
      : undefined
  }
}

function serializeShoppingList(list: any, date?: Date) {
  return {
    id: list?.id,
    date: formatDate(list?.date || date)!,
    items: (list?.items || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity ?? undefined,
      unit: item.unit ?? undefined,
      note: item.note ?? undefined,
      checked: item.checked
    }))
  }
}

function serializeCookCheckin(item: any) {
  return {
    id: item.id,
    date: formatDate(item.date)!,
    recipeId: item.recipeId ?? undefined,
    title: item.title,
    imageUrl: item.imageUrl ?? undefined,
    note: item.note ?? undefined,
    rating: item.rating ?? undefined,
    userId: item.createdById,
    user: item.createdBy
      ? {
          id: item.createdBy.id,
          username: item.createdBy.username,
          avatar: item.createdBy.avatar ?? undefined,
          bio: item.createdBy.bio ?? undefined
        }
      : undefined
  }
}

function readPositiveInt(value: unknown) {
  if (value === undefined || value === null || value === '') return undefined
  const number = Number(value)
  return Number.isInteger(number) && number > 0 ? number : undefined
}

function readKitchenIngredients(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const raw = item as any
      const name = String(raw.name || '').trim()
      if (!name) return null
      const amount =
        raw.amount === undefined || raw.amount === ''
          ? undefined
          : Number(raw.amount)
      return {
        name,
        amount: Number.isFinite(amount) && amount > 0 ? amount : undefined,
        unit: typeof raw.unit === 'string' ? raw.unit.trim() : '',
        note: typeof raw.note === 'string' ? raw.note.trim() : ''
      }
    })
    .filter(Boolean)
}

function readKitchenSteps(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.map((step) => String(step || '').trim()).filter(Boolean)
}

function readKitchenRecipePayload(body: any) {
  return {
    title: String(body.title || '').trim(),
    category: String(body.category || '').trim(),
    summary: typeof body.summary === 'string' ? body.summary.trim() : '',
    imageUrl: readImageKey(body.imageUrl),
    difficulty:
      typeof body.difficulty === 'string' ? body.difficulty.trim() : '',
    cookTime: readPositiveInt(body.cookTime),
    servings: readPositiveInt(body.servings),
    ingredients: readKitchenIngredients(body.ingredients),
    steps: readKitchenSteps(body.steps)
  }
}

function readKitchenDate(value: unknown) {
  if (value === undefined || value === null || value === '') return todayDate()
  return readOrderDate(value)
}

function readOptionalDate(value: unknown) {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return undefined
  const date = parseDate(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function readOptionalDateTime(value: unknown) {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string') return undefined
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value)
  const isDateTime =
    /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d{3})?Z?)?$/.test(value)
  if (!isDateOnly && !isDateTime) return undefined
  const date = parseDate(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function readStringArray(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.map((item) => String(item || '').trim()).filter(Boolean)
}

function readImageKey(value: unknown) {
  return normalizeImageKey(value)
}

function readImageKeys(value: unknown) {
  return normalizeImageKeyArray(value)
}

const PERIOD_FLOWS = new Set(['spotting', 'light', 'medium', 'heavy'])
const PERIOD_MODES = new Set(['cycle', 'trying_to_conceive'])
const LH_TEST_RESULTS = new Set(['positive', 'negative', 'not_tested'])
const DEFAULT_CYCLE_DAYS = 28
const DEFAULT_PERIOD_DAYS = 5
const PERIOD_CARE_SOURCE = 'period-care'
const PERIOD_FERTILITY_SOURCE = 'period-fertility'
const PERIOD_CARE_CATEGORY = '姨妈照顾'
const PERIOD_FERTILITY_CATEGORY = '备孕记录'
const PERIOD_DISCLAIMER = '仅供生活记录和周期参考，不作为医疗、避孕或助孕建议。'
const PERIOD_CARE_TODOS = [
  {
    key: 'warm-drink',
    title: '准备热饮或暖宝宝',
    description: '姨妈期快到了，提前备好热饮、暖宝宝或热水袋。'
  },
  {
    key: 'gentle-food',
    title: '少吃冰辣，安排清淡一点',
    description: '这几天尽量避开冰饮和重辣，给身体留一点缓冲。'
  },
  {
    key: 'soft-care',
    title: '主动关心休息状态',
    description: '多问一句累不累、疼不疼，今天把照顾放在前面。'
  }
]
const PERIOD_FERTILITY_TODOS = [
  {
    key: 'temperature',
    title: '记录基础体温',
    description:
      '备孕模式下可以补充体温记录，帮助你们回看周期变化。仅供生活记录参考。'
  },
  {
    key: 'lh-test',
    title: '记录 LH 试纸',
    description:
      '如果今天安排了试纸，可以把结果记到姨妈助手里，方便之后一起回看。'
  }
]

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function diffDays(from: Date, to: Date) {
  const dayMs = 24 * 60 * 60 * 1000
  return Math.round((to.getTime() - from.getTime()) / dayMs)
}

function readPeriodDate(value: unknown) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return undefined
  const date = parseDate(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function readPeriodFlow(value: unknown) {
  if (value === undefined || value === null || value === '') return null
  const flow = String(value)
  return PERIOD_FLOWS.has(flow) ? flow : undefined
}

function readLhTestResult(value: unknown) {
  if (value === undefined || value === null || value === '') return null
  const result = String(value)
  return LH_TEST_RESULTS.has(result) ? result : undefined
}

function readPainLevel(value: unknown) {
  if (value === undefined || value === null || value === '') return null
  const painLevel = Number(value)
  if (!Number.isInteger(painLevel) || painLevel < 0 || painLevel > 5)
    return undefined
  return painLevel
}

function readEnergyLevel(value: unknown) {
  if (value === undefined || value === null || value === '') return null
  const energyLevel = Number(value)
  if (!Number.isInteger(energyLevel) || energyLevel < 0 || energyLevel > 5)
    return undefined
  return energyLevel
}

function readTemperature(value: unknown) {
  if (value === undefined || value === null || value === '') return null
  const temperature = Number(value)
  if (!Number.isFinite(temperature) || temperature < 30 || temperature > 45)
    return undefined
  return temperature
}

function readPeriodPayload(body: any, partial = false) {
  const data: any = {}

  if (!partial || body.startDate !== undefined) {
    const startDate = readPeriodDate(body.startDate)
    if (!startDate) return { error: 'startDate must be YYYY-MM-DD' }
    data.startDate = startDate
  }

  if (!partial || body.endDate !== undefined) {
    if (
      body.endDate === undefined ||
      body.endDate === null ||
      body.endDate === ''
    ) {
      data.endDate = null
    } else {
      const endDate = readPeriodDate(body.endDate)
      if (!endDate) return { error: 'endDate must be YYYY-MM-DD' }
      data.endDate = endDate
    }
  }

  if (body.flow !== undefined) {
    const flow = readPeriodFlow(body.flow)
    if (flow === undefined)
      return { error: 'flow must be spotting, light, medium, or heavy' }
    data.flow = flow
  } else if (!partial) {
    data.flow = null
  }

  if (body.painLevel !== undefined) {
    const painLevel = readPainLevel(body.painLevel)
    if (painLevel === undefined)
      return { error: 'painLevel must be an integer between 0 and 5' }
    data.painLevel = painLevel
  } else if (!partial) {
    data.painLevel = null
  }

  if (body.symptoms !== undefined) {
    data.symptoms = readStringArray(body.symptoms).slice(0, 12)
  } else if (!partial) {
    data.symptoms = []
  }

  if (body.note !== undefined) {
    data.note = typeof body.note === 'string' ? body.note.trim() || null : null
  } else if (!partial) {
    data.note = null
  }

  const startDate = data.startDate
  const endDate = Object.prototype.hasOwnProperty.call(data, 'endDate')
    ? data.endDate
    : undefined
  if (startDate && endDate && endDate < startDate) {
    return { error: 'endDate cannot be earlier than startDate' }
  }

  return { data }
}

function readPeriodLogPayload(body: any) {
  const data: any = {}

  if (body.flow !== undefined) {
    const flow = readPeriodFlow(body.flow)
    if (flow === undefined)
      return { error: 'flow must be spotting, light, medium, or heavy' }
    data.flow = flow
  }

  if (body.painLevel !== undefined) {
    const painLevel = readPainLevel(body.painLevel)
    if (painLevel === undefined)
      return { error: 'painLevel must be an integer between 0 and 5' }
    data.painLevel = painLevel
  }

  if (body.symptoms !== undefined) {
    data.symptoms = readStringArray(body.symptoms).slice(0, 24)
  }

  if (body.moods !== undefined) {
    data.moods = readStringArray(body.moods).slice(0, 12)
  }

  if (body.energyLevel !== undefined) {
    const energyLevel = readEnergyLevel(body.energyLevel)
    if (energyLevel === undefined)
      return { error: 'energyLevel must be an integer between 0 and 5' }
    data.energyLevel = energyLevel
  }

  if (body.temperatureCelsius !== undefined) {
    const temperatureCelsius = readTemperature(body.temperatureCelsius)
    if (temperatureCelsius === undefined)
      return { error: 'temperatureCelsius must be between 30 and 45' }
    data.temperatureCelsius = temperatureCelsius
  }

  if (body.lhTestResult !== undefined) {
    const lhTestResult = readLhTestResult(body.lhTestResult)
    if (lhTestResult === undefined)
      return { error: 'lhTestResult must be positive, negative, or not_tested' }
    data.lhTestResult = lhTestResult
  }

  if (body.intercourse !== undefined) {
    data.intercourse = Boolean(body.intercourse)
  }

  if (body.note !== undefined) {
    data.note = typeof body.note === 'string' ? body.note.trim() || null : null
  }

  return { data }
}

function readPeriodSettingsPayload(body: any) {
  const data: any = {}

  if (body.mode !== undefined) {
    const mode = String(body.mode)
    if (!PERIOD_MODES.has(mode))
      return { error: 'mode must be cycle or trying_to_conceive' }
    data.mode = mode
  }

  if (body.defaultCycleDays !== undefined) {
    const defaultCycleDays = Number(body.defaultCycleDays)
    if (
      !Number.isInteger(defaultCycleDays) ||
      defaultCycleDays < 15 ||
      defaultCycleDays > 90
    ) {
      return { error: 'defaultCycleDays must be an integer between 15 and 90' }
    }
    data.defaultCycleDays = defaultCycleDays
  }

  if (body.defaultPeriodDays !== undefined) {
    const defaultPeriodDays = Number(body.defaultPeriodDays)
    if (
      !Number.isInteger(defaultPeriodDays) ||
      defaultPeriodDays < 1 ||
      defaultPeriodDays > 15
    ) {
      return { error: 'defaultPeriodDays must be an integer between 1 and 15' }
    }
    data.defaultPeriodDays = defaultPeriodDays
  }

  if (body.reminderLeadDays !== undefined) {
    const reminderLeadDays = Number(body.reminderLeadDays)
    if (
      !Number.isInteger(reminderLeadDays) ||
      reminderLeadDays < 0 ||
      reminderLeadDays > 14
    ) {
      return { error: 'reminderLeadDays must be an integer between 0 and 14' }
    }
    data.reminderLeadDays = reminderLeadDays
  }

  if (body.autoSyncCareTodos !== undefined) {
    data.autoSyncCareTodos = Boolean(body.autoSyncCareTodos)
  }

  return { data }
}

function serializePeriodSettings(settings: any) {
  return {
    mode: settings?.mode || 'cycle',
    defaultCycleDays: settings?.defaultCycleDays || DEFAULT_CYCLE_DAYS,
    defaultPeriodDays: settings?.defaultPeriodDays || DEFAULT_PERIOD_DAYS,
    reminderLeadDays: settings?.reminderLeadDays ?? 3,
    autoSyncCareTodos: settings?.autoSyncCareTodos ?? true
  }
}

function serializePeriodDailyLog(item: any) {
  return {
    id: item.id,
    date: formatDate(item.date)!,
    flow: item.flow ?? undefined,
    painLevel: item.painLevel ?? undefined,
    symptoms: Array.isArray(item.symptoms) ? item.symptoms : [],
    moods: Array.isArray(item.moods) ? item.moods : [],
    energyLevel: item.energyLevel ?? undefined,
    temperatureCelsius:
      item.temperatureCelsius === null || item.temperatureCelsius === undefined
        ? undefined
        : Number(item.temperatureCelsius),
    lhTestResult: item.lhTestResult ?? undefined,
    intercourse: Boolean(item.intercourse),
    note: item.note ?? undefined,
    createdById: item.createdById
  }
}

async function ensurePeriodSettings(coupleId: string) {
  return prisma.periodSettings.upsert({
    where: { coupleId },
    update: {},
    create: { coupleId }
  })
}

async function getPeriodData(coupleId: string) {
  const [records, logs, settings] = await Promise.all([
    prisma.periodRecord.findMany({
      where: { coupleId },
      orderBy: { startDate: 'desc' }
    }),
    prisma.periodDailyLog.findMany({
      where: { coupleId },
      orderBy: { date: 'desc' },
      take: 180
    }),
    ensurePeriodSettings(coupleId)
  ])
  return { records, logs, settings }
}

function hasPeriodOverlap(
  aStart: Date,
  aEnd: Date | null | undefined,
  bStart: Date,
  bEnd: Date | null | undefined
) {
  const leftEnd = aEnd ?? aStart
  const rightEnd = bEnd ?? bStart
  return aStart <= rightEnd && bStart <= leftEnd
}

async function validatePeriodWindow(
  coupleId: string,
  startDate: Date,
  endDate: Date | null | undefined,
  excludeId?: string
) {
  const records = await prisma.periodRecord.findMany({ where: { coupleId } })
  if (
    !endDate &&
    records.some((record) => record.id !== excludeId && !record.endDate)
  ) {
    return '只能保留一条未结束的经期记录'
  }
  const overlapping = records.some((record) => {
    if (record.id === excludeId) return false
    return hasPeriodOverlap(
      startDate,
      endDate,
      record.startDate,
      record.endDate
    )
  })
  return overlapping ? '经期记录不能互相重叠' : undefined
}

function buildPeriodSummary(
  records: any[],
  logs: any[] = [],
  rawSettings?: any,
  referenceToday?: Date
) {
  const settings = serializePeriodSettings(rawSettings)
  const ordered = [...records].sort(
    (a, b) => a.startDate.getTime() - b.startDate.getTime()
  )
  const latest = ordered.at(-1)
  const intervals: number[] = []
  for (
    let index = Math.max(1, ordered.length - 6);
    index < ordered.length;
    index += 1
  ) {
    intervals.push(
      diffDays(ordered[index - 1].startDate, ordered[index].startDate)
    )
  }
  const validIntervals = intervals.filter((days) => days >= 15 && days <= 90)
  const averageCycleDays =
    validIntervals.length > 0
      ? Math.round(
          validIntervals.reduce((sum, days) => sum + days, 0) /
            validIntervals.length
        )
      : settings.defaultCycleDays
  const cycleVarianceDays =
    validIntervals.length > 1
      ? Math.max(...validIntervals) - Math.min(...validIntervals)
      : 0

  const periodLengths = ordered
    .filter((record) => record.endDate)
    .slice(-6)
    .map((record) => diffDays(record.startDate, record.endDate) + 1)
    .filter((days) => days >= 1 && days <= 15)
  const averagePeriodDays =
    periodLengths.length > 0
      ? Math.round(
          periodLengths.reduce((sum, days) => sum + days, 0) /
            periodLengths.length
        )
      : settings.defaultPeriodDays

  const today = referenceToday || todayDate()
  let isInPeriod = false
  let currentDay: number | undefined
  let currentCycleDay: number | undefined
  let predictedStartDate: Date | undefined

  if (latest) {
    const daysSinceLatest = diffDays(latest.startDate, today)
    if (daysSinceLatest >= 0) currentCycleDay = daysSinceLatest + 1
    if (latest.endDate) {
      isInPeriod = today >= latest.startDate && today <= latest.endDate
    } else {
      isInPeriod =
        daysSinceLatest >= 0 &&
        daysSinceLatest <= Math.min(averagePeriodDays + 3, 10)
    }
    if (isInPeriod) currentDay = daysSinceLatest + 1
    predictedStartDate = addDays(latest.startDate, averageCycleDays)
  }

  const predictedEndDate = predictedStartDate
    ? addDays(predictedStartDate, averagePeriodDays - 1)
    : undefined
  const predictedOvulationDate =
    predictedStartDate && settings.mode === 'trying_to_conceive'
      ? addDays(predictedStartDate, -14)
      : undefined
  const fertileWindow = predictedOvulationDate
    ? {
        startDate: formatDate(addDays(predictedOvulationDate, -5))!,
        endDate: formatDate(addDays(predictedOvulationDate, 1))!
      }
    : undefined
  const symptomCounts = new Map<string, number>()
  for (const item of [...records, ...logs]) {
    const symptoms = Array.isArray(item.symptoms) ? item.symptoms : []
    for (const symptom of symptoms) {
      symptomCounts.set(symptom, (symptomCounts.get(symptom) || 0) + 1)
    }
  }
  const symptomStats = [...symptomCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 6)

  return {
    recordCount: records.length,
    averageCycleDays,
    averagePeriodDays,
    cycleVarianceDays,
    predictedStartDate: formatDate(predictedStartDate),
    predictedEndDate: formatDate(predictedEndDate),
    daysUntilNext: predictedStartDate
      ? diffDays(today, predictedStartDate)
      : undefined,
    isInPeriod,
    currentDay,
    currentCycleDay,
    latestStartDate: latest ? formatDate(latest.startDate) : undefined,
    latestEndDate: latest ? formatDate(latest.endDate) : undefined,
    predictedOvulationDate: formatDate(predictedOvulationDate),
    fertileWindow,
    symptomStats,
    loggedDayCount: logs.length,
    disclaimer: PERIOD_DISCLAIMER
  }
}

function buildPeriodOverview(
  records: any[],
  logs: any[] = [],
  settings?: any,
  referenceToday?: Date
) {
  return {
    records: records.map(serializePeriodRecord),
    logs: logs.map(serializePeriodDailyLog),
    summary: buildPeriodSummary(records, logs, settings, referenceToday),
    settings: serializePeriodSettings(settings)
  }
}

async function findKitchenRecipeForCouple(recipeId: string, coupleId: string) {
  const preset = KITCHEN_PRESET_RECIPES.find((recipe) => recipe.id === recipeId)
  if (preset) return preset
  const recipe = await prisma.kitchenRecipe.findUnique({
    where: { id: recipeId }
  })
  if (!recipe || recipe.coupleId !== coupleId) return null
  return recipe
}

function mergeIngredients(recipes: any[]) {
  const merged = new Map<
    string,
    { name: string; quantity?: number; unit?: string; note?: string }
  >()
  recipes.forEach((recipe) => {
    const ingredients = Array.isArray(recipe.ingredients)
      ? recipe.ingredients
      : []
    ingredients.forEach((ingredient: any) => {
      const name = String(ingredient.name || '').trim()
      if (!name) return
      const unit = String(ingredient.unit || '').trim()
      const amount = Number(ingredient.amount)
      const note = String(ingredient.note || '').trim()
      const key = `${name.toLowerCase()}__${unit.toLowerCase()}`
      const existing = merged.get(key)
      if (!existing) {
        merged.set(key, {
          name,
          quantity: Number.isFinite(amount) && amount > 0 ? amount : undefined,
          unit,
          note
        })
        return
      }
      if (
        existing.quantity !== undefined &&
        Number.isFinite(amount) &&
        amount > 0
      ) {
        existing.quantity += amount
      } else if (note) {
        existing.note = [existing.note, note].filter(Boolean).join('；')
      }
    })
  })
  return Array.from(merged.values())
}

async function generateInviteCode() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const inviteCode = `LOVE-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
    const existing = await prisma.user.findUnique({ where: { inviteCode } })
    if (!existing) return inviteCode
  }
  return `LOVE-${Date.now().toString(36).toUpperCase()}`
}

function findCurrentCouple(userId: string) {
  return prisma.couple.findFirst({
    where: {
      OR: [{ userAId: userId }, { userBId: userId }]
    }
  })
}

async function requireCurrentCouple(
  user: { id: string; partnerId: string | null },
  res: express.Response
) {
  if (!user.partnerId) {
    res.status(400).json({ message: 'No relationship found' })
    return null
  }

  const couple = await findCurrentCouple(user.id)
  if (!couple) {
    res.status(404).json({ message: 'Relationship not found' })
    return null
  }

  return couple
}

const AI_GENERATE_TYPES = new Set([
  'love_chat',
  'diary_polish',
  'todo_ideas',
  'message_reply',
  'period_care',
  'kitchen_ideas',
  'kitchen_recipe'
])

const AI_RECIPE_CATEGORIES = [
  '家常快手',
  '下饭硬菜',
  '约会餐',
  '饮品甜点',
  '轻食',
  '夜宵'
]
const AI_RECIPE_DIFFICULTIES = ['简单', '中等', '进阶']
const AI_RECIPE_FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=720&q=80'
const AI_RECIPE_IMAGE_LIBRARY = [
  {
    keys: ['鸡翅', '鸡肉', '烤鸡', '炸鸡', 'chicken', 'wing'],
    images: [
      'https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&w=720&q=80',
      'https://images.unsplash.com/photo-1562967916-eb82221dfb92?auto=format&fit=crop&w=720&q=80',
      'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=720&q=80'
    ]
  },
  {
    keys: ['牛肉', '牛排', '肥牛', 'beef', 'steak'],
    images: [
      'https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=720&q=80',
      'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=720&q=80',
      'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=720&q=80'
    ]
  },
  {
    keys: ['虾', '海鲜', '蟹', '贝', 'shrimp', 'seafood'],
    images: [
      'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=720&q=80',
      'https://images.unsplash.com/photo-1559737558-2f5a35f4523b?auto=format&fit=crop&w=720&q=80',
      'https://images.unsplash.com/photo-1535399831218-d5bd36d1a6b3?auto=format&fit=crop&w=720&q=80'
    ]
  },
  {
    keys: ['鱼', '三文鱼', '鳕鱼', 'fish', 'salmon'],
    images: [
      'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=720&q=80',
      'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=720&q=80',
      'https://images.unsplash.com/photo-1485921325833-c519f76c4927?auto=format&fit=crop&w=720&q=80'
    ]
  },
  {
    keys: ['面', '意面', '粉', 'noodle', 'pasta'],
    images: [
      'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=720&q=80',
      'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=720&q=80',
      'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=720&q=80'
    ]
  },
  {
    keys: ['饭', '炒饭', '盖饭', 'rice'],
    images: [
      'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=720&q=80',
      'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=720&q=80',
      'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=720&q=80'
    ]
  },
  {
    keys: ['甜点', '蛋糕', '布丁', 'dessert', 'cake'],
    images: [
      'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=720&q=80',
      'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=720&q=80',
      'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=720&q=80'
    ]
  },
  {
    keys: ['饮品', '奶茶', '咖啡', '果汁', 'drink', 'coffee'],
    images: [
      'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=720&q=80',
      'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?auto=format&fit=crop&w=720&q=80',
      'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=720&q=80'
    ]
  },
  {
    keys: ['沙拉', '轻食', '蔬菜', 'salad'],
    images: [
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=720&q=80',
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=720&q=80',
      'https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?auto=format&fit=crop&w=720&q=80'
    ]
  }
]
const AI_RECIPE_CATEGORY_IMAGE_LIBRARY: Record<string, string[]> = {
  家常快手: [
    'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=720&q=80',
    'https://images.unsplash.com/photo-1606787366850-de6330128bfc?auto=format&fit=crop&w=720&q=80'
  ],
  下饭硬菜: [
    'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=720&q=80',
    'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=720&q=80'
  ],
  约会餐: [
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=720&q=80',
    'https://images.unsplash.com/photo-1551218808-94e220e084d2?auto=format&fit=crop&w=720&q=80'
  ],
  饮品甜点: [
    'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=720&q=80',
    'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=720&q=80'
  ],
  轻食: [
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=720&q=80',
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=720&q=80'
  ],
  夜宵: [
    'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=720&q=80',
    'https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&w=720&q=80'
  ]
}
const AI_RECIPE_IMAGE_RULES = [
  {
    ingredient: ['鸡翅', '鸡中翅', '鸡翅根', 'wing'],
    method: ['烤', '炸', '蜜汁', '可乐', '空气炸锅', '煎'],
    images: [
      'https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&w=720&q=80',
      'https://images.unsplash.com/photo-1562967916-eb82221dfb92?auto=format&fit=crop&w=720&q=80'
    ]
  },
  {
    ingredient: ['牛排', 'steak'],
    method: ['牛排', '煎', '黑椒', '香煎'],
    images: [
      'https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=720&q=80',
      'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=720&q=80'
    ]
  },
  {
    ingredient: ['牛肉', '肥牛', 'beef'],
    method: ['炒', '炖', '红烧', '咖喱', '土豆'],
    images: [
      'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=720&q=80',
      'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?auto=format&fit=crop&w=720&q=80'
    ]
  },
  {
    ingredient: ['虾', 'shrimp'],
    method: ['蒜蓉', '油焖', '椒盐', '清炒', '煎'],
    images: [
      'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=720&q=80',
      'https://images.unsplash.com/photo-1559737558-2f5a35f4523b?auto=format&fit=crop&w=720&q=80'
    ]
  },
  {
    ingredient: ['三文鱼', 'salmon'],
    method: ['煎', '烤', '柠檬', '香草'],
    images: [
      'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=720&q=80',
      'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=720&q=80'
    ]
  },
  {
    ingredient: ['意面', 'pasta'],
    method: ['番茄', '奶油', '培根', '肉酱', '黑椒'],
    images: [
      'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=720&q=80',
      'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=720&q=80'
    ]
  },
  {
    ingredient: ['炒饭', 'rice'],
    method: ['炒饭', '蛋炒饭', '扬州'],
    images: [
      'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=720&q=80',
      'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=720&q=80'
    ]
  },
  {
    ingredient: ['沙拉', 'salad'],
    method: ['沙拉', '轻食', '拌'],
    images: [
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=720&q=80',
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=720&q=80'
    ]
  },
  {
    ingredient: ['蛋糕', '甜点', 'cake', 'dessert'],
    method: ['蛋糕', '烤', '慕斯', '布丁', '甜点'],
    images: [
      'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=720&q=80',
      'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=720&q=80'
    ]
  }
]

const AI_SYSTEM_PROMPTS: Record<string, string> = {
  love_chat:
    '你是情侣应用里的恋爱小助手。用温柔、自然、简洁的中文回答，适合直接复制给另一半。避免说教，不输出医疗、法律、财务建议。',
  diary_polish:
    '你是日记润色助手。只润色用户给出的日记正文，保留原意、第一人称和亲密语气，不新增不存在的事实。只输出润色后的正文。',
  todo_ideas:
    '你是情侣待办灵感助手。根据用户需求生成 3-5 条短小、可执行、有生活感的恋爱小事。每条一行，不要编号以外的解释。',
  message_reply:
    '你是聊天文案助手。生成一段可以发送给恋人的自然中文消息。不要解释，不要自动代替用户做决定，只输出文案。',
  period_care:
    '你是经期生活照顾文案助手。只生成关心、休息、热饮、饮食清淡、情绪陪伴等生活照顾建议或话术；禁止诊断、治疗建议、安全期、怀孕概率和药物建议。语气温柔简洁。',
  kitchen_ideas:
    '你是情侣厨房灵感助手。根据口味、时间和人数给出吃什么建议，偏家常、可执行、适合两个人一起做。输出简洁清单。',
  kitchen_recipe:
    '你是情侣厨房菜谱生成助手。只输出严格 JSON 对象，不要 Markdown，不要代码块。字段必须包含 title, category, summary, difficulty, cookTime, servings, ingredients, steps。category 从 家常快手/下饭硬菜/约会餐/饮品甜点/轻食/夜宵 中选择；difficulty 从 简单/中等/进阶 中选择；cookTime 为分钟数字；servings 为人数数字；ingredients 是数组，每项包含 name, amount, unit, note；steps 是 4-7 条中文步骤。默认适合情侣一起做。'
}

function stringifyAiContext(context: unknown) {
  if (context === undefined || context === null || context === '') return ''
  try {
    return `\n\n参考上下文：${JSON.stringify(context).slice(0, 3000)}`
  } catch {
    return ''
  }
}

function buildAiUserContent(type: string, prompt: string, context: unknown) {
  const variation =
    type === 'kitchen_recipe'
      ? `\n\n本次生成要求：请主动换一个菜谱角度，避免重复上一次或最常见的做法。即使主食材相同，也要在口味、烹饪方式、配菜、标题和步骤上明显不同。不要生成与参考上下文里 currentDraftTitle 或 existingRecipes 高度相似的标题。本次随机种子：${Date.now()}-${Math.random().toString(36).slice(2)}。`
      : ''
  return `${prompt}${variation}${stringifyAiContext(context)}`
}

function extractJsonObject(text: string) {
  const trimmed = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
  try {
    return JSON.parse(trimmed)
  } catch {
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start < 0 || end <= start) throw new Error('No JSON object found')
    return JSON.parse(trimmed.slice(start, end + 1))
  }
}

function clampInt(value: unknown, fallback: number, min: number, max: number) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, Math.round(number)))
}

function readAiRecipeString(value: unknown, maxLength = 80) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function hashString(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash
}

function pickRecipeImage(images: string[], seed: string) {
  if (images.length === 0) return undefined
  return images[hashString(seed) % images.length]
}

function includesAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word.toLowerCase()))
}

function buildRecipeImageQuery(recipe: {
  title: string
  category: string
  summary: string
  ingredients: Array<{ name: string }>
  steps: string[]
}) {
  const ingredientText = [
    recipe.title,
    recipe.summary,
    ...recipe.ingredients.map((ingredient) => ingredient.name)
  ]
    .join(' ')
    .toLowerCase()
  const methodText = recipe.title.toLowerCase()
  const rule = AI_RECIPE_IMAGE_RULES.find(
    (item) =>
      includesAny(ingredientText, item.ingredient) &&
      includesAny(methodText, item.method)
  )
  if (!rule) return undefined

  if (
    includesAny(methodText, ['蜜汁']) &&
    includesAny(ingredientText, ['鸡翅', '鸡中翅', 'wing'])
  )
    return 'honey roasted chicken wings'
  if (
    includesAny(methodText, ['可乐']) &&
    includesAny(ingredientText, ['鸡翅', '鸡中翅', 'wing'])
  )
    return 'chicken wings'
  if (
    includesAny(methodText, ['烤', '空气炸锅']) &&
    includesAny(ingredientText, ['鸡翅', '鸡中翅', 'wing'])
  )
    return 'roasted chicken wings'
  if (
    includesAny(methodText, ['炸']) &&
    includesAny(ingredientText, ['鸡翅', '鸡中翅', 'wing'])
  )
    return 'fried chicken wings'
  if (
    includesAny(methodText, ['牛排', '黑椒']) &&
    includesAny(ingredientText, ['牛排', 'steak'])
  )
    return 'steak dinner'
  if (
    includesAny(methodText, ['炖', '红烧', '咖喱', '土豆']) &&
    includesAny(ingredientText, ['牛肉', 'beef'])
  )
    return 'beef stew'
  if (
    includesAny(methodText, ['炒']) &&
    includesAny(ingredientText, ['牛肉', 'beef'])
  )
    return 'stir fried beef'
  if (
    includesAny(methodText, ['蒜蓉', '油焖', '椒盐', '清炒', '煎']) &&
    includesAny(ingredientText, ['虾', 'shrimp'])
  )
    return 'shrimp dish'
  if (
    includesAny(methodText, ['煎', '烤', '柠檬', '香草']) &&
    includesAny(ingredientText, ['三文鱼', 'salmon'])
  )
    return 'salmon dinner'
  if (
    includesAny(methodText, ['番茄', '奶油', '培根', '肉酱', '黑椒']) &&
    includesAny(ingredientText, ['意面', 'pasta'])
  )
    return 'pasta'
  if (
    includesAny(methodText, ['炒饭', '蛋炒饭', '扬州']) &&
    includesAny(ingredientText, ['炒饭', 'rice'])
  )
    return 'fried rice'
  if (
    includesAny(methodText, ['沙拉', '轻食', '拌']) &&
    includesAny(ingredientText, ['沙拉', 'salad'])
  )
    return 'salad bowl'
  if (
    includesAny(methodText, ['蛋糕', '慕斯', '布丁', '甜点']) &&
    includesAny(ingredientText, ['蛋糕', '甜点', 'cake', 'dessert'])
  )
    return 'dessert cake'

  return undefined
}

function isLikelyFoodPhoto(text: string) {
  return /food|dish|meal|dinner|lunch|recipe|cooking|chicken|wings|beef|steak|shrimp|salmon|pasta|rice|salad|cake|dessert/i.test(
    text
  )
}

async function searchPexelsRecipeImage(query: string) {
  if (!env.stockImages.pexelsApiKey) return undefined
  const params = new URLSearchParams({
    query,
    per_page: '6',
    orientation: 'landscape',
    locale: 'en-US'
  })
  const res = await fetch(`https://api.pexels.com/v1/search?${params}`, {
    headers: { Authorization: env.stockImages.pexelsApiKey }
  })
  if (!res.ok) return undefined
  const data = (await res.json()) as any
  const photo = Array.isArray(data?.photos)
    ? data.photos.find((item: any) =>
        isLikelyFoodPhoto(`${item?.alt || ''} ${item?.url || ''}`)
      ) || data.photos[0]
    : undefined
  return typeof photo?.src?.large === 'string'
    ? photo.src.large
    : photo?.src?.medium
}

async function searchPixabayRecipeImage(query: string) {
  if (!env.stockImages.pixabayApiKey) return undefined
  const params = new URLSearchParams({
    key: env.stockImages.pixabayApiKey,
    q: query,
    image_type: 'photo',
    orientation: 'horizontal',
    category: 'food',
    safesearch: 'true',
    per_page: '6'
  })
  const res = await fetch(`https://pixabay.com/api/?${params}`)
  if (!res.ok) return undefined
  const data = (await res.json()) as any
  const hit = Array.isArray(data?.hits)
    ? data.hits.find((item: any) =>
        isLikelyFoodPhoto(`${item?.tags || ''} ${item?.pageURL || ''}`)
      ) || data.hits[0]
    : undefined
  return typeof hit?.largeImageURL === 'string'
    ? hit.largeImageURL
    : hit?.webformatURL
}

async function suggestRecipeImage(recipe: {
  title: string
  category: string
  summary: string
  ingredients: Array<{ name: string }>
  steps: string[]
}) {
  const query = buildRecipeImageQuery(recipe)
  if (!query) return undefined

  try {
    return (
      (await searchPexelsRecipeImage(query)) ||
      (await searchPixabayRecipeImage(query))
    )
  } catch {
    return undefined
  }
}

function normalizeAiRecipeDraft(value: unknown) {
  if (!value || typeof value !== 'object') return null
  const raw = value as any
  const title = readAiRecipeString(raw.title, 40)
  const summary = readAiRecipeString(raw.summary, 140)
  if (!title || !summary) return null

  const rawCategory = readAiRecipeString(raw.category, 20)
  const rawDifficulty = readAiRecipeString(raw.difficulty, 20)
  const category = AI_RECIPE_CATEGORIES.includes(rawCategory)
    ? rawCategory
    : AI_RECIPE_CATEGORIES[0]
  const difficulty = AI_RECIPE_DIFFICULTIES.includes(rawDifficulty)
    ? rawDifficulty
    : AI_RECIPE_DIFFICULTIES[0]

  const ingredients = readKitchenIngredients(raw.ingredients).slice(0, 20)
  const steps = readKitchenSteps(raw.steps).slice(0, 7)
  if (!ingredients.length || steps.length < 3) return null

  const recipe = {
    title,
    category,
    summary,
    difficulty,
    cookTime: clampInt(raw.cookTime, 30, 5, 240),
    servings: clampInt(raw.servings, 2, 1, 12),
    ingredients,
    steps
  }
  return {
    ...recipe
  }
}

async function withSuggestedRecipeImage<
  T extends {
    title: string
    category: string
    summary: string
    ingredients: Array<{ name: string }>
    steps: string[]
  }
>(recipe: T) {
  const imageUrl = await suggestRecipeImage(recipe)
  return imageUrl ? { ...recipe, imageUrl } : recipe
}

async function generateAiRecipeDraft(userContent: string) {
  const result = await chatWithAi(
    [
      { role: 'system', content: AI_SYSTEM_PROMPTS.kitchen_recipe },
      { role: 'user', content: userContent }
    ],
    {
      maxTokens: 1600,
      temperature: 0.85
    }
  )

  try {
    const recipe = normalizeAiRecipeDraft(extractJsonObject(result.content))
    if (recipe)
      return { result, recipe: await withSuggestedRecipeImage(recipe) }
  } catch {
    // Fall through to the repair request below.
  }

  const repaired = await chatWithAi(
    [
      { role: 'system', content: AI_SYSTEM_PROMPTS.kitchen_recipe },
      {
        role: 'user',
        content: `把下面内容修复成唯一一个合法 JSON 菜谱对象。不要解释，不要 Markdown，只输出 JSON。原始内容：\n${result.content}`
      }
    ],
    {
      maxTokens: 1600,
      temperature: 0.2
    }
  )
  const recipe = normalizeAiRecipeDraft(extractJsonObject(repaired.content))
  if (!recipe) return null
  return { result: repaired, recipe: await withSuggestedRecipeImage(recipe) }
}

function sendAiError(
  res: express.Response,
  error: unknown,
  fallback = 'AI 生成失败'
) {
  if (error instanceof AiError) {
    const isNotConfigured = error.message.includes('not configured')
    const status = isNotConfigured ? 503 : error.status || 502
    res
      .status(status)
      .json({ message: isNotConfigured ? 'AI 暂未配置' : error.message })
    return
  }

  res.status(500).json({ message: fallback })
}

const s3Client = env.s3
  ? new S3Client({
      region: env.s3.region,
      endpoint: env.s3.endpoint,
      forcePathStyle: env.s3.forcePathStyle,
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
      credentials: {
        accessKeyId: env.s3.accessKeyId,
        secretAccessKey: env.s3.secretAccessKey
      }
    })
  : null

function uploadFileFilter(
  _req: express.Request,
  file: Express.Multer.File,
  callback: multer.FileFilterCallback
) {
  if (
    !file.mimetype.startsWith('image/') &&
    !file.mimetype.startsWith('video/')
  ) {
    callback(new Error('Only image or video uploads are allowed'))
    return
  }
  callback(null, true)
}

function makeUploadFilename(file: Express.Multer.File) {
  const ext = path.extname(file.originalname).toLowerCase() || '.jpg'
  return `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`
}

function makeS3Key(userId: string, file: Express.Multer.File) {
  return `users/${userId}/${makeUploadFilename(file)}`
}

function buildS3PublicUrl(publicUrl: string, key: string) {
  const encodedKey = key
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
  return `${publicUrl.replace(/\/+$/, '')}/${encodedKey}`
}

const localStorage = multer.diskStorage({
  destination(req, _file, callback) {
    const user = (req as AuthenticatedRequest).user
    const dir = path.join(env.uploadDir, 'users', user.id)
    fs.mkdirSync(dir, { recursive: true })
    callback(null, dir)
  },
  filename(_req, file, callback) {
    callback(null, makeUploadFilename(file))
  }
})

const localUpload = multer({
  storage: localStorage,
  limits: { fileSize: env.maxUploadBytes },
  fileFilter: uploadFileFilter
})

const s3Upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxUploadBytes },
  fileFilter: uploadFileFilter
})

function handleUpload(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const upload = env.storageDriver === 's3' ? s3Upload : localUpload
  upload.single('file')(req, res, (error) => {
    if (!error) return next()
    if (
      error instanceof multer.MulterError &&
      error.code === 'LIMIT_FILE_SIZE'
    ) {
      return res
        .status(413)
        .json({ message: `File must be ${env.maxUploadMb}MB or smaller` })
    }
    return res.status(400).json({ message: error.message || 'Upload failed' })
  })
}

router.post('/auth/register', async (req, res) => {
  const { username, email, password } = req.body
  if (!username || !email || !password) {
    return res
      .status(400)
      .json({ message: 'Username, email, and password are required' })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return res.status(400).json({ message: 'Email already exists' })
  }

  const user = await prisma.user.create({
    data: {
      username,
      email,
      password: await bcrypt.hash(password, 10),
      inviteCode: await generateInviteCode()
    },
    select: publicUserSelect
  })

  res.status(201).json({
    user: await serializeUserWithPartner(user),
    token: tokenFor(user.id)
  })
})

router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: 'Invalid credentials' })
  }

  res.json({
    user: await serializeUserWithPartner(user),
    token: tokenFor(user.id)
  })
})

router.get('/auth/me', authenticate, async (req, res) => {
  res.json(await serializeUserWithPartner((req as AuthenticatedRequest).user))
})

router.post('/auth/bind', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  const { inviteCode } = req.body
  if (!inviteCode)
    return res.status(400).json({ message: 'Invite code is required' })
  if (currentUser.partnerId)
    return res.status(400).json({ message: 'Already bound to a partner' })

  const partner = await prisma.user.findUnique({ where: { inviteCode } })
  if (!partner) return res.status(404).json({ message: 'Invalid invite code' })
  if (partner.id === currentUser.id)
    return res.status(400).json({ message: 'Cannot bind with yourself' })
  if (partner.partnerId)
    return res
      .status(400)
      .json({ message: 'This user is already bound to someone else' })

  const updatedUser = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: currentUser.id },
      data: { partnerId: partner.id }
    })
    await tx.user.update({
      where: { id: partner.id },
      data: { partnerId: currentUser.id }
    })
    await tx.couple.create({
      data: {
        userAId: currentUser.id,
        userBId: partner.id,
        name: `${currentUser.username} & ${partner.username}`,
        startDate: todayDate(),
        bio: '开启我们的浪漫之旅...'
      }
    })
    return tx.user.findUniqueOrThrow({
      where: { id: currentUser.id },
      select: publicUserSelect
    })
  })

  res.json(await serializeUserWithPartner(updatedUser))
})

router.post('/auth/unbind', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  const partnerId = currentUser.partnerId
  if (!partnerId)
    return res.status(400).json({ message: 'Not bound to anyone' })

  const updatedUser = await prisma.$transaction(async (tx) => {
    await tx.couple.deleteMany({
      where: {
        OR: [
          { userAId: currentUser.id, userBId: partnerId },
          { userAId: partnerId, userBId: currentUser.id }
        ]
      }
    })
    await tx.user.update({
      where: { id: partnerId },
      data: { partnerId: null }
    })
    return tx.user.update({
      where: { id: currentUser.id },
      data: { partnerId: null },
      select: publicUserSelect
    })
  })

  res.json(await serializeUserWithPartner(updatedUser))
})

router.put('/user/profile', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  const { username, avatar, bio } = req.body
  const updated = await prisma.user.update({
    where: { id: currentUser.id },
    data: {
      username: username || currentUser.username,
      ...(avatar !== undefined ? { avatar: readImageKey(avatar) || null } : {}),
      bio: bio ?? currentUser.bio
    },
    select: publicUserSelect
  })
  res.json(await serializeUserWithPartner(updated))
})

router.patch('/user/moment-status', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  const rawStatus = req.body.momentStatus
  const text =
    typeof req.body.momentStatusText === 'string'
      ? req.body.momentStatusText.trim()
      : ''
  const isClearing =
    rawStatus === null || rawStatus === undefined || rawStatus === ''

  if (
    !isClearing &&
    (typeof rawStatus !== 'string' || !MOMENT_STATUS_KEYS.has(rawStatus))
  ) {
    return res.status(400).json({ message: 'Invalid moment status' })
  }
  if (text.length > MOMENT_STATUS_TEXT_MAX_LENGTH) {
    return res
      .status(400)
      .json({ message: 'Moment status text must be 30 characters or fewer' })
  }
  if (isClearing && text) {
    return res
      .status(400)
      .json({ message: 'Moment status is required when text is provided' })
  }

  const updated = await prisma.user.update({
    where: { id: currentUser.id },
    data: {
      momentStatus: isClearing ? null : rawStatus,
      momentStatusText: isClearing ? null : text || null,
      momentStatusUpdatedAt: isClearing ? null : new Date()
    },
    select: publicUserSelect
  })

  res.json(await serializeUserWithPartner(updated))
})

router.post('/ai/generate', authenticate, async (req, res) => {
  const type = typeof req.body.type === 'string' ? req.body.type : ''
  const prompt =
    typeof req.body.prompt === 'string' ? req.body.prompt.trim() : ''

  if (!AI_GENERATE_TYPES.has(type)) {
    return res.status(400).json({ message: 'Invalid AI generation type' })
  }
  if (!prompt) {
    return res.status(400).json({ message: 'Prompt is required' })
  }

  const currentUser = (req as AuthenticatedRequest).user
  const partner = currentUser.partnerId
    ? await prisma.user.findUnique({
        where: { id: currentUser.partnerId },
        select: publicPartnerSelect
      })
    : null
  const couple = currentUser.partnerId
    ? await findCurrentCouple(currentUser.id)
    : null
  const context = {
    user: { username: currentUser.username },
    partner: partner ? { username: partner.username } : null,
    couple: couple
      ? { name: couple.name, startDate: formatDate(couple.startDate) }
      : null,
    requestContext: req.body.context
  }

  const userContent = buildAiUserContent(type, prompt, context)

  try {
    if (type === 'kitchen_recipe') {
      const generated = await generateAiRecipeDraft(userContent)
      if (!generated) {
        return res.status(502).json({ message: 'AI 菜谱格式异常，请重试' })
      }

      return res.json({
        content: generated.recipe.summary,
        recipe: generated.recipe,
        model: generated.result.model,
        usage: generated.result.usage
      })
    }

    const result = await chatWithAi(
      [
        { role: 'system', content: AI_SYSTEM_PROMPTS[type] },
        { role: 'user', content: userContent }
      ],
      {
        maxTokens: 900,
        temperature: 0.7
      }
    )

    return res.json(result)
  } catch (error) {
    if (type === 'kitchen_recipe' && !(error instanceof AiError)) {
      return res.status(502).json({ message: 'AI 菜谱格式异常，请重试' })
    }
    return sendAiError(res, error)
  }
})

router.get('/couple', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  if (!currentUser.partnerId)
    return res.status(404).json({ message: 'No relationship found' })
  const couple = await findCurrentCouple(currentUser.id)
  res.json(serializeCouple(couple))
})

router.put('/couple', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  if (!currentUser.partnerId)
    return res.status(400).json({ message: 'No relationship found' })

  const couple = await findCurrentCouple(currentUser.id)
  if (!couple)
    return res.status(404).json({ message: 'Relationship not found' })

  const { name, bio, coverImage, startDate } = req.body
  const updated = await prisma.couple.update({
    where: { id: couple.id },
    data: {
      name: name ?? couple.name,
      bio: bio ?? couple.bio,
      ...(coverImage !== undefined
        ? { coverImage: readImageKey(coverImage) || null }
        : {}),
      startDate: startDate ? parseDate(startDate) : couple.startDate
    }
  })
  res.json(serializeCouple(updated))
})

// 封面轮播图：GET 读取当前配置，PUT 更新配置（存储相册图片的 src 路径数组）。
router.get('/couple/cover-carousel', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  if (!currentUser.partnerId)
    return res.status(404).json({ message: 'No relationship found' })
  const couple = await findCurrentCouple(currentUser.id)
  if (!couple)
    return res.status(404).json({ message: 'Relationship not found' })
  const carousel =
    Array.isArray(couple.coverCarousel) && couple.coverCarousel.length > 0
      ? couple.coverCarousel.map((src: any) => String(src))
      : undefined
  res.json({ coverCarousel: carousel })
})

router.put('/couple/cover-carousel', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  if (!currentUser.partnerId)
    return res.status(400).json({ message: 'No relationship found' })

  const couple = await findCurrentCouple(currentUser.id)
  if (!couple)
    return res.status(404).json({ message: 'Relationship not found' })

  const { coverCarousel } = req.body
  // 校验输入：最多 10 张，每张是有效字符串。
  let carousel: string[] | null = null
  if (Array.isArray(coverCarousel)) {
    if (coverCarousel.length > 10)
      return res.status(400).json({ message: '最多选择 10 张图片' })
    const cleaned = coverCarousel
      .map((src: unknown) => (typeof src === 'string' ? src.trim() : null))
      .filter(Boolean) as string[]
    if (cleaned.length > 10)
      return res.status(400).json({ message: '最多选择 10 张图片' })
    carousel = cleaned.length > 0 ? cleaned : null
  } else if (coverCarousel !== undefined && coverCarousel !== null) {
    return res.status(400).json({ message: 'coverCarousel 必须是数组' })
  }

  const data: any = {}
  if (carousel !== undefined) data.coverCarousel = carousel
  if (Object.keys(data).length === 0) {
    return res.json(serializeCouple(couple))
  }
  const updated = await prisma.couple.update({
    where: { id: couple.id },
    data
  })
  res.json(serializeCouple(updated))
})

// 封面候选图：查询相册中可选的图片（图片类型，按时间倒序），前端从中选择轮播图。
router.get('/couple/cover-candidates', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  const where = albumWhereFor(currentUser)
  const images = await prisma.albumImage.findMany({
    where: { ...where, mediaType: { not: 'video' } },
    select: { id: true, src: true, title: true, date: true },
    orderBy: [{ date: 'desc' }, { id: 'desc' }]
  })
  res.json({
    images: images.map((img) => ({
      id: img.id,
      src: img.src,
      title: img.title || '',
      date: formatDate(img.date)
    }))
  })
})

// 主题配置：GET 读当前主题色，PUT 更新（存储为 JSON { enabled, color }）。
router.get('/couple/theme', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  if (!currentUser.partnerId)
    return res.status(404).json({ message: 'No relationship found' })
  const couple = await findCurrentCouple(currentUser.id)
  if (!couple)
    return res.status(404).json({ message: 'Relationship not found' })

  let theme: { enabled: boolean; color: string } | undefined = undefined
  const raw = couple.themeConfig
  if (raw && typeof raw === 'object' && 'enabled' in raw && 'color' in raw) {
    const c = String(raw.color || '')
    const e = Boolean(raw.enabled)
    if (c.startsWith('#') || /^#[0-9a-fA-F]{6}$/.test(c)) {
      theme = { enabled: e, color: c }
    }
  }
  res.json({ themeConfig: theme })
})

router.put('/couple/theme', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  if (!currentUser.partnerId)
    return res.status(400).json({ message: 'No relationship found' })

  const couple = await findCurrentCouple(currentUser.id)
  if (!couple)
    return res.status(404).json({ message: 'Relationship not found' })

  const { enabled, color } = req.body
  const hex = typeof color === 'string' ? color.trim() : ''
  if (!/^#[0-9a-fA-F]{6}$/.test(hex))
    return res
      .status(400)
      .json({ message: '颜色格式错误，请使用 #RRGGBB 格式' })

  const data: any = { themeConfig: { enabled: Boolean(enabled), color: hex } }
  const updated = await prisma.couple.update({
    where: { id: couple.id },
    data
  })
  res.json({ themeConfig: { enabled: true, color: hex } })
})

// AI 配置（单行表）：GET 读当前配置，PUT 写入配置，启用的 provider 配置会覆盖 .env 默认值。
const AI_CONFIG_SINGLETON_ID = 'singleton'

function serializeAiConfig(cfg: any) {
  if (!cfg) {
    // 没有任何数据库记录时：返回全空字段，让前端用 placeholder 占位，不要显示 .env 默认值。
    return {
      enabled: false,
      provider: env.ai.provider,
      openai: {
        apiKey: '',
        baseUrl: '',
        model: '',
        temperature: null,
        maxTokens: null,
        timeoutMs: null
      },
      gemini: {
        apiKey: '',
        model: '',
        temperature: null,
        maxTokens: null,
        timeoutMs: null
      },
      claude: {
        apiKey: '',
        model: '',
        maxTokens: null,
        timeoutMs: null
      }
    }
  }
  return {
    enabled: cfg.enabled,
    provider: cfg.provider,
    openai: {
      apiKey: cfg.openaiApiKey || '',
      baseUrl: cfg.openaiBaseUrl || '',
      model: cfg.openaiModel || '',
      temperature: cfg.openaiTemperature,
      maxTokens: cfg.openaiMaxTokens,
      timeoutMs: cfg.openaiTimeoutMs
    },
    gemini: {
      apiKey: cfg.geminiApiKey || '',
      model: cfg.geminiModel || '',
      temperature: cfg.geminiTemperature,
      maxTokens: cfg.geminiMaxTokens,
      timeoutMs: cfg.geminiTimeoutMs
    },
    claude: {
      apiKey: cfg.claudeApiKey || '',
      model: cfg.claudeModel || '',
      maxTokens: cfg.claudeMaxTokens,
      timeoutMs: cfg.claudeTimeoutMs
    }
  }
}

router.get('/ai/config', authenticate, async (_req, res) => {
  const cfg = await prisma.aiConfig.findUnique({
    where: { id: AI_CONFIG_SINGLETON_ID }
  })
  res.json(serializeAiConfig(cfg))
})

// 根据 provider + 用户填的 baseUrl/apiKey 拉取可选模型列表：
// - openai-compatible: GET {baseUrl}/models
// - gemini: GET https://generativelanguage.googleapis.com/v1beta/models?key={apiKey}
// - claude: 无标准列表接口，返回常见推荐模型
router.get('/ai/models/:provider', authenticate, async (req, res) => {
  const provider = String(req.params.provider || '').trim()
  const baseUrl = String(req.query.baseUrl || '')
    .trim()
    .replace(/\/+$/, '')
  const apiKey = String(req.query.apiKey || '').trim()

  try {
    if (provider === 'openai-compatible') {
      if (!baseUrl)
        return res.status(400).json({ message: 'baseUrl is required' })
      const headers: Record<string, string> = {}
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`
      const r = await fetch(`${baseUrl}/models`, { headers })
      if (!r.ok) {
        const text = await r.text().catch(() => '')
        return res.status(r.status).json({
          message: `Failed to fetch models: ${r.status} ${text.slice(0, 200)}`
        })
      }
      const data: any = await r.json()
      const list: string[] = Array.isArray(data?.data)
        ? data.data
            .map((m: any) => m?.id)
            .filter((s: any) => typeof s === 'string')
        : []
      return res.json({ models: list })
    }

    if (provider === 'gemini') {
      if (!apiKey)
        return res.status(400).json({ message: 'apiKey is required' })
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`
      )
      if (!r.ok) {
        const text = await r.text().catch(() => '')
        return res.status(r.status).json({
          message: `Failed to fetch models: ${r.status} ${text.slice(0, 200)}`
        })
      }
      const data: any = await r.json()
      const list: string[] = Array.isArray(data?.models)
        ? data.models
            .map((m: any) =>
              typeof m?.name === 'string'
                ? m.name.replace(/^models\//, '')
                : null
            )
            .filter((s: any) => typeof s === 'string')
        : []
      return res.json({ models: list })
    }

    if (provider === 'claude') {
      // Anthropic 没有公开的 list models 接口；返回常见推荐模型让用户挑选。
      return res.json({
        models: [
          'claude-opus-4-1',
          'claude-sonnet-4-5',
          'claude-haiku-4-5',
          'claude-3-7-sonnet-latest',
          'claude-3-5-sonnet-latest',
          'claude-3-5-haiku-latest'
        ]
      })
    }

    return res.status(400).json({ message: 'Unknown provider' })
  } catch (error) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : 'Failed to fetch models'
    })
  }
})

router.put('/ai/config', authenticate, async (req, res) => {
  const body = req.body || {}
  const provider =
    typeof body.provider === 'string' ? body.provider.trim() : env.ai.provider
  if (!['openai-compatible', 'gemini', 'claude'].includes(provider)) {
    return res.status(400).json({
      message: 'provider must be one of openai-compatible, gemini, claude'
    })
  }

  const openai = body.openai || {}
  const gemini = body.gemini || {}
  const claude = body.claude || {}

  const data: any = {
    enabled: Boolean(body.enabled),
    provider,
    openaiApiKey: emptyToNull(openai.apiKey),
    openaiBaseUrl: emptyToNull(openai.baseUrl),
    openaiModel: emptyToNull(openai.model),
    openaiTemperature: numberOrNull(openai.temperature),
    openaiMaxTokens: intOrNull(openai.maxTokens),
    openaiTimeoutMs: intOrNull(openai.timeoutMs),
    geminiApiKey: emptyToNull(gemini.apiKey),
    geminiModel: emptyToNull(gemini.model),
    geminiTemperature: numberOrNull(gemini.temperature),
    geminiMaxTokens: intOrNull(gemini.maxTokens),
    geminiTimeoutMs: intOrNull(gemini.timeoutMs),
    claudeApiKey: emptyToNull(claude.apiKey),
    claudeModel: emptyToNull(claude.model),
    claudeMaxTokens: intOrNull(claude.maxTokens),
    claudeTimeoutMs: intOrNull(claude.timeoutMs)
  }

  const cfg = await prisma.aiConfig.upsert({
    where: { id: AI_CONFIG_SINGLETON_ID },
    create: { id: AI_CONFIG_SINGLETON_ID, ...data },
    update: data
  })
  res.json(serializeAiConfig(cfg))
})

function emptyToNull(v: any) {
  if (v === undefined || v === null) return null
  if (typeof v === 'string' && v.trim() === '') return null
  return v
}
function numberOrNull(v: any) {
  if (v === undefined || v === null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
function intOrNull(v: any) {
  if (v === undefined || v === null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? Math.round(n) : null
}

router.post('/uploads', authenticate, handleUpload, async (req, res) => {
  const file = req.file
  const user = (req as AuthenticatedRequest).user
  if (!file) return res.status(400).json({ message: 'No file uploaded' })

  if (env.storageDriver === 'local') {
    if (!file.filename)
      return res
        .status(500)
        .json({ message: 'Local upload did not produce a filename' })
    const key = `users/${user.id}/${file.filename}`
    return res.status(201).json({ key, url: `/uploads/${key}` })
  }

  if (!env.s3 || !s3Client) {
    return res.status(500).json({ message: 'S3 storage is not configured' })
  }

  if (!file.buffer) {
    return res.status(500).json({ message: 'S3 upload buffer is missing' })
  }

  const key = makeS3Key(user.id, file)

  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: env.s3.bucket,
        Key: key,
        Body: file.buffer,
        ContentLength: file.size,
        ContentType: file.mimetype
      })
    )
  } catch (error) {
    console.error('S3 upload failed:', error)
    return res.status(502).json({ message: 'Upload to object storage failed' })
  }

  res.status(201).json({ key, url: buildS3PublicUrl(env.s3.publicUrl, key) })
})

router.get('/ratings/today', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  const ratings = await prisma.dailyRating.findMany({
    where: { date: todayDate(), userId: { in: visibleUserIds(currentUser) } },
    orderBy: { createdAt: 'asc' }
  })
  res.json(ratings.map(serializeRating))
})

router.post('/ratings', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  const date = todayDate()
  const score = Number(req.body.score)
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    return res.status(400).json({ message: 'Score must be between 1 and 5' })
  }
  const rating = await prisma.dailyRating.upsert({
    where: { userId_date: { userId: currentUser.id, date } },
    create: { userId: currentUser.id, date, score, note: req.body.note || '' },
    update: { score, note: req.body.note || '' }
  })
  res.json(serializeRating(rating))
})

router.get('/periods', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  const couple = await requireCurrentCouple(currentUser, res)
  if (!couple) return

  const { records, logs, settings } = await getPeriodData(couple.id)
  res.json(buildPeriodOverview(records, logs, settings))
})

router.post('/periods', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  const couple = await requireCurrentCouple(currentUser, res)
  if (!couple) return

  const payload = readPeriodPayload(req.body)
  if (payload.error) return res.status(400).json({ message: payload.error })
  const windowError = await validatePeriodWindow(
    couple.id,
    payload.data.startDate,
    payload.data.endDate
  )
  if (windowError) return res.status(400).json({ message: windowError })

  await prisma.periodRecord.create({
    data: {
      ...payload.data,
      coupleId: couple.id,
      createdById: currentUser.id
    }
  })

  const { records, logs, settings } = await getPeriodData(couple.id)
  res.status(201).json(buildPeriodOverview(records, logs, settings))
})

router.put('/periods/logs/:date', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  const couple = await requireCurrentCouple(currentUser, res)
  if (!couple) return

  const date = readPeriodDate(req.params.date)
  if (!date) return res.status(400).json({ message: 'date must be YYYY-MM-DD' })

  const payload = readPeriodLogPayload(req.body)
  if (payload.error) return res.status(400).json({ message: payload.error })

  await prisma.periodDailyLog.upsert({
    where: { coupleId_date: { coupleId: couple.id, date } },
    create: {
      date,
      symptoms: [],
      moods: [],
      ...payload.data,
      coupleId: couple.id,
      createdById: currentUser.id
    },
    update: payload.data
  })

  const { records, logs, settings } = await getPeriodData(couple.id)
  res.json(buildPeriodOverview(records, logs, settings))
})

router.delete('/periods/logs/:date', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  const couple = await requireCurrentCouple(currentUser, res)
  if (!couple) return

  const date = readPeriodDate(req.params.date)
  if (!date) return res.status(400).json({ message: 'date must be YYYY-MM-DD' })

  await prisma.periodDailyLog.deleteMany({
    where: { coupleId: couple.id, date }
  })

  const { records, logs, settings } = await getPeriodData(couple.id)
  res.json(buildPeriodOverview(records, logs, settings))
})

router.patch('/periods/settings', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  const couple = await requireCurrentCouple(currentUser, res)
  if (!couple) return

  const payload = readPeriodSettingsPayload(req.body)
  if (payload.error) return res.status(400).json({ message: payload.error })

  await prisma.periodSettings.upsert({
    where: { coupleId: couple.id },
    create: {
      coupleId: couple.id,
      ...payload.data
    },
    update: payload.data
  })

  const { records, logs, settings } = await getPeriodData(couple.id)
  res.json(buildPeriodOverview(records, logs, settings))
})

router.patch('/periods/:id', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  const couple = await requireCurrentCouple(currentUser, res)
  if (!couple) return

  const record = await prisma.periodRecord.findUnique({
    where: { id: req.params.id }
  })
  if (!record)
    return res.status(404).json({ message: 'Period record not found' })
  if (record.coupleId !== couple.id)
    return res.status(403).json({ message: 'Permission denied' })

  const payload = readPeriodPayload(req.body, true)
  if (payload.error) return res.status(400).json({ message: payload.error })

  const nextStartDate = payload.data.startDate ?? record.startDate
  const nextEndDate = Object.prototype.hasOwnProperty.call(
    payload.data,
    'endDate'
  )
    ? payload.data.endDate
    : record.endDate
  if (nextEndDate && nextEndDate < nextStartDate) {
    return res
      .status(400)
      .json({ message: 'endDate cannot be earlier than startDate' })
  }
  const windowError = await validatePeriodWindow(
    couple.id,
    nextStartDate,
    nextEndDate,
    record.id
  )
  if (windowError) return res.status(400).json({ message: windowError })

  await prisma.periodRecord.update({
    where: { id: req.params.id },
    data: payload.data
  })

  const { records, logs, settings } = await getPeriodData(couple.id)
  res.json(buildPeriodOverview(records, logs, settings))
})

router.delete('/periods/:id', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  const couple = await requireCurrentCouple(currentUser, res)
  if (!couple) return

  const record = await prisma.periodRecord.findUnique({
    where: { id: req.params.id }
  })
  if (!record)
    return res.status(404).json({ message: 'Period record not found' })
  if (record.coupleId !== couple.id)
    return res.status(403).json({ message: 'Permission denied' })

  await prisma.periodRecord.delete({ where: { id: req.params.id } })
  const { records, logs, settings } = await getPeriodData(couple.id)
  res.json(buildPeriodOverview(records, logs, settings))
})

router.post('/periods/care-todos/sync', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  const couple = await requireCurrentCouple(currentUser, res)
  if (!couple) return

  const clientTodayVal = req.body.clientToday
    ? readPeriodDate(req.body.clientToday)
    : undefined
  const today = clientTodayVal || todayDate()

  const { records, logs, settings } = await getPeriodData(couple.id)
  const normalizedSettings = serializePeriodSettings(settings)
  const summary = buildPeriodSummary(records, logs, settings, today)
  if (!normalizedSettings.autoSyncCareTodos) {
    return res.json({
      skipped: true,
      created: 0,
      updated: 0,
      predictedStartDate: summary.predictedStartDate
    })
  }

  const latestRecord = records[0]
  const periodOwnerId = latestRecord ? latestRecord.createdById : currentUser.id
  const partnerId =
    couple.userAId === periodOwnerId ? couple.userBId : couple.userAId

  const visibleIds = [couple.userAId, couple.userBId]
  let created = 0
  let updated = 0

  const syncTodoGroup = async (
    items: Array<{ key: string; title: string; description: string }>,
    source: string,
    category: string,
    targetDate: Date,
    assignedUserId: string
  ) => {
    for (const item of items) {
      const updateResult = await prisma.todo.updateMany({
        where: {
          userId: { in: visibleIds },
          autoSource: source,
          autoSourceKey: item.key,
          completed: false
        },
        data: {
          title: item.title,
          description: item.description,
          targetDate,
          category,
          autoDate: targetDate,
          userId: assignedUserId
        }
      })

      if (updateResult.count > 0) {
        updated += updateResult.count
        continue
      }

      const count = await prisma.todo.count({
        where: { userId: { in: visibleIds } }
      })
      await prisma.todo.create({
        data: {
          title: item.title,
          description: item.description,
          targetDate,
          category,
          autoSource: source,
          autoSourceKey: item.key,
          autoDate: targetDate,
          isFeatured: true,
          sortOrder: count,
          completed: false,
          userId: assignedUserId
        }
      })
      created += 1
    }
  }

  if (
    summary.predictedStartDate &&
    summary.daysUntilNext !== undefined &&
    summary.daysUntilNext >= 0 &&
    summary.daysUntilNext <= normalizedSettings.reminderLeadDays
  ) {
    await syncTodoGroup(
      PERIOD_CARE_TODOS,
      PERIOD_CARE_SOURCE,
      PERIOD_CARE_CATEGORY,
      parseDate(summary.predictedStartDate),
      partnerId
    )
  }

  if (
    normalizedSettings.mode === 'trying_to_conceive' &&
    summary.fertileWindow
  ) {
    const windowStart = parseDate(summary.fertileWindow.startDate)
    const windowEnd = parseDate(summary.fertileWindow.endDate)
    if (today >= windowStart && today <= windowEnd) {
      await syncTodoGroup(
        PERIOD_FERTILITY_TODOS,
        PERIOD_FERTILITY_SOURCE,
        PERIOD_FERTILITY_CATEGORY,
        today,
        periodOwnerId
      )
    }
  }

  if (created + updated === 0) {
    return res.json({
      skipped: true,
      created,
      updated,
      predictedStartDate: summary.predictedStartDate
    })
  }

  res.json({
    skipped: false,
    created,
    updated,
    predictedStartDate: summary.predictedStartDate
  })
})

router.get('/menu/dishes', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  const couple = await requireCurrentCouple(currentUser, res)
  if (!couple) return

  const customDishes = await prisma.menuDish.findMany({
    where: { coupleId: couple.id },
    orderBy: [{ category: 'asc' }, { createdAt: 'asc' }]
  })

  res.json([...MENU_PRESET_DISHES, ...customDishes.map(serializeMenuDish)])
})

router.post('/menu/dishes', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  const couple = await requireCurrentCouple(currentUser, res)
  if (!couple) return

  const name = String(req.body.name || '').trim()
  const category = String(req.body.category || '').trim()
  const description =
    typeof req.body.description === 'string' ? req.body.description.trim() : ''
  const imageUrl = readImageKey(req.body.imageUrl)
  if (!name || !category) {
    return res
      .status(400)
      .json({ message: 'Dish name and category are required' })
  }

  try {
    const dish = await prisma.menuDish.create({
      data: {
        name,
        category,
        description,
        imageUrl,
        coupleId: couple.id,
        createdById: currentUser.id
      }
    })
    res.status(201).json(serializeMenuDish(dish))
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return res.status(409).json({ message: 'Dish already exists' })
    }
    throw error
  }
})

router.delete('/menu/dishes/:id', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  const couple = await requireCurrentCouple(currentUser, res)
  if (!couple) return

  if (req.params.id.startsWith('preset-')) {
    return res.status(400).json({ message: 'Preset dishes cannot be deleted' })
  }

  const dish = await prisma.menuDish.findUnique({
    where: { id: req.params.id }
  })
  if (!dish) return res.status(404).json({ message: 'Dish not found' })
  if (dish.coupleId !== couple.id)
    return res.status(403).json({ message: 'Permission denied' })

  await prisma.menuDish.delete({ where: { id: req.params.id } })
  res.status(204).send()
})

async function getMealOrderDay(coupleId: string, date: Date) {
  const items = await prisma.mealOrderItem.findMany({
    where: { coupleId, date },
    orderBy: { createdAt: 'asc' },
    include: { createdBy: { select: publicPartnerSelect } }
  })

  return {
    date: formatDate(date)!,
    items: items.map(serializeMealOrderItem)
  }
}

function readOrderDate(value: unknown) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return null
  const date = parseDate(value)
  return Number.isNaN(date.getTime()) ? null : date
}

router.get('/meal-orders/today', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  const couple = await requireCurrentCouple(currentUser, res)
  if (!couple) return

  res.json(await getMealOrderDay(couple.id, todayDate()))
})

router.get('/meal-orders', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  const couple = await requireCurrentCouple(currentUser, res)
  if (!couple) return

  const date = readOrderDate(req.query.date)
  if (!date) return res.status(400).json({ message: 'date must be YYYY-MM-DD' })

  res.json(await getMealOrderDay(couple.id, date))
})

router.post('/meal-orders/today/items', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  const couple = await requireCurrentCouple(currentUser, res)
  if (!couple) return

  const dishId =
    typeof req.body.dishId === 'string' ? req.body.dishId : undefined
  let dishName = String(req.body.dishName || req.body.name || '').trim()
  let category = String(req.body.category || '').trim()
  let description =
    typeof req.body.description === 'string' ? req.body.description.trim() : ''
  let imageUrl = readImageKey(req.body.imageUrl)
  let customDishId: string | undefined

  if (dishId?.startsWith('preset-')) {
    const preset = MENU_PRESET_DISHES.find((dish) => dish.id === dishId)
    if (!preset) return res.status(404).json({ message: 'Dish not found' })
    dishName = preset.name
    category = preset.category
    description = preset.description
    imageUrl = readImageKey(preset.imageUrl)
  } else if (dishId) {
    const dish = await prisma.menuDish.findUnique({ where: { id: dishId } })
    if (!dish) return res.status(404).json({ message: 'Dish not found' })
    if (dish.coupleId !== couple.id)
      return res.status(403).json({ message: 'Permission denied' })
    dishName = dish.name
    category = dish.category
    description = dish.description || ''
    imageUrl = readImageKey(dish.imageUrl)
    customDishId = dish.id
  }

  if (!dishName || !category) {
    return res
      .status(400)
      .json({ message: 'Dish name and category are required' })
  }

  const date = todayDate()
  const item = await prisma.mealOrderItem.upsert({
    where: { coupleId_date_dishName: { coupleId: couple.id, date, dishName } },
    create: {
      coupleId: couple.id,
      createdById: currentUser.id,
      date,
      dishName,
      category,
      description,
      imageUrl,
      quantity: 1,
      dishId: customDishId
    },
    update: { quantity: { increment: 1 } },
    include: { createdBy: { select: publicPartnerSelect } }
  })

  res.status(201).json(serializeMealOrderItem(item))
})

router.patch('/meal-orders/items/:id', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  const couple = await requireCurrentCouple(currentUser, res)
  if (!couple) return

  const item = await prisma.mealOrderItem.findUnique({
    where: { id: req.params.id }
  })
  if (!item) return res.status(404).json({ message: 'Order item not found' })
  if (item.coupleId !== couple.id)
    return res.status(403).json({ message: 'Permission denied' })

  const data: { quantity?: number; note?: string } = {}
  if (req.body.quantity !== undefined) {
    const quantity = Number(req.body.quantity)
    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ message: 'Quantity must be at least 1' })
    }
    data.quantity = quantity
  }
  if (req.body.note !== undefined) {
    data.note = String(req.body.note || '').trim()
  }

  const updated = await prisma.mealOrderItem.update({
    where: { id: req.params.id },
    data,
    include: { createdBy: { select: publicPartnerSelect } }
  })

  res.json(serializeMealOrderItem(updated))
})

router.delete('/meal-orders/items/:id', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  const couple = await requireCurrentCouple(currentUser, res)
  if (!couple) return

  const item = await prisma.mealOrderItem.findUnique({
    where: { id: req.params.id }
  })
  if (!item) return res.status(404).json({ message: 'Order item not found' })
  if (item.coupleId !== couple.id)
    return res.status(403).json({ message: 'Permission denied' })

  await prisma.mealOrderItem.delete({ where: { id: req.params.id } })
  res.status(204).send()
})

router.get('/kitchen/recipes', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  const couple = await requireCurrentCouple(currentUser, res)
  if (!couple) return

  const customRecipes = await prisma.kitchenRecipe.findMany({
    where: { coupleId: couple.id },
    orderBy: [{ createdAt: 'desc' }],
    include: { createdBy: { select: publicPartnerSelect } }
  })
  const recipes = [...KITCHEN_PRESET_RECIPES, ...customRecipes]
  const recipeIds = recipes.map((recipe) => recipe.id)
  const favorites = await prisma.kitchenRecipeFavorite.findMany({
    where: { recipeId: { in: recipeIds } }
  })
  const favoriteIds = new Set(
    favorites
      .filter((favorite) => favorite.userId === currentUser.id)
      .map((favorite) => favorite.recipeId)
  )
  const favoriteCounts = favorites.reduce((map, favorite) => {
    map.set(favorite.recipeId, (map.get(favorite.recipeId) || 0) + 1)
    return map
  }, new Map<string, number>())

  res.json(
    recipes.map((recipe) =>
      serializeKitchenRecipe(recipe, favoriteIds, favoriteCounts)
    )
  )
})

router.post('/kitchen/recipes', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  const couple = await requireCurrentCouple(currentUser, res)
  if (!couple) return

  const payload = readKitchenRecipePayload(req.body)
  if (!payload.title || !payload.category) {
    return res
      .status(400)
      .json({ message: 'Recipe title and category are required' })
  }

  try {
    const recipe = await prisma.kitchenRecipe.create({
      data: {
        ...payload,
        coupleId: couple.id,
        createdById: currentUser.id
      },
      include: { createdBy: { select: publicPartnerSelect } }
    })
    res.status(201).json(serializeKitchenRecipe(recipe))
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return res.status(409).json({ message: 'Recipe already exists' })
    }
    throw error
  }
})

router.patch('/kitchen/recipes/:id', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  const couple = await requireCurrentCouple(currentUser, res)
  if (!couple) return
  if (req.params.id.startsWith('preset-')) {
    return res.status(400).json({ message: 'Preset recipes cannot be edited' })
  }

  const existing = await prisma.kitchenRecipe.findUnique({
    where: { id: req.params.id }
  })
  if (!existing) return res.status(404).json({ message: 'Recipe not found' })
  if (existing.coupleId !== couple.id)
    return res.status(403).json({ message: 'Permission denied' })

  const payload = readKitchenRecipePayload({ ...existing, ...req.body })
  if (!payload.title || !payload.category) {
    return res
      .status(400)
      .json({ message: 'Recipe title and category are required' })
  }

  const recipe = await prisma.kitchenRecipe.update({
    where: { id: req.params.id },
    data: payload,
    include: { createdBy: { select: publicPartnerSelect } }
  })
  res.json(serializeKitchenRecipe(recipe))
})

router.delete('/kitchen/recipes/:id', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  const couple = await requireCurrentCouple(currentUser, res)
  if (!couple) return
  if (req.params.id.startsWith('preset-')) {
    return res.status(400).json({ message: 'Preset recipes cannot be deleted' })
  }

  const recipe = await prisma.kitchenRecipe.findUnique({
    where: { id: req.params.id }
  })
  if (!recipe) return res.status(404).json({ message: 'Recipe not found' })
  if (recipe.coupleId !== couple.id)
    return res.status(403).json({ message: 'Permission denied' })

  await prisma.kitchenRecipe.delete({ where: { id: req.params.id } })
  await prisma.kitchenRecipeFavorite.deleteMany({
    where: { recipeId: req.params.id }
  })
  res.status(204).send()
})

router.post('/kitchen/recipes/:id/favorite', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  const couple = await requireCurrentCouple(currentUser, res)
  if (!couple) return

  const recipe = await findKitchenRecipeForCouple(req.params.id, couple.id)
  if (!recipe) return res.status(404).json({ message: 'Recipe not found' })

  await prisma.kitchenRecipeFavorite.upsert({
    where: {
      recipeId_userId: { recipeId: req.params.id, userId: currentUser.id }
    },
    create: { recipeId: req.params.id, userId: currentUser.id },
    update: {}
  })
  res.status(204).send()
})

router.delete(
  '/kitchen/recipes/:id/favorite',
  authenticate,
  async (req, res) => {
    const currentUser = (req as AuthenticatedRequest).user
    const couple = await requireCurrentCouple(currentUser, res)
    if (!couple) return

    await prisma.kitchenRecipeFavorite.deleteMany({
      where: { recipeId: req.params.id, userId: currentUser.id }
    })
    res.status(204).send()
  }
)

router.get('/kitchen/shopping-lists', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  const couple = await requireCurrentCouple(currentUser, res)
  if (!couple) return

  const date = readKitchenDate(req.query.date)
  if (!date) return res.status(400).json({ message: 'date must be YYYY-MM-DD' })

  const list = await prisma.kitchenShoppingList.findUnique({
    where: { coupleId_date: { coupleId: couple.id, date } },
    include: { items: { orderBy: { createdAt: 'asc' } } }
  })
  res.json(serializeShoppingList(list, date))
})

router.post(
  '/kitchen/shopping-lists/generate',
  authenticate,
  async (req, res) => {
    const currentUser = (req as AuthenticatedRequest).user
    const couple = await requireCurrentCouple(currentUser, res)
    if (!couple) return

    const date = readKitchenDate(req.body.date)
    if (!date)
      return res.status(400).json({ message: 'date must be YYYY-MM-DD' })
    const recipeIds: string[] = Array.from(
      new Set(
        (Array.isArray(req.body.recipeIds) ? req.body.recipeIds : []).map(
          (id) => String(id)
        )
      )
    )
    if (recipeIds.length === 0)
      return res.status(400).json({ message: 'Select at least one recipe' })

    const recipes = []
    for (const recipeId of recipeIds) {
      const recipe = await findKitchenRecipeForCouple(recipeId, couple.id)
      if (!recipe) return res.status(404).json({ message: 'Recipe not found' })
      recipes.push(recipe)
    }
    const items = mergeIngredients(recipes)

    const list = await prisma.$transaction(async (tx) => {
      const current = await tx.kitchenShoppingList.upsert({
        where: { coupleId_date: { coupleId: couple.id, date } },
        create: { coupleId: couple.id, createdById: currentUser.id, date },
        update: { createdById: currentUser.id }
      })
      await tx.kitchenShoppingListItem.deleteMany({
        where: { listId: current.id }
      })
      if (items.length > 0) {
        await tx.kitchenShoppingListItem.createMany({
          data: items.map((item) => ({ ...item, listId: current.id }))
        })
      }
      return tx.kitchenShoppingList.findUnique({
        where: { id: current.id },
        include: { items: { orderBy: { createdAt: 'asc' } } }
      })
    })

    res.json(serializeShoppingList(list, date))
  }
)

router.patch(
  '/kitchen/shopping-list-items/:id',
  authenticate,
  async (req, res) => {
    const currentUser = (req as AuthenticatedRequest).user
    const couple = await requireCurrentCouple(currentUser, res)
    if (!couple) return

    const item = await prisma.kitchenShoppingListItem.findUnique({
      where: { id: req.params.id },
      include: { list: true }
    })
    if (!item)
      return res.status(404).json({ message: 'Shopping item not found' })
    if (item.list.coupleId !== couple.id)
      return res.status(403).json({ message: 'Permission denied' })

    const data: { checked?: boolean; note?: string } = {}
    if (req.body.checked !== undefined) data.checked = Boolean(req.body.checked)
    if (req.body.note !== undefined)
      data.note = String(req.body.note || '').trim()

    const updated = await prisma.kitchenShoppingListItem.update({
      where: { id: req.params.id },
      data
    })
    res.json({
      id: updated.id,
      name: updated.name,
      quantity: updated.quantity ?? undefined,
      unit: updated.unit ?? undefined,
      note: updated.note ?? undefined,
      checked: updated.checked
    })
  }
)

router.delete(
  '/kitchen/shopping-list-items/:id',
  authenticate,
  async (req, res) => {
    const currentUser = (req as AuthenticatedRequest).user
    const couple = await requireCurrentCouple(currentUser, res)
    if (!couple) return

    const item = await prisma.kitchenShoppingListItem.findUnique({
      where: { id: req.params.id },
      include: { list: true }
    })
    if (!item)
      return res.status(404).json({ message: 'Shopping item not found' })
    if (item.list.coupleId !== couple.id)
      return res.status(403).json({ message: 'Permission denied' })

    await prisma.kitchenShoppingListItem.delete({
      where: { id: req.params.id }
    })
    res.status(204).send()
  }
)

router.get('/kitchen/checkins', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  const couple = await requireCurrentCouple(currentUser, res)
  if (!couple) return

  const checkins = await prisma.kitchenCookCheckin.findMany({
    where: { coupleId: couple.id },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    take: 50,
    include: { createdBy: { select: publicPartnerSelect } }
  })
  res.json(checkins.map(serializeCookCheckin))
})

router.post('/kitchen/checkins', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  const couple = await requireCurrentCouple(currentUser, res)
  if (!couple) return

  const date = readKitchenDate(req.body.date)
  if (!date) return res.status(400).json({ message: 'date must be YYYY-MM-DD' })
  const recipeId =
    typeof req.body.recipeId === 'string' && req.body.recipeId
      ? req.body.recipeId
      : undefined
  let title = String(req.body.title || '').trim()
  if (recipeId) {
    const recipe = await findKitchenRecipeForCouple(recipeId, couple.id)
    if (!recipe) return res.status(404).json({ message: 'Recipe not found' })
    title = title || recipe.title
  }
  if (!title)
    return res.status(400).json({ message: 'Checkin title is required' })

  const rating =
    req.body.rating === undefined || req.body.rating === ''
      ? undefined
      : Number(req.body.rating)
  if (
    rating !== undefined &&
    (!Number.isInteger(rating) || rating < 1 || rating > 5)
  ) {
    return res.status(400).json({ message: 'Rating must be between 1 and 5' })
  }

  const checkin = await prisma.kitchenCookCheckin.create({
    data: {
      coupleId: couple.id,
      createdById: currentUser.id,
      date,
      recipeId,
      title,
      imageUrl: readImageKey(req.body.imageUrl),
      note: typeof req.body.note === 'string' ? req.body.note.trim() : '',
      rating
    },
    include: { createdBy: { select: publicPartnerSelect } }
  })
  res.status(201).json(serializeCookCheckin(checkin))
})

router.delete('/kitchen/checkins/:id', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  const couple = await requireCurrentCouple(currentUser, res)
  if (!couple) return

  const checkin = await prisma.kitchenCookCheckin.findUnique({
    where: { id: req.params.id }
  })
  if (!checkin) return res.status(404).json({ message: 'Checkin not found' })
  if (checkin.coupleId !== couple.id)
    return res.status(403).json({ message: 'Permission denied' })

  await prisma.kitchenCookCheckin.delete({ where: { id: req.params.id } })
  res.status(204).send()
})

router.get('/anniversaries', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  const anniversaries = await prisma.anniversary.findMany({
    where: { userId: { in: visibleUserIds(currentUser) } },
    orderBy: { date: 'asc' }
  })
  res.json(anniversaries.map(serializeAnniversary))
})

router.post('/anniversaries', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  const anniversary = await prisma.anniversary.create({
    data: {
      title: req.body.title,
      date: parseDate(req.body.date),
      isImportant: Boolean(req.body.isImportant),
      userId: currentUser.id
    }
  })
  res.status(201).json(serializeAnniversary(anniversary))
})

router.patch('/anniversaries/:id', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  const anniversary = await prisma.anniversary.findUnique({
    where: { id: req.params.id }
  })
  if (!anniversary)
    return res.status(404).json({ message: 'Anniversary not found' })
  if (!canAccess(currentUser, anniversary.userId))
    return res.status(403).json({ message: 'Permission denied' })

  const updated = await prisma.anniversary.update({
    where: { id: req.params.id },
    data: {
      title: req.body.title ?? anniversary.title,
      date: req.body.date ? parseDate(req.body.date) : anniversary.date,
      isImportant: req.body.isImportant ?? anniversary.isImportant
    }
  })
  res.json(serializeAnniversary(updated))
})

router.delete('/anniversaries/:id', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  const anniversary = await prisma.anniversary.findUnique({
    where: { id: req.params.id }
  })
  if (!anniversary)
    return res.status(404).json({ message: 'Anniversary not found' })
  if (!canAccess(currentUser, anniversary.userId))
    return res.status(403).json({ message: 'Permission denied' })
  await prisma.anniversary.delete({ where: { id: req.params.id } })
  res.status(204).send()
})

router.get('/album/overview', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  const where = albumWhereFor(currentUser)
  const visibleIds = visibleUserIds(currentUser)

  const [
    total,
    photos,
    videos,
    featured,
    comments,
    likes,
    categories,
    featuredImages,
    fallbackImages
  ] = await Promise.all([
    prisma.albumImage.count({ where }),
    prisma.albumImage.count({
      where: { ...where, mediaType: { not: 'video' } }
    }),
    prisma.albumImage.count({ where: { ...where, mediaType: 'video' } }),
    prisma.albumImage.count({ where: { ...where, isFeatured: true } }),
    prisma.albumComment.count({
      where: { albumImage: { userId: { in: visibleIds } } }
    }),
    prisma.albumLike.count({
      where: { albumImage: { userId: { in: visibleIds } } }
    }),
    prisma.albumImage.groupBy({
      by: ['category'],
      where,
      _count: { _all: true }
    }),
    prisma.albumImage.findMany({
      where: { ...where, isFeatured: true },
      include: {
        likes: { where: { userId: currentUser.id } },
        _count: { select: { likes: true, comments: true } }
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 4
    }),
    prisma.albumImage.findMany({
      where,
      include: {
        likes: { where: { userId: currentUser.id } },
        _count: { select: { likes: true, comments: true } }
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 4
    })
  ])

  const categoryStats: Record<string, number> = { 全部: total }
  categories.forEach((category) => {
    if (category.category)
      categoryStats[category.category] = category._count._all
  })
  const seenFeaturedIds = new Set(featuredImages.map((image) => image.id))
  const featuredItems = [
    ...featuredImages,
    ...fallbackImages.filter((image) => !seenFeaturedIds.has(image.id))
  ].slice(0, 4)

  res.json({
    total,
    photos,
    videos,
    featured,
    comments,
    likes,
    categoryStats,
    featuredItems: featuredItems.map((image) =>
      serializeAlbumListImage(image, currentUser.id)
    )
  })
})

router.get('/album/map', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  const category = readAlbumCategory(req.query.category)
  const startDate = req.query.startDate as string | undefined
  const endDate = req.query.endDate as string | undefined
  const where = albumWhereFor(currentUser, category, startDate, endDate)
  const locatedWhere = { ...where, lat: { not: null }, lng: { not: null } }
  const [items, missingCount] = await Promise.all([
    prisma.albumImage.findMany({
      where: locatedWhere,
      include: {
        likes: { where: { userId: currentUser.id } },
        _count: { select: { likes: true, comments: true } }
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]
    }),
    prisma.albumImage.count({
      where: {
        ...where,
        OR: [{ lat: null }, { lng: null }]
      }
    })
  ])
  res.json({
    items: items.map((image) => serializeAlbumListImage(image, currentUser.id)),
    missingCount
  })
})

router.get('/album/location-missing', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  const category = readAlbumCategory(req.query.category)
  const startDate = req.query.startDate as string | undefined
  const endDate = req.query.endDate as string | undefined
  const images = await prisma.albumImage.findMany({
    where: {
      ...albumWhereFor(currentUser, category, startDate, endDate),
      OR: [{ lat: null }, { lng: null }]
    },
    include: {
      likes: { where: { userId: currentUser.id } },
      _count: { select: { likes: true, comments: true } }
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]
  })
  res.json(
    images.map((image) => serializeAlbumListImage(image, currentUser.id))
  )
})

router.get('/proxy', async (req, res) => {
  const token =
    req.headers.authorization?.split(' ')[1] || (req.query.token as string)
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  try {
    jwt.verify(token, env.jwtSecret)
  } catch {
    return res.status(401).json({ message: 'Invalid token' })
  }

  const imageUrl = req.query.url
  if (!imageUrl || typeof imageUrl !== 'string') {
    return res.status(400).send('URL parameter is required')
  }

  // Security check: only proxy URLs from S3 public URL or relative uploads
  const allowedPrefix = env.s3?.publicUrl
  if (allowedPrefix && !imageUrl.startsWith(allowedPrefix)) {
    return res.status(403).send('Forbidden URL')
  }

  try {
    const response = await fetch(imageUrl)
    if (!response.ok)
      throw new Error(`Failed to fetch image: ${response.statusText}`)

    const contentType = response.headers.get('content-type')
    if (contentType) res.setHeader('content-type', contentType)

    const buffer = Buffer.from(await response.arrayBuffer())
    return res.send(buffer)
  } catch (error) {
    console.error('Image proxy failed:', error)
    res.status(500).send('Image proxy failed')
  }
})

router.get('/album', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  const category = readAlbumCategory(req.query.category)
  const limit = readAlbumLimit(req.query.limit)
  const startDate = req.query.startDate as string | undefined
  const endDate = req.query.endDate as string | undefined

  const where = await albumWhereAfterCursor(
    currentUser,
    category,
    req.query.cursor,
    startDate,
    endDate
  )
  if (!where) return res.status(400).json({ message: 'Invalid album cursor' })

  const images = await prisma.albumImage.findMany({
    where,
    include: {
      likes: { where: { userId: currentUser.id } },
      _count: { select: { likes: true, comments: true } }
    },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1
  })
  res.json(serializeAlbumPage(images, currentUser.id, limit))
})

router.get('/album/:id', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  const image = await prisma.albumImage.findUnique({
    where: { id: req.params.id },
    include: {
      comments: {
        orderBy: { createdAt: 'asc' },
        include: { user: true }
      },
      likes: { where: { userId: currentUser.id } },
      _count: { select: { likes: true, comments: true } }
    }
  })
  if (!image) return res.status(404).json({ message: 'Image not found' })
  if (!canAccess(currentUser, image.userId))
    return res.status(403).json({ message: 'Permission denied' })
  res.json(serializeAlbumImage(image, currentUser.id))
})

router.post('/album', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  const src = readImageKey(req.body.src)
  if (!src || !req.body.title) {
    return res.status(400).json({ message: 'Media URL and title are required' })
  }
  const locationPayload = readAlbumLocationPayload(req.body)
  if (locationPayload.error)
    return res.status(400).json({ message: locationPayload.error })
  const image = await prisma.albumImage.create({
    data: {
      src,
      title: req.body.title,
      description: req.body.description || null,
      mediaType: req.body.mediaType === 'video' ? 'video' : 'image',
      height: req.body.height || 'h-64',
      date: parseDate(req.body.date),
      category: req.body.category,
      ...locationPayload.data,
      isFeatured: Boolean(req.body.isFeatured),
      userId: currentUser.id
    },
    include: {
      comments: { include: { user: true } },
      likes: { where: { userId: currentUser.id } },
      _count: { select: { likes: true, comments: true } }
    }
  })
  res.status(201).json(serializeAlbumImage(image, currentUser.id))
})

router.patch('/album/:id', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  const image = await prisma.albumImage.findUnique({
    where: { id: req.params.id }
  })
  if (!image) return res.status(404).json({ message: 'Image not found' })
  if (!canAccess(currentUser, image.userId))
    return res.status(403).json({ message: 'Permission denied' })

  const locationPayload = readAlbumLocationPayload(req.body)
  if (locationPayload.error)
    return res.status(400).json({ message: locationPayload.error })
  const updated = await prisma.albumImage.update({
    where: { id: req.params.id },
    data: {
      ...(typeof req.body.isFeatured === 'boolean'
        ? { isFeatured: req.body.isFeatured }
        : {}),
      ...(typeof req.body.title === 'string' ? { title: req.body.title } : {}),
      ...(typeof req.body.description === 'string'
        ? { description: req.body.description }
        : {}),
      ...(typeof req.body.category === 'string'
        ? { category: req.body.category }
        : {}),
      ...(typeof req.body.src === 'string' && readImageKey(req.body.src)
        ? { src: readImageKey(req.body.src) }
        : {}),
      ...(req.body.date ? { date: parseDate(req.body.date) } : {}),
      ...locationPayload.data
    },
    include: {
      comments: {
        orderBy: { createdAt: 'asc' },
        include: { user: true }
      },
      likes: { where: { userId: currentUser.id } },
      _count: { select: { likes: true, comments: true } }
    }
  })
  res.json(serializeAlbumImage(updated, currentUser.id))
})

router.post('/album/:id/comments', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  const content = String(req.body.content || '').trim()
  if (!content)
    return res.status(400).json({ message: 'Comment content is required' })

  const image = await prisma.albumImage.findUnique({
    where: { id: req.params.id }
  })
  if (!image) return res.status(404).json({ message: 'Image not found' })
  if (!canAccess(currentUser, image.userId))
    return res.status(403).json({ message: 'Permission denied' })

  await prisma.albumComment.create({
    data: {
      content,
      albumImageId: image.id,
      userId: currentUser.id
    }
  })

  const updated = await prisma.albumImage.findUnique({
    where: { id: image.id },
    include: {
      comments: {
        orderBy: { createdAt: 'asc' },
        include: { user: true }
      },
      likes: { where: { userId: currentUser.id } },
      _count: { select: { likes: true, comments: true } }
    }
  })
  res.status(201).json(serializeAlbumImage(updated, currentUser.id))
})

router.post('/album/:id/like', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  const image = await prisma.albumImage.findUnique({
    where: { id: req.params.id }
  })
  if (!image) return res.status(404).json({ message: 'Image not found' })
  if (!canAccess(currentUser, image.userId))
    return res.status(403).json({ message: 'Permission denied' })

  await prisma.albumLike.upsert({
    where: {
      albumImageId_userId: { albumImageId: image.id, userId: currentUser.id }
    },
    update: {},
    create: { albumImageId: image.id, userId: currentUser.id }
  })

  const updated = await prisma.albumImage.findUnique({
    where: { id: image.id },
    include: {
      comments: {
        orderBy: { createdAt: 'asc' },
        include: { user: true }
      },
      likes: { where: { userId: currentUser.id } },
      _count: { select: { likes: true, comments: true } }
    }
  })
  res.json(serializeAlbumImage(updated, currentUser.id))
})

router.delete('/album/:id/like', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  const image = await prisma.albumImage.findUnique({
    where: { id: req.params.id }
  })
  if (!image) return res.status(404).json({ message: 'Image not found' })
  if (!canAccess(currentUser, image.userId))
    return res.status(403).json({ message: 'Permission denied' })

  await prisma.albumLike.deleteMany({
    where: { albumImageId: image.id, userId: currentUser.id }
  })

  const updated = await prisma.albumImage.findUnique({
    where: { id: image.id },
    include: {
      comments: {
        orderBy: { createdAt: 'asc' },
        include: { user: true }
      },
      likes: { where: { userId: currentUser.id } },
      _count: { select: { likes: true, comments: true } }
    }
  })
  res.json(serializeAlbumImage(updated, currentUser.id))
})

router.delete('/album/:id', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  const image = await prisma.albumImage.findUnique({
    where: { id: req.params.id }
  })
  if (!image) return res.status(404).json({ message: 'Image not found' })
  if (!canAccess(currentUser, image.userId))
    return res.status(403).json({ message: 'Permission denied' })
  await prisma.albumImage.delete({ where: { id: req.params.id } })
  res.status(204).send()
})

router.get('/diaries', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  const startDate = req.query.startDate as string | undefined
  const endDate = req.query.endDate as string | undefined

  const dateFilter: any = {}
  if (startDate) dateFilter.gte = parseDate(startDate)
  if (endDate) {
    const end = parseDate(endDate)
    end.setUTCHours(23, 59, 59, 999)
    dateFilter.lte = end
  }

  const diaries = await prisma.diary.findMany({
    where: {
      userId: { in: visibleUserIds(currentUser) },
      ...(startDate || endDate ? { date: dateFilter } : {})
    },
    orderBy: { date: 'desc' }
  })
  res.json(diaries.map(serializeDiary))
})

router.post('/diaries', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  const diary = await prisma.diary.create({
    data: {
      date: parseDate(req.body.date),
      mood: req.body.mood,
      content: req.body.content,
      location: req.body.location,
      images: readImageKeys(req.body.images),
      userId: currentUser.id
    }
  })
  res.status(201).json(serializeDiary(diary))
})

router.put('/diaries/:id', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  const diary = await prisma.diary.findUnique({ where: { id: req.params.id } })
  if (!diary) return res.status(404).json({ message: 'Diary not found' })
  if (diary.userId !== currentUser.id)
    return res.status(403).json({ message: 'Permission denied' })

  const updated = await prisma.diary.update({
    where: { id: req.params.id },
    data: {
      date: req.body.date ? parseDate(req.body.date) : diary.date,
      mood: req.body.mood ?? diary.mood,
      content: req.body.content ?? diary.content,
      location: req.body.location ?? diary.location,
      images:
        req.body.images !== undefined
          ? readImageKeys(req.body.images)
          : diary.images
    }
  })
  res.json(serializeDiary(updated))
})

router.delete('/diaries/:id', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  const diary = await prisma.diary.findUnique({ where: { id: req.params.id } })
  if (!diary) return res.status(404).json({ message: 'Diary not found' })
  if (diary.userId !== currentUser.id)
    return res.status(403).json({ message: 'Permission denied' })
  await prisma.diary.delete({ where: { id: req.params.id } })
  res.status(204).send()
})

router.get('/todos', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  const todos = await prisma.todo.findMany({
    where: { userId: { in: visibleUserIds(currentUser) } },
    orderBy: [
      { completed: 'asc' },
      { isFeatured: 'desc' },
      { sortOrder: 'asc' },
      { createdAt: 'asc' }
    ]
  })
  res.json(todos.map(serializeTodo))
})

router.post('/todos', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  const visibleIds = visibleUserIds(currentUser)
  const count = await prisma.todo.count({
    where: { userId: { in: visibleIds } }
  })
  if (count >= 100) {
    return res.status(400).json({ message: '最多只能创建 100 件恋爱小事' })
  }

  const title = String(req.body.title || '').trim()
  const category = String(req.body.category || '日常').trim()
  const targetDate = readOptionalDateTime(req.body.targetDate)
  if (!title) return res.status(400).json({ message: '标题不能为空' })
  if (!category) return res.status(400).json({ message: '分类不能为空' })
  if (targetDate === undefined)
    return res.status(400).json({ message: '计划日期时间格式不正确' })

  const todo = await prisma.todo.create({
    data: {
      title,
      description:
        typeof req.body.description === 'string'
          ? req.body.description.trim() || null
          : null,
      targetDate,
      category,
      isFeatured: Boolean(req.body.isFeatured),
      sortOrder: Number.isInteger(Number(req.body.sortOrder))
        ? Number(req.body.sortOrder)
        : count,
      completed: false,
      userId: currentUser.id
    }
  })
  res.status(201).json(serializeTodo(todo))
})

router.patch('/todos/:id', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  const todo = await prisma.todo.findUnique({ where: { id: req.params.id } })
  if (!todo) return res.status(404).json({ message: 'Todo not found' })
  if (!canAccess(currentUser, todo.userId))
    return res.status(403).json({ message: 'Permission denied' })

  const data: any = {}
  if (req.body.title !== undefined) {
    const title = String(req.body.title || '').trim()
    if (!title) return res.status(400).json({ message: '标题不能为空' })
    data.title = title
  }
  if (req.body.description !== undefined) {
    data.description =
      typeof req.body.description === 'string'
        ? req.body.description.trim() || null
        : null
  }
  if (req.body.category !== undefined) {
    const category = String(req.body.category || '').trim()
    if (!category) return res.status(400).json({ message: '分类不能为空' })
    data.category = category
  }
  if (req.body.targetDate !== undefined) {
    const targetDate = readOptionalDateTime(req.body.targetDate)
    if (targetDate === undefined)
      return res.status(400).json({ message: '计划日期时间格式不正确' })
    data.targetDate = targetDate
  }
  if (req.body.isFeatured !== undefined)
    data.isFeatured = Boolean(req.body.isFeatured)
  if (req.body.sortOrder !== undefined) {
    const sortOrder = Number(req.body.sortOrder)
    if (!Number.isInteger(sortOrder) || sortOrder < 0)
      return res.status(400).json({ message: '排序值必须是非负整数' })
    data.sortOrder = sortOrder
  }
  if (req.body.memoryNote !== undefined) {
    data.memoryNote =
      typeof req.body.memoryNote === 'string'
        ? req.body.memoryNote.trim() || null
        : null
  }
  if (req.body.memoryImages !== undefined) {
    data.memoryImages = readImageKeys(req.body.memoryImages)
  }
  if (req.body.completedAt !== undefined) {
    const completedAt = readOptionalDateTime(req.body.completedAt)
    if (completedAt === undefined)
      return res.status(400).json({ message: '完成日期时间格式不正确' })
    data.completedAt = completedAt
  }
  if (req.body.completed !== undefined) {
    const completed = Boolean(req.body.completed)
    data.completed = completed
    if (completed && !todo.completed) {
      data.completedAt = data.completedAt ?? new Date()
      data.completedById = currentUser.id
    }
    if (!completed) {
      data.completedAt = null
      data.completedById = null
      data.memoryNote = null
      data.memoryImages = []
    }
  }

  const updated = await prisma.todo.update({
    where: { id: req.params.id },
    data
  })
  res.json(serializeTodo(updated))
})

router.delete('/todos/:id', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  const todo = await prisma.todo.findUnique({ where: { id: req.params.id } })
  if (!todo) return res.status(404).json({ message: 'Todo not found' })
  if (!canAccess(currentUser, todo.userId))
    return res.status(403).json({ message: 'Permission denied' })
  await prisma.todo.delete({ where: { id: req.params.id } })
  res.status(204).send()
})

router.get('/messages', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  const beforeId = req.query.beforeId as string | undefined
  const limit = parseInt((req.query.limit as string) || '20')

  let whereClause: any = {
    userId: { in: visibleUserIds(currentUser) }
  }

  if (beforeId) {
    const beforeMsg = await prisma.message.findUnique({
      where: { id: beforeId }
    })
    if (beforeMsg) {
      whereClause.createdAt = {
        lt: beforeMsg.createdAt
      }
    }
  }

  const messages = await prisma.message.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      user: { select: publicPartnerSelect },
      replyTo: {
        include: {
          user: { select: publicPartnerSelect }
        }
      }
    }
  })
  res.json(messages.reverse().map((item) => serializeMessage(item)))
})

router.post('/messages', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  const messageImageUrl = readImageKey(req.body.imageUrl)
  if (!req.body.content && !messageImageUrl) {
    return res
      .status(400)
      .json({ message: 'Message content or image is required' })
  }
  const message = await prisma.message.create({
    data: {
      content: req.body.content || '',
      imageUrl: messageImageUrl,
      senderId: currentUser.id,
      userId: currentUser.id,
      replyToId: req.body.replyToId || undefined,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      })
    },
    include: {
      user: { select: publicPartnerSelect },
      replyTo: {
        include: {
          user: { select: publicPartnerSelect }
        }
      }
    }
  })
  res.status(201).json(serializeMessage(message))
})

router.delete('/messages/:id', authenticate, async (req, res) => {
  const currentUser = (req as AuthenticatedRequest).user
  const message = await prisma.message.findUnique({
    where: { id: req.params.id }
  })
  if (!message) return res.status(404).json({ message: 'Message not found' })
  if (
    message.senderId !== currentUser.id &&
    message.userId !== currentUser.id
  ) {
    return res.status(403).json({ message: 'Permission denied' })
  }
  await prisma.message.delete({ where: { id: req.params.id } })
  res.status(204).send()
})

export default router
