import { useEffect, useMemo, useRef, useState } from 'react';
import AMapLoader from '@amap/amap-jsapi-loader';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Image as ImageIcon, Loader2, MapPin, Navigation, Video, X } from 'lucide-react';
import { AlbumImage } from '../types';
import { AMAP_KEY, configureAmapSecurity, hasValidAmapKey } from '../lib/amap';
import { useModalHistory } from '../hooks/useModalHistory';
import { AppImage } from './AppImage';
import { buildImageUrl } from '../lib/imageUrl';

configureAmapSecurity();

type LocatedAlbumImage = AlbumImage & { lat: number; lng: number };

interface Cluster {
  id: string;
  items: LocatedAlbumImage[];
  lat: number;
  lng: number;
}

interface AlbumFootprintMapProps {
  items: AlbumImage[];
  missingCount?: number;
  onOpenImage: (image: AlbumImage) => void;
  onAddLocation: () => void;
  onClose: () => void;
}

const CLUSTER_DISTANCE = 72;

function hasLocation(item: AlbumImage): item is LocatedAlbumImage {
  return typeof item.lat === 'number' && typeof item.lng === 'number';
}

function clusterCenter(items: LocatedAlbumImage[]) {
  return {
    lat: items.reduce((sum, item) => sum + item.lat, 0) / items.length,
    lng: items.reduce((sum, item) => sum + item.lng, 0) / items.length,
  };
}

function createMarkerContent(cluster: Cluster) {
  const first = cluster.items[0];
  const root = document.createElement('div');
  root.className = 'album-footprint-marker';

  const media = first.mediaType === 'video' ? document.createElement('video') : document.createElement('img');
  media.src = first.src;
  if (media instanceof HTMLImageElement) media.alt = first.title;
  if (media instanceof HTMLVideoElement) {
    media.muted = true;
    media.playsInline = true;
    media.preload = 'metadata';
  }
  media.className = 'album-footprint-marker-media';
  root.appendChild(media);

  if (first.mediaType === 'video') {
    const video = document.createElement('div');
    video.className = 'album-footprint-marker-video';
    video.textContent = '▶';
    root.appendChild(video);
  }

  if (cluster.items.length > 1) {
    const badge = document.createElement('div');
    badge.className = 'album-footprint-marker-badge';
    badge.textContent = String(cluster.items.length);
    root.appendChild(badge);
  }

  return root;
}

