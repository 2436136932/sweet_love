import { AnimatePresence, motion } from 'motion/react';
import {
  CalendarDays,
  Camera,
  Check,
  ChefHat,
  Heart,
  Image as ImageIcon,
  ListChecks,
  Minus,
  Plus,
  ReceiptText,
  Search,
  ShoppingBasket,
  Sparkles,
  Star,
  Trash2,
  Utensils,
  X,
} from 'lucide-react';
import { ChangeEvent, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AiRecipeDraft, KitchenCookCheckin, KitchenIngredient, KitchenRecipe, KitchenShoppingList, KitchenShoppingListItem, MealOrderDay, MealOrderItem } from '../types';
import { aiService, uploadService } from '../services/api';
import { cn } from '../lib/utils';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/Confirm';
import { useModalHistory } from '../hooks/useModalHistory';
import { AppImage } from '../components/AppImage';

type KitchenTab = 'recipes' | 'shopping' | 'checkins' | 'ticket';
const KITCHEN_TABS = [
  { id: 'recipes', label: '菜谱', icon: ChefHat },
  { id: 'shopping', label: '买菜', icon: ShoppingBasket },
  { id: 'checkins', label: '打卡', icon: Camera },
  { id: 'ticket', label: '小票', icon: ReceiptText },
];
type RecipeAction = 'ticket';
type RecipeFormMode = 'create' | 'edit' | 'copy';

interface RecipeFormState {
  title: string;
  category: string;
  summary: string;
  difficulty: string;
  cookTime: string;
  servings: string;
  ingredients: KitchenIngredient[];
  steps: string[];
  imageUrl: string;
}

const RECIPE_CATEGORIES = ['家常快手', '下饭硬菜', '约会餐', '饮品甜点', '轻食', '夜宵'];
const DIFFICULTY_OPTIONS = ['简单', '中等', '进阶'];
const today = () => new Date().toISOString().slice(0, 10);
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=720&q=80';

function blankIngredient(): KitchenIngredient {
  return { name: '', unit: '', note: '' };
}

function createBlankRecipeForm(): RecipeFormState {
  return {
    title: '',
    category: RECIPE_CATEGORIES[0],
    summary: '',
    difficulty: DIFFICULTY_OPTIONS[0],
    cookTime: '20',
    servings: '2',
    ingredients: [blankIngredient()],
    steps: [''],
    imageUrl: '',
  };
}

function recipeToForm(recipe: KitchenRecipe, copy = false): RecipeFormState {
  return {
    title: copy ? `${recipe.title}（我的版）` : recipe.title,
    category: recipe.category || RECIPE_CATEGORIES[0],
    summary: recipe.summary || '',
    difficulty: recipe.difficulty || DIFFICULTY_OPTIONS[0],
    cookTime: recipe.cookTime ? String(recipe.cookTime) : '20',
    servings: recipe.servings ? String(recipe.servings) : '2',
    ingredients: recipe.ingredients.length > 0 ? recipe.ingredients.map((item) => ({ ...item })) : [blankIngredient()],
    steps: recipe.steps.length > 0 ? [...recipe.steps] : [''],
    imageUrl: recipe.imageUrl || '',
  };
}

function recipeToTicketDish(recipe: KitchenRecipe) {
  return {
    id: '',
    name: recipe.title,
    category: recipe.category,
    description: recipe.summary,
    imageUrl: recipe.imageUrl,
    isPreset: recipe.isPreset,
  };
}

