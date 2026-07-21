import {
  DiaryEntry,
  TodoItem,
  Message,
  User,
  AuthState,
  Anniversary,
  AlbumImage,
  AlbumMapData,
  AlbumOverview,
  AlbumPage,
  Couple,
  DailyRating,
  MenuDish,
  MealOrderDay,
  MealOrderItem,
  KitchenRecipe,
  KitchenShoppingList,
  KitchenShoppingListItem,
  KitchenCookCheckin,
  PeriodOverview,
  PeriodRecord,
  PeriodDailyLog,
  PeriodSettings,
  MomentStatusPayload,
  AiGenerateResponse,
  AiGenerateType
} from '../types'

const API_BASE = '/api'

// 统一从 localStorage 读取登录 token，所有需要鉴权的接口都复用这组请求头。
const getAuthHeaders = () => {
  const token = localStorage.getItem('token')
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }
}

// JSON 接口默认请求头；上传文件接口不能使用它，否则 FormData 边界会丢失。
const getHeaders = () => ({
  'Content-Type': 'application/json',
  ...getAuthHeaders()
})

// 后端错误统一返回 { message } 时，优先把服务端中文提示透传给页面 toast。
const parseError = async (res: Response, fallback: string) => {
  try {
    const error = await res.json()
    return error.message || fallback
  } catch {
    return fallback
  }
}

const ensureOk = async (res: Response, fallback: string) => {
  if (!res.ok) {
    throw new Error(await parseError(res, fallback))
  }
  return res
}

export const uploadService = {
  async upload(file: File): Promise<string> {
    const data = await this.uploadDetailed(file)
    return data.key
  },
  async uploadDetailed(file: File): Promise<{ key: string; url: string }> {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`${API_BASE}/uploads`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData
    })
    await ensureOk(res, 'Upload failed')
    const data = await res.json()
    return { key: data.key || data.url, url: data.url }
  }
}

export const aiService = {
  // 统一 AI 生成入口。前端只关心生成类型、用户 prompt 和可选上下文，不直接感知 OpenAI/Gemini/Claude provider。
  async generate(request: {
    type: AiGenerateType
    prompt: string
    context?: unknown
  }): Promise<AiGenerateResponse> {
    const res = await fetch(`${API_BASE}/ai/generate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(request)
    })
    await ensureOk(res, 'AI generation failed')
    return res.json()
  }
}

export const authService = {
  async register(
    username: string,
    email: string,
    password: string
  ): Promise<AuthState> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    })
    await ensureOk(res, 'Registration failed')
    const data = await res.json()
    localStorage.setItem('token', data.token)
    return data
  },

  async login(email: string, password: string): Promise<AuthState> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    await ensureOk(res, 'Login failed')
    const data = await res.json()
    localStorage.setItem('token', data.token)
    return data
  },

  async me(): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getHeaders()
    })
    await ensureOk(res, 'Failed to fetch user')
    return res.json()
  },

  async bind(inviteCode: string): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/bind`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ inviteCode })
    })
    await ensureOk(res, 'Binding failed')
    return res.json()
  },

  async unbind(): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/unbind`, {
      method: 'POST',
      headers: getHeaders()
    })
    await ensureOk(res, 'Unbinding failed')
    return res.json()
  },

  logout() {
    localStorage.removeItem('token')
  }
}

export const ratingService = {
  async getTodayStatus(): Promise<DailyRating[]> {
    const res = await fetch(`${API_BASE}/ratings/today`, {
      headers: getHeaders()
    })
    await ensureOk(res, 'Failed to fetch ratings')
    return res.json()
  },
  async submit(rating: { score: number; note?: string }): Promise<DailyRating> {
    const res = await fetch(`${API_BASE}/ratings`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(rating)
    })
    await ensureOk(res, 'Failed to submit rating')
    return res.json()
  }
}

export const periodService = {
  async getAll(): Promise<PeriodOverview> {
    const res = await fetch(`${API_BASE}/periods`, { headers: getHeaders() })
    await ensureOk(res, 'Failed to fetch period records')
    return res.json()
  },
  async create(
    record: Omit<PeriodRecord, 'id' | 'createdById'>
  ): Promise<PeriodOverview> {
    const res = await fetch(`${API_BASE}/periods`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(record)
    })
    await ensureOk(res, 'Failed to create period record')
    return res.json()
  },
  async update(
    id: string,
    record: Partial<Omit<PeriodRecord, 'id' | 'createdById'>>
  ): Promise<PeriodOverview> {
    const res = await fetch(`${API_BASE}/periods/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(record)
    })
    await ensureOk(res, 'Failed to update period record')
    return res.json()
  },
  async delete(id: string): Promise<PeriodOverview> {
    const res = await fetch(`${API_BASE}/periods/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    })
    await ensureOk(res, 'Failed to delete period record')
    return res.json()
  },
  async saveLog(
    date: string,
    log: Partial<Omit<PeriodDailyLog, 'id' | 'date' | 'createdById'>>
  ): Promise<PeriodOverview> {
    const res = await fetch(`${API_BASE}/periods/logs/${date}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(log)
    })
    await ensureOk(res, 'Failed to save period daily log')
    return res.json()
  },
  async deleteLog(date: string): Promise<PeriodOverview> {
    const res = await fetch(`${API_BASE}/periods/logs/${date}`, {
      method: 'DELETE',
      headers: getHeaders()
    })
    await ensureOk(res, 'Failed to delete period daily log')
    return res.json()
  },
  async updateSettings(
    settings: Partial<PeriodSettings>
  ): Promise<PeriodOverview> {
    const res = await fetch(`${API_BASE}/periods/settings`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(settings)
    })
    await ensureOk(res, 'Failed to update period settings')
    return res.json()
  },
  async syncCareTodos(
    clientToday?: string
  ): Promise<{
    skipped: boolean
    created: number
    updated: number
    predictedStartDate?: string
  }> {
    const res = await fetch(`${API_BASE}/periods/care-todos/sync`, {
      method: 'POST',
      headers: getHeaders(),
      body: clientToday ? JSON.stringify({ clientToday }) : undefined
    })
    await ensureOk(res, 'Failed to sync period care todos')
    return res.json()
  }
}

