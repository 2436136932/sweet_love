import { AnimatePresence, motion } from 'motion/react';
import {
  ChefHat,
  Image as ImageIcon,
  Minus,
  Plus,
  ReceiptText,
  Search,
  ShoppingCart,
  Sparkles,
  Trash2,
  Utensils,
  X,
} from 'lucide-react';
import { ChangeEvent, useMemo, useState } from 'react';
import { MealOrderDay, MealOrderItem, MenuDish } from '../types';
import { uploadService } from '../services/api';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/Confirm';
import { useModalHistory } from '../hooks/useModalHistory';
import { AppImage } from '../components/AppImage';

const CATEGORIES = ['全部', '家常', '川湘', '甜品', '饮品', '夜宵', '轻食'];
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=420&q=80';

export default function MenuOrder({
  dishes,
  order,
  isLoading = false,
  onAddDish,
  onDeleteDish,
  onAddOrderItem,
  onUpdateOrderItem,
  onDeleteOrderItem,
}: {
  dishes: MenuDish[];
  order: MealOrderDay | null;
  isLoading?: boolean;
  onAddDish: (dish: { name: string; category: string; description?: string; imageUrl?: string }) => Promise<void> | void;
  onDeleteDish: (id: string) => Promise<void> | void;
  onAddOrderItem: (dish: MenuDish) => Promise<void> | void;
  onUpdateOrderItem: (id: string, item: { quantity?: number; note?: string }) => Promise<void> | void;
  onDeleteOrderItem: (id: string) => Promise<void> | void;
}) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [activeCategory, setActiveCategory] = useState('全部');
  const [query, setQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('家常');
  const [newDescription, setNewDescription] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [savingDish, setSavingDish] = useState(false);
  const [busyDishId, setBusyDishId] = useState<string | null>(null);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const closeAddModal = useModalHistory('menu-add', showAdd, () => setShowAdd(false));
  const closeCartModal = useModalHistory('menu-cart', showCart, () => setShowCart(false));

  const orderItems = order?.items || [];
  const totalQuantity = orderItems.reduce((sum, item) => sum + item.quantity, 0);
  const orderByName = useMemo(() => {
    const map = new Map<string, MealOrderItem>();
    orderItems.forEach((item) => map.set(item.dishName, item));
    return map;
  }, [orderItems]);

  const categories = useMemo(() => {
    const collected = Array.from(new Set(dishes.map((dish) => dish.category)));
    return Array.from(new Set([...CATEGORIES, ...collected]));
  }, [dishes]);

  const filteredDishes = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return dishes.filter((dish) => {
      const matchesCategory = activeCategory === '全部' || dish.category === activeCategory;
      const matchesQuery = !keyword || dish.name.toLowerCase().includes(keyword) || dish.category.toLowerCase().includes(keyword);
      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, dishes, query]);

  const resetCustomForm = () => {
    setNewName('');
    setNewCategory('家常');
    setNewDescription('');
    setSelectedImage(null);
    setSelectedFile(null);
  };

  const handleImageSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setSelectedImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleAddDish = async () => {
    const name = newName.trim();
    const description = newDescription.trim();
    if (!name || !newCategory || savingDish) return;
    setSavingDish(true);
    try {
      const imageUrl = selectedFile ? await uploadService.upload(selectedFile) : undefined;
      await onAddDish({ name, category: newCategory, description, imageUrl });
      showToast('菜品已加入菜单', 'success');
      resetCustomForm();
      setShowAdd(false);
    } catch (error) {
      console.error('Create dish failed:', error);
      showToast(error instanceof Error ? error.message : '新增菜品失败', 'error');
    } finally {
      setSavingDish(false);
    }
  };

  const handleIncrement = async (dish: MenuDish) => {
    if (busyDishId) return;
    setBusyDishId(dish.id);
    try {
      await onAddOrderItem(dish);
    } catch (error) {
      console.error('Add meal order item failed:', error);
      showToast(error instanceof Error ? error.message : '点菜失败，请稍后重试', 'error');
    } finally {
      setBusyDishId(null);
    }
  };

  const handleDecrement = async (item: MealOrderItem) => {
    if (busyOrderId) return;
    setBusyOrderId(item.id);
    try {
      if (item.quantity <= 1) {
        await onDeleteOrderItem(item.id);
      } else {
        await onUpdateOrderItem(item.id, { quantity: item.quantity - 1 });
      }
    } catch (error) {
      console.error('Update meal order item failed:', error);
      showToast(error instanceof Error ? error.message : '更新点单失败，请稍后重试', 'error');
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleSetQuantity = async (item: MealOrderItem, quantity: number) => {
    if (busyOrderId) return;
    setBusyOrderId(item.id);
    try {
      await onUpdateOrderItem(item.id, { quantity });
    } catch (error) {
      console.error('Update meal order quantity failed:', error);
      showToast(error instanceof Error ? error.message : '更新数量失败，请稍后重试', 'error');
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleDeleteDish = async (id: string) => {
    if (busyDishId) return;
    const isConfirmed = await confirm({
      title: '确认删除菜品',
      message: '你确定要将这道菜品从菜单中永久删除吗？此操作无法撤销。',
      confirmText: '确认删除',
      cancelText: '取消',
      type: 'danger'
    });
    if (!isConfirmed) return;

    setBusyDishId(id);
    try {
      await onDeleteDish(id);
      showToast('菜品已删除', 'success');
    } catch (error) {
      console.error('Delete dish failed:', error);
      showToast(error instanceof Error ? error.message : '删除菜品失败', 'error');
    } finally {
      setBusyDishId(null);
    }
  };

  const handleDeleteOrderItem = async (id: string) => {
    if (busyOrderId) return;
    const isConfirmed = await confirm({
      title: '确认移除菜品',
      message: '确定要从小票中移除这道菜品吗？',
      confirmText: '确认移除',
      cancelText: '取消',
      type: 'warning'
    });
    if (!isConfirmed) return;

    setBusyOrderId(id);
    try {
      await onDeleteOrderItem(id);
      showToast('已从小票移除', 'success');
    } catch (error) {
      console.error('Delete order item failed:', error);
      showToast(error instanceof Error ? error.message : '移除失败，请稍后重试', 'error');
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleNoteBlur = async (item: MealOrderItem, note: string) => {
    if ((item.note || '') === note.trim()) return;
    try {
      await onUpdateOrderItem(item.id, { note: note.trim() });
      showToast('备注已保存', 'success');
    } catch (error) {
      console.error('Update order note failed:', error);
      showToast(error instanceof Error ? error.message : '备注保存失败', 'error');
    }
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[#FFF8F2]">
      <header className="sticky top-0 z-30 shrink-0 border-b border-white/70 bg-[linear-gradient(135deg,#fff7ed_0%,#fff1f2_46%,#eefcf6_100%)] px-5 pb-4 pt-8 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/75 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-rose-500 shadow-sm ring-1 ring-white/80">
              <ChefHat size={12} /> Sweet menu
            </div>
            <h1 className="text-2xl font-black tracking-tight text-gray-900">今天吃什么</h1>
            <p className="mt-1 text-[11px] font-bold text-gray-500">把想吃的放进今日小票</p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-900 text-white shadow-lg shadow-rose-100 transition-transform active:scale-95"
            aria-label="新增菜品"
          >
            <Plus size={22} />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="w-[88px] shrink-0 overflow-y-auto border-r border-white/70 bg-white/45 pb-20 pt-2 scrollbar-hide lg:pb-4">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`relative mx-2 mb-1 flex min-h-[48px] w-[72px] items-center justify-center rounded-2xl px-2 text-center text-[11px] font-black transition-all ${
                activeCategory === category ? 'bg-gray-900 text-white shadow-md shadow-rose-100' : 'text-gray-500 hover:bg-white/70'
              }`}
            >
              <span className="leading-tight">{category}</span>
            </button>
          ))}
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto px-4 pb-20 pt-4 scrollbar-hide lg:pb-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-white/70 px-3 py-2 shadow-sm ring-1 ring-white/80">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">菜单</p>
              <p className="mt-0.5 text-sm font-black text-gray-900">{dishes.length} 道</p>
            </div>
            <div className="rounded-2xl bg-white/70 px-3 py-2 shadow-sm ring-1 ring-white/80">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">今日</p>
              <p className="mt-0.5 text-sm font-black text-rose-500">{totalQuantity} 份</p>
            </div>
            <button
              onClick={() => setShowCart(true)}
              className="rounded-2xl bg-gray-900 px-3 py-2 text-left text-white shadow-lg shadow-rose-100 transition-transform active:scale-95"
            >
              <p className="text-[9px] font-black uppercase tracking-widest text-white/50">小票</p>
              <p className="mt-0.5 flex items-center gap-1 text-sm font-black">
                查看 <ReceiptText size={14} />
              </p>
            </button>
          </div>
          <div className="relative mt-3">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-300" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索菜名或分类"
              className="w-full rounded-2xl border border-white/80 bg-white/85 py-3 pl-10 pr-4 text-sm font-bold text-gray-700 shadow-sm outline-none placeholder:text-gray-300 focus:ring-2 focus:ring-rose-100"
            />
          </div>
          <button
            onClick={() => setShowCart(true)}
            className="mt-3 flex w-full items-center justify-between rounded-[28px] bg-white/80 px-4 py-3 text-gray-900 shadow-lg shadow-rose-100/40 ring-1 ring-white/80 transition-transform active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500 text-white">
                <ShoppingCart size={22} />
                {totalQuantity > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-900 px-1 text-[10px] font-black text-white">{totalQuantity}</span>
                )}
              </div>
              <div className="text-left">
                <p className="text-sm font-black">{totalQuantity > 0 ? `已选 ${totalQuantity} 份` : '还没有点菜'}</p>
                <p className="text-[10px] font-bold text-gray-400">点击查看今日小票和备注</p>
              </div>
            </div>
            <Sparkles size={18} className="text-rose-400" />
          </button>

          {isLoading && dishes.length === 0 && (
            <div className="flex h-60 flex-col items-center justify-center rounded-[28px] bg-white/80 text-gray-400 shadow-sm ring-1 ring-white/80">
              <div className="mb-3 h-12 w-12 animate-pulse rounded-2xl bg-rose-100" />
              <p className="text-xs font-black uppercase tracking-widest">正在加载菜单...</p>
            </div>
          )}

          {!isLoading && filteredDishes.length === 0 && (
            <div className="flex h-60 flex-col items-center justify-center rounded-[28px] border border-dashed border-rose-100 bg-white/75 text-center shadow-sm">
              <Utensils size={30} className="mb-3 text-rose-200" />
              <p className="text-sm font-black text-gray-600">没有找到这道菜</p>
              <button onClick={() => setShowAdd(true)} className="mt-3 rounded-full bg-rose-50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-rose-500">
                加进菜单
              </button>
            </div>
          )}

          <div className="space-y-3">
            {filteredDishes.map((dish) => {
              const item = orderByName.get(dish.name);
              const busy = busyDishId === dish.id || (item ? busyOrderId === item.id : false);
              return (
                <motion.article
                  key={dish.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="overflow-hidden rounded-[28px] bg-white/90 shadow-sm ring-1 ring-white/80 transition-shadow hover:shadow-md"
                >
                  <div className="flex gap-3 p-3">
                    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-rose-50">
                      <AppImage src={dish.imageUrl || FALLBACK_IMAGE} alt={dish.name} className="h-full w-full object-cover" width={192} height={192} crop="square" sizes="96px" referrerPolicy="no-referrer" />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-2 pb-1.5 pt-5">
                        <span className="line-clamp-1 text-[9px] font-black text-white">{dish.category}</span>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h2 className="truncate text-base font-black text-gray-900">{dish.name}</h2>
                          <p className="mt-1 line-clamp-2 text-[11px] font-medium leading-relaxed text-gray-400">
                            {dish.description || '这是我们菜单里的常驻选手，今天也可以安排。'}
                          </p>
                        </div>
                        {!dish.isPreset && (
                          <button
                            onClick={() => handleDeleteDish(dish.id)}
                            disabled={busy}
                            className="rounded-xl bg-red-50 p-2 text-red-300 transition-colors hover:text-red-500 disabled:opacity-50"
                            title="删除菜品"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <span className={`rounded-full px-2.5 py-1 text-[9px] font-black ${item ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-600'}`}>
                          {item ? `小票中 x${item.quantity}` : '可点'}
                        </span>
                        <div className="flex items-center gap-2">
                          {item && (
                            <>
                              <button
                                onClick={() => handleDecrement(item)}
                                disabled={busy}
                                className="flex h-8 w-8 items-center justify-center rounded-full border border-rose-100 bg-white text-rose-500 disabled:opacity-50"
                              >
                                <Minus size={15} />
                              </button>
                              <span className="min-w-5 text-center text-sm font-black text-gray-800">{item.quantity}</span>
                            </>
                          )}
                          <button
                            onClick={() => handleIncrement(dish)}
                            disabled={busy}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-white shadow-md shadow-rose-100 disabled:opacity-50"
                          >
                            {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Plus size={16} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </main>
      </div>

      <AnimatePresence>
        {showCart && (
          <div className="fixed inset-0 z-[160] flex items-end justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeCartModal}
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: 120, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 120, opacity: 0 }}
              className="relative max-h-[78vh] w-full max-w-sm overflow-hidden rounded-[32px] bg-[#FFF8F2] shadow-2xl ring-1 ring-white/70"
            >
              <div className="flex items-center justify-between border-b border-white/80 bg-white/75 px-6 py-5">
                <div>
                  <h2 className="text-lg font-black text-gray-900">今日小票</h2>
                  <p className="mt-1 text-[10px] font-bold text-gray-400">{order?.date || new Date().toISOString().slice(0, 10)} · 共 {totalQuantity} 份</p>
                </div>
                <button onClick={closeCartModal} className="rounded-full bg-white p-2 text-gray-400 shadow-sm">
                  <X size={18} />
                </button>
              </div>

              <div className="max-h-[58vh] overflow-y-auto px-5 py-4 scrollbar-hide">
                {orderItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 text-center">
                    <ShoppingCart size={32} className="mb-3 text-rose-200" />
                    <p className="text-sm font-black text-gray-500">小票还是空的</p>
                    <p className="mt-1 text-[10px] font-bold text-gray-300">点几道今天想吃的吧</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orderItems.map((item) => (
                      <div key={item.id} className="rounded-[26px] bg-white/85 p-3 shadow-sm ring-1 ring-white/70">
                        <div className="flex gap-3">
                          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-white">
                            <AppImage src={item.imageUrl || FALLBACK_IMAGE} alt={item.dishName} className="h-full w-full object-cover" width={128} height={128} crop="square" sizes="64px" referrerPolicy="no-referrer" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-black text-gray-900">{item.dishName}</p>
                                <p className="mt-0.5 text-[10px] font-bold text-rose-400">{item.category} · {item.user?.username || '我们'}</p>
                              </div>
                              <button
                                onClick={() => handleDeleteOrderItem(item.id)}
                                disabled={busyOrderId === item.id}
                                className="rounded-xl bg-white p-2 text-red-300 hover:text-red-500 disabled:opacity-50"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                            <div className="mt-3 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleDecrement(item)}
                                  disabled={busyOrderId === item.id}
                                  className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-50 text-rose-500 disabled:opacity-50"
                                >
                                  <Minus size={15} />
                                </button>
                                <span className="min-w-5 text-center text-sm font-black text-gray-800">{item.quantity}</span>
                                <button
                                  onClick={() => handleSetQuantity(item, item.quantity + 1)}
                                  disabled={busyOrderId === item.id}
                                  className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-white disabled:opacity-50"
                                >
                                  <Plus size={15} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                        <input
                          defaultValue={item.note || ''}
                          onBlur={(event) => handleNoteBlur(item, event.target.value)}
                          onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
                          placeholder="给这道菜加备注，比如少辣、多葱..."
                          className="mt-3 w-full rounded-2xl border border-rose-100 bg-rose-50/30 px-4 py-2.5 text-xs font-bold text-gray-600 outline-none placeholder:text-gray-300 focus:ring-2 focus:ring-rose-100"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 z-[170] flex items-end justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeAddModal}
              className="absolute inset-0 bg-black/25 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: 120, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 120, opacity: 0 }}
              className="relative max-h-[84vh] w-full max-w-sm overflow-y-auto rounded-[32px] bg-[#FFF8F2] p-7 shadow-2xl ring-1 ring-white/70 scrollbar-hide"
            >
              <button onClick={closeAddModal} className="absolute right-6 top-6 rounded-full bg-white p-2 text-gray-300 shadow-sm">
                <X size={20} />
              </button>
              <div className="mb-5 pr-10">
                <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[9px] font-black uppercase tracking-widest text-rose-500 shadow-sm">
                  <Plus size={12} /> New dish
                </div>
                <h2 className="text-xl font-black text-gray-900">加一道常吃菜</h2>
                <p className="mt-1 text-xs font-bold text-gray-400">写进你们的小菜单，下次就能直接点。</p>
              </div>
              <div className="space-y-4">
                <label className="block">
                  <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                  <div className="flex h-40 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[28px] border-2 border-dashed border-rose-100 bg-white/65 shadow-sm">
                    {selectedImage ? (
                      <AppImage src={selectedImage} alt="Preview" className="h-full w-full object-cover" width={320} height={320} crop="cover" />
                    ) : (
                      <>
                        <ImageIcon size={26} className="mb-2 text-rose-300" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-rose-400">上传菜品图片</span>
                      </>
                    )}
                  </div>
                </label>

                <input
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  placeholder="菜名，比如：糖醋排骨"
                  className="w-full rounded-2xl border border-white/80 bg-white/80 p-4 text-sm font-bold text-gray-700 shadow-sm outline-none placeholder:text-gray-300 focus:ring-2 focus:ring-rose-100"
                />

                <textarea
                  value={newDescription}
                  onChange={(event) => setNewDescription(event.target.value)}
                  placeholder="描述一下口味，比如：酸甜开胃、适合拌饭"
                  rows={3}
                  className="w-full resize-none rounded-2xl border border-white/80 bg-white/80 p-4 text-sm font-bold text-gray-700 shadow-sm outline-none placeholder:text-gray-300 focus:ring-2 focus:ring-rose-100"
                />

                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {CATEGORIES.filter((category) => category !== '全部').map((category) => (
                    <button
                      key={category}
                      onClick={() => setNewCategory(category)}
                      className={`whitespace-nowrap rounded-full px-4 py-2 text-[10px] font-black transition-all ${
                        newCategory === category ? 'bg-gray-900 text-white shadow-md shadow-rose-100' : 'bg-white text-rose-400 shadow-sm'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleAddDish}
                  disabled={!newName.trim() || savingDish}
                  className="w-full rounded-2xl bg-rose-500 py-4 text-sm font-black text-white shadow-lg shadow-rose-100 transition-all active:scale-[0.99] disabled:opacity-50 disabled:shadow-none"
                >
                  {savingDish ? '正在保存...' : '保存菜品'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