export default function CoupleKitchen({
  recipes,
  shoppingList,
  checkins,
  order,
  isLoading = false,
  onRefresh,
  onCreateRecipe,
  onUpdateRecipe,
  onToggleFavorite,
  onDeleteRecipe,
  onGenerateShoppingList,
  onLoadShoppingList,
  onToggleShoppingItem,
  onDeleteShoppingItem,
  onCreateCheckin,
  onDeleteCheckin,
  onAddOrderItem,
  onUpdateOrderItem,
  onDeleteOrderItem,
}: {
  recipes: KitchenRecipe[];
  shoppingList: KitchenShoppingList | null;
  checkins: KitchenCookCheckin[];
  order: MealOrderDay | null;
  isLoading?: boolean;
  onRefresh: () => Promise<void> | void;
  onCreateRecipe: (recipe: Partial<KitchenRecipe>) => Promise<void> | void;
  onUpdateRecipe: (id: string, recipe: Partial<KitchenRecipe>) => Promise<void> | void;
  onToggleFavorite: (recipe: KitchenRecipe) => Promise<void> | void;
  onDeleteRecipe: (id: string) => Promise<void> | void;
  onGenerateShoppingList: (date: string, recipeIds: string[]) => Promise<void> | void;
  onLoadShoppingList: (date: string) => Promise<void> | void;
  onToggleShoppingItem: (id: string, checked: boolean) => Promise<void> | void;
  onDeleteShoppingItem: (id: string) => Promise<void> | void;
  onCreateCheckin: (checkin: { date: string; recipeId?: string; title: string; imageUrl?: string; note?: string; rating?: number }) => Promise<void> | void;
  onDeleteCheckin: (id: string) => Promise<void> | void;
  onAddOrderItem: (dish: ReturnType<typeof recipeToTicketDish>) => Promise<void> | void;
  onUpdateOrderItem: (id: string, item: { quantity?: number; note?: string }) => Promise<void> | void;
  onDeleteOrderItem: (id: string) => Promise<void> | void;
}) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState<KitchenTab>('recipes');
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('全部');
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>([]);
  const [shoppingDate, setShoppingDate] = useState(today());
  const [showRecipeForm, setShowRecipeForm] = useState(false);
  const [recipeFormMode, setRecipeFormMode] = useState<RecipeFormMode>('create');
  const [editingRecipe, setEditingRecipe] = useState<KitchenRecipe | null>(null);
  const [showCheckinForm, setShowCheckinForm] = useState(false);
  const [checkinRecipe, setCheckinRecipe] = useState<KitchenRecipe | null>(null);
  const [detailRecipeId, setDetailRecipeId] = useState<string | null>(null);
  const detailRecipe = useMemo(() => {
    return recipes.find((r) => r.id === detailRecipeId) || null;
  }, [recipes, detailRecipeId]);
  const [busy, setBusy] = useState(false);
  const [pendingRecipeActions, setPendingRecipeActions] = useState<Record<string, boolean>>({});
  const [deletingShoppingItemIds, setDeletingShoppingItemIds] = useState<Record<string, boolean>>({});

  const [recipeForm, setRecipeForm] = useState<RecipeFormState>(() => createBlankRecipeForm());
  const [checkinForm, setCheckinForm] = useState({
    date: today(),
    title: '',
    note: '',
    rating: 5,
    imageUrl: '',
  });
  const [imageUploading, setImageUploading] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiTab, setAiTab] = useState<'recipe' | 'ideas'>('recipe');
  const [aiRecipeForm, setAiRecipeForm] = useState({ idea: '', preferences: '', servings: '2', cookTime: '30' });
  const [aiRecipeDraft, setAiRecipeDraft] = useState<AiRecipeDraft | null>(null);
  const [aiKitchenPrompt, setAiKitchenPrompt] = useState('');
  const [aiKitchenResult, setAiKitchenResult] = useState('');
  const [aiLoading, setAiLoading] = useState<'recipe' | 'ideas' | null>(null);

  const orderItems = order?.items || [];
  const totalQuantity = orderItems.reduce((sum, item) => sum + item.quantity, 0);
  const categories = useMemo(() => ['全部', '收藏', ...Array.from(new Set([...RECIPE_CATEGORIES, ...recipes.map((recipe) => recipe.category)]))], [recipes]);
  const filteredRecipes = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return recipes.filter((recipe) => {
      const matchesCategory = activeCategory === '全部' || (activeCategory === '收藏' ? recipe.isFavorite : recipe.category === activeCategory);
      const matchesQuery = !keyword || recipe.title.toLowerCase().includes(keyword) || recipe.category.toLowerCase().includes(keyword);
      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, query, recipes]);

  const selectedRecipes = recipes.filter((recipe) => selectedRecipeIds.includes(recipe.id));
  const shoppingItems = shoppingList?.items || [];
  const pendingShoppingItems = shoppingItems.filter((item) => !item.checked);
  const purchasedShoppingItems = shoppingItems.filter((item) => item.checked);
  const checkedShoppingCount = purchasedShoppingItems.length;
  const shoppingProgress = shoppingItems.length > 0 ? Math.round((checkedShoppingCount / shoppingItems.length) * 100) : 0;
  const hasSelectedRecipes = selectedRecipes.length > 0;
  const hasShoppingList = Boolean(shoppingList?.id);

  const toggleSelectedRecipe = (id: string) => {
    setSelectedRecipeIds((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  };

  const uploadImage = async (event: ChangeEvent<HTMLInputElement>, target: 'recipe' | 'checkin') => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    try {
      const url = await uploadService.upload(file);
      if (target === 'recipe') setRecipeForm((prev) => ({ ...prev, imageUrl: url }));
      if (target === 'checkin') setCheckinForm((prev) => ({ ...prev, imageUrl: url }));
      showToast('图片已上传', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '图片上传失败', 'error');
    } finally {
      setImageUploading(false);
    }
  };

  const openCreateRecipeForm = () => {
    setRecipeFormMode('create');
    setEditingRecipe(null);
    setRecipeForm(createBlankRecipeForm());
    setShowRecipeForm(true);
  };

  const generateKitchenIdeas = async () => {
    setAiLoading('ideas');
    setAiKitchenResult('');
    try {
      const result = await aiService.generate({
        type: 'kitchen_ideas',
        prompt: aiKitchenPrompt.trim() || '今天不知道吃什么，给我们几个适合情侣一起做的家常建议。',
        context: {
          existingRecipes: recipes.slice(0, 12).map((recipe) => recipe.title),
          selectedCategory: activeCategory,
        },
      });
      setAiKitchenResult(result.content);
    } catch (error) {
      console.error('Generate kitchen ideas failed:', error);
      showToast(error instanceof Error ? error.message : 'AI 厨房灵感生成失败，请稍后重试', 'error');
    } finally {
      setAiLoading(null);
    }
  };

  const generateAiRecipe = async () => {
    setAiLoading('recipe');
    setAiRecipeDraft(null);
    try {
      const result = await aiService.generate({
        type: 'kitchen_recipe',
        prompt: aiRecipeForm.idea.trim() || '生成一道适合情侣一起做的家常菜谱',
        context: {
          preferences: aiRecipeForm.preferences,
          servings: aiRecipeForm.servings || '2',
          cookTime: aiRecipeForm.cookTime || '30',
          categories: RECIPE_CATEGORIES,
          existingRecipes: recipes.slice(0, 12).map((recipe) => recipe.title),
          currentDraftTitle: aiRecipeDraft?.title,
          variationSeed: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        },
      });
      if (!result.recipe) throw new Error('AI 菜谱格式异常，请重试');
      setAiRecipeDraft(result.recipe);
    } catch (error) {
      console.error('Generate AI recipe failed:', error);
      showToast(error instanceof Error ? error.message : 'AI 菜谱生成失败，请稍后重试', 'error');
    } finally {
      setAiLoading(null);
    }
  };

  const adoptAiRecipeDraft = () => {
    if (!aiRecipeDraft) return;
    setRecipeFormMode('create');
    setEditingRecipe(null);
    setRecipeForm({
      title: aiRecipeDraft.title,
      category: RECIPE_CATEGORIES.includes(aiRecipeDraft.category) ? aiRecipeDraft.category : RECIPE_CATEGORIES[0],
      summary: aiRecipeDraft.summary,
      difficulty: DIFFICULTY_OPTIONS.includes(aiRecipeDraft.difficulty) ? aiRecipeDraft.difficulty : DIFFICULTY_OPTIONS[0],
      cookTime: String(aiRecipeDraft.cookTime || 30),
      servings: String(aiRecipeDraft.servings || 2),
      ingredients: aiRecipeDraft.ingredients.length > 0 ? aiRecipeDraft.ingredients : [blankIngredient()],
      steps: aiRecipeDraft.steps.length > 0 ? aiRecipeDraft.steps : [''],
      imageUrl: aiRecipeDraft.imageUrl || '',
    });
    setShowRecipeForm(true);
    setAiPanelOpen(false);
    showToast('AI 菜谱已填入表单，可以继续编辑后保存', 'success');
  };

  const openRecipeManager = (recipe: KitchenRecipe) => {
    const copy = recipe.isPreset;
    setRecipeFormMode(copy ? 'copy' : 'edit');
    setEditingRecipe(recipe);
    setRecipeForm(recipeToForm(recipe, copy));
    setShowRecipeForm(true);
  };

  const closeRecipeForm = () => {
    setShowRecipeForm(false);
    setEditingRecipe(null);
    setRecipeFormMode('create');
    setRecipeForm(createBlankRecipeForm());
  };

  const closeRecipeFormModal = useModalHistory('kitchen-recipe-form', showRecipeForm, closeRecipeForm);
  const closeCheckinFormModal = useModalHistory('kitchen-checkin-form', showCheckinForm, () => setShowCheckinForm(false));
  const closeDetailRecipeModal = useModalHistory('kitchen-recipe-detail', Boolean(detailRecipe), () => setDetailRecipeId(null));
  const closeAiPanel = useModalHistory('kitchen-ai', aiPanelOpen, () => setAiPanelOpen(false));

  const cleanRecipePayload = () => ({
    title: recipeForm.title.trim(),
    category: recipeForm.category,
    summary: recipeForm.summary.trim(),
    difficulty: recipeForm.difficulty,
    cookTime: Number(recipeForm.cookTime) || undefined,
    servings: Number(recipeForm.servings) || undefined,
    imageUrl: recipeForm.imageUrl,
    ingredients: recipeForm.ingredients
      .map((item) => ({
        name: item.name.trim(),
        amount: item.amount,
        unit: item.unit?.trim() || '',
        note: item.note?.trim() || '',
      }))
      .filter((item) => item.name),
    steps: recipeForm.steps.map((step) => step.trim()).filter(Boolean),
  });

  const submitRecipe = async () => {
    if (!recipeForm.title.trim() || busy) return;
    setBusy(true);
    try {
      const payload = cleanRecipePayload();
      if (recipeFormMode === 'edit' && editingRecipe && !editingRecipe.isPreset) {
        await onUpdateRecipe(editingRecipe.id, payload);
        showToast('菜谱已更新', 'success');
      } else {
        await onCreateRecipe(payload);
        showToast(recipeFormMode === 'copy' ? '已保存为我的菜谱' : '菜谱已保存', 'success');
      }
      closeRecipeForm();
    } finally {
      setBusy(false);
    }
  };

  const submitCheckin = async () => {
    const title = (checkinRecipe?.title || checkinForm.title).trim();
    if (!title || busy) return;
    setBusy(true);
    try {
      await onCreateCheckin({
        date: checkinForm.date,
        recipeId: checkinRecipe?.id,
        title,
        note: checkinForm.note.trim(),
        rating: checkinForm.rating,
        imageUrl: checkinForm.imageUrl,
      });
      setShowCheckinForm(false);
      setCheckinRecipe(null);
      setCheckinForm({ date: today(), title: '', note: '', rating: 5, imageUrl: '' });
    } finally {
      setBusy(false);
    }
  };

  const generateShoppingList = async () => {
    if (selectedRecipeIds.length === 0 || busy) return;
    setBusy(true);
    try {
      await onGenerateShoppingList(shoppingDate, selectedRecipeIds);
      setActiveTab('shopping');
    } finally {
      setBusy(false);
    }
  };

  const openCheckin = (recipe?: KitchenRecipe) => {
    setCheckinRecipe(recipe || null);
    setCheckinForm((prev) => ({ ...prev, title: recipe?.title || '' }));
    setShowCheckinForm(true);
  };

  const setRecipeActionPending = (recipeId: string, action: RecipeAction, pending: boolean) => {
    const key = `${recipeId}:${action}`;
    setPendingRecipeActions((prev) => {
      if (pending) return { ...prev, [key]: true };
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const isRecipeActionPending = (recipeId: string, action: RecipeAction) => Boolean(pendingRecipeActions[`${recipeId}:${action}`]);

  const handleAddOrderItem = async (recipe: KitchenRecipe) => {
    if (isRecipeActionPending(recipe.id, 'ticket')) return;
    setRecipeActionPending(recipe.id, 'ticket', true);
    try {
      await onAddOrderItem(recipeToTicketDish(recipe));
      showToast('已加入今日小票', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '加入小票失败，请稍后重试', 'error');
    } finally {
      setRecipeActionPending(recipe.id, 'ticket', false);
    }
  };

  const handleBuyIngredients = (recipe: KitchenRecipe) => {
    const alreadySelected = selectedRecipeIds.includes(recipe.id);
    setSelectedRecipeIds((prev) => prev.includes(recipe.id) ? prev : [...prev, recipe.id]);
    setActiveTab('shopping');
    showToast(alreadySelected ? `「${recipe.title}」已在买菜清单候选中` : `已选中「${recipe.title}」，可以生成买菜清单`, 'success');
  };

  const removeSelectedRecipe = (recipe: KitchenRecipe) => {
    setSelectedRecipeIds((prev) => prev.filter((id) => id !== recipe.id));
    showToast(`已移除「${recipe.title}」`, 'success');
    if (hasShoppingList) showToast('重新生成后会按新的菜谱更新清单', 'info');
  };

  const deleteShoppingItem = async (item: KitchenShoppingListItem) => {
    if (deletingShoppingItemIds[item.id]) return;
    const isConfirmed = await confirm({
      title: '确认删除清单项',
      message: `你确定要将食材 "${item.name}" 从买菜清单中删除吗？`,
      confirmText: '删除',
      cancelText: '取消',
      type: 'warning'
    });
    if (!isConfirmed) return;

    setDeletingShoppingItemIds((prev) => ({ ...prev, [item.id]: true }));
    try {
      await onDeleteShoppingItem(item.id);
      showToast('已从买菜清单删除', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '删除食材失败，请稍后重试', 'error');
    } finally {
      setDeletingShoppingItemIds((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
    }
  };

  const handleDeleteRecipe = async (id: string) => {
    const isConfirmed = await confirm({
      title: '确认删除菜谱',
      message: '你确定要永久删除这道菜谱吗？此操作无法撤销。',
      confirmText: '确认删除',
      cancelText: '取消',
      type: 'danger'
    });
    if (!isConfirmed) return;
    try {
      await onDeleteRecipe(id);
      showToast('菜谱已删除', 'success');
      setDetailRecipeId(null);
    } catch (error) {
      console.error('Delete recipe failed:', error);
      showToast(error instanceof Error ? error.message : '删除菜谱失败', 'error');
    }
  };

  const handleDeleteCheckin = async (id: string) => {
    const isConfirmed = await confirm({
      title: '确认删除打卡记录',
      message: '你确定要删除这条做菜打卡记录吗？此操作无法撤销。',
      confirmText: '确认删除',
      cancelText: '取消',
      type: 'danger'
    });
    if (!isConfirmed) return;
    try {
      await onDeleteCheckin(id);
      showToast('打卡记录已删除', 'success');
    } catch (error) {
      console.error('Delete checkin failed:', error);
      showToast(error instanceof Error ? error.message : '删除打卡记录失败', 'error');
    }
  };

  const handleDeleteOrderItem = async (id: string) => {
    const isConfirmed = await confirm({
      title: '确认移除菜品',
      message: '确定要从今日小票中移除这道菜品吗？',
      confirmText: '确认移除',
      cancelText: '取消',
      type: 'warning'
    });
    if (!isConfirmed) return;
    try {
      await onDeleteOrderItem(id);
      showToast('已从今日小票移除', 'success');
    } catch (error) {
      console.error('Delete order item failed:', error);
      showToast(error instanceof Error ? error.message : '移除失败，请稍后重试', 'error');
    }
  };

  const handleDecrementOrderItem = async (item: MealOrderItem) => {
    if (item.quantity <= 1) {
      await handleDeleteOrderItem(item.id);
    } else {
      try {
        await onUpdateOrderItem(item.id, { quantity: item.quantity - 1 });
      } catch (error) {
        console.error('Decrement order item failed:', error);
        showToast(error instanceof Error ? error.message : '更新数量失败，请稍后重试', 'error');
      }
    }
  };

  const updateIngredient = (index: number, patch: Partial<KitchenIngredient>) => {
    setRecipeForm((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
    }));
  };

  const addIngredient = () => {
    setRecipeForm((prev) => ({ ...prev, ingredients: [...prev.ingredients, blankIngredient()] }));
  };

  const removeIngredient = (index: number) => {
    setRecipeForm((prev) => ({
      ...prev,
      ingredients: prev.ingredients.length > 1 ? prev.ingredients.filter((_, itemIndex) => itemIndex !== index) : [blankIngredient()],
    }));
  };

  const updateStep = (index: number, value: string) => {
    setRecipeForm((prev) => ({
      ...prev,
      steps: prev.steps.map((step, stepIndex) => stepIndex === index ? value : step),
    }));
  };

  const addStep = () => {
    setRecipeForm((prev) => ({ ...prev, steps: [...prev.steps, ''] }));
  };

  const removeStep = (index: number) => {
    setRecipeForm((prev) => ({
      ...prev,
      steps: prev.steps.length > 1 ? prev.steps.filter((_, stepIndex) => stepIndex !== index) : [''],
    }));
  };

  const renderShoppingItem = (item: KitchenShoppingListItem, purchased = false) => (
    <div
      key={item.id}
      className={`flex w-full items-center gap-3 rounded-3xl p-3 text-left shadow-sm ring-1 ring-white/80 transition-all active:scale-[0.99] ${
        purchased ? 'bg-white/55 text-gray-400' : 'bg-white/90 text-gray-900'
      }`}
    >
      <button
        type="button"
        onClick={() => onToggleShoppingItem(item.id, !item.checked)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left transition-all active:scale-[0.99]"
      >
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${purchased ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-400'}`}>
          <Check size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block text-sm font-black ${purchased ? 'text-gray-300 line-through' : 'text-gray-900'}`}>{item.name}</span>
          <span className="mt-0.5 block text-[10px] font-bold text-gray-400">
            {[item.quantity ? `${item.quantity}${item.unit || ''}` : '', item.note || ''].filter(Boolean).join(' · ') || '按需购买'}
          </span>
        </span>
        {!purchased && <span className="rounded-full bg-gray-100 px-2 py-1 text-[9px] font-black text-gray-400">待买</span>}
      </button>
      <button
        type="button"
        onClick={() => void deleteShoppingItem(item)}
        disabled={deletingShoppingItemIds[item.id]}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-300 transition-all active:scale-95 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={`删除${item.name}`}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[#FFF8F2]">
      <header className={`${activeTab === 'recipes' ? 'shrink-0 lg:sticky lg:top-0 lg:z-30' : 'sticky top-0 z-30 shrink-0'} border-b border-white/70 bg-[linear-gradient(135deg,#fff7ed_0%,#fff1f2_48%,#effdf5_100%)] px-4 pb-3 pt-6 shadow-sm`}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black tracking-tight text-gray-900">情侣厨房</h1>
            <div className="inline-flex items-center gap-1 rounded-full bg-white/75 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-rose-500 shadow-sm ring-1 ring-white/80">
              <ChefHat size={12} /> Kitchen
            </div>
          </div>
          <button
            onClick={openCreateRecipeForm}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-900 text-white shadow-sm transition-transform active:scale-95"
            aria-label="新增菜谱"
          >
            <Plus size={18} />
          </button>
        </div>

        {/* iOS-style Segment Control for Tabs */}
        <div className="mb-3 flex rounded-2xl bg-rose-950/[0.04] p-1 backdrop-blur-md border border-black/[0.03]">
          {KITCHEN_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as KitchenTab)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-black transition-all duration-200 active:scale-[0.97]",
                  active 
                    ? "bg-white text-rose-600 shadow-[0_2px_8px_rgba(244,63,94,0.08)] ring-1 ring-rose-500/5 font-extrabold" 
                    : "text-gray-500 hover:text-gray-900"
                )}
              >
                <Icon size={14} className={active ? "text-rose-500" : "text-gray-400"} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {activeTab === 'recipes' && (
          <>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-rose-300" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜索菜谱或分类"
                  className="w-full rounded-xl border border-white/80 bg-white/85 py-2 pl-9 pr-3 text-xs font-bold text-gray-700 shadow-sm outline-none placeholder:text-gray-300 focus:ring-2 focus:ring-rose-100"
                />
              </div>
              <button
                type="button"
                onClick={() => aiPanelOpen ? closeAiPanel() : setAiPanelOpen(true)}
                className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-xl shadow-sm transition-colors ${aiPanelOpen ? 'bg-rose-500 text-white' : 'bg-white text-rose-500 border border-rose-100'}`}
                aria-label="AI菜谱"
              >
                <Sparkles size={16} />
              </button>
              <button
                type="button"
                onClick={generateShoppingList}
                disabled={selectedRecipeIds.length === 0 || busy}
                className="flex h-[34px] shrink-0 items-center justify-center gap-1.5 rounded-xl bg-gray-900 px-3 text-[10px] font-black text-white shadow-sm disabled:opacity-40"
              >
                <ListChecks size={14} />
                {busy ? '生成中' : selectedRecipeIds.length > 0 ? `买菜 (${selectedRecipeIds.length})` : '生成买菜'}
              </button>
            </div>
            
            {/* Horizontal Category Strip */}
            <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {categories.map((category) => {
                const active = activeCategory === category;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveCategory(category)}
                    className={cn(
                      "shrink-0 rounded-full px-3.5 py-1 text-[11px] font-black transition-all duration-200 active:scale-95",
                      active
                        ? "bg-gray-900 text-white shadow-sm shadow-black/10"
                        : "bg-white/80 border border-rose-100/50 text-gray-500 hover:text-gray-950"
                    )}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </header>

      {activeTab === 'recipes' && (
        <main className="min-w-0 flex-1 overflow-y-auto px-4 pb-36 pt-4 scrollbar-hide lg:pb-24">


          {isLoading && recipes.length === 0 && (
            <div className="flex h-60 flex-col items-center justify-center rounded-[28px] bg-white/80 text-gray-400 shadow-sm ring-1 ring-white/80">
              <div className="mb-3 h-12 w-12 animate-pulse rounded-2xl bg-rose-100" />
              <p className="text-xs font-black uppercase tracking-widest">正在加载厨房...</p>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pb-32">
            {filteredRecipes.map((recipe) => {
              const isSelected = selectedRecipeIds.includes(recipe.id);
              return (
                <motion.article
                  key={recipe.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "group relative flex flex-col cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] overflow-hidden border",
                    isSelected
                      ? "rounded-[24px] bg-rose-50/50 border-rose-300 shadow-md shadow-rose-100/30 scale-[1.02]"
                      : "rounded-[24px] bg-white/95 border-white/80 shadow-sm hover:shadow-md hover:scale-[1.02] hover:bg-white"
                  )}
                  onClick={() => setDetailRecipeId(recipe.id)}
                >
                  {/* Image container stretches edge-to-edge */}
                  <div className="relative h-28 sm:h-36 lg:h-40 w-full overflow-hidden bg-rose-50/40 shrink-0">
                    {recipe.imageUrl ? (
                      <AppImage
                        src={recipe.imageUrl}
                        alt={recipe.title}
                        className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-105"
                        width={720}
                        height={480}
                        crop="cover"
                        sizes="(min-width: 1024px) 33vw, 100vw"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-rose-50/40 via-white to-amber-50/40 text-center">
                        <ChefHat size={22} className="text-rose-200" />
                        <span className="text-[10px] font-black text-gray-400 mt-1">暂无图片</span>
                      </div>
                    )}
                    
                    {/* Shadow overlay */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.3)_0%,rgba(0,0,0,0)_60%)] pointer-events-none" />
                    
                    {/* Select indicator checkbox at top-left */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectedRecipe(recipe.id);
                      }}
                      className={cn(
                        "absolute left-3 top-3 flex h-6 w-6 items-center justify-center rounded-full transition-all duration-300 active:scale-90 z-10",
                        isSelected 
                          ? "bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-200/50 scale-105" 
                          : "bg-black/25 text-white/90 border border-white/30 backdrop-blur-[2px] hover:bg-black/35 hover:border-white/50"
                      )}
                      aria-label="选择生成买菜"
                    >
                      <Check size={10} strokeWidth={4} />
                    </button>
                    
                    {/* Category label badge on image */}
                    <div className="absolute bottom-3 left-3 pointer-events-none">
                      <span className="rounded-full bg-white/25 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white backdrop-blur-[4px] border border-white/10">
                        {recipe.category || '家常'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Card Content Core */}
                  <div className="p-3.5 flex flex-col flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <h2 className="text-sm sm:text-base font-black leading-tight text-gray-900 truncate group-hover:text-rose-500 transition-colors flex-1">
                        {recipe.title}
                      </h2>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void onToggleFavorite(recipe);
                        }}
                        className={cn(
                          "shrink-0 flex h-7 w-7 items-center justify-center rounded-full transition-all duration-300 active:scale-90 hover:bg-rose-50/50",
                          recipe.isFavorite ? "text-rose-500" : "text-gray-300 hover:text-rose-500"
                        )}
                        aria-label="收藏菜谱"
                      >
                        <Heart size={13} className={recipe.isFavorite ? 'fill-current' : ''} />
                      </button>
                    </div>
                    
                    {/* Metadata & Quick Actions Row */}
                    <div className="mt-3.5 flex items-center justify-between gap-2">
                      <span className="text-[11px] sm:text-xs font-bold text-gray-400 truncate">
                        {recipe.cookTime || 20}分钟 · {recipe.difficulty || '简单'}
                      </span>
                      
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleAddOrderItem(recipe);
                        }}
                        disabled={isRecipeActionPending(recipe.id, 'ticket')}
                        className="shrink-0 flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-[11px] sm:text-xs font-black px-3.5 py-1.5 shadow-md shadow-rose-200/50 hover:shadow-lg hover:shadow-rose-300/35 transition-all duration-300 active:scale-95 disabled:opacity-40"
                      >
                        {isRecipeActionPending(recipe.id, 'ticket') ? '...' : '+ 小票'}
                      </button>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </main>
      )}

      {activeTab === 'shopping' && (
        <main className="flex-1 overflow-y-auto px-5 pb-28 pt-4 scrollbar-hide">
          <section className="overflow-hidden rounded-[30px] bg-gray-900 text-white shadow-xl shadow-rose-100/50">
            <div className="bg-[linear-gradient(135deg,rgba(244,63,94,0.22),rgba(16,185,129,0.18))] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-white/70">
                    <ShoppingBasket size={12} /> 今日采购
                  </div>
                  <h2 className="mt-3 text-2xl font-black tracking-tight">{shoppingProgress}%</h2>
                  <p className="mt-1 text-[11px] font-bold text-white/55">{shoppingItems.length} 项 · 已买 {checkedShoppingCount} 项 · 待买 {pendingShoppingItems.length} 项</p>
                </div>
                <label className="rounded-2xl bg-white/10 px-3 py-2 text-[10px] font-black text-white/80">
                  <span className="mb-1 flex items-center gap-1 text-white/45">
                    <CalendarDays size={12} /> 日期
                  </span>
                  <input
                    type="date"
                    value={shoppingDate}
                    onChange={(event) => setShoppingDate(event.target.value)}
                    onBlur={(event) => void onLoadShoppingList(event.target.value)}
                    className="max-w-[118px] bg-transparent text-xs font-black text-white outline-none"
                  />
                </label>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/12">
                <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${shoppingProgress}%` }} />
              </div>
            </div>
          </section>

          <section className="mt-4 rounded-[28px] bg-white/85 p-4 shadow-sm ring-1 ring-white/80">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-gray-900">已选菜谱</h3>
                <p className="mt-1 text-[10px] font-bold text-gray-400">{hasSelectedRecipes ? '用这些菜谱生成今天要买的食材' : '先去菜谱选择今晚想做的菜'}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('recipes')}
                className="shrink-0 rounded-2xl bg-rose-50 px-3 py-2 text-[10px] font-black text-rose-500 transition-all active:scale-[0.97]"
              >
                去选菜谱
              </button>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {hasSelectedRecipes ? (
                selectedRecipes.map((recipe) => (
                  <span key={recipe.id} className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 py-1.5 pl-3 pr-1.5 text-[10px] font-black text-emerald-600">
                    {recipe.title}
                    <button
                      type="button"
                      onClick={() => removeSelectedRecipe(recipe)}
                      className="flex h-5 w-5 items-center justify-center rounded-full bg-white/80 text-emerald-400 transition-all active:scale-90 hover:text-red-400"
                      aria-label={`移除${recipe.title}`}
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))
              ) : (
                <span className="rounded-full bg-gray-100 px-3 py-1.5 text-[10px] font-black text-gray-400">还没选菜谱</span>
              )}
            </div>
            <button
              type="button"
              onClick={generateShoppingList}
              disabled={!hasSelectedRecipes || busy}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 py-3 text-xs font-black text-white shadow-lg shadow-rose-100 transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            >
              <ListChecks size={15} />
              {busy ? '生成中...' : hasShoppingList ? '重新生成清单' : '生成买菜清单'}
            </button>
          </section>

          {shoppingItems.length === 0 ? (
            <section className="mt-4 flex h-64 flex-col items-center justify-center rounded-[28px] border border-dashed border-rose-100 bg-white/70 px-6 text-center">
              <ShoppingBasket size={34} className="mb-3 text-rose-200" />
              {!hasSelectedRecipes ? (
                <>
                  <p className="text-sm font-black text-gray-700">先选今晚要做的菜</p>
                  <p className="mt-1 text-[10px] font-bold leading-relaxed text-gray-400">选好菜谱后，这里会帮你把食材合并成一份采购清单。</p>
                  <button type="button" onClick={() => setActiveTab('recipes')} className="mt-4 rounded-2xl bg-gray-900 px-5 py-2.5 text-[10px] font-black text-white transition-all active:scale-[0.97]">去选菜谱</button>
                </>
              ) : hasShoppingList ? (
                <>
                  <p className="text-sm font-black text-gray-700">这份清单还没有食材</p>
                  <p className="mt-1 text-[10px] font-bold leading-relaxed text-gray-400">已选菜谱可能还没补食材，回到菜谱里完善后再生成。</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-black text-gray-700">菜谱选好了</p>
                  <p className="mt-1 text-[10px] font-bold leading-relaxed text-gray-400">点击上方按钮，生成今天一起去买的食材。</p>
                </>
              )}
            </section>
          ) : (
            <section className="mt-4 space-y-4">
              {pendingShoppingItems.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center justify-between px-1">
                    <h3 className="text-xs font-black text-gray-900">待购买</h3>
                    <span className="text-[10px] font-black text-rose-400">{pendingShoppingItems.length} 项</span>
                  </div>
                  <div className="space-y-2">
                    {pendingShoppingItems.map((item) => renderShoppingItem(item))}
                  </div>
                </div>
              )}

              {purchasedShoppingItems.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center justify-between px-1">
                    <h3 className="text-xs font-black text-gray-400">已买好</h3>
                    <span className="text-[10px] font-black text-emerald-500">{purchasedShoppingItems.length} 项</span>
                  </div>
                  <div className="space-y-2">
                    {purchasedShoppingItems.map((item) => renderShoppingItem(item, true))}
                  </div>
                </div>
              )}
            </section>
          )}
        </main>
      )}

      {activeTab === 'checkins' && (
        <main className="flex-1 overflow-y-auto px-5 pb-28 pt-4 scrollbar-hide">
          <button onClick={() => openCheckin()} className="mb-4 flex w-full items-center justify-between rounded-[28px] bg-gray-900 p-4 text-left text-white shadow-lg shadow-rose-100">
            <span>
              <span className="block text-sm font-black">记录一次做饭打卡</span>
              <span className="mt-1 block text-[10px] font-bold text-white/50">拍照、评分、留下今天的味道</span>
            </span>
            <Camera size={22} />
          </button>
          <div className="space-y-3">
            {checkins.length === 0 ? (
              <div className="flex h-56 flex-col items-center justify-center rounded-[28px] border border-dashed border-rose-100 bg-white/70 text-center">
                <Star size={32} className="mb-3 text-rose-200" />
                <p className="text-sm font-black text-gray-600">还没有厨房打卡</p>
              </div>
            ) : (
              checkins.map((checkin) => (
                <article key={checkin.id} className="overflow-hidden rounded-[28px] bg-white/85 shadow-sm ring-1 ring-white/80">
                  {checkin.imageUrl && <AppImage src={checkin.imageUrl} alt={checkin.title} className="h-40 w-full object-cover" width={720} height={320} crop="cover" sizes="100vw" />}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-rose-400">{checkin.date} · {checkin.user?.username || '我们'}</p>
                        <h2 className="mt-1 text-base font-black text-gray-900">{checkin.title}</h2>
                      </div>
                      <button onClick={() => handleDeleteCheckin(checkin.id)} className="rounded-2xl bg-red-50 p-2 text-red-300">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    {checkin.note && <p className="mt-2 text-xs font-bold leading-relaxed text-gray-500">{checkin.note}</p>}
                    {checkin.rating && <p className="mt-3 text-[10px] font-black text-amber-500">{'★'.repeat(checkin.rating)}</p>}
                  </div>
                </article>
              ))
            )}
          </div>
        </main>
      )}

      {activeTab === 'ticket' && (
        <main className="flex-1 overflow-y-auto px-5 pb-28 pt-4 scrollbar-hide">
          <section className="rounded-[28px] bg-white/85 p-4 shadow-sm ring-1 ring-white/80">
            <h2 className="text-lg font-black text-gray-900">今日小票</h2>
            <p className="mt-1 text-[10px] font-bold text-gray-400">{order?.date || today()} · 共 {totalQuantity} 份</p>
          </section>
          <div className="mt-4 space-y-3">
            {orderItems.length === 0 ? (
              <div className="flex h-56 flex-col items-center justify-center rounded-[28px] border border-dashed border-rose-100 bg-white/70 text-center">
                <ReceiptText size={32} className="mb-3 text-rose-200" />
                <p className="text-sm font-black text-gray-600">今日小票还是空的</p>
                <p className="mt-1 text-[10px] font-bold text-gray-300">从菜谱卡片加入一道菜吧</p>
              </div>
            ) : (
              orderItems.map((item) => (
                <TicketItem
                  key={item.id}
                  item={item}
                  onIncrement={() => onUpdateOrderItem(item.id, { quantity: item.quantity + 1 })}
                  onDecrement={() => handleDecrementOrderItem(item)}
                  onDelete={() => handleDeleteOrderItem(item.id)}
                />
              ))
            )}
          </div>
        </main>
      )}

      <AnimatePresence>
        {showRecipeForm && (
          <Modal onClose={closeRecipeFormModal}>
            <h2 className="text-xl font-black text-gray-900">
              {recipeFormMode === 'edit' ? '编辑菜谱' : recipeFormMode === 'copy' ? '复制为我的菜谱' : '新增菜谱'}
            </h2>
            <p className="mt-1 text-xs font-bold text-gray-400">
              {recipeFormMode === 'copy' ? '预设菜谱不会被修改，会保存成你们自己的版本。' : '把食材和步骤整理清楚，买菜清单会更准。'}
            </p>
            <div className="mt-5 space-y-4">
              <ImageUpload imageUrl={recipeForm.imageUrl} uploading={imageUploading} onChange={(event) => uploadImage(event, 'recipe')} />
              <section className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-rose-400">基础信息</p>
                <input value={recipeForm.title} onChange={(event) => setRecipeForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="菜谱名" className="field" />
                <div className="grid grid-cols-2 gap-2">
                  <select value={recipeForm.category} onChange={(event) => setRecipeForm((prev) => ({ ...prev, category: event.target.value }))} className="field">
                    {RECIPE_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
                  </select>
                  <select value={recipeForm.difficulty} onChange={(event) => setRecipeForm((prev) => ({ ...prev, difficulty: event.target.value }))} className="field">
                    {DIFFICULTY_OPTIONS.map((difficulty) => <option key={difficulty}>{difficulty}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" min="1" value={recipeForm.cookTime} onChange={(event) => setRecipeForm((prev) => ({ ...prev, cookTime: event.target.value }))} placeholder="耗时分钟" className="field" />
                  <input type="number" min="1" value={recipeForm.servings} onChange={(event) => setRecipeForm((prev) => ({ ...prev, servings: event.target.value }))} placeholder="几人份" className="field" />
                </div>
                <textarea value={recipeForm.summary} onChange={(event) => setRecipeForm((prev) => ({ ...prev, summary: event.target.value }))} placeholder="一句话介绍" rows={2} className="field resize-none" />
              </section>

              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-widest text-rose-400">食材</p>
                  <button type="button" onClick={addIngredient} className="rounded-full bg-rose-50 px-3 py-1 text-[10px] font-black text-rose-500">添加</button>
                </div>
                <div className="space-y-2">
                  {recipeForm.ingredients.map((ingredient, index) => (
                    <div key={index} className="rounded-3xl bg-white/70 p-3 shadow-sm ring-1 ring-white/80">
                      <div className="grid grid-cols-[1fr_72px_64px_36px] gap-2">
                        <input value={ingredient.name} onChange={(event) => updateIngredient(index, { name: event.target.value })} placeholder="食材" className="field min-w-0" />
                        <input type="number" min="0" value={ingredient.amount ?? ''} onChange={(event) => updateIngredient(index, { amount: event.target.value ? Number(event.target.value) : undefined })} placeholder="数量" className="field min-w-0" />
                        <input value={ingredient.unit || ''} onChange={(event) => updateIngredient(index, { unit: event.target.value })} placeholder="单位" className="field min-w-0" />
                        <button type="button" onClick={() => removeIngredient(index)} className="flex h-11 items-center justify-center rounded-2xl bg-red-50 text-red-300 transition-all active:scale-95">
                          <X size={15} />
                        </button>
                      </div>
                      <input value={ingredient.note || ''} onChange={(event) => updateIngredient(index, { note: event.target.value })} placeholder="备注，可不填" className="field mt-2" />
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-widest text-rose-400">步骤</p>
                  <button type="button" onClick={addStep} className="rounded-full bg-rose-50 px-3 py-1 text-[10px] font-black text-rose-500">添加</button>
                </div>
                <div className="space-y-2">
                  {recipeForm.steps.map((step, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <span className="mt-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-900 text-[10px] font-black text-white">{index + 1}</span>
                      <textarea value={step} onChange={(event) => updateStep(index, event.target.value)} placeholder="写下这一步怎么做" rows={2} className="field min-w-0 flex-1 resize-none" />
                      <button type="button" onClick={() => removeStep(index)} className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-300 transition-all active:scale-95">
                        <X size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <button onClick={submitRecipe} disabled={!recipeForm.title.trim() || busy} className="w-full rounded-2xl bg-rose-500 py-4 text-sm font-black text-white shadow-lg shadow-rose-100 transition-all active:scale-[0.99] disabled:opacity-40 disabled:shadow-none">
                {busy ? '保存中...' : recipeFormMode === 'edit' ? '更新菜谱' : recipeFormMode === 'copy' ? '保存为我的菜谱' : '保存菜谱'}
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCheckinForm && (
          <Modal onClose={closeCheckinFormModal}>
            <h2 className="text-xl font-black text-gray-900">做饭打卡</h2>
            <div className="mt-5 space-y-3">
              <ImageUpload imageUrl={checkinForm.imageUrl} uploading={imageUploading} onChange={(event) => uploadImage(event, 'checkin')} />
              <input type="date" value={checkinForm.date} onChange={(event) => setCheckinForm((prev) => ({ ...prev, date: event.target.value }))} className="field" />
              <input value={checkinRecipe?.title || checkinForm.title} onChange={(event) => setCheckinForm((prev) => ({ ...prev, title: event.target.value }))} disabled={Boolean(checkinRecipe)} placeholder="今天做了什么" className="field disabled:text-gray-400" />
              <textarea value={checkinForm.note} onChange={(event) => setCheckinForm((prev) => ({ ...prev, note: event.target.value }))} placeholder="味道如何？谁掌勺？" rows={3} className="field resize-none" />
              <div className="flex justify-center gap-1 rounded-2xl bg-white/80 p-3">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button key={rating} onClick={() => setCheckinForm((prev) => ({ ...prev, rating }))} className={rating <= checkinForm.rating ? 'text-amber-400' : 'text-gray-200'}>
                    <Star size={28} className="fill-current" />
                  </button>
                ))}
              </div>
              <button onClick={submitCheckin} disabled={busy} className="w-full rounded-2xl bg-rose-500 py-4 text-sm font-black text-white disabled:opacity-40">保存打卡</button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Recipe Detail Modal */}
      <AnimatePresence>
        {detailRecipe && (
          <Modal onClose={closeDetailRecipeModal}>
            <div className="relative -mx-7 -mt-7 mb-5 h-48 bg-rose-50 overflow-hidden rounded-t-[32px]">
              {detailRecipe.imageUrl ? (
                <AppImage src={detailRecipe.imageUrl} alt={detailRecipe.title} className="h-full w-full object-cover" width={960} height={640} crop="cover" sizes="(min-width: 640px) 480px, 100vw" referrerPolicy="no-referrer" />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-rose-50 via-white to-amber-50 text-center">
                  <ChefHat size={36} className="text-rose-200" />
                  <span className="text-xs font-black text-gray-400 mt-1">暂无图片</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
              
              {/* Floating buttons in detail modal */}
              <button
                type="button"
                onClick={() => void onToggleFavorite(detailRecipe)}
                className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/85 text-rose-500 shadow-md backdrop-blur-sm transition-transform active:scale-95"
                aria-label="收藏菜谱"
              >
                <Heart size={18} className={detailRecipe.isFavorite ? 'fill-current' : ''} />
              </button>
              
              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <span className="inline-block rounded-full bg-white/25 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white backdrop-blur-md">
                  {detailRecipe.category || '家常'}
                </span>
                <h1 className="mt-1.5 text-lg font-black leading-tight">{detailRecipe.title}</h1>
              </div>
            </div>

            <div className="space-y-4">
              {/* Meta information row */}
              <div className="flex gap-2">
                <span className="flex-1 rounded-2xl bg-rose-50/60 p-2 text-center shadow-sm">
                  <span className="block text-[9px] font-bold text-gray-400">准备时间</span>
                  <span className="mt-0.5 block text-xs font-black text-rose-600">{detailRecipe.cookTime || 20} 分钟</span>
                </span>
                <span className="flex-1 rounded-2xl bg-emerald-50/60 p-2 text-center shadow-sm">
                  <span className="block text-[9px] font-bold text-gray-400">分量</span>
                  <span className="mt-0.5 block text-xs font-black text-emerald-600">{detailRecipe.servings || 2} 人份</span>
                </span>
                <span className="flex-1 rounded-2xl bg-amber-50/60 p-2 text-center shadow-sm">
                  <span className="block text-[9px] font-bold text-gray-400">难度</span>
                  <span className="mt-0.5 block text-xs font-black text-amber-600">{detailRecipe.difficulty || '简单'}</span>
                </span>
              </div>

              {/* Summary */}
              {detailRecipe.summary && (
                <div className="rounded-2xl bg-white/50 p-3 ring-1 ring-white/60 shadow-sm">
                  <p className="text-xs font-medium leading-relaxed text-gray-600">{detailRecipe.summary}</p>
                </div>
              )}

              {/* Ingredients List */}
              <div>
                <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-rose-500">所需食材</h3>
                {detailRecipe.ingredients && detailRecipe.ingredients.length > 0 ? (
                  <div className="divide-y divide-gray-100 rounded-3xl bg-white p-3 ring-1 ring-white/70 shadow-sm max-h-48 overflow-y-auto">
                    {detailRecipe.ingredients.map((item, index) => (
                      <div key={index} className="flex justify-between py-1.5 text-xs first:pt-0 last:pb-0">
                        <span className="font-bold text-gray-700">{item.name}</span>
                        <span className="font-black text-rose-500">
                          {item.amount || ''} {item.unit || ''}
                          {item.note && <span className="ml-1 text-[10px] font-bold text-gray-400">({item.note})</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs font-bold text-gray-400 italic">这道菜还没有添加食材。</p>
                )}
              </div>

              {/* Cooking Steps */}
              <div>
                <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-rose-500">烹饪步骤</h3>
                {detailRecipe.steps && detailRecipe.steps.length > 0 ? (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {detailRecipe.steps.map((step, index) => (
                      <div key={index} className="flex gap-2.5 rounded-2xl bg-white/60 p-3 ring-1 ring-white/80 shadow-sm">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-900 text-[10px] font-black text-white">
                          {index + 1}
                        </span>
                        <p className="text-xs font-bold leading-relaxed text-gray-600">{step}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs font-bold text-gray-400 italic">这道菜还没有添加步骤。</p>
                )}
              </div>

              {/* Detail actions footer */}
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    void handleAddOrderItem(detailRecipe);
                    setDetailRecipeId(null);
                  }}
                  disabled={isRecipeActionPending(detailRecipe.id, 'ticket')}
                  className="w-full flex min-h-11 items-center justify-center rounded-2xl bg-gray-900 text-xs font-black text-white shadow-md transition-all active:scale-[0.98]"
                >
                  {isRecipeActionPending(detailRecipe.id, 'ticket') ? '加入中...' : '加入今日小票'}
                </button>
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      openCheckin(detailRecipe);
                      setDetailRecipeId(null);
                    }}
                    className="min-h-10 rounded-2xl bg-rose-500 text-xs font-black text-white transition-all active:scale-[0.98]"
                  >
                    打卡
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      openRecipeManager(detailRecipe);
                      setDetailRecipeId(null);
                    }}
                    className="min-h-10 rounded-2xl bg-amber-500 text-xs font-black text-white transition-all active:scale-[0.98]"
                  >
                    {detailRecipe.isPreset ? '复制编辑' : '编辑'}
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleBuyIngredients(detailRecipe);
                      setDetailRecipeId(null);
                    }}
                    className="min-h-10 rounded-2xl bg-emerald-500 text-[11px] font-black text-white transition-all active:scale-[0.98]"
                  >
                    买菜
                  </button>
                  {detailRecipe.isPreset ? (
                    <button
                      type="button"
                      onClick={() => {
                        toggleSelectedRecipe(detailRecipe.id);
                        const selected = selectedRecipeIds.includes(detailRecipe.id);
                        showToast(selected ? '已取消选择' : '已选择用于买菜清单', 'info');
                      }}
                      className={cn(
                        "min-h-10 rounded-2xl text-[11px] font-black transition-all active:scale-[0.98]",
                        selectedRecipeIds.includes(detailRecipe.id)
                          ? "bg-rose-50 border border-rose-200 text-rose-500"
                          : "bg-white border border-gray-200 text-gray-600"
                      )}
                    >
                      {selectedRecipeIds.includes(detailRecipe.id) ? '取消选菜' : '选此菜买菜'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        void handleDeleteRecipe(detailRecipe.id);
                      }}
                      className="min-h-10 rounded-2xl bg-red-50 text-red-500 hover:bg-red-100 text-[11px] font-black transition-all active:scale-[0.98]"
                    >
                      删除菜谱
                    </button>
                  )}
                </div>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {aiPanelOpen && (
          <Modal onClose={closeAiPanel}>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500">AI Kitchen</span>
              <h2 className="text-xl font-black text-gray-900">AI 厨房灵感</h2>
              <p className="text-xs font-bold text-gray-400">用 AI 探索今晚吃什么，或一键生成详细菜谱草稿。</p>
            </div>

            {/* Segmented Control Tabs */}
            <div className="mt-4 flex rounded-2xl bg-rose-50/50 p-1 ring-1 ring-rose-100/30">
              <button
                type="button"
                onClick={() => setAiTab('recipe')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black transition-all",
                  aiTab === 'recipe'
                    ? "bg-white text-rose-600 shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                )}
              >
                <Sparkles size={13} className={aiTab === 'recipe' ? "text-rose-500" : "text-gray-400"} />
                AI 菜谱
              </button>
              <button
                type="button"
                onClick={() => setAiTab('ideas')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black transition-all",
                  aiTab === 'ideas'
                    ? "bg-white text-rose-600 shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                )}
              >
                <Utensils size={13} className={aiTab === 'ideas' ? "text-rose-500" : "text-gray-400"} />
                吃什么灵感
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {aiTab === 'recipe' ? (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-rose-400">菜谱要求</p>
                    <input
                      value={aiRecipeForm.idea}
                      onChange={(event) => setAiRecipeForm((prev) => ({ ...prev, idea: event.target.value }))}
                      placeholder="想吃什么？比如：可乐鸡翅 / 适合下饭的菜"
                      className="field"
                    />
                    <input
                      value={aiRecipeForm.preferences}
                      onChange={(event) => setAiRecipeForm((prev) => ({ ...prev, preferences: event.target.value }))}
                      placeholder="口味偏好？比如：少油微辣 / 偏甜"
                      className="field"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <input
                          value={aiRecipeForm.servings}
                          onChange={(event) => setAiRecipeForm((prev) => ({ ...prev, servings: event.target.value }))}
                          placeholder="几人份"
                          className="field pr-9"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400">人份</span>
                      </div>
                      <div className="relative">
                        <input
                          value={aiRecipeForm.cookTime}
                          onChange={(event) => setAiRecipeForm((prev) => ({ ...prev, cookTime: event.target.value }))}
                          placeholder="希望时间"
                          className="field pr-9"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400">分钟</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={generateAiRecipe}
                    disabled={aiLoading === 'recipe'}
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 text-xs font-black text-white shadow-md transition-all active:scale-[0.99] disabled:opacity-50"
                  >
                    {aiLoading === 'recipe' ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    ) : (
                      <Sparkles size={14} />
                    )}
                    生成菜谱草稿
                  </button>

                  {aiRecipeDraft && (
                    <div className="mt-4 rounded-3xl bg-rose-50/40 p-4 border border-rose-100/50">
                      {aiRecipeDraft.imageUrl ? (
                        <AppImage
                          src={aiRecipeDraft.imageUrl}
                          alt={aiRecipeDraft.title}
                          className="mb-3 h-32 w-full rounded-2xl object-cover shadow-sm"
                          width={640}
                          height={256}
                          crop="cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="mb-3 flex h-28 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-rose-100 bg-white/50 text-center">
                          <ChefHat size={20} className="mb-1 text-rose-300 animate-pulse" />
                          <p className="text-[10px] font-black text-gray-500">暂无配图，采用后可上传</p>
                        </div>
                      )}
                      
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-black text-gray-900">{aiRecipeDraft.title}</h3>
                          <p className="mt-1 text-[10px] font-black text-rose-500">
                            {aiRecipeDraft.category} · {aiRecipeDraft.difficulty} · {aiRecipeDraft.cookTime}分钟 · {aiRecipeDraft.servings}人份
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={adoptAiRecipeDraft}
                          className="shrink-0 flex items-center justify-center rounded-xl bg-rose-500 hover:bg-rose-600 active:scale-95 px-3 py-2 text-[10px] font-black text-white shadow-sm transition-all"
                        >
                          采用并编辑
                        </button>
                      </div>

                      <p className="mt-2 text-xs font-bold leading-relaxed text-gray-600">{aiRecipeDraft.summary}</p>
                      
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {aiRecipeDraft.ingredients.slice(0, 6).map((ingredient, idx) => (
                          <span key={idx} className="max-w-full truncate rounded-full bg-white px-2.5 py-1 text-[9px] font-bold text-rose-500 border border-rose-100/30">
                            {ingredient.name}{ingredient.amount ? ` ${ingredient.amount}${ingredient.unit || ''}` : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">灵感提问</p>
                    <textarea
                      value={aiKitchenPrompt}
                      onChange={(event) => setAiKitchenPrompt(event.target.value)}
                      rows={3}
                      placeholder="今天吃什么好呢？比如：今晚想吃清淡一点，20 分钟内搞定 / 适合夏天吃的开胃小菜"
                      className="w-full resize-none rounded-2xl border border-white/80 bg-white/80 px-3.5 py-3 text-xs font-bold text-gray-700 shadow-sm outline-none placeholder:text-gray-300 focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={generateKitchenIdeas}
                    disabled={aiLoading === 'ideas'}
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-xs font-black text-white shadow-md transition-all active:scale-[0.99] disabled:opacity-50"
                  >
                    {aiLoading === 'ideas' ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    ) : (
                      <Sparkles size={14} />
                    )}
                    生成吃什么建议
                  </button>

                  {aiKitchenResult && (
                    <div className="mt-4 rounded-3xl bg-emerald-50/30 p-4 border border-emerald-100/50">
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-2">AI 厨房建议</p>
                      <div className="whitespace-pre-wrap rounded-2xl bg-white p-3.5 text-xs font-bold leading-relaxed text-gray-600 shadow-sm border border-emerald-100/20 max-h-60 overflow-y-auto scrollbar-hide">
                        {aiKitchenResult}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

function TicketItem({ item, onIncrement, onDecrement, onDelete }: { key?: string; item: MealOrderItem; onIncrement: () => Promise<void> | void; onDecrement: () => Promise<void> | void; onDelete: () => Promise<void> | void }) {
  return (
    <article className="rounded-[26px] bg-white/85 p-3 shadow-sm ring-1 ring-white/80">
      <div className="flex gap-3">
        {item.imageUrl ? (
          <AppImage src={item.imageUrl} alt={item.dishName} className="h-16 w-16 shrink-0 rounded-2xl object-cover" width={128} height={128} crop="square" sizes="64px" />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-200">
            <ChefHat size={22} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-black text-gray-900">{item.dishName}</p>
              <p className="mt-0.5 text-[10px] font-bold text-rose-400">{item.category} · {item.user?.username || '我们'}</p>
            </div>
            <button onClick={onDelete} className="rounded-xl bg-red-50 p-2 text-red-300">
              <Trash2 size={14} />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button onClick={onDecrement} className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-50 text-rose-500">
              <Minus size={15} />
            </button>
            <span className="min-w-5 text-center text-sm font-black text-gray-800">{item.quantity}</span>
            <button onClick={onIncrement} className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-white">
              <Plus size={15} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function ImageUpload({ imageUrl, uploading, onChange }: { imageUrl?: string; uploading: boolean; onChange: (event: ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <label className="block">
      <input type="file" accept="image/*" onChange={onChange} className="hidden" />
      <div className="flex h-36 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[28px] border-2 border-dashed border-rose-100 bg-white/65 shadow-sm">
        {imageUrl ? (
          <AppImage src={imageUrl} alt="Preview" className="h-full w-full object-cover" width={320} height={240} crop="cover" />
        ) : uploading ? (
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-rose-200 border-t-rose-500" />
        ) : (
          <>
            <ImageIcon size={26} className="mb-2 text-rose-300" />
            <span className="text-[10px] font-black uppercase tracking-widest text-rose-400">上传图片</span>
          </>
        )}
      </div>
    </label>
  );
}

function Modal({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[180] flex items-end justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <motion.div initial={{ y: 120, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 120, opacity: 0 }} className="relative max-h-[86vh] w-full max-w-sm overflow-y-auto rounded-[32px] bg-[#FFF8F2] p-7 shadow-2xl ring-1 ring-white/70 scrollbar-hide">
        <button onClick={onClose} className="absolute right-6 top-6 rounded-full bg-white p-2 text-gray-300 shadow-sm">
          <X size={20} />
        </button>
        {children}
      </motion.div>
    </div>
  );
}