export const userService = {
  async updateProfile(profile: {
    username?: string
    avatar?: string
    bio?: string
  }): Promise<User> {
    const res = await fetch(`${API_BASE}/user/profile`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(profile)
    })
    await ensureOk(res, 'Failed to update profile')
    return res.json()
  },
  async updateMomentStatus(status: MomentStatusPayload): Promise<User> {
    const res = await fetch(`${API_BASE}/user/moment-status`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(status)
    })
    await ensureOk(res, 'Failed to update moment status')
    return res.json()
  }
}

export const coupleService = {
  async get(): Promise<Couple | null> {
    const res = await fetch(`${API_BASE}/couple`, { headers: getHeaders() })
    if (res.status === 404) return null
    await ensureOk(res, 'Failed to fetch couple profile')
    return res.json()
  },
  async update(couple: Partial<Couple>): Promise<Couple> {
    const res = await fetch(`${API_BASE}/couple`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(couple)
    })
    await ensureOk(res, 'Failed to update couple profile')
    return res.json()
  }
}

export type AiProvider = 'openai-compatible' | 'gemini' | 'claude'

export type AiConfigData = {
  enabled: boolean
  provider: AiProvider
  openai: {
    apiKey: string
    baseUrl: string
    model: string
    temperature: number | null
    maxTokens: number | null
    timeoutMs: number | null
  }
  gemini: {
    apiKey: string
    model: string
    temperature: number | null
    maxTokens: number | null
    timeoutMs: number | null
  }
  claude: {
    apiKey: string
    model: string
    maxTokens: number | null
    timeoutMs: number | null
  }
}

export const aiConfigService = {
  async get(): Promise<AiConfigData> {
    const res = await fetch(`${API_BASE}/ai/config`, { headers: getHeaders() })
    await ensureOk(res, 'Failed to fetch AI config')
    return res.json()
  },
  async update(config: AiConfigData): Promise<AiConfigData> {
    const res = await fetch(`${API_BASE}/ai/config`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(config)
    })
    await ensureOk(res, 'Failed to update AI config')
    return res.json()
  }
}

export const aiModelService = {
  async list(
    provider: AiProvider,
    baseUrl: string,
    apiKey: string
  ): Promise<string[]> {
    const search = new URLSearchParams()
    if (baseUrl) search.set('baseUrl', baseUrl)
    if (apiKey) search.set('apiKey', apiKey)
    const query = search.toString()
    const res = await fetch(
      `${API_BASE}/ai/models/${provider}${query ? `?${query}` : ''}`,
      {
        headers: getHeaders()
      }
    )
    await ensureOk(res, 'Failed to fetch models')
    const data: { models: string[] } = await res.json()
    return data.models || []
  }
}

