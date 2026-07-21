/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Heart,
  Calendar,
  Book,
  CheckSquare,
  Image as ImageIcon,
  MessageSquare,
  User,
  Link as LinkIcon,
  Utensils,
  ChefHat,
  Droplets,
  Sparkles
} from 'lucide-react'
import {
  PageType,
  Anniversary,
  DiaryEntry,
  TodoItem,
  Message,
  User as UserType,
  AlbumImage,
  AlbumOverview,
  Couple,
  DailyRating,
  MenuDish,
  MealOrderDay,
  KitchenRecipe,
  KitchenShoppingList,
  KitchenCookCheckin,
  PeriodRecord,
  PeriodSummary,
  PeriodDailyLog,
  PeriodSettings,
  PeriodOverview
} from './types.ts'
import {
  diaryService,
  todoService,
  messageService,
  authService,
  anniversaryService,
  albumService,
  coupleService,
  ratingService,
  menuService,
  mealOrderService,
  kitchenService,
  periodService
} from './services/api'
import { useToast } from './components/Toast'
import { usePolling } from './hooks/usePolling'
import { AppImage } from './components/AppImage'
import { ThemeProvider } from './contexts/ThemeContext'

// Components
import Auth from './components/Auth'

// Pages
import Home from './pages/Home'
import Anniversaries from './pages/Anniversaries'
import Diary from './pages/Diary'
import TodoList from './pages/TodoList'
import Album from './pages/Album'
import MessageBoard from './pages/MessageBoard'
import Profile from './pages/Profile'
import Binding from './pages/Binding'
import MenuOrder from './pages/MenuOrder'
import CoupleKitchen from './pages/CoupleKitchen'
import PeriodAssistantPage from './pages/PeriodAssistant'

function daysSince(date?: string) {
  if (!date) return 0
  return Math.max(
    0,
    Math.floor(
      (Date.now() - new Date(`${date}T00:00:00`).getTime()) /
        (1000 * 60 * 60 * 24)
    )
  )
}

function momentLabel(user?: UserType['partner'] | UserType | null) {
  return (
    user?.momentStatusText ||
    (user?.momentStatus ? '已更新此刻状态' : '还没更新')
  )
}

const HASH_ROUTABLE_PAGES: PageType[] = [
  'home',
  'anniversaries',
  'diary',
  'todo',
  'album',
  'messages',
  'profile',
  'menu',
  'kitchen',
  'period'
]

const HASH_ROUTABLE_PAGE_SET = new Set<PageType>(HASH_ROUTABLE_PAGES)

function pageToHash(page: PageType) {
  return `#/${HASH_ROUTABLE_PAGE_SET.has(page) ? page : 'home'}`
}

