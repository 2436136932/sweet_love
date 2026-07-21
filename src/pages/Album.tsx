import { motion, AnimatePresence } from 'motion/react';
import { Plus, Image as ImageIcon, Heart, X, Trash2, Video, CalendarDays, MessageCircle, Send, Sparkles, Download, Star, MapPin, Map as MapIcon, Edit3, Compass, Plane, Camera, Gift, Calendar } from 'lucide-react';
import { useEffect, useMemo, useState, ChangeEvent } from 'react';
import { gps as readExifGps, parse as parseExif } from 'exifr';
import { AlbumImage, AlbumLocationData, Anniversary, Couple, AlbumOverview } from '../types';
import { uploadService, albumService } from '../services/api';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/Confirm';
import MapPicker from '../components/MapPicker';
import AlbumFootprintMap from '../components/AlbumFootprintMap';
import { Upload } from '../components/Upload';
import { convertGpsToGcj02, hasValidAmapKey, reverseGeocodeGcj02 } from '../lib/amap';
import { useModalHistory } from '../hooks/useModalHistory';
import { AppImage } from '../components/AppImage';
import { buildImageUrl } from '../lib/imageUrl';

function getLocalDateTimeString(date = new Date()) {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
}

function getLocalDateString(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatDisplayDateTime(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

const CATEGORIES = ['旅行', '约会', '日常', '纪念日'];

function getCategoryIcon(category: string, className = 'w-3 h-3') {
  switch (category) {
    case '全部':
      return <Compass className={className} />;
    case '旅行':
      return <Plane className={className} />;
    case '约会':
      return <Heart className={className} />;
    case '日常':
      return <Camera className={className} />;
    case '纪念日':
      return <Gift className={className} />;
    default:
      return <Camera className={className} />;
  }
}
const POSTER_MAX_IMAGES = 6;
const DEFAULT_POSTER_SUBTITLE = '把这些瞬间收藏成我们的光';

type PosterBox = { x: number; y: number; w: number; h: number; radius: number };

const LOCATION_SOURCE_LABELS: Record<NonNullable<AlbumImage['locationSource']>, string> = {
  exif: '照片定位',
  amap_geolocation: '当前定位',
  amap_poi: '高德地点',
  manual_pin: '手动校准',
};

function locationToAlbumPatch(location: AlbumLocationData): Partial<AlbumImage> {
  return {
    locationAddress: location.address,
    lat: location.lat,
    lng: location.lng,
    locationSource: location.locationSource || 'manual_pin',
    locationAccuracyMeters: location.locationAccuracyMeters,
    locationPoiId: location.locationPoiId,
    locationPoiName: location.locationPoiName,
    locationAdcode: location.locationAdcode,
    locationCoordinateSystem: 'GCJ02',
  };
}

function hasAlbumLocation(item: AlbumImage) {
  return typeof item.lat === 'number' && typeof item.lng === 'number';
}

export default function Album({
  anniversaries,
  couple,
  isLoading = false,
  overview,
  onOverviewChange,
  onAdd,
  onUpdate,
  onToggleLike,
  onAddComment,
  onDelete,
}: {
  anniversaries: Anniversary[],
  couple: Couple | null,
  isLoading?: boolean,
  overview?: AlbumOverview | null,
  onOverviewChange?: () => void,
  onAdd: (img: Omit<AlbumImage, 'id'>) => Promise<void> | void,
  onUpdate: (id: string, img: Partial<AlbumImage>) => Promise<AlbumImage>,
  onToggleLike: (img: AlbumImage) => Promise<AlbumImage>,
  onAddComment: (id: string, content: string) => Promise<AlbumImage>,
  onDelete: (id: string) => Promise<void> | void,
}) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [data, setData] = useState<AlbumImage[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'week' | 'month' | 'custom'>('all');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [dateTime, setDateTime] = useState(() => getLocalDateTimeString());
  const [isEditingDateTime, setIsEditingDateTime] = useState(false);
  const [editDateTimeVal, setEditDateTimeVal] = useState('');

  const dateRange = useMemo(() => {
    let start = '';
    let end = '';
    const now = new Date();
    if (filterType === 'week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const d = new Date(now.setDate(diff));
      start = d.toISOString().split('T')[0];
    } else if (filterType === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    } else if (filterType === 'custom') {
      start = startDateFilter;
      end = endDateFilter;
    }
    return { startDate: start || undefined, endDate: end || undefined };
  }, [filterType, startDateFilter, endDateFilter]);
  const [showAdd, setShowAdd] = useState(false);
  const [zoomImage, setZoomImage] = useState<AlbumImage | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState(CATEGORIES[0]);
  const [selectedPreview, setSelectedPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeCategory, setActiveCategory] = useState('全部');
  const [viewMode, setViewMode] = useState<'wall' | 'timeline' | 'map'>('wall');
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [isPosterOpen, setIsPosterOpen] = useState(false);
  const [isPosterConfigOpen, setIsPosterConfigOpen] = useState(false);
  const [selectedPosterImageIds, setSelectedPosterImageIds] = useState<string[]>([]);
  const [posterTitle, setPosterTitle] = useState('');
  const [posterSubtitle, setPosterSubtitle] = useState(DEFAULT_POSTER_SUBTITLE);
  const [isGeneratingPoster, setIsGeneratingPoster] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<AlbumLocationData | null>(null);
  const [isReadingExifLocation, setIsReadingExifLocation] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [locationTarget, setLocationTarget] = useState<'new' | 'detail'>('new');
  const [calibrationQueueIds, setCalibrationQueueIds] = useState<string[]>([]);
  const [calibrationTotalCount, setCalibrationTotalCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    setIsDataLoading(true);
    albumService.getPage({ 
      limit: 1000,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    }).then(res => {
      if (mounted) setData(res.items);
    }).catch(console.error).finally(() => {
      if (mounted) setIsDataLoading(false);
    });
    return () => { mounted = false; };
  }, [overview, dateRange.startDate, dateRange.endDate]);

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data]);

  const filteredData = useMemo(() => {
    if (activeCategory === '全部') return sortedData;
    return sortedData.filter(img => img.category === activeCategory);
  }, [sortedData, activeCategory]);

  const missingLocationItems = useMemo(() => {
    return filteredData.filter((item) => !hasAlbumLocation(item));
  }, [filteredData]);

  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = { '全部': data.length };
    CATEGORIES.forEach(cat => {
      stats[cat] = data.filter(img => img.category === cat).length;
    });
    return stats;
  }, [data]);

  const timelineGroups = useMemo(() => {
    const groups = new Map<string, AlbumImage[]>();
    filteredData.forEach((item) => {
      const localDate = getLocalDateString(item.date);
      const month = localDate.slice(0, 7);
      groups.set(month, [...(groups.get(month) || []), item]);
    });
    return Array.from(groups.entries());
  }, [filteredData]);

  const featuredItems = useMemo(() => {
    const featured = sortedData.filter((item) => item.isFeatured);
    return (featured.length > 0 ? featured : sortedData).slice(0, 4);
  }, [sortedData]);

  const posterImageCandidates = useMemo(() => {
    return sortedData.filter((item) => item.mediaType !== 'video');
  }, [sortedData]);

  const defaultPosterImageIds = useMemo(() => {
    const featured = posterImageCandidates.filter((item) => item.isFeatured);
    const regular = posterImageCandidates.filter((item) => !item.isFeatured);
    return [...featured, ...regular].slice(0, POSTER_MAX_IMAGES).map((item) => item.id);
  }, [posterImageCandidates]);

  const selectedPosterImages = useMemo(() => {
    const candidateMap = new Map(posterImageCandidates.map((item) => [item.id, item]));
    return selectedPosterImageIds
      .map((id) => candidateMap.get(id))
      .filter(Boolean) as AlbumImage[];
  }, [posterImageCandidates, selectedPosterImageIds]);

  const posterStats = useMemo(() => {
    return {
      photos: data.filter((item) => item.mediaType !== 'video').length,
      videos: data.filter((item) => item.mediaType === 'video').length,
      featured: data.filter((item) => item.isFeatured).length,
      comments: data.reduce((sum, item) => sum + (item.comments?.length || 0), 0),
      likes: data.reduce((sum, item) => sum + (item.likeCount || 0), 0),
    };
  }, [data]);

  const nearestAnniversary = useMemo(() => {
    return anniversaries.find((item) => item.isImportant) || anniversaries[0] || null;
  }, [anniversaries]);

  const calibrationQueueItems = useMemo(() => {
    return calibrationQueueIds
      .map((id) => data.find((item) => item.id === id))
      .filter(Boolean) as AlbumImage[];
  }, [calibrationQueueIds, data]);

  const calibrationRemainingItems = useMemo(() => {
    return calibrationQueueItems.filter((item) => !hasAlbumLocation(item));
  }, [calibrationQueueItems]);

  const calibrationRemainingCount = calibrationRemainingItems.length;
  const isCalibrationActive = calibrationQueueIds.length > 0;
  const activeCalibrationIndex = zoomImage ? calibrationQueueIds.indexOf(zoomImage.id) : -1;
  const activeCalibrationStep = isCalibrationActive
    ? Math.max(1, calibrationTotalCount - calibrationQueueIds.length + Math.max(activeCalibrationIndex, 0) + 1)
    : 0;

  const locationPickerInitialLocation = useMemo(() => {
    if (
      locationTarget === 'detail' &&
      zoomImage &&
      typeof zoomImage.lat === 'number' &&
      typeof zoomImage.lng === 'number'
    ) {
      return {
        address: zoomImage.locationAddress,
        lat: zoomImage.lat,
        lng: zoomImage.lng,
        locationSource: zoomImage.locationSource,
        locationAccuracyMeters: zoomImage.locationAccuracyMeters,
        locationPoiId: zoomImage.locationPoiId,
        locationPoiName: zoomImage.locationPoiName,
        locationAdcode: zoomImage.locationAdcode,
        locationCoordinateSystem: 'GCJ02' as const,
      };
    }
    if (locationTarget === 'new' && selectedLocation) {
      return selectedLocation;
    }
    return undefined;
  }, [locationTarget, selectedLocation, zoomImage]);

  useEffect(() => {
    if (!zoomImage) return;
    const latest = data.find((item) => item.id === zoomImage.id);
    if (latest) setZoomImage(latest);
  }, [data, zoomImage]);

  useEffect(() => {
    setSelectedPosterImageIds((current) => current.filter((id) => posterImageCandidates.some((item) => item.id === id)));
  }, [posterImageCandidates]);

  useEffect(() => {
    setCalibrationQueueIds((current) => current.filter((id) => data.some((item) => item.id === id)));
  }, [data]);

  const handleMediaSelect = async (file: File) => {
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      showToast('请选择图片或视频文件', 'error');
      return;
    }
    setSelectedFile(file);
    setSelectedLocation(null);
    const reader = new FileReader();
    reader.onloadend = () => setSelectedPreview(reader.result as string);
    reader.readAsDataURL(file);

    if (!file.type.startsWith('image/')) return;

    setIsReadingExifLocation(true);
    try {
      const meta = await parseExif(file);
      if (meta && meta.DateTimeOriginal) {
        const dateTaken = new Date(meta.DateTimeOriginal);
        if (!isNaN(dateTaken.getTime())) {
          setDateTime(getLocalDateTimeString(dateTaken));
        }
      }

      const exifGps = await readExifGps(file);
      if (!exifGps || !Number.isFinite(exifGps.latitude) || !Number.isFinite(exifGps.longitude)) return;
      if (!hasValidAmapKey) {
        showToast('照片里有定位信息，配置高德 Key 后可自动点亮足迹', 'error');
        return;
      }
      const converted = await convertGpsToGcj02(exifGps.longitude, exifGps.latitude);
      const address = await reverseGeocodeGcj02(converted.lng, converted.lat);
      setSelectedLocation({
        address,
        lat: converted.lat,
        lng: converted.lng,
        locationSource: 'exif',
        locationCoordinateSystem: 'GCJ02',
      });
      showToast('已读取照片定位，可继续校准', 'success');
    } catch (error) {
      console.warn('Read photo GPS failed:', error);
    } finally {
      setIsReadingExifLocation(false);
    }
  };

  const resetUploadForm = () => {
    setNewTitle('');
    setNewDescription('');
    setNewCategory(CATEGORIES[0]);
    setSelectedPreview(null);
    setSelectedFile(null);
    setSelectedLocation(null);
    setDateTime(getLocalDateTimeString());
  };

  const openUploadLocationPicker = () => {
    setLocationTarget('new');
    setShowLocationPicker(true);
  };

  const openDetailLocationPicker = () => {
    if (!zoomImage) return;
    setLocationTarget('detail');
    setShowLocationPicker(true);
  };

  const closeDetail = () => {
    setZoomImage(null);
    setShowLocationPicker(false);
    setCalibrationQueueIds([]);
    setCalibrationTotalCount(0);
    setIsEditingDateTime(false);
  };

  const closeAddModal = useModalHistory('album-add', showAdd, () => setShowAdd(false));
  const closeDetailModal = useModalHistory('album-detail', Boolean(zoomImage), closeDetail);
  const closeLocationModal = useModalHistory('album-location', showLocationPicker, () => setShowLocationPicker(false));
  const closePosterConfigModal = useModalHistory('album-poster-config', isPosterConfigOpen, () => {
    if (!isGeneratingPoster) setIsPosterConfigOpen(false);
  });
  const closePosterModal = () => setIsPosterOpen(false);

  const startLocationCalibration = () => {
    const queue = missingLocationItems;
    if (queue.length === 0) {
      setCalibrationQueueIds([]);
      setCalibrationTotalCount(0);
      setShowAdd(true);
      return;
    }
    setCalibrationQueueIds(queue.map((item) => item.id));
    setCalibrationTotalCount(queue.length);
    setLocationTarget('detail');
    setZoomImage(queue[0]);
    setShowLocationPicker(false);
  };

  const getNextCalibrationItem = (currentId: string) => {
    const currentIndex = calibrationQueueIds.indexOf(currentId);
    const orderedIds = currentIndex >= 0
      ? [...calibrationQueueIds.slice(currentIndex + 1), ...calibrationQueueIds.slice(0, currentIndex)]
      : calibrationQueueIds;

    return orderedIds
      .map((id) => data.find((item) => item.id === id))
      .find((item): item is AlbumImage => Boolean(item && item.id !== currentId && !hasAlbumLocation(item)));
  };

  const handleLocationSelect = async (location: AlbumLocationData) => {
    if (locationTarget === 'new') {
      setSelectedLocation(location);
      setShowLocationPicker(false);
      return;
    }
    if (!zoomImage) return;
    setBusyId(zoomImage.id);
    try {
      const updated = await onUpdate(zoomImage.id, locationToAlbumPatch(location));
      if (isCalibrationActive) {
        const nextItem = getNextCalibrationItem(zoomImage.id);
        const remainingAfterSave = Math.max(calibrationRemainingCount - 1, 0);
        if (nextItem) {
          setCalibrationQueueIds((current) => current.filter((id) => id !== zoomImage.id));
          setZoomImage(nextItem);
          setShowLocationPicker(false);
          showToast(`地点已保存，还剩 ${remainingAfterSave} 张`, 'success');
        } else {
          setZoomImage(updated);
          setShowLocationPicker(false);
          setCalibrationQueueIds([]);
          setCalibrationTotalCount(0);
          showToast('地点已保存，足迹已补全', 'success');
        }
      } else {
        setZoomImage(updated);
        setShowLocationPicker(false);
        showToast('地点已更新', 'success');
      }
    } catch (error) {
      console.error('Update album location failed:', error);
      showToast(error instanceof Error ? error.message : '地点更新失败', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleAdd = async () => {
    if (!selectedFile || !newTitle.trim()) return;
    setIsUploading(true);
    try {
      const mediaUrl = await uploadService.upload(selectedFile);
      await onAdd({
        src: mediaUrl,
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        category: newCategory,
        mediaType: selectedFile.type.startsWith('video/') ? 'video' : 'image',
        height: selectedFile.type.startsWith('video/') ? 'h-56' : 'h-64',
        date: new Date(dateTime).toISOString(),
        isFeatured: data.length === 0,
        ...(selectedLocation ? locationToAlbumPatch(selectedLocation) : {}),
      });
      showToast('回忆已保存', 'success');
      resetUploadForm();
      setShowAdd(false);
    } catch (error) {
      console.error('Upload album media failed:', error);
      showToast(error instanceof Error ? error.message : '上传失败，请检查格式或大小', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleToggleFeatured = async (image: AlbumImage) => {
    setBusyId(image.id);
    try {
      const updated = await onUpdate(image.id, { isFeatured: !image.isFeatured });
      setZoomImage(updated);
      showToast(updated.isFeatured ? '已加入首页照片墙' : '已从精选照片墙移除', 'success');
    } catch (error) {
      console.error('Update album featured failed:', error);
      showToast(error instanceof Error ? error.message : '更新精选失败', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleLike = async (image: AlbumImage) => {
    setBusyId(image.id);
    try {
      const updated = await onToggleLike(image);
      setZoomImage(updated);
    } catch (error) {
      console.error('Toggle album like failed:', error);
      showToast(error instanceof Error ? error.message : '点赞失败，请稍后重试', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleAddComment = async () => {
    if (!zoomImage || !commentText.trim()) return;
    setBusyId(zoomImage.id);
    try {
      const updated = await onAddComment(zoomImage.id, commentText.trim());
      setZoomImage(updated);
      setCommentText('');
    } catch (error) {
      console.error('Add album comment failed:', error);
      showToast(error instanceof Error ? error.message : '留言失败，请稍后重试', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (image: AlbumImage) => {
    const isConfirmed = await confirm({
      title: '确认删除回忆',
      message: '你确定要删除这张照片吗？此操作无法撤销。',
      confirmText: '确认删除',
      cancelText: '取消',
      type: 'danger'
    });
    if (!isConfirmed) return;

    setDeletingId(image.id);
    try {
      await onDelete(image.id);
      showToast('回忆已删除', 'success');
      setZoomImage(null);
    } catch (error) {
      console.error('Delete album media failed:', error);
      showToast(error instanceof Error ? error.message : '删除失败，请稍后重试', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const openPosterConfig = () => {
    if (posterImageCandidates.length === 0) {
      showToast(data.length === 0 ? '至少上传一张照片后再生成海报' : '视频暂不参与海报，请先上传一张照片', 'error');
      return;
    }

    const validSelectedIds = selectedPosterImageIds.filter((id) => posterImageCandidates.some((item) => item.id === id));
    setSelectedPosterImageIds(validSelectedIds.length > 0 ? validSelectedIds : defaultPosterImageIds);
    if (!posterTitle.trim()) setPosterTitle(couple?.name || 'Sweet Love');
    if (!posterSubtitle.trim()) setPosterSubtitle(DEFAULT_POSTER_SUBTITLE);
    setIsPosterConfigOpen(true);
  };

  const togglePosterImage = (image: AlbumImage) => {
    setSelectedPosterImageIds((current) => {
      if (current.includes(image.id)) return current.filter((id) => id !== image.id);
      if (current.length >= POSTER_MAX_IMAGES) {
        showToast(`最多选择 ${POSTER_MAX_IMAGES} 张照片`, 'error');
        return current;
      }
      return [...current, image.id];
    });
  };

  const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });

  const createRoundedRectPath = (ctx: CanvasRenderingContext2D, box: PosterBox) => {
    const radius = Math.min(box.radius, box.w / 2, box.h / 2);
    ctx.beginPath();
    ctx.moveTo(box.x + radius, box.y);
    ctx.lineTo(box.x + box.w - radius, box.y);
    ctx.quadraticCurveTo(box.x + box.w, box.y, box.x + box.w, box.y + radius);
    ctx.lineTo(box.x + box.w, box.y + box.h - radius);
    ctx.quadraticCurveTo(box.x + box.w, box.y + box.h, box.x + box.w - radius, box.y + box.h);
    ctx.lineTo(box.x + radius, box.y + box.h);
    ctx.quadraticCurveTo(box.x, box.y + box.h, box.x, box.y + box.h - radius);
    ctx.lineTo(box.x, box.y + radius);
    ctx.quadraticCurveTo(box.x, box.y, box.x + radius, box.y);
    ctx.closePath();
  };

  const drawCoverImage = (ctx: CanvasRenderingContext2D, image: HTMLImageElement, box: PosterBox) => {
    const scale = Math.max(box.w / image.width, box.h / image.height);
    const sw = box.w / scale;
    const sh = box.h / scale;
    ctx.save();
    createRoundedRectPath(ctx, box);
    ctx.clip();
    ctx.drawImage(image, (image.width - sw) / 2, (image.height - sh) / 2, sw, sh, box.x, box.y, box.w, box.h);
    ctx.restore();
  };

  const drawFittedText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    font: string,
    color: string,
  ) => {
    ctx.font = font;
    ctx.fillStyle = color;
    const content = text.trim();
    if (ctx.measureText(content).width <= maxWidth) {
      ctx.fillText(content, x, y);
      return;
    }
    let clipped = content;
    while (clipped.length > 1 && ctx.measureText(`${clipped}...`).width > maxWidth) {
      clipped = clipped.slice(0, -1);
    }
    ctx.fillText(`${clipped}...`, x, y);
  };

  const drawWrappedText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
    maxLines: number,
  ) => {
    const chars = text.trim().split('');
    const lines: string[] = [];
    let line = '';
    chars.forEach((char) => {
      const testLine = `${line}${char}`;
      if (ctx.measureText(testLine).width > maxWidth && line) {
        lines.push(line);
        line = char;
      } else {
        line = testLine;
      }
    });
    if (line) lines.push(line);
    lines.slice(0, maxLines).forEach((item, index) => {
      const suffix = index === maxLines - 1 && lines.length > maxLines ? '...' : '';
      ctx.fillText(`${item}${suffix}`, x, y + index * lineHeight);
    });
  };

  const drawPosterPlaceholder = (ctx: CanvasRenderingContext2D, item: AlbumImage, box: PosterBox) => {
    ctx.save();
    createRoundedRectPath(ctx, box);
    ctx.clip();
    const gradient = ctx.createLinearGradient(box.x, box.y, box.x + box.w, box.y + box.h);
    gradient.addColorStop(0, '#fff7ed');
    gradient.addColorStop(1, '#fce7f3');
    ctx.fillStyle = gradient;
    ctx.fillRect(box.x, box.y, box.w, box.h);
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.fillRect(box.x + 18, box.y + 18, box.w - 36, box.h - 36);
    ctx.fillStyle = '#be185d';
    ctx.font = '900 28px sans-serif';
    drawWrappedText(ctx, item.title || '照片加载失败', box.x + 42, box.y + box.h / 2 - 18, box.w - 84, 36, 2);
    ctx.restore();
  };

  const getPosterLayout = (count: number): PosterBox[] => {
    if (count === 1) return [{ x: 90, y: 332, w: 900, h: 640, radius: 58 }];
    if (count === 2) return [
      { x: 90, y: 314, w: 900, h: 330, radius: 48 },
      { x: 90, y: 676, w: 900, h: 330, radius: 48 },
    ];
    if (count === 3) return [
      { x: 90, y: 314, w: 580, h: 692, radius: 52 },
      { x: 702, y: 314, w: 288, h: 330, radius: 44 },
      { x: 702, y: 676, w: 288, h: 330, radius: 44 },
    ];
    if (count === 4) return [
      { x: 90, y: 314, w: 430, h: 330, radius: 44 },
      { x: 560, y: 314, w: 430, h: 330, radius: 44 },
      { x: 90, y: 676, w: 430, h: 330, radius: 44 },
      { x: 560, y: 676, w: 430, h: 330, radius: 44 },
    ];
    if (count === 5) return [
      { x: 90, y: 314, w: 560, h: 430, radius: 50 },
      { x: 682, y: 314, w: 308, h: 200, radius: 40 },
      { x: 682, y: 544, w: 308, h: 200, radius: 40 },
      { x: 90, y: 776, w: 430, h: 230, radius: 42 },
      { x: 560, y: 776, w: 430, h: 230, radius: 42 },
    ];
    return [
      { x: 90, y: 314, w: 560, h: 430, radius: 50 },
      { x: 682, y: 314, w: 308, h: 200, radius: 40 },
      { x: 682, y: 544, w: 308, h: 200, radius: 40 },
      { x: 90, y: 776, w: 270, h: 230, radius: 42 },
      { x: 405, y: 776, w: 270, h: 230, radius: 42 },
      { x: 720, y: 776, w: 270, h: 230, radius: 42 },
    ];
  };

  const drawPosterBackground = (ctx: CanvasRenderingContext2D) => {
    const gradient = ctx.createLinearGradient(0, 0, 1080, 1440);
    gradient.addColorStop(0, '#fff1f5');
    gradient.addColorStop(0.48, '#fff7ed');
    gradient.addColorStop(1, '#eef2ff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1440);

    ctx.fillStyle = 'rgba(236, 72, 153, 0.13)';
    ctx.beginPath();
    ctx.arc(930, 126, 170, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(251, 191, 36, 0.18)';
    ctx.beginPath();
    ctx.arc(140, 1120, 210, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.fillRect(0, 0, 1080, 1440);
  };

  const generatePoster = async () => {
    const posterImages = selectedPosterImages.slice(0, POSTER_MAX_IMAGES);
    if (posterImages.length === 0) {
      showToast('请至少选择一张照片', 'error');
      return;
    }

    setIsGeneratingPoster(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1440;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('无法创建海报');

      drawPosterBackground(ctx);

      const today = new Date();
      const isoDate = today.toISOString().split('T')[0];
      const title = posterTitle.trim() || couple?.name || 'Sweet Love';
      const subtitle = posterSubtitle.trim() || DEFAULT_POSTER_SUBTITLE;
      const anniversaryText = nearestAnniversary
        ? `${nearestAnniversary.title} · ${nearestAnniversary.date}`
        : '把今天也记成纪念日';

      ctx.fillStyle = '#831843';
      ctx.font = '900 30px sans-serif';
      ctx.fillText('SWEET LOVE ALBUM', 90, 108);
      drawFittedText(ctx, title, 88, 190, 760, '900 74px sans-serif', '#111827');
      drawFittedText(ctx, subtitle, 92, 250, 700, '700 34px sans-serif', '#9d174d');
      ctx.fillStyle = '#64748b';
      ctx.font = '800 26px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(isoDate, 990, 112);
      ctx.textAlign = 'left';

      const boxes = getPosterLayout(posterImages.length);
      await Promise.all(posterImages.map(async (item, index) => {
        const box = boxes[index];
        try {
          const image = await loadImage(buildImageUrl(item.src, { width: 1080, quality: 90 }));
          drawCoverImage(ctx, image, box);
        } catch {
          drawPosterPlaceholder(ctx, item, box);
        }
        ctx.save();
        createRoundedRectPath(ctx, box);
        ctx.clip();
        const shade = ctx.createLinearGradient(box.x, box.y + box.h * 0.45, box.x, box.y + box.h);
        shade.addColorStop(0, 'rgba(0,0,0,0)');
        shade.addColorStop(1, 'rgba(0,0,0,0.42)');
        ctx.fillStyle = shade;
        ctx.fillRect(box.x, box.y, box.w, box.h);
        ctx.restore();
      }));

      const statsY = 1110;
      ctx.fillStyle = 'rgba(255,255,255,0.74)';
      createRoundedRectPath(ctx, { x: 70, y: 1060, w: 940, h: 198, radius: 46 });
      ctx.fill();

      const statItems = [
        { label: '照片', value: posterStats.photos },
        { label: '视频', value: posterStats.videos },
        { label: '精选', value: posterStats.featured },
        { label: '互动', value: posterStats.comments + posterStats.likes },
      ];
      statItems.forEach((item, index) => {
        const x = 130 + index * 220;
        ctx.fillStyle = ['#ec4899', '#f59e0b', '#8b5cf6', '#0f172a'][index];
        ctx.font = '900 48px sans-serif';
        ctx.fillText(String(item.value), x, statsY + 34);
        ctx.fillStyle = '#64748b';
        ctx.font = '900 24px sans-serif';
        ctx.fillText(item.label, x, statsY + 76);
      });

      drawFittedText(ctx, anniversaryText, 90, 1320, 900, '900 34px sans-serif', '#be185d');
      drawFittedText(ctx, 'Every moment matters.', 90, 1370, 900, '900 40px sans-serif', '#111827');

      const url = canvas.toDataURL('image/png');
      setPosterUrl(url);
      setIsPosterConfigOpen(false);
      setIsPosterOpen(true);
      showToast('海报已生成', 'success');
    } catch (error) {
      console.error('Generate poster failed:', error);
      showToast(error instanceof Error ? error.message : '海报生成失败，请更换图片后重试', 'error');
    } finally {
      setIsGeneratingPoster(false);
    }
  };

  const renderMedia = (item: AlbumImage, className: string) => (
    item.mediaType === 'video' ? (
      <video src={buildImageUrl(item.src)} className={className} muted playsInline preload="none" />
    ) : (
      <AppImage src={item.src} alt={item.title} className={className} width={720} height={720} crop="cover" sizes="(min-width: 1024px) 25vw, 50vw" referrerPolicy="no-referrer" />
    )
  );

  const renderCard = (item: AlbumImage) => (
    <button
      key={item.id}
      onClick={() => setZoomImage(item)}
      className="album-media-card relative overflow-hidden rounded-[24px] border border-white bg-white text-left shadow-sm active:scale-[0.98] transition-transform"
    >
      {renderMedia(item, `w-full ${item.mediaType === 'video' ? 'h-56' : item.height || 'h-64'} object-cover`)}
      {item.mediaType === 'video' && (
        <div className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white">
          <Video size={15} />
        </div>
      )}
      {item.isFeatured && (
        <div className="absolute right-3 top-3 rounded-full bg-white/90 px-2 py-1 text-[9px] font-black text-pink-500 shadow-sm">
          精选
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-4">
        <p className="text-[11px] font-black text-white line-clamp-1">{item.title}</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-white/80">
            <Heart size={11} className={item.likedByMe ? 'fill-pink-400 text-pink-400' : 'text-white/70'} />
            <span className="text-[9px] font-bold">{item.likeCount || 0}</span>
            <MessageCircle size={11} />
            <span className="text-[9px] font-bold">{item.comments?.length || 0}</span>
          </div>
          <span className="rounded-full bg-white/25 px-2 py-0.5 text-[8px] font-bold text-white flex items-center gap-1">
            {getCategoryIcon(item.category || '日常', 'w-2.5 h-2.5')}
            <span>{item.category || '日常'}</span>
          </span>
        </div>
      </div>
    </button>
  );

  return (
    <div className={`${viewMode === 'map' ? 'flex h-full min-h-0 flex-col' : 'min-h-full lg:flex lg:h-full lg:min-h-0 lg:flex-col'} bg-[#FEF9F3]/30`}>
      {viewMode !== 'map' && (
        <div className="sticky top-0 z-30 bg-[#FEF9F3] pb-3">
          <header className="px-6 pt-7 pb-3">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-gray-800">时光相册</h1>
                <p className="mt-1 text-xs font-bold uppercase tracking-widest text-gray-400">Photos, videos and tiny echoes</p>
              </div>
              <div className="flex gap-2">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={openPosterConfig}
                  disabled={isGeneratingPoster}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white bg-white text-amber-500 shadow-sm disabled:opacity-60"
                  title="生成情侣海报"
                >
                  {isGeneratingPoster ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-amber-100 border-t-amber-500" /> : <Sparkles size={19} />}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowAdd(true)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-500 text-white shadow-lg shadow-pink-100"
                >
                  <Plus size={20} />
                </motion.button>
              </div>
            </div>

          </header>

          <div className="shrink-0 px-6">
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {['全部', ...CATEGORIES].map((folder) => (
                <button
                  key={folder}
                  onClick={() => setActiveCategory(folder)}
                  className={`min-h-10 shrink-0 rounded-2xl px-4 text-[10px] font-black transition-all flex items-center gap-1.5 ${
                    activeCategory === folder
                      ? 'bg-pink-500 text-white shadow-md shadow-pink-100'
                      : 'bg-white text-gray-500 border border-pink-50'
                  }`}
                >
                  {getCategoryIcon(folder, 'w-3.5 h-3.5')}
                  <span>{folder}</span>
                  <span className="opacity-70">{categoryStats[folder] || 0}</span>
                </button>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-3 rounded-2xl bg-white/70 p-1 text-[11px] font-black text-gray-400">
              <button
                onClick={() => setViewMode('wall')}
                className={`min-h-10 rounded-xl ${viewMode === 'wall' ? 'bg-pink-500 text-white shadow-sm' : ''}`}
              >
                照片墙
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`min-h-10 rounded-xl ${viewMode === 'timeline' ? 'bg-pink-500 text-white shadow-sm' : ''}`}
              >
                时间线
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`min-h-10 rounded-xl ${viewMode === 'map' ? 'bg-pink-500 text-white shadow-sm' : ''}`}
              >
                足迹地图
              </button>
            </div>
            {/* Date range filter capsules */}
            <div className="mt-3 flex flex-col gap-2.5">
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {(['all', 'week', 'month', 'custom'] as const).map((type) => {
                  const labels = { all: '全部时间', week: '本周', month: '本月', custom: '自定义' };
                  const selected = filterType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFilterType(type)}
                      className={`shrink-0 rounded-full px-3.5 py-1.5 text-[10px] font-black transition-all duration-200 border ${
                        selected
                          ? 'bg-gradient-to-r from-pink-400 to-pink-500 text-white border-transparent shadow-sm'
                          : 'bg-pink-50/40 text-pink-400 border-pink-100/20 hover:bg-pink-50/65'
                      }`}
                    >
                      {labels[type]}
                    </button>
                  );
                })}
              </div>
              {filterType === 'custom' && (
                <motion.div 
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2"
                >
                  <div className="relative flex items-center flex-1 rounded-2xl border border-pink-100/50 bg-white/80 px-3 py-1.5 shadow-xs focus-within:border-pink-300 focus-within:ring-1 focus-within:ring-pink-100/30 transition-all">
                    <Calendar size={13} className="text-pink-400 mr-2 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="block text-[8px] font-black uppercase text-gray-400 leading-none">开始日期</span>
                      <input
                        type="date"
                        className="w-full bg-transparent text-[10px] font-black text-gray-700 outline-none mt-0.5 cursor-pointer"
                        value={startDateFilter}
                        onChange={(e) => setStartDateFilter(e.target.value)}
                      />
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 shrink-0 px-0.5">至</span>
                  <div className="relative flex items-center flex-1 rounded-2xl border border-pink-100/50 bg-white/80 px-3 py-1.5 shadow-xs focus-within:border-pink-300 focus-within:ring-1 focus-within:ring-pink-100/30 transition-all">
                    <Calendar size={13} className="text-pink-400 mr-2 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="block text-[8px] font-black uppercase text-gray-400 leading-none">结束日期</span>
                      <input
                        type="date"
                        className="w-full bg-transparent text-[10px] font-black text-gray-700 outline-none mt-0.5 cursor-pointer"
                        value={endDateFilter}
                        onChange={(e) => setEndDateFilter(e.target.value)}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className={viewMode === 'map' ? 'flex-1 min-h-0 overflow-hidden' : 'pb-28 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:scrollbar-hide'}>
        {viewMode !== 'map' && (
          <section className="px-6 pt-4">
            <div className="rounded-[28px] border border-white/70 bg-white/80 p-4 shadow-sm">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-xl font-black text-gray-800">{data.length}</p>
                  <p className="text-[9px] font-black text-gray-400">全部回忆</p>
                </div>
                <div>
                  <p className="text-xl font-black text-pink-500">{data.filter(item => item.mediaType === 'video').length}</p>
                  <p className="text-[9px] font-black text-gray-400">视频片段</p>
                </div>
                <div>
                  <p className="text-xl font-black text-amber-500">{data.filter(item => item.isFeatured).length}</p>
                  <p className="text-[9px] font-black text-gray-400">首页精选</p>
                </div>
              </div>
            </div>
          </section>
        )}
        {featuredItems.length > 0 && viewMode === 'wall' && (
          <section className="px-6 pt-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-black text-gray-800">精选照片墙</h2>
              <span className="text-[10px] font-bold text-gray-400">会同步到首页</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {featuredItems.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => setZoomImage(item)}
                  className={`relative overflow-hidden rounded-2xl bg-white shadow-sm ${index === 0 ? 'col-span-2 row-span-2 aspect-square' : 'aspect-square'}`}
                >
                  {renderMedia(item, 'h-full w-full object-cover')}
                  {item.mediaType === 'video' && <Video size={14} className="absolute left-2 top-2 text-white drop-shadow" />}
                </button>
              ))}
            </div>
          </section>
        )}

        <AnimatePresence mode="popLayout">
          {(isLoading || isDataLoading) && filteredData.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center p-20 text-center"
            >
              <div className="mb-4 h-12 w-12 animate-pulse rounded-2xl bg-pink-100" />
              <p className="text-sm font-bold text-gray-400">正在加载相册...</p>
            </motion.div>
          ) : filteredData.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center p-20 text-center"
            >
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-pink-50 text-pink-200">
                <ImageIcon size={32} />
              </div>
              <p className="text-sm font-bold text-gray-400">这个分类下还没有回忆</p>
              <button onClick={() => setShowAdd(true)} className="mt-4 text-xs font-black uppercase tracking-widest text-pink-500">
                去上传第一段吧
              </button>
            </motion.div>
          ) : viewMode === 'wall' ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 grid grid-cols-2 gap-4 px-4">
              <div className="flex flex-col gap-4">
                {filteredData.filter((_, i) => i % 2 === 0).map(renderCard)}
              </div>
              <div className="flex flex-col gap-4">
                {filteredData.filter((_, i) => i % 2 !== 0).map(renderCard)}
              </div>
            </motion.div>
          ) : viewMode === 'map' ? (
            <AlbumFootprintMap
              items={filteredData}
              onOpenImage={setZoomImage}
              onAddLocation={startLocationCalibration}
              onClose={() => setViewMode('wall')}
            />
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 space-y-7 px-6">
              {timelineGroups.map(([month, items]) => (
                <section key={month} className="relative border-l-2 border-pink-100 pl-5">
                  <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full border-4 border-[#FEF9F3] bg-pink-500" />
                  <div className="mb-3 flex items-center gap-2">
                    <CalendarDays size={16} className="text-pink-500" />
                    <h2 className="text-sm font-black text-gray-800">{month}</h2>
                  </div>
                  <div className="space-y-3">
                    {items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setZoomImage(item)}
                        className="flex w-full gap-3 rounded-2xl border border-white bg-white/75 p-3 text-left shadow-sm"
                      >
                        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-pink-50">
                          {renderMedia(item, 'h-full w-full object-cover')}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-gray-800">{item.title}</p>
                          <p className="mt-1 line-clamp-2 text-[11px] font-bold text-gray-400">{item.description || '没有写描述，也是一段很珍贵的回忆'}</p>
                          <div className="mt-2 flex items-center gap-2 text-[9px] font-black text-gray-400">
                            <span>{formatDisplayDateTime(item.date)}</span>
                            <span className="rounded-full bg-pink-50 px-2 py-0.5 text-pink-500 flex items-center gap-1">
                              {getCategoryIcon(item.category, 'w-2.5 h-2.5')}
                              <span>{item.category}</span>
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeAddModal}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="relative max-h-[88vh] w-full max-w-sm overflow-y-auto rounded-[36px] bg-white p-6 shadow-2xl scrollbar-hide"
            >
              <button onClick={closeAddModal} className="absolute right-5 top-5 text-gray-300">
                <X size={20} />
              </button>
              <h2 className="mb-5 text-xl font-black text-gray-800">上传甜蜜时刻</h2>
              <div className="space-y-4">
                <Upload
                  value={selectedPreview || undefined}
                  onChange={(val) => {
                    if (val === null) {
                      setSelectedPreview(null);
                      setSelectedFile(null);
                    }
                  }}
                  onFileSelect={(file) => {
                    if (file && !Array.isArray(file)) {
                      handleMediaSelect(file);
                    }
                  }}
                  autoUpload={false}
                  accept="image/*,video/*"
                  placeholder="选择图片或视频"
                  disabled={isUploading}
                />

                <input
                  type="text"
                  placeholder="回忆标题"
                  className="w-full rounded-2xl border border-pink-100 bg-pink-50/30 p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-pink-100"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
                <textarea
                  placeholder="写一点当时的心情..."
                  className="h-24 w-full resize-none rounded-2xl border border-pink-100 bg-pink-50/30 p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-pink-100"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setNewCategory(cat)}
                      className={`shrink-0 rounded-full px-4 py-2 text-[10px] font-black transition-all flex items-center gap-1 ${
                        newCategory === cat ? 'bg-pink-500 text-white shadow-md shadow-pink-100' : 'bg-pink-50 text-pink-400'
                      }`}
                    >
                      {getCategoryIcon(cat, 'w-3 h-3')}
                      <span>{cat}</span>
                    </button>
                  ))}
                </div>

                {/* Date & Time Picker */}
                <div className="relative">
                  <input 
                    type="datetime-local" 
                    className="w-full rounded-2xl border border-pink-100 bg-pink-50/30 p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-pink-100 text-gray-700"
                    value={dateTime}
                    onChange={(e) => setDateTime(e.target.value)}
                  />
                </div>

                <div className="rounded-2xl border border-pink-100 bg-pink-50/30 p-3">
                  <button
                    type="button"
                    onClick={openUploadLocationPicker}
                    className="flex w-full items-center gap-3 text-left"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-pink-400 shadow-sm">
                      <MapPin size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-black text-gray-700">{selectedLocation ? '已选择地点' : '选择地点'}</span>
                      <span className="mt-1 block truncate text-[10px] font-bold text-gray-400">
                        {isReadingExifLocation ? '正在读取照片定位...' : selectedLocation?.address || '可选，给这段回忆点亮足迹'}
                      </span>
                      {(selectedLocation?.locationSource || isReadingExifLocation) && (
                        <span className="mt-2 inline-flex rounded-full bg-white px-2 py-1 text-[9px] font-black text-pink-500 shadow-sm">
                          {isReadingExifLocation ? '解析中' : LOCATION_SOURCE_LABELS[selectedLocation!.locationSource!]}
                        </span>
                      )}
                    </span>
                  </button>
                  {selectedLocation && (
                    <button
                      type="button"
                      onClick={() => setSelectedLocation(null)}
                      className="mt-2 text-[10px] font-black text-pink-400"
                    >
                      清除地点
                    </button>
                  )}
                </div>
                <button
                  onClick={handleAdd}
                  disabled={!selectedFile || !newTitle.trim() || isUploading}
                  className="mt-2 w-full rounded-2xl bg-pink-500 py-4 font-bold text-white shadow-lg shadow-pink-100 transition-all active:scale-95 disabled:opacity-50 disabled:shadow-none"
                >
                  {isUploading ? '正在上传...' : '确认上传'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {zoomImage && (
          <div className="fixed inset-0 z-[150] flex items-end justify-center sm:items-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeDetailModal}
              className="absolute inset-0 bg-black/88 backdrop-blur-md"
            />
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-[36px] bg-white p-4 shadow-2xl scrollbar-hide sm:rounded-[36px]"
            >
              {isCalibrationActive && (
                <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-pink-50 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-pink-400">连续校准</p>
                    <p className="mt-0.5 truncate text-xs font-black text-gray-700">
                      第 {activeCalibrationStep} / {calibrationTotalCount} 张
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-white px-3 py-1.5 text-[10px] font-black text-pink-500 shadow-sm">
                    还剩 {calibrationRemainingCount} 张
                  </span>
                </div>
              )}
              <div className="relative overflow-hidden rounded-[28px] bg-gray-950 flex items-center justify-center min-h-[300px]">
                {zoomImage.mediaType === 'video' ? (
                  <video src={buildImageUrl(zoomImage.src)} className="max-h-[48vh] w-full object-contain relative z-10" controls autoPlay />
                ) : (
                  <>
                    <div 
                      className="absolute inset-0 bg-cover bg-center blur-2xl opacity-35 scale-110 select-none pointer-events-none"
                      style={{ backgroundImage: `url(${buildImageUrl(zoomImage.src)})` }}
                    />
                    <AppImage 
                      src={zoomImage.src} 
                      alt={zoomImage.title} 
                      className="max-h-[48vh] w-auto max-w-full object-contain relative z-10" 
                      width={1080} 
                      height={810} 
                      sizes="(min-width: 768px) 480px, 100vw" 
                      referrerPolicy="no-referrer" 
                    />
                  </>
                )}
              </div>
              <div className="px-2 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-black text-gray-800">{zoomImage.title}</h3>
                    {isEditingDateTime ? (
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          type="datetime-local"
                          className="bg-white rounded-lg border border-pink-100 p-1 text-[10px] font-medium outline-none text-gray-700 shadow-sm"
                          value={editDateTimeVal}
                          onChange={(e) => setEditDateTimeVal(e.target.value)}
                        />
                        <button
                          onClick={async () => {
                            setBusyId(zoomImage.id);
                            try {
                              const updated = await onUpdate(zoomImage.id, { date: new Date(editDateTimeVal).toISOString() });
                              setData((current) => current.map((item) => item.id === updated.id ? { ...item, ...updated } : item));
                              setZoomImage(updated);
                              setIsEditingDateTime(false);
                              showToast('时刻已更新', 'success');
                            } catch (err) {
                              console.error('Update image datetime failed:', err);
                              showToast('更新时刻失败，请稍后重试', 'error');
                            } finally {
                              setBusyId(null);
                            }
                          }}
                          disabled={busyId === zoomImage.id}
                          className="rounded bg-pink-500 px-2 py-0.5 text-[9px] font-black text-white hover:bg-pink-600"
                        >
                          保存
                        </button>
                        <button
                          onClick={() => setIsEditingDateTime(false)}
                          className="rounded bg-gray-100 px-2 py-0.5 text-[9px] font-black text-gray-500 hover:bg-gray-200"
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <div className="mt-1 flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
                        <span>{formatDisplayDateTime(zoomImage.date)} · {zoomImage.category}</span>
                        <button
                          onClick={() => {
                            setEditDateTimeVal(getLocalDateTimeString(new Date(zoomImage.date)));
                            setIsEditingDateTime(true);
                          }}
                          className="text-pink-400 hover:text-pink-600 p-0.5 rounded transition-colors"
                          title="修改时刻"
                        >
                          <Edit3 size={11} className="inline" />
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleToggleFeatured(zoomImage)}
                    disabled={busyId === zoomImage.id}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-black ${zoomImage.isFeatured ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-500'}`}
                  >
                    <Star size={11} className="mr-1 inline" />
                    {zoomImage.isFeatured ? '已精选' : '设为精选'}
                  </button>
                </div>
                <p className="mt-3 text-sm font-bold leading-relaxed text-gray-500">
                  {zoomImage.description || '这段回忆还没有描述。'}
                </p>
                <div className="mt-4 rounded-2xl bg-gray-50 p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-pink-400 shadow-sm">
                      <MapIcon size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-black text-gray-700">
                        {zoomImage.locationAddress || '还没有地点'}
                      </p>
                      <p className="mt-0.5 text-[9px] font-bold text-gray-400">
                        {typeof zoomImage.lat === 'number' && typeof zoomImage.lng === 'number'
                          ? `${zoomImage.lat.toFixed(5)}, ${zoomImage.lng.toFixed(5)} · GCJ-02`
                          : '补充位置后会出现在足迹地图'}
                      </p>
                      {(zoomImage.locationSource || zoomImage.locationPoiName || typeof zoomImage.locationAccuracyMeters === 'number') && (
                        <p className="mt-1 truncate text-[9px] font-black text-pink-400">
                          {zoomImage.locationSource ? LOCATION_SOURCE_LABELS[zoomImage.locationSource] : '地点信息'}
                          {zoomImage.locationPoiName ? ` · ${zoomImage.locationPoiName}` : ''}
                          {typeof zoomImage.locationAccuracyMeters === 'number' ? ` · 约 ${Math.round(zoomImage.locationAccuracyMeters)} 米` : ''}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={openDetailLocationPicker}
                      disabled={busyId === zoomImage.id}
                      className="shrink-0 rounded-xl bg-pink-500 px-3 py-2 text-[10px] font-black text-white disabled:opacity-50"
                    >
                      {isCalibrationActive ? '校准这张' : (zoomImage.locationAddress ? '修改' : '补充')}
                    </button>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => handleToggleLike(zoomImage)}
                    disabled={busyId === zoomImage.id}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-xs font-black ${zoomImage.likedByMe ? 'bg-pink-500 text-white' : 'bg-pink-50 text-pink-500'}`}
                  >
                    <Heart size={16} className={zoomImage.likedByMe ? 'fill-white' : ''} />
                    {zoomImage.likeCount || 0}
                  </button>
                  <button
                    onClick={() => handleDelete(zoomImage)}
                    disabled={deletingId === zoomImage.id}
                    className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 hover:text-red-400"
                    title="删除"
                  >
                    {deletingId === zoomImage.id ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-red-400" /> : <Trash2 size={17} />}
                  </button>
                </div>

                <div className="mt-5">
                  <h4 className="mb-3 flex items-center gap-2 text-xs font-black text-gray-700">
                    <MessageCircle size={14} className="text-pink-400" />
                    照片留言
                  </h4>
                  <div className="space-y-2">
                    {(zoomImage.comments || []).length === 0 ? (
                      <div className="rounded-2xl bg-gray-50 p-4 text-center text-[11px] font-bold text-gray-400">还没有留言，写下第一句吧</div>
                    ) : (
                      zoomImage.comments?.map((comment) => (
                        <div key={comment.id} className="rounded-2xl bg-gray-50 p-3">
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-[10px] font-black text-gray-600">{comment.user?.username || '我们'}</span>
                            <span className="text-[9px] font-bold text-gray-300">{new Date(comment.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-xs font-bold leading-relaxed text-gray-500">{comment.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <input
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                      placeholder="写一句照片留言..."
                      className="min-w-0 flex-1 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-pink-100"
                    />
                    <button
                      onClick={handleAddComment}
                      disabled={!commentText.trim() || busyId === zoomImage.id}
                      className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pink-500 text-white disabled:opacity-50"
                    >
                      <Send size={15} />
                    </button>
                  </div>
                </div>
              </div>
              <button onClick={closeDetailModal} className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur">
                <X size={18} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLocationPicker && (
          <div key={`${locationTarget}-${zoomImage?.id || 'new'}`}>
            <MapPicker
              onClose={closeLocationModal}
              onSelect={handleLocationSelect}
              initialLocation={locationPickerInitialLocation}
              title={isCalibrationActive ? '校准足迹地点' : undefined}
              confirmLabel={isCalibrationActive ? (calibrationRemainingCount > 1 ? '保存并下一张' : '保存并完成') : undefined}
            />
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isPosterConfigOpen && (
          <div className="fixed inset-0 z-[165] flex items-end justify-center p-4 sm:items-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isGeneratingPoster && closePosterConfigModal()}
              className="absolute inset-0 bg-black/35 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: 80, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 80, opacity: 0, scale: 0.98 }}
              className="relative max-h-[90vh] w-full max-w-md overflow-hidden rounded-[34px] bg-white shadow-2xl"
            >
              <div className="border-b border-pink-50 bg-gradient-to-br from-pink-50 via-white to-amber-50 px-6 py-5">
                <button
                  onClick={closePosterConfigModal}
                  disabled={isGeneratingPoster}
                  className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-gray-400 shadow-sm disabled:opacity-50"
                >
                  <X size={18} />
                </button>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-amber-500 shadow-sm">
                  <Sparkles size={22} />
                </div>
                <h2 className="mt-4 text-xl font-black text-gray-800">生成回忆海报</h2>
                <p className="mt-1 text-[11px] font-bold text-gray-400">
                  已选择 {selectedPosterImages.length}/{POSTER_MAX_IMAGES} 张照片
                </p>
              </div>

              <div className="max-h-[62vh] space-y-5 overflow-y-auto px-6 py-5 scrollbar-hide">
                <div className="space-y-3">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400">海报标题</label>
                  <input
                    value={posterTitle}
                    onChange={(e) => setPosterTitle(e.target.value)}
                    placeholder={couple?.name || 'Sweet Love'}
                    className="w-full rounded-2xl border border-pink-100 bg-pink-50/30 px-4 py-3 text-sm font-black text-gray-800 outline-none focus:ring-2 focus:ring-pink-100"
                  />
                  <textarea
                    value={posterSubtitle}
                    onChange={(e) => setPosterSubtitle(e.target.value)}
                    placeholder={DEFAULT_POSTER_SUBTITLE}
                    className="h-20 w-full resize-none rounded-2xl border border-pink-100 bg-pink-50/30 px-4 py-3 text-sm font-bold text-gray-600 outline-none focus:ring-2 focus:ring-pink-100"
                  />
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-xs font-black text-gray-800">选择照片</h3>
                    <span className="text-[10px] font-bold text-gray-400">视频不会出现在海报里</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {posterImageCandidates.map((item) => {
                      const selectedIndex = selectedPosterImageIds.indexOf(item.id);
                      const isSelected = selectedIndex >= 0;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => togglePosterImage(item)}
                          className={`relative aspect-square overflow-hidden rounded-2xl border-2 bg-pink-50 text-left transition-all ${
                            isSelected ? 'border-pink-500 shadow-lg shadow-pink-100' : 'border-white'
                          }`}
                        >
                          <AppImage src={item.src} alt={item.title} className="h-full w-full object-cover" width={240} height={240} crop="square" sizes="120px" referrerPolicy="no-referrer" />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                            <p className="truncate text-[9px] font-black text-white">{item.title}</p>
                          </div>
                          {isSelected && (
                            <span className="absolute right-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-pink-500 px-1.5 text-[10px] font-black text-white shadow">
                              {selectedIndex + 1}
                            </span>
                          )}
                          {item.isFeatured && (
                            <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[8px] font-black text-amber-500 shadow-sm">
                              精选
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 border-t border-pink-50 bg-white px-6 py-4">
                <button
                  onClick={closePosterConfigModal}
                  disabled={isGeneratingPoster}
                  className="flex h-12 w-20 items-center justify-center rounded-2xl bg-gray-100 text-xs font-black text-gray-500 disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  onClick={generatePoster}
                  disabled={selectedPosterImages.length === 0 || isGeneratingPoster}
                  className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-pink-500 text-xs font-black text-white shadow-lg shadow-pink-100 disabled:opacity-50 disabled:shadow-none"
                >
                  {isGeneratingPoster ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-pink-100 border-t-white" />
                      正在生成
                    </>
                  ) : (
                    <>
                      <Sparkles size={15} />
                      生成海报
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isPosterOpen && posterUrl && (
          <div className="fixed inset-0 z-[170] flex items-center justify-center p-5">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closePosterModal}
              className="absolute inset-0 bg-black/70 backdrop-blur"
            />
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              className="relative w-full max-w-sm rounded-[30px] bg-white p-4 shadow-2xl"
            >
              <img src={posterUrl} alt="Sweet love poster" className="max-h-[76vh] w-full rounded-2xl object-contain" />
              <div className="mt-4 flex gap-2">
                <a
                  href={posterUrl}
                  download={`sweet-love-poster-${new Date().toISOString().split('T')[0]}.png`}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-pink-500 py-3 text-xs font-black text-white"
                >
                  <Download size={15} />
                  保存海报
                </a>
                <button onClick={closePosterModal} className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-100 text-gray-500">
                  <X size={18} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
