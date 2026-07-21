export type PageType = 'home' | 'anniversaries' | 'diary' | 'todo' | 'album' | 'messages' | 'profile' | 'binding' | 'menu' | 'kitchen' | 'period';
export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';
export type AlbumLocationSource = 'exif' | 'amap_geolocation' | 'amap_poi' | 'manual_pin';

export interface AlbumLocationData {
  address: string;
  lat: number;
  lng: number;
  locationSource?: AlbumLocationSource;
  locationAccuracyMeters?: number;
  locationPoiId?: string;
  locationPoiName?: string;
  locationAdcode?: string;
  locationCoordinateSystem?: 'GCJ02';
}

export interface Anniversary {
  id: string;
  title: string;
  date: string;
  isImportant: boolean;
  userId?: string;
}

export interface DiaryEntry {
  id: string;
  date: string;
  mood: 'happy' | 'sad' | 'love' | 'angry' | 'surprised';
  content: string;
  location?: string;
  images?: string[];
  userId?: string;
}

export interface TodoItem {
  id: string;
  title: string;
  description?: string;
  targetDate?: string;
  completed: boolean;
  completedAt?: string;
  completedById?: string;
  memoryNote?: string;
  memoryImages?: string[];
  isFeatured: boolean;
  sortOrder: number;
  category: string;
  autoSource?: string;
  autoSourceKey?: string;
  autoDate?: string;
  userId?: string;
}

export type PeriodFlow = 'spotting' | 'light' | 'medium' | 'heavy';
export type PeriodMode = 'cycle' | 'trying_to_conceive';
export type LhTestResult = 'positive' | 'negative' | 'not_tested';

export interface PeriodRecord {
  id: string;
  startDate: string;
  endDate?: string;
  flow?: PeriodFlow;
  painLevel?: number;
  symptoms: string[];
  note?: string;
  createdById: string;
}

export interface PeriodDailyLog {
  id: string;
  date: string;
  flow?: PeriodFlow;
  painLevel?: number;
  symptoms: string[];
  moods: string[];
  energyLevel?: number;
  temperatureCelsius?: number;
  lhTestResult?: LhTestResult;
  intercourse: boolean;
  note?: string;
  createdById: string;
}

export interface PeriodSettings {
  mode: PeriodMode;
  defaultCycleDays: number;
  defaultPeriodDays: number;
  reminderLeadDays: number;
  autoSyncCareTodos: boolean;
}

export interface PeriodFertilityWindow {
  startDate: string;
  endDate: string;
}

export interface PeriodSymptomStat {
  name: string;
  count: number;
}

export interface PeriodSummary {
  recordCount: number;
  averageCycleDays: number;
  averagePeriodDays: number;
  cycleVarianceDays: number;
  predictedStartDate?: string;
  predictedEndDate?: string;
  daysUntilNext?: number;
  isInPeriod: boolean;
  currentDay?: number;
  currentCycleDay?: number;
  latestStartDate?: string;
  latestEndDate?: string;
  predictedOvulationDate?: string;
  fertileWindow?: PeriodFertilityWindow;
  symptomStats: PeriodSymptomStat[];
  loggedDayCount: number;
  disclaimer?: string;
}

export interface PeriodOverview {
  records: PeriodRecord[];
  logs: PeriodDailyLog[];
  summary: PeriodSummary;
  settings: PeriodSettings;
}

export interface AlbumImage {
  id: string;
  src: string;
  title: string;
  description?: string;
  mediaType?: 'image' | 'video';
  height?: string;
  date: string;
  category?: string;
  locationAddress?: string;
  lat?: number;
  lng?: number;
  locationSource?: AlbumLocationSource;
  locationAccuracyMeters?: number;
  locationPoiId?: string;
  locationPoiName?: string;
  locationAdcode?: string;
  locationCoordinateSystem?: 'GCJ02';
  isFeatured?: boolean;
  likeCount?: number;
  likedByMe?: boolean;
  commentCount?: number;
  comments?: AlbumComment[];
  userId?: string;
}