export const diaryService = {
  async getAll(startDate?: string, endDate?: string): Promise<DiaryEntry[]> {
    const search = new URLSearchParams()
    if (startDate) search.set('startDate', startDate)
    if (endDate) search.set('endDate', endDate)
    const query = search.toString()
    const res = await fetch(`${API_BASE}/diaries${query ? `?${query}` : ''}`, {
      headers: getHeaders()
    })
    await ensureOk(res, 'Failed to fetch diaries')
    return res.json()
  },
  async create(entry: Omit<DiaryEntry, 'id'>): Promise<DiaryEntry> {
    const res = await fetch(`${API_BASE}/diaries`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(entry)
    })
    await ensureOk(res, 'Failed to create diary')
    return res.json()
  },
  async update(entry: DiaryEntry): Promise<DiaryEntry> {
    const res = await fetch(`${API_BASE}/diaries/${entry.id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(entry)
    })
    await ensureOk(res, 'Failed to update diary')
    return res.json()
  },
  async delete(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/diaries/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    })
    await ensureOk(res, 'Failed to delete diary')
  }
}

export const todoService = {
  async getAll(): Promise<TodoItem[]> {
    const res = await fetch(`${API_BASE}/todos`, { headers: getHeaders() })
    await ensureOk(res, 'Failed to fetch todos')
    return res.json()
  },
  async create(
    todo: Pick<TodoItem, 'title' | 'category'> &
      Partial<
        Pick<
          TodoItem,
          'description' | 'targetDate' | 'isFeatured' | 'sortOrder'
        >
      >
  ): Promise<TodoItem> {
    const res = await fetch(`${API_BASE}/todos`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(todo)
    })
    await ensureOk(res, 'Failed to create todo')
    return res.json()
  },
  async update(id: string, todo: Partial<TodoItem>): Promise<TodoItem> {
    const res = await fetch(`${API_BASE}/todos/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(todo)
    })
    await ensureOk(res, 'Failed to update todo')
    return res.json()
  },
  async toggle(id: string, completed: boolean): Promise<TodoItem> {
    return this.update(id, { completed })
  },
  async delete(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/todos/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    })
    await ensureOk(res, 'Failed to delete todo')
  }
}

export const messageService = {
  async getAll(beforeId?: string, limit?: number): Promise<Message[]> {
    let path = `${API_BASE}/messages`
    const params: string[] = []
    if (beforeId) params.push(`beforeId=${encodeURIComponent(beforeId)}`)
    if (limit) params.push(`limit=${limit}`)
    if (params.length > 0) {
      path += `?${params.join('&')}`
    }

    const res = await fetch(path, { headers: getHeaders() })
    await ensureOk(res, 'Failed to fetch messages')
    return res.json()
  },
  async send(
    content: string,
    imageUrl?: string,
    replyToId?: string
  ): Promise<Message> {
    const res = await fetch(`${API_BASE}/messages`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ content, imageUrl, replyToId })
    })
    await ensureOk(res, 'Failed to send message')
    return res.json()
  },
  async delete(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/messages/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    })
    await ensureOk(res, 'Failed to delete message')
  }
}