export default function AlbumFootprintMap({ items, missingCount: missingCountOverride, onOpenImage, onAddLocation, onClose }: AlbumFootprintMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const amapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const redrawTimerRef = useRef<number | null>(null);
  const locatedItems = useMemo(() => items.filter(hasLocation), [items]);
  const missingCount = missingCountOverride ?? Math.max(items.length - locatedItems.length, 0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
  const closeClusterModal = useModalHistory('album-footprint-cluster', Boolean(selectedCluster), () => setSelectedCluster(null));

  const clearMarkers = () => {
    if (mapRef.current && markersRef.current.length) {
      mapRef.current.remove(markersRef.current);
    }
    markersRef.current = [];
  };

  const drawClusters = (fitToView = false) => {
    const AMap = amapRef.current;
    const map = mapRef.current;
    if (!AMap || !map) return;

    if (redrawTimerRef.current) {
      window.clearTimeout(redrawTimerRef.current);
      redrawTimerRef.current = null;
    }

    clearMarkers();
    if (locatedItems.length === 0) return;

    const clusters: Cluster[] = [];
    locatedItems.forEach((item) => {
      const point = map.lngLatToContainer([item.lng, item.lat]);
      const match = clusters.find((cluster) => {
        const clusterPoint = map.lngLatToContainer([cluster.lng, cluster.lat]);
        const dx = point.x - clusterPoint.x;
        const dy = point.y - clusterPoint.y;
        return Math.sqrt(dx * dx + dy * dy) <= CLUSTER_DISTANCE;
      });

      if (match) {
        match.items.push(item);
        const center = clusterCenter(match.items);
        match.lat = center.lat;
        match.lng = center.lng;
        match.id = match.items.map((clusterItem) => clusterItem.id).join('-');
      } else {
        clusters.push({ id: item.id, items: [item], lat: item.lat, lng: item.lng });
      }
    });

    markersRef.current = clusters.map((cluster) => {
      const marker = new AMap.Marker({
        position: [cluster.lng, cluster.lat],
        content: createMarkerContent(cluster),
        anchor: 'center',
        zIndex: 20,
      });
      marker.on('click', () => {
        if (cluster.items.length === 1) {
          onOpenImage(cluster.items[0]);
          return;
        }
        setSelectedCluster(cluster);
      });
      return marker;
    });

    map.add(markersRef.current);
    if (fitToView && markersRef.current.length > 0) {
      map.setFitView(markersRef.current, false, [96, 32, 140, 32], locatedItems.length === 1 ? 14 : undefined);
    }
  };

  useEffect(() => {
    if (!hasValidAmapKey || !mapContainerRef.current || locatedItems.length === 0) return;

    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;
    let timers: number[] = [];

    const initMap = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const AMap = await AMapLoader.load({
          key: AMAP_KEY,
          version: '2.0',
          plugins: ['AMap.Marker'],
        });
        if (disposed || !mapContainerRef.current || locatedItems.length === 0) return;

        amapRef.current = AMap;
        const first = locatedItems[0];
        const map = new AMap.Map(mapContainerRef.current, {
          viewMode: '3D',
          zoom: locatedItems.length === 1 ? 14 : 9,
          center: [first.lng, first.lat],
          dragEnable: true,
          zoomEnable: true,
          touchZoom: true,
          doubleClickZoom: true,
          scrollWheel: true,
          jogEnable: true,
          animateEnable: true,
          mapStyle: 'amap://styles/normal',
        });
        mapRef.current = map;

        const redraw = () => drawClusters(false);
        const redrawAndFit = () => {
          map.resize?.();
          drawClusters(true);
        };
        map.on('zoomend', redraw);
        map.on('moveend', redraw);
        map.on('complete', redrawAndFit);

        resizeObserver = new ResizeObserver(() => {
          if (disposed) return;
          map.resize?.();
          drawClusters(false);
        });
        resizeObserver.observe(mapContainerRef.current);
        timers = [80, 260, 700].map((delay) => window.setTimeout(redrawAndFit, delay));
      } catch (error) {
        console.error('Album footprint map init error:', error);
        setLoadError(error instanceof Error ? error.message : '地图加载失败');
      } finally {
        setIsLoading(false);
      }
    };

    initMap();

    return () => {
      disposed = true;
      timers.forEach((timer) => window.clearTimeout(timer));
      resizeObserver?.disconnect();
      if (redrawTimerRef.current) window.clearTimeout(redrawTimerRef.current);
      clearMarkers();
      mapRef.current?.destroy();
      mapRef.current = null;
      amapRef.current = null;
    };
  }, [locatedItems, onOpenImage]);

  useEffect(() => {
    if (!mapRef.current || !amapRef.current) return;
    redrawTimerRef.current = window.setTimeout(() => drawClusters(true), 50);
  }, [locatedItems]);

  if (locatedItems.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-full flex-col bg-[#FEF9F3] px-6 py-6">
        <button onClick={onClose} className="mb-6 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-gray-500 shadow-sm">
          <ArrowLeft size={20} />
        </button>
        <div className="flex flex-1 flex-col items-center justify-center rounded-[32px] border border-white bg-white/75 p-8 text-center shadow-sm">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-pink-50 text-pink-300">
            <MapPin size={30} />
          </div>
          <p className="text-sm font-black text-gray-700">还没有带地点的回忆</p>
          <p className="mt-2 max-w-[220px] text-[11px] font-bold leading-relaxed text-gray-400">
            {items.length > 0 ? '先给一段旧回忆补充位置，就能在地图上点亮第一枚足迹。' : '上传时选择地点，或者打开旧照片补充位置，就能在地图上点亮足迹。'}
          </p>
          {items.length > 0 && (
            <span className="mt-4 rounded-full bg-pink-50 px-3 py-1.5 text-[10px] font-black text-pink-500">
              还剩 {missingCount} 张待校准
            </span>
          )}
          <button onClick={onAddLocation} className="mt-5 rounded-2xl bg-pink-500 px-5 py-3 text-xs font-black text-white shadow-lg shadow-pink-100">
            {items.length > 0 ? '开始连续校准' : '上传带地点的回忆'}
          </button>
        </div>
      </motion.div>
    );
  }

  if (!hasValidAmapKey) {
    return (
      <div className="flex h-full flex-col bg-[#FEF9F3] px-6 py-6">
        <button onClick={onClose} className="mb-6 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-gray-500 shadow-sm">
          <ArrowLeft size={20} />
        </button>
        <div className="flex flex-1 flex-col items-center justify-center rounded-[32px] border border-white bg-white/80 p-8 text-center shadow-sm">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-pink-50 text-pink-400">
            <Navigation size={30} />
          </div>
          <p className="text-sm font-black text-gray-700">需要配置高德地图密钥</p>
          <p className="mt-2 text-[11px] font-bold leading-relaxed text-gray-400">
            请配置 VITE_AMAP_KEY 和 VITE_AMAP_SECURITY_CODE 后再查看足迹地图。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-0 overflow-hidden bg-[#EEF3EC]">
      <div ref={mapContainerRef} className="absolute inset-0 z-0 h-full w-full" />

      <div className="pointer-events-none absolute left-4 right-4 top-5 z-20 flex items-center justify-between gap-3">
        <button
          onClick={onClose}
          className="pointer-events-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/95 text-gray-600 shadow-xl backdrop-blur active:scale-95"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="min-w-0 flex-1 rounded-2xl bg-white/90 px-4 py-3 shadow-xl backdrop-blur">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Footprints</p>
          <p className="truncate text-sm font-black text-gray-800">
            {locatedItems.length} / {items.length} 段已定位{missingCount > 0 ? ` · 还剩 ${missingCount} 张` : ' · 已完成'}
          </p>
        </div>
        {missingCount > 0 ? (
          <button
            onClick={onAddLocation}
            className="pointer-events-auto flex h-11 shrink-0 items-center gap-1 rounded-2xl bg-pink-500 px-3 text-[10px] font-black text-white shadow-xl shadow-pink-200 active:scale-95"
          >
            <MapPin size={14} />
            补全 {missingCount}
          </button>
        ) : isLoading && (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/95 text-pink-500 shadow-xl backdrop-blur">
            <Loader2 size={19} className="animate-spin" />
          </div>
        )}
      </div>

      {loadError && (
        <div className="absolute inset-x-4 bottom-28 z-20 rounded-2xl bg-white/95 p-4 text-xs font-bold leading-relaxed text-red-400 shadow-xl">
          {loadError}
        </div>
      )}

      <AnimatePresence>
        {selectedCluster && (
          <div className="fixed inset-0 z-[160] flex items-end justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeClusterModal}
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: 90, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 90, opacity: 0 }}
              className="relative mb-20 max-h-[75vh] w-full max-w-sm overflow-y-auto rounded-[30px] bg-white p-5 shadow-2xl scrollbar-hide"
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-gray-800">这里有 {selectedCluster.items.length} 段回忆</p>
                  <p className="mt-1 text-[10px] font-bold text-gray-400">选择一张打开详情</p>
                </div>
                <button onClick={closeClusterModal} className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
                  <X size={18} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {selectedCluster.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      onOpenImage(item);
                    }}
                    className="overflow-hidden rounded-2xl bg-gray-50 text-left"
                  >
                    <div className="relative h-28">
                      {item.mediaType === 'video' ? (
                        <video src={buildImageUrl(item.src)} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                      ) : (
                        <AppImage src={item.src} alt={item.title} className="h-full w-full object-cover" width={320} height={224} crop="cover" sizes="320px" referrerPolicy="no-referrer" />
                      )}
                      {item.mediaType === 'video' && (
                        <div className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur">
                          <Video size={13} />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="truncate text-xs font-black text-gray-800">{item.title}</p>
                      <p className="mt-1 flex items-center gap-1 truncate text-[9px] font-bold text-gray-400">
                        <ImageIcon size={10} />
                        {item.date}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