function pageFromHash(hash = window.location.hash): PageType {
  const page = hash.replace(/^#\/?/, '').split(/[?#]/)[0]
  if (!page) return 'home'
  return HASH_ROUTABLE_PAGE_SET.has(page as PageType)
    ? (page as PageType)
    : 'home'
}

function isKnownHashRoute(hash = window.location.hash) {
  const page = hash.replace(/^#\/?/, '').split(/[?#]/)[0]
  return !page || HASH_ROUTABLE_PAGE_SET.has(page as PageType)
}

function replaceHashRoute(page: PageType) {
  window.history.replaceState(
    null,
    '',
    `${window.location.pathname}${window.location.search}${pageToHash(page)}`
  )
}

export default function App() {
  const { showToast } = useToast()
  const [currentPage, setCurrentPage] = useState<PageType>(() => pageFromHash())
  const [user, setUser] = useState<UserType | null>(null)
  const [couple, setCouple] = useState<Couple | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [initialDataLoading, setInitialDataLoading] = useState(false)
  const [pageRefreshing, setPageRefreshing] = useState<PageType | null>(null)
  const lastPeriodCareSyncRef = useRef<string | null>(null)
  const appNavigationDepthRef = useRef(0)

  // Global State
  const [anniversaries, setAnniversaries] = useState<Anniversary[]>([])
  const [diaries, setDiaries] = useState<DiaryEntry[]>([])
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [albumOverview, setAlbumOverview] = useState<AlbumOverview | null>(null)
  const [dailyRatings, setDailyRatings] = useState<DailyRating[]>([])
  const [menuDishes, setMenuDishes] = useState<MenuDish[]>([])
  const [mealOrder, setMealOrder] = useState<MealOrderDay | null>(null)
  const [kitchenRecipes, setKitchenRecipes] = useState<KitchenRecipe[]>([])
  const [shoppingList, setShoppingList] = useState<KitchenShoppingList | null>(
    null
  )
  const [cookCheckins, setCookCheckins] = useState<KitchenCookCheckin[]>([])
  const [periodRecords, setPeriodRecords] = useState<PeriodRecord[]>([])
  const [periodLogs, setPeriodLogs] = useState<PeriodDailyLog[]>([])
  const [periodSummary, setPeriodSummary] = useState<PeriodSummary | null>(null)
  const [periodSettings, setPeriodSettings] = useState<PeriodSettings | null>(
    null
  )

  useEffect(() => {
    if (!isKnownHashRoute()) {
      replaceHashRoute('home')
    }

    const handleHashChange = () => {
      if (!isKnownHashRoute()) {
        replaceHashRoute('home')
        setCurrentPage('home')
        return
      }
      setCurrentPage(pageFromHash())
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const navigateToPage = useCallback((page: PageType) => {
    const nextHash = pageToHash(page)
    if (window.location.hash === nextHash) {
      setCurrentPage(pageFromHash(nextHash))
      return
    }

    appNavigationDepthRef.current += 1
    window.location.hash = nextHash
  }, [])

  const goBackOrHome = useCallback(() => {
    if (appNavigationDepthRef.current > 0) {
      appNavigationDepthRef.current -= 1
      window.history.back()
      return
    }

    replaceHashRoute('home')
    setCurrentPage('home')
  }, [])

  useEffect(() => {
    const updateAppHeight = () => {
      const height = window.visualViewport?.height || window.innerHeight
      document.documentElement.style.setProperty('--app-height', `${height}px`)
    }

    updateAppHeight()
    window.addEventListener('resize', updateAppHeight)
    window.visualViewport?.addEventListener('resize', updateAppHeight)
    window.visualViewport?.addEventListener('scroll', updateAppHeight)
    return () => {
      window.removeEventListener('resize', updateAppHeight)
      window.visualViewport?.removeEventListener('resize', updateAppHeight)
      window.visualViewport?.removeEventListener('scroll', updateAppHeight)
    }
  }, [])

  const refreshDiaries = useCallback(async () => {
    if (!user) return
    const diaryData = await diaryService.getAll()
    setDiaries(diaryData)
  }, [user])

  const refreshTodos = useCallback(async () => {
    if (!user) return
    const todoData = await todoService.getAll()
    setTodos(todoData)
  }, [user])

  const refreshAnniversaries = useCallback(async () => {
    if (!user) return
    const anniversaryData = await anniversaryService.getAll()
    setAnniversaries(anniversaryData)
  }, [user])

  const refreshAlbumOverview = useCallback(async () => {
    if (!user) return
    const overview = await albumService.getOverview()
    setAlbumOverview(overview)
  }, [user])

  const refreshMessages = useCallback(async () => {
    if (!user) return
    try {
      const latestData = await messageService.getAll(undefined, 20)
      setMessages((prev) => {
        const map = new Map<string, Message>()
        prev.forEach((m) => map.set(m.id, m))
        latestData.forEach((m) => map.set(m.id, m))
        return Array.from(map.values()).sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
          return aTime - bTime
        })
      })
    } catch (error) {
      console.error('Failed to refresh messages:', error)
    }
  }, [user])

  const loadMoreMessages = useCallback(
    async (beforeId: string) => {
      if (!user) return
      const olderData = await messageService.getAll(beforeId, 20)
      if (olderData.length > 0) {
        setMessages((prev) => {
          const map = new Map<string, Message>()
          olderData.forEach((m) => map.set(m.id, m))
          prev.forEach((m) => map.set(m.id, m))
          return Array.from(map.values()).sort((a, b) => {
            const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
            const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
            return aTime - bTime
          })
        })
      }
      return olderData.length
    },
    [user]
  )

  const refreshMenu = useCallback(async () => {
    if (!user?.partnerId) return
    const [dishData, orderData] = await Promise.all([
      menuService.getDishes(),
      mealOrderService.getToday()
    ])
    setMenuDishes(dishData)
    setMealOrder(orderData)
  }, [user])

  const refreshKitchen = useCallback(async () => {
    if (!user?.partnerId) return
    const today = new Date().toISOString().slice(0, 10)
    const [recipeData, shoppingData, checkinData, orderData] =
      await Promise.all([
        kitchenService.getRecipes(),
        kitchenService.getShoppingList(today),
        kitchenService.getCheckins(),
        mealOrderService.getToday()
      ])
    setKitchenRecipes(recipeData)
    setShoppingList(shoppingData)
    setCookCheckins(checkinData)
    setMealOrder(orderData)
  }, [user])

  const refreshPeriods = useCallback(async () => {
    if (!user?.partnerId) return
    const periodData = await periodService.getAll()
    setPeriodRecords(periodData.records)
    setPeriodLogs(periodData.logs)
    setPeriodSummary(periodData.summary)
    setPeriodSettings(periodData.settings)
  }, [user])

  // Auth and Fetch initial data
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token')
      if (token) {
        try {
          const userData = await authService.me()
          setUser(userData)
        } catch (error) {
          console.error('Auth failed:', error)
          localStorage.removeItem('token')
        }
      }
      setAuthLoading(false)
    }
    initAuth()
  }, [])

  useEffect(() => {
    if (!user) return

    const fetchData = async () => {
      setInitialDataLoading(true)
      try {
        const [
          diaryData,
          todoData,
          messageData,
          anniversaryData,
          albumOverviewData,
          coupleData,
          ratingData,
          dishData,
          orderData,
          recipeData,
          shoppingData,
          checkinData,
          periodData
        ] = await Promise.all([
          diaryService.getAll(),
          todoService.getAll(),
          messageService.getAll(),
          anniversaryService.getAll(),
          albumService.getOverview(),
          coupleService.get(),
          ratingService.getTodayStatus(),
          user.partnerId ? menuService.getDishes() : Promise.resolve([]),
          user.partnerId ? mealOrderService.getToday() : Promise.resolve(null),
          user.partnerId ? kitchenService.getRecipes() : Promise.resolve([]),
          user.partnerId
            ? kitchenService.getShoppingList(
                new Date().toISOString().slice(0, 10)
              )
            : Promise.resolve(null),
          user.partnerId ? kitchenService.getCheckins() : Promise.resolve([]),
          user.partnerId
            ? periodService.getAll()
            : Promise.resolve({
                records: [],
                logs: [],
                summary: null,
                settings: null
              })
        ])
        setDiaries(diaryData)
        setTodos(todoData)
        setMessages(messageData)
        setAnniversaries(anniversaryData)
        setAlbumOverview(albumOverviewData)
        setCouple(coupleData)
        setDailyRatings(ratingData)
        setMenuDishes(dishData)
        setMealOrder(orderData)
        setKitchenRecipes(recipeData)
        setShoppingList(shoppingData)
        setCookCheckins(checkinData)
        setPeriodRecords(periodData.records)
        setPeriodLogs(periodData.logs)
        setPeriodSummary(periodData.summary)
        setPeriodSettings(periodData.settings)
      } catch (error) {
        console.error('Failed to fetch data:', error)
        showToast(
          error instanceof Error ? error.message : '数据加载失败，请稍后重试',
          'error'
        )
      } finally {
        setInitialDataLoading(false)
      }
    }
    fetchData()
  }, [showToast, user])

  useEffect(() => {
    if (
      !user?.partnerId ||
      !periodSummary ||
      periodSettings?.autoSyncCareTodos === false
    )
      return
    const today = new Date().toISOString().slice(0, 10)
    const leadDays = periodSettings?.reminderLeadDays ?? 3
    const days = periodSummary.daysUntilNext
    const shouldSyncPeriod = Boolean(
      periodSummary.predictedStartDate &&
      days !== undefined &&
      days >= 0 &&
      days <= leadDays
    )
    const shouldSyncFertility = Boolean(
      periodSettings?.mode === 'trying_to_conceive' &&
      periodSummary.fertileWindow &&
      today >= periodSummary.fertileWindow.startDate &&
      today <= periodSummary.fertileWindow.endDate
    )
    if (!shouldSyncPeriod && !shouldSyncFertility) return
    const syncKey = shouldSyncFertility
      ? `fertility:${today}`
      : `period:${periodSummary.predictedStartDate}`
    if (lastPeriodCareSyncRef.current === syncKey) return

    lastPeriodCareSyncRef.current = syncKey
    periodService
      .syncCareTodos()
      .then(async (result) => {
        if (!result.skipped && (result.created > 0 || result.updated > 0)) {
          await refreshTodos()
          showToast('姨妈照顾清单已准备好', 'success')
        }
      })
      .catch((error) => {
        console.error('Sync period care todos failed:', error)
      })
  }, [periodSettings, periodSummary, refreshTodos, showToast, user])

  usePolling(refreshMessages, {
    enabled: Boolean(user && currentPage === 'messages'),
    intervalMs: 3000
  })

  useEffect(() => {
    if (!user) return

    const refreshCurrentPage = async () => {
      try {
        setPageRefreshing(currentPage)
        if (currentPage === 'diary') await refreshDiaries()
        if (currentPage === 'todo') await refreshTodos()
        if (currentPage === 'album') await refreshAlbumOverview()
        if (currentPage === 'anniversaries') await refreshAnniversaries()
        if (currentPage === 'menu') await refreshMenu()
        if (currentPage === 'kitchen') await refreshKitchen()
        if (currentPage === 'period') await refreshPeriods()
      } catch (error) {
        console.error('Failed to refresh page:', error)
        showToast(
          error instanceof Error ? error.message : '页面数据刷新失败',
          'error'
        )
      } finally {
        setPageRefreshing(null)
      }
    }

    if (
      [
        'diary',
        'todo',
        'album',
        'anniversaries',
        'menu',
        'kitchen',
        'period'
      ].includes(currentPage)
    ) {
      void refreshCurrentPage()
    }
  }, [
    currentPage,
    refreshAlbumOverview,
    refreshAnniversaries,
    refreshDiaries,
    refreshKitchen,
    refreshMenu,
    refreshPeriods,
    refreshTodos,
    showToast,
    user
  ])

  const updatePeriodState = (periodData: PeriodOverview) => {
    setPeriodRecords(periodData.records)
    setPeriodLogs(periodData.logs)
    setPeriodSummary(periodData.summary)
    setPeriodSettings(periodData.settings)
    lastPeriodCareSyncRef.current = null
  }

  const isPageLoading = (page: PageType) =>
    initialDataLoading || pageRefreshing === page
  const albumImages = albumOverview?.featuredItems || []

  if (authLoading) return null
  if (!user) return <Auth onSuccess={setUser} />

  const renderPage = () => {
    if (user && !user.partnerId)
      return (
        <Binding
          user={user}
          onBound={(updatedUser) => setUser(updatedUser)}
          onLogout={() => {
            authService.logout()
            setUser(null)
          }}
        />
      )

    switch (currentPage) {
      case 'home':
        return (
          <Home
            user={user}
            onNavigate={navigateToPage}
            anniversaries={anniversaries}
            todos={todos}
            couple={couple}
            dailyRatings={dailyRatings}
            mealOrder={mealOrder}
            albumImages={albumImages}
            periodRecords={periodRecords}
            periodSummary={periodSummary}
            onUpdateRatings={(newRatings) => setDailyRatings(newRatings)}
            onUpdateUser={(updatedUser) => setUser(updatedUser)}
            onOpenPeriod={() => navigateToPage('period')}
          />
        )
      case 'anniversaries':
        return (
          <Anniversaries
            data={anniversaries}
            isLoading={isPageLoading('anniversaries')}
            onAdd={async (ann) => {
              await anniversaryService.create(ann)
              await refreshAnniversaries()
            }}
            onDelete={async (id) => {
              await anniversaryService.delete(id)
              await refreshAnniversaries()
            }}
            onToggleImportant={async (id) => {
              const anniversary = anniversaries.find((a) => a.id === id)
              if (!anniversary) return
              await anniversaryService.update(id, {
                isImportant: !anniversary.isImportant
              })
              await refreshAnniversaries()
            }}
          />
        )
      case 'diary':
        return (
          <Diary
            data={diaries}
            user={user}
            isLoading={isPageLoading('diary')}
            onAdd={async (entry) => {
              await diaryService.create(entry)
              await refreshDiaries()
            }}
            onDelete={async (id) => {
              await diaryService.delete(id)
              await refreshDiaries()
            }}
            onUpdate={async (updatedEntry) => {
              await diaryService.update(updatedEntry)
              await refreshDiaries()
            }}
          />
        )
      case 'todo':
        return (
          <TodoList
            data={todos}
            isLoading={isPageLoading('todo')}
            onUpdate={async (id, patch) => {
              await todoService.update(id, patch)
              await refreshTodos()
            }}
            onAdd={async (todo) => {
              await todoService.create(todo)
              await refreshTodos()
            }}
            onDelete={async (id) => {
              await todoService.delete(id)
              await refreshTodos()
            }}
          />
        )
      case 'album':
        return (
          <Album
            overview={albumOverview}
            anniversaries={anniversaries}
            couple={couple}
            isLoading={isPageLoading('album')}
            onOverviewChange={refreshAlbumOverview}
            onAdd={async (img) => {
              await albumService.create(img)
              await refreshAlbumOverview()
            }}
            onUpdate={async (id, image) => {
              const updated = await albumService.update(id, image)
              await refreshAlbumOverview()
              return updated
            }}
            onToggleLike={async (image) => {
              const updated = image.likedByMe
                ? await albumService.unlike(image.id)
                : await albumService.like(image.id)
              await refreshAlbumOverview()
              return updated
            }}
            onAddComment={async (id, content) => {
              const updated = await albumService.addComment(id, content)
              await refreshAlbumOverview()
              return updated
            }}
            onDelete={async (id) => {
              await albumService.delete(id)
              await refreshAlbumOverview()
            }}
          />
        )
      case 'messages':
        return (
          <MessageBoard
            data={messages}
            user={user}
            isLoading={isPageLoading('messages')}
            onBack={goBackOrHome}
            onSend={async (content, imageUrl, replyToId) => {
              await messageService.send(content, imageUrl, replyToId)
              await refreshMessages()
            }}
            onDelete={async (id) => {
              await messageService.delete(id)
              await refreshMessages()
            }}
            onLoadMore={loadMoreMessages}
          />
        )
      case 'menu':
        return (
          <MenuOrder
            dishes={menuDishes}
            order={mealOrder}
            isLoading={isPageLoading('menu')}
            onAddDish={async (dish) => {
              await menuService.createDish(dish)
              await refreshMenu()
            }}
            onDeleteDish={async (id) => {
              await menuService.deleteDish(id)
              await refreshMenu()
            }}
            onAddOrderItem={async (dish) => {
              await mealOrderService.addTodayItem(dish)
              await refreshMenu()
            }}
            onUpdateOrderItem={async (id, item) => {
              await mealOrderService.updateItem(id, item)
              await refreshMenu()
            }}
            onDeleteOrderItem={async (id) => {
              await mealOrderService.deleteItem(id)
              await refreshMenu()
            }}
          />
        )
      case 'kitchen':
        return (
          <CoupleKitchen
            recipes={kitchenRecipes}
            shoppingList={shoppingList}
            checkins={cookCheckins}
            order={mealOrder}
            isLoading={isPageLoading('kitchen')}
            onRefresh={refreshKitchen}
            onCreateRecipe={async (recipe) => {
              await kitchenService.createRecipe(recipe)
              await refreshKitchen()
            }}
            onUpdateRecipe={async (id, recipe) => {
              await kitchenService.updateRecipe(id, recipe)
              await refreshKitchen()
            }}
            onToggleFavorite={async (recipe) => {
              if (recipe.isFavorite)
                await kitchenService.unfavoriteRecipe(recipe.id)
              else await kitchenService.favoriteRecipe(recipe.id)
              await refreshKitchen()
            }}
            onDeleteRecipe={async (id) => {
              await kitchenService.deleteRecipe(id)
              await refreshKitchen()
            }}
            onGenerateShoppingList={async (date, recipeIds) => {
              const updated = await kitchenService.generateShoppingList(
                date,
                recipeIds
              )
              setShoppingList(updated)
            }}
            onLoadShoppingList={async (date) => {
              const updated = await kitchenService.getShoppingList(date)
              setShoppingList(updated)
            }}
            onToggleShoppingItem={async (id, checked) => {
              await kitchenService.updateShoppingItem(id, { checked })
              await refreshKitchen()
            }}
            onDeleteShoppingItem={async (id) => {
              await kitchenService.deleteShoppingItem(id)
              setShoppingList((current) =>
                current
                  ? {
                      ...current,
                      items: current.items.filter((item) => item.id !== id)
                    }
                  : current
              )
            }}
            onCreateCheckin={async (checkin) => {
              await kitchenService.createCheckin(checkin)
              await refreshKitchen()
            }}
            onDeleteCheckin={async (id) => {
              await kitchenService.deleteCheckin(id)
              await refreshKitchen()
            }}
            onAddOrderItem={async (dish) => {
              await mealOrderService.addTodayItem(dish)
              await refreshKitchen()
            }}
            onUpdateOrderItem={async (id, item) => {
              await mealOrderService.updateItem(id, item)
              await refreshKitchen()
            }}
            onDeleteOrderItem={async (id) => {
              await mealOrderService.deleteItem(id)
              await refreshKitchen()
            }}
          />
        )
      case 'period':
        return (
          <PeriodAssistantPage
            records={periodRecords}
            logs={periodLogs}
            summary={periodSummary}
            settings={periodSettings}
            isLoading={isPageLoading('period')}
            onBack={goBackOrHome}
            onCreate={async (record) =>
              updatePeriodState(await periodService.create(record))
            }
            onUpdate={async (id, record) =>
              updatePeriodState(await periodService.update(id, record))
            }
            onDelete={async (id) =>
              updatePeriodState(await periodService.delete(id))
            }
            onSaveLog={async (date, log) =>
              updatePeriodState(await periodService.saveLog(date, log))
            }
            onDeleteLog={async (date) =>
              updatePeriodState(await periodService.deleteLog(date))
            }
            onUpdateSettings={async (settings) =>
              updatePeriodState(await periodService.updateSettings(settings))
            }
            onSyncCareTodos={async () => {
              const result = await periodService.syncCareTodos(todayString())
              if (!result.skipped && (result.created > 0 || result.updated > 0))
                await refreshTodos()
              return result
            }}
          />
        )
      case 'profile':
        return (
          <Profile
            user={user}
            couple={couple}
            onUpdateUser={(updatedUser) => setUser(updatedUser)}
            onUpdateCouple={(updatedCouple) => setCouple(updatedCouple)}
            onLogout={() => setUser(null)}
            onUnbind={async () => {
              if (
                window.confirm('确定要解除绑定吗？这会清除你们的关联关系。')
              ) {
                try {
                  const updatedUser = await authService.unbind()
                  setUser(updatedUser)
                  showToast('已解除绑定', 'success')
                } catch (error) {
                  console.error('Unbind failed:', error)
                  showToast(
                    error instanceof Error ? error.message : '解除绑定失败',
                    'error'
                  )
                }
              }
            }}
          />
        )
      default:
        return (
          <Home
            user={user}
            onNavigate={navigateToPage}
            anniversaries={anniversaries}
            todos={todos}
            couple={couple}
            dailyRatings={dailyRatings}
            mealOrder={mealOrder}
            albumImages={albumImages}
            periodRecords={periodRecords}
            periodSummary={periodSummary}
            onUpdateRatings={(newRatings) => setDailyRatings(newRatings)}
            onUpdateUser={(updatedUser) => setUser(updatedUser)}
            onOpenPeriod={() => navigateToPage('period')}
          />
        )
    }
  }

  const isBound = Boolean(user?.partnerId)
  const daysTogether = daysSince(couple?.startDate)
  const pendingTodos = todos.filter((todo) => !todo.completed)
  const completedTodoCount = todos.length - pendingTodos.length
  const todayRating = dailyRatings.find((rating) => rating.userId === user.id)
  const partnerRating = dailyRatings.find((rating) => rating.userId !== user.id)
  const nextAnniversary = anniversaries[0]
  const mealOrderQuantity =
    mealOrder?.items.reduce((sum, item) => sum + item.quantity, 0) || 0
  const periodHint = periodSummary?.isInPeriod
    ? `第 ${periodSummary.currentDay || 1} 天`
    : periodSummary?.daysUntilNext !== undefined
      ? `${periodSummary.daysUntilNext} 天后`
      : '待记录'

  const mobileNavItems = [
    { id: 'home', icon: Heart, label: '首页' },
    { id: 'diary', icon: Book, label: '日记' },
    { id: 'album', icon: ImageIcon, label: '相册' },
    { id: 'todo', icon: CheckSquare, label: '100件' },
    { id: 'profile', icon: User, label: '我的' }
  ]
  const fixedHeaderPages: PageType[] = [
    'anniversaries',
    'messages',
    'menu',
    'kitchen',
    'album'
  ]
  const usesFixedHeaderLayout = fixedHeaderPages.includes(currentPage)
  const desktopNavItems = [
    { id: 'home', icon: Heart, label: '首页', description: '今日总览' },
    {
      id: 'diary',
      icon: Book,
      label: '日记',
      description: `${diaries.length} 篇记录`
    },
    {
      id: 'album',
      icon: ImageIcon,
      label: '相册',
      description: `${albumOverview?.total || 0} 段回忆`
    },
    {
      id: 'todo',
      icon: CheckSquare,
      label: '100件',
      description: `${completedTodoCount}/100 完成`
    },
    {
      id: 'anniversaries',
      icon: Calendar,
      label: '纪念日',
      description: `${anniversaries.length} 个日子`
    },
    {
      id: 'menu',
      icon: Utensils,
      label: '点餐',
      description:
        mealOrderQuantity > 0 ? `${mealOrderQuantity} 份待定` : '今天吃什么'
    },
    {
      id: 'kitchen',
      icon: ChefHat,
      label: '厨房',
      description: `${kitchenRecipes.length} 道菜谱`
    },
    {
      id: 'period',
      icon: Droplets,
      label: '姨妈助手',
      description: periodHint
    },
    {
      id: 'messages',
      icon: MessageSquare,
      label: '留言',
      description: `${messages.length} 条心事`
    },
    { id: 'profile', icon: User, label: '我的', description: user.username }
  ]

  return (
    <ThemeProvider coupleId={couple?.id}>
      <div className="app-viewport flex justify-center items-center bg-[var(--theme-bg)] p-0 md:p-5 xl:p-8">
        {/* Background Decor for Web */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-40 hidden sm:block">
          <div className="absolute top-[8%] left-[4%] w-96 h-96 bg-[var(--theme-200)] blur-[150px] rounded-full" />
          <div className="absolute bottom-[8%] right-[6%] w-96 h-96 bg-[var(--theme-100)] blur-[150px] rounded-full" />
        </div>

        <div
          className={`app-shell w-full bg-gradient-to-b from-[var(--theme-bg)] via-[var(--theme-bg-light)] to-[var(--theme-50)] overflow-hidden relative shadow-2xl font-sans sm:border-[8px] border-white/80 ${isBound ? 'max-w-md md:max-w-[1800px] md:grid md:grid-cols-[260px_minmax(0,1fr)] md:rounded-[2rem] md:border md:bg-white/64 md:backdrop-blur-2xl xl:grid-cols-[300px_minmax(0,1fr)_390px]' : 'max-w-md sm:rounded-[3rem] flex flex-col'}`}
        >
          {isBound && (
            <aside className="hidden min-h-0 flex-col border-r border-white/70 bg-white/55 px-4 py-5 md:flex">
              <button
                type="button"
                onClick={() => navigateToPage('home')}
                className="mb-6 flex items-center gap-3 rounded-[1.5rem] bg-white/80 p-3 text-left shadow-sm transition-transform active:scale-[0.98]"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pink-500 text-white shadow-lg shadow-pink-200">
                  <Heart
                    size={20}
                    className="fill-white"
                  />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black text-gray-900">
                    {couple?.name || 'SweetLover'}
                  </span>
                  <span className="mt-0.5 block text-[11px] font-bold text-gray-400">
                    {daysTogether || 0} 天甜蜜同步
                  </span>
                </span>
              </button>

              <nav
                className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1 scrollbar-hide"
                aria-label="桌面导航"
              >
                {desktopNavItems.map((item) => {
                  const Icon = item.icon
                  const active = currentPage === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-label={`打开${item.label}`}
                      onClick={() => navigateToPage(item.id as PageType)}
                      className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all duration-200 active:scale-[0.99] ${
                        active
                          ? 'bg-accent text-on-accent shadow-lg shadow-accent/30'
                          : 'text-gray-500 hover:bg-white/75 hover:text-gray-900'
                      }`}
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${active ? 'bg-white/25 text-on-accent' : 'bg-white/70 text-pink-400 group-hover:text-pink-500'}`}
                      >
                        <Icon size={17} />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-black">
                          {item.label}
                        </span>
                        <span
                          className={`mt-0.5 block truncate text-[10px] font-bold ${active ? 'text-white/55' : 'text-gray-400'}`}
                        >
                          {item.description}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </nav>

              <div className="mt-5 rounded-[1.5rem] bg-pink-50/70 p-4">
                <div className="flex items-center gap-2 text-pink-500">
                  <Sparkles size={16} />
                  <span className="text-xs font-black">今日状态</span>
                </div>
                <p className="mt-2 text-xs font-bold leading-relaxed text-gray-500">
                  {todayRating
                    ? `你给今天打了 ${todayRating.score} 分`
                    : '还没给今天打分'}
                  {partnerRating ? '，TA 也回应了。' : '，等一个温柔回应。'}
                </p>
              </div>
            </aside>
          )}

          {/* Main Content Area */}
          <main
            className={`relative h-full min-h-0 flex-1 overflow-y-auto scrollbar-hide md:col-start-2 md:min-w-0 ${currentPage === 'messages' ? 'xl:col-end-4' : ''}`}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={user?.partnerId ? currentPage : 'binding'}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className={`h-full min-h-full ${usesFixedHeaderLayout ? 'md:h-full md:min-h-0' : 'md:h-auto md:min-h-full'} ${currentPage === 'messages' || currentPage === 'period' || currentPage === 'menu' || currentPage === 'kitchen' ? '' : 'pb-28 md:pb-0'}`}
              >
                {renderPage()}
              </motion.div>
            </AnimatePresence>
          </main>

          {isBound && currentPage !== 'messages' && (
            <aside className="hidden min-h-0 overflow-y-auto border-l border-white/70 bg-white/45 px-5 py-5 scrollbar-hide xl:block">
              <section className="rounded-[1.75rem] bg-gradient-to-br from-pink-400 to-purple-400 p-5 text-on-accent shadow-xl shadow-accent/20">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-accent/70">
                      Love desk
                    </p>
                    <h2 className="mt-2 text-2xl font-black leading-tight">
                      {couple?.name || 'SweetLover'}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigateToPage('messages')}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-on-accent transition-colors hover:bg-white/30"
                    aria-label="打开留言"
                  >
                    <MessageSquare size={19} />
                  </button>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-white/15 p-3">
                    <p className="text-3xl font-black leading-none tabular-nums">
                      {daysTogether || 0}
                    </p>
                    <p className="mt-1 text-[10px] font-bold text-on-accent/60">
                      相伴天数
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/15 p-3">
                    <p className="text-3xl font-black leading-none tabular-nums">
                      {pendingTodos.length}
                    </p>
                    <p className="mt-1 text-[10px] font-bold text-on-accent/60">
                      待完成小事
                    </p>
                  </div>
                </div>
              </section>

              <section className="mt-4 rounded-[1.75rem] bg-white/75 p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-black text-gray-900">此刻状态</h3>
                  <button
                    type="button"
                    onClick={() => navigateToPage('home')}
                    className="rounded-full bg-pink-50 px-3 py-1.5 text-[10px] font-black text-pink-500"
                  >
                    设置
                  </button>
                </div>
                {[user, user.partner].map((person, index) => (
                  <div
                    key={person?.id || index}
                    className="flex items-center gap-3 border-t border-pink-50 py-3 first:border-t-0 first:pt-0 last:pb-0"
                  >
                    <AppImage
                      src={
                        person?.avatar ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(person?.username || 'lover')}`
                      }
                      alt={person?.username || '伴侣'}
                      className="h-10 w-10 rounded-2xl border-2 border-white object-cover shadow-sm"
                      width={80}
                      height={80}
                      crop="square"
                      sizes="40px"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-black text-gray-800">
                        {person?.username || '另一半'}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] font-bold text-gray-400">
                        {momentLabel(person)}
                      </p>
                    </div>
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${index === 0 ? 'bg-pink-500' : 'bg-blue-400'}`}
                    />
                  </div>
                ))}
              </section>

              <section className="mt-4 rounded-[1.75rem] bg-white/75 p-4 shadow-sm">
                <h3 className="text-sm font-black text-gray-900">今日重点</h3>
                <div className="mt-3 space-y-2">
                  <button
                    type="button"
                    onClick={() => navigateToPage('todo')}
                    className="flex w-full items-center justify-between rounded-2xl bg-pink-50/80 px-3 py-3 text-left transition-colors hover:bg-pink-100"
                  >
                    <span>
                      <span className="block text-xs font-black text-gray-800">
                        恋爱清单
                      </span>
                      <span className="mt-0.5 block text-[10px] font-bold text-gray-400">
                        {completedTodoCount}/100 已完成
                      </span>
                    </span>
                    <CheckSquare
                      size={16}
                      className="text-pink-500"
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateToPage('period')}
                    className="flex w-full items-center justify-between rounded-2xl bg-rose-50/80 px-3 py-3 text-left transition-colors hover:bg-rose-100"
                  >
                    <span>
                      <span className="block text-xs font-black text-gray-800">
                        姨妈助手
                      </span>
                      <span className="mt-0.5 block text-[10px] font-bold text-gray-400">
                        {periodHint}
                      </span>
                    </span>
                    <Droplets
                      size={16}
                      className="text-rose-500"
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateToPage('kitchen')}
                    className="flex w-full items-center justify-between rounded-2xl bg-amber-50/90 px-3 py-3 text-left transition-colors hover:bg-amber-100"
                  >
                    <span>
                      <span className="block text-xs font-black text-gray-800">
                        今天吃什么
                      </span>
                      <span className="mt-0.5 block text-[10px] font-bold text-gray-400">
                        {mealOrderQuantity > 0
                          ? `${mealOrderQuantity} 份已加入`
                          : '去厨房看看'}
                      </span>
                    </span>
                    <Utensils
                      size={16}
                      className="text-amber-500"
                    />
                  </button>
                </div>
              </section>

              {nextAnniversary && (
                <section className="mt-4 rounded-[1.75rem] bg-white/75 p-4 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">
                    Next date
                  </p>
                  <h3 className="mt-2 truncate text-sm font-black text-gray-900">
                    {nextAnniversary.title}
                  </h3>
                  <p className="mt-1 text-xs font-bold text-gray-400">
                    {nextAnniversary.date}
                  </p>
                </section>
              )}
            </aside>
          )}

          {/* Navigation Bar - Only show when bound */}
          {user?.partnerId &&
            currentPage !== 'messages' &&
            currentPage !== 'period' && (
              <nav className="app-bottom-nav absolute left-1/2 -translate-x-1/2 w-[90%] bg-white/60 backdrop-blur-2xl border border-white/50 h-16 rounded-[2rem] shadow-xl flex items-center justify-around px-2 z-50 md:hidden">
                {mobileNavItems.map((item) => (
                  <button
                    key={item.id}
                    aria-label={`打开${item.label}`}
                    onClick={() => navigateToPage(item.id as PageType)}
                    className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-300 flex-1 ${
                      currentPage === item.id
                        ? 'text-pink-500 scale-110'
                        : 'text-gray-400 hover:text-pink-300'
                    }`}
                  >
                    <item.icon size={20} />
                    <span className="text-[10px] mt-0.5 font-black uppercase tracking-tighter">
                      {item.label}
                    </span>
                  </button>
                ))}
              </nav>
            )}
        </div>
      </div>
    </ThemeProvider>
  )
}