export const anniversaryService = {
  async getAll(): Promise<Anniversary[]> {
    const res = await fetch(`${API_BASE}/anniversaries`, {
      headers: getHeaders()
    })
    await ensureOk(res, 'Failed to fetch anniversaries')
    return res.json()
  },
  async create(anniversary: Omit<Anniversary, 'id'>): Promise<Anniversary> {
    const res = await fetch(`${API_BASE}/anniversaries`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(anniversary)
    })
    await ensureOk(res, 'Failed to create anniversary')
    return res.json()
  },
  async update(
    id: string,
    anniversary: Partial<Anniversary>
  ): Promise<Anniversary> {
    const res = await fetch(`${API_BASE}/anniversaries/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(anniversary)
    })
    await ensureOk(res, 'Failed to update anniversary')
    return res.json()
  },
  async delete(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/anniversaries/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    })
    await ensureOk(res, 'Failed to delete anniversary')
  }
}

export const albumService = {
  async getOverview(): Promise<AlbumOverview> {
    const res = await fetch(`${API_BASE}/album/overview`, {
      headers: getHeaders()
    })
    await ensureOk(res, 'Failed to fetch album overview')
    return res.json()
  },
  async getPage(
    params: {
      category?: string
      limit?: number
      cursor?: string
      startDate?: string
      endDate?: string
    } = {}
  ): Promise<AlbumPage> {
    const search = new URLSearchParams()
    if (params.category) search.set('category', params.category)
    if (params.limit) search.set('limit', String(params.limit))
    if (params.cursor) search.set('cursor', params.cursor)
    if (params.startDate) search.set('startDate', params.startDate)
    if (params.endDate) search.set('endDate', params.endDate)
    const query = search.toString()
    const res = await fetch(`${API_BASE}/album${query ? `?${query}` : ''}`, {
      headers: getHeaders()
    })
    await ensureOk(res, 'Failed to fetch album')
    return res.json()
  },
  async getDetail(id: string): Promise<AlbumImage> {
    const res = await fetch(`${API_BASE}/album/${id}`, {
      headers: getHeaders()
    })
    await ensureOk(res, 'Failed to fetch album image')
    return res.json()
  },
  async getMapData(
    category?: string,
    startDate?: string,
    endDate?: string
  ): Promise<AlbumMapData> {
    const search = new URLSearchParams()
    if (category) search.set('category', category)
    if (startDate) search.set('startDate', startDate)
    if (endDate) search.set('endDate', endDate)
    const query = search.toString()
    const res = await fetch(
      `${API_BASE}/album/map${query ? `?${query}` : ''}`,
      {
        headers: getHeaders()
      }
    )
    await ensureOk(res, 'Failed to fetch album map')
    return res.json()
  },
  async getLocationMissing(
    category?: string,
    startDate?: string,
    endDate?: string
  ): Promise<AlbumImage[]> {
    const search = new URLSearchParams()
    if (category) search.set('category', category)
    if (startDate) search.set('startDate', startDate)
    if (endDate) search.set('endDate', endDate)
    const query = search.toString()
    const res = await fetch(
      `${API_BASE}/album/location-missing${query ? `?${query}` : ''}`,
      {
        headers: getHeaders()
      }
    )
    await ensureOk(res, 'Failed to fetch missing album locations')
    return res.json()
  },
  async create(image: Omit<AlbumImage, 'id'>): Promise<AlbumImage> {
    const res = await fetch(`${API_BASE}/album`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(image)
    })
    await ensureOk(res, 'Failed to upload image')
    return res.json()
  },
  async update(id: string, image: Partial<AlbumImage>): Promise<AlbumImage> {
    const res = await fetch(`${API_BASE}/album/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(image)
    })
    await ensureOk(res, 'Failed to update album image')
    return res.json()
  },
  async addComment(id: string, content: string): Promise<AlbumImage> {
    const res = await fetch(`${API_BASE}/album/${id}/comments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ content })
    })
    await ensureOk(res, 'Failed to add comment')
    return res.json()
  },
  async like(id: string): Promise<AlbumImage> {
    const res = await fetch(`${API_BASE}/album/${id}/like`, {
      method: 'POST',
      headers: getHeaders()
    })
    await ensureOk(res, 'Failed to like album image')
    return res.json()
  },
  async unlike(id: string): Promise<AlbumImage> {
    const res = await fetch(`${API_BASE}/album/${id}/like`, {
      method: 'DELETE',
      headers: getHeaders()
    })
    await ensureOk(res, 'Failed to unlike album image')
    return res.json()
  },
  async delete(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/album/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    })
    await ensureOk(res, 'Failed to delete album image')
  }
}

export const menuService = {
  async getDishes(): Promise<MenuDish[]> {
    const res = await fetch(`${API_BASE}/menu/dishes`, {
      headers: getHeaders()
    })
    await ensureOk(res, 'Failed to fetch menu dishes')
    return res.json()
  },
  async createDish(dish: {
    name: string
    category: string
    description?: string
    imageUrl?: string
  }): Promise<MenuDish> {
    const res = await fetch(`${API_BASE}/menu/dishes`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(dish)
    })
    await ensureOk(res, 'Failed to create dish')
    return res.json()
  },
  async deleteDish(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/menu/dishes/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    })
    await ensureOk(res, 'Failed to delete dish')
  }
}

export const mealOrderService = {
  async getToday(): Promise<MealOrderDay> {
    const res = await fetch(`${API_BASE}/meal-orders/today`, {
      headers: getHeaders()
    })
    await ensureOk(res, 'Failed to fetch meal order')
    return res.json()
  },
  async getByDate(date: string): Promise<MealOrderDay> {
    const res = await fetch(
      `${API_BASE}/meal-orders?date=${encodeURIComponent(date)}`,
      { headers: getHeaders() }
    )
    await ensureOk(res, 'Failed to fetch meal order')
    return res.json()
  },
  async addTodayItem(
    dish: Pick<
      MenuDish,
      'id' | 'name' | 'category' | 'description' | 'imageUrl'
    >
  ): Promise<MealOrderItem> {
    const res = await fetch(`${API_BASE}/meal-orders/today/items`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        ...(dish.id ? { dishId: dish.id } : {}),
        dishName: dish.name,
        category: dish.category,
        description: dish.description,
        imageUrl: dish.imageUrl
      })
    })
    await ensureOk(res, 'Failed to add meal order item')
    return res.json()
  },
  async updateItem(
    id: string,
    item: { quantity?: number; note?: string }
  ): Promise<MealOrderItem> {
    const res = await fetch(`${API_BASE}/meal-orders/items/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(item)
    })
    await ensureOk(res, 'Failed to update meal order item')
    return res.json()
  },
  async deleteItem(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/meal-orders/items/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    })
    await ensureOk(res, 'Failed to delete meal order item')
  }
}