export interface AlbumOverview {
  total: number;
  photos: number;
  videos: number;
  featured: number;
  comments: number;
  likes: number;
  categoryStats: Record<string, number>;
  featuredItems: AlbumImage[];
}

export interface AlbumPage {
  items: AlbumImage[];
  nextCursor?: string;
  hasMore: boolean;
}

export interface AlbumMapData {
  items: AlbumImage[];
  missingCount: number;
}

export interface AlbumComment {
  id: string;
  content: string;
  userId: string;
  createdAt: string;
  user?: PublicUser;
}

export interface Message {
  id: string;
  senderId: string;
  content: string;
  imageUrl?: string;
  timestamp: string;
  userId?: string;
  user?: PublicUser;
  createdAt?: string;
  replyToId?: string;
  replyTo?: Message;
}

export interface Couple {
  id: string;
  name?: string;
  bio?: string;
  coverImage?: string;
  coverCarousel?: string[];
  startDate?: string;
  userIds: string[];
}

export interface DailyRating {
  id: string;
  userId: string;
  score: number;
  note?: string;
  date: string;
}

export interface MenuDish {
  id: string;
  name: string;
  category: string;
  description?: string;
  imageUrl?: string;
  isPreset: boolean;
  userId?: string;
}

export interface MealOrderItem {
  id: string;
  date: string;
  dishName: string;
  category: string;
  quantity: number;
  note?: string;
  description?: string;
  imageUrl?: string;
  userId: string;
  user?: PublicUser;
}

export interface MealOrderDay {
  date: string;
  items: MealOrderItem[];
}

export interface KitchenIngredient {
  name: string;
  amount?: number;
  unit?: string;
  note?: string;
}

export interface KitchenRecipe {
  id: string;
  title: string;
  category: string;
  summary?: string;
  imageUrl?: string;
  difficulty?: string;
  cookTime?: number;
  servings?: number;
  ingredients: KitchenIngredient[];
  steps: string[];
  isPreset: boolean;
  isFavorite: boolean;
  favoriteCount: number;
  userId?: string;
  user?: PublicUser;
}

export interface KitchenShoppingListItem {
  id: string;
  name: string;
  quantity?: number;
  unit?: string;
  note?: string;
  checked: boolean;
}

export interface KitchenShoppingList {
  id?: string;
  date: string;
  items: KitchenShoppingListItem[];
}

export interface KitchenCookCheckin {
  id: string;
  date: string;
  recipeId?: string;
  title: string;
  imageUrl?: string;
  note?: string;
  rating?: number;
  userId: string;
  user?: PublicUser;
}

export type AiGenerateType =
  | 'love_chat'
  | 'diary_polish'
  | 'todo_ideas'
  | 'message_reply'
  | 'period_care'
  | 'kitchen_ideas'
  | 'kitchen_recipe';

export type AiRecipeDraft = {
  title: string;
  category: string;
  summary: string;
  imageUrl?: string;
  difficulty: string;
  cookTime: number;
  servings: number;
  ingredients: KitchenIngredient[];
  steps: string[];
};

export type AiGenerateResponse = {
  content: string;
  recipe?: AiRecipeDraft;
  model?: string;
  usage?: unknown;
};

export type MomentStatus = 'missing' | 'busy' | 'resting' | 'happy' | 'tired' | 'eating' | 'working';

export interface MomentStatusPayload {
  momentStatus?: MomentStatus | null;
  momentStatusText?: string | null;
}

export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  bio?: string;
  momentStatus?: MomentStatus | null;
  momentStatusText?: string | null;
  momentStatusUpdatedAt?: string | null;
  inviteCode: string;
  partnerId?: string;
  partner?: PublicUser | null;
}

export interface PublicUser {
  id: string;
  username: string;
  avatar?: string;
  bio?: string;
  momentStatus?: MomentStatus | null;
  momentStatusText?: string | null;
  momentStatusUpdatedAt?: string | null;
}

export interface AuthState {
  user: User | null;
  token: string | null;
}