export const kitchenService = {
  async getRecipes(): Promise<KitchenRecipe[]> {
    const res = await fetch(`${API_BASE}/kitchen/recipes`, {
      headers: getHeaders()
    })
    await ensureOk(res, 'Failed to fetch kitchen recipes')
    return res.json()
  },
  async createRecipe(recipe: Partial<KitchenRecipe>): Promise<KitchenRecipe> {
    const res = await fetch(`${API_BASE}/kitchen/recipes`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(recipe)
    })
    await ensureOk(res, 'Failed to create kitchen recipe')
    return res.json()
  },
  async updateRecipe(
    id: string,
    recipe: Partial<KitchenRecipe>
  ): Promise<KitchenRecipe> {
    const res = await fetch(`${API_BASE}/kitchen/recipes/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(recipe)
    })
    await ensureOk(res, 'Failed to update kitchen recipe')
    return res.json()
  },
  async deleteRecipe(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/kitchen/recipes/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    })
    await ensureOk(res, 'Failed to delete kitchen recipe')
  },
  async favoriteRecipe(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/kitchen/recipes/${id}/favorite`, {
      method: 'POST',
      headers: getHeaders()
    })
    await ensureOk(res, 'Failed to favorite recipe')
  },
  async unfavoriteRecipe(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/kitchen/recipes/${id}/favorite`, {
      method: 'DELETE',
      headers: getHeaders()
    })
    await ensureOk(res, 'Failed to unfavorite recipe')
  },
  async getShoppingList(date: string): Promise<KitchenShoppingList> {
    const res = await fetch(
      `${API_BASE}/kitchen/shopping-lists?date=${encodeURIComponent(date)}`,
      { headers: getHeaders() }
    )
    await ensureOk(res, 'Failed to fetch shopping list')
    return res.json()
  },
  async generateShoppingList(
    date: string,
    recipeIds: string[]
  ): Promise<KitchenShoppingList> {
    const res = await fetch(`${API_BASE}/kitchen/shopping-lists/generate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ date, recipeIds })
    })
    await ensureOk(res, 'Failed to generate shopping list')
    return res.json()
  },
  async updateShoppingItem(
    id: string,
    item: { checked?: boolean; note?: string }
  ): Promise<KitchenShoppingListItem> {
    const res = await fetch(`${API_BASE}/kitchen/shopping-list-items/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(item)
    })
    await ensureOk(res, 'Failed to update shopping item')
    return res.json()
  },
  async deleteShoppingItem(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/kitchen/shopping-list-items/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    })
    await ensureOk(res, 'Failed to delete shopping item')
  },
  async getCheckins(): Promise<KitchenCookCheckin[]> {
    const res = await fetch(`${API_BASE}/kitchen/checkins`, {
      headers: getHeaders()
    })
    await ensureOk(res, 'Failed to fetch kitchen checkins')
    return res.json()
  },
  async createCheckin(checkin: {
    date: string
    recipeId?: string
    title: string
    imageUrl?: string
    note?: string
    rating?: number
  }): Promise<KitchenCookCheckin> {
    const res = await fetch(`${API_BASE}/kitchen/checkins`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(checkin)
    })
    await ensureOk(res, 'Failed to create kitchen checkin')
    return res.json()
  },
  async deleteCheckin(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/kitchen/checkins/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    })
    await ensureOk(res, 'Failed to delete kitchen checkin')
  }
}
