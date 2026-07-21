import { useState, useEffect, useRef } from 'react';
import AMapLoader from '@amap/amap-jsapi-loader';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, X, Check, Loader2, Navigation, Search } from 'lucide-react';
import { AMAP_KEY, configureAmapSecurity, hasValidAmapKey } from '../lib/amap';
import { AlbumLocationData } from '../types';

configureAmapSecurity();

interface MapPickerProps {
  onSelect: (location: AlbumLocationData) => void;
  onClose: () => void;
  initialLocation?: Partial<AlbumLocationData> & { lat: number; lng: number };
  title?: string;
  confirmLabel?: string;
}

const SOURCE_LABELS: Record<NonNullable<AlbumLocationData['locationSource']>, string> = {
  exif: '照片定位',
  amap_geolocation: '当前定位',
  amap_poi: '高德地点',
  manual_pin: '手动校准',
};

export default function MapPicker({ onSelect, onClose, initialLocation, title = '高德选点', confirmLabel = '确认这个位置' }: MapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [marker, setMarker] = useState<any>(null);
  const [address, setAddress] = useState('正在获取地址...');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [currentPos, setCurrentPos] = useState<AlbumLocationData>({
    address: initialLocation?.address || '正在获取地址...',
    lat: initialLocation?.lat ?? 39.9042,
    lng: initialLocation?.lng ?? 116.4074,
    locationSource: initialLocation?.locationSource,
    locationAccuracyMeters: initialLocation?.locationAccuracyMeters,
    locationPoiId: initialLocation?.locationPoiId,
    locationPoiName: initialLocation?.locationPoiName,
    locationAdcode: initialLocation?.locationAdcode,
    locationCoordinateSystem: 'GCJ02',
  }); // 北京
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (searchKeyword.trim().length > 1 && map?._search) {
      setIsSearching(true);
      map._search(searchKeyword, (list: any[]) => {
        setSearchResults(list);
        setIsSearching(false);
      });
    } else {
      setSearchResults([]);
    }
  }, [searchKeyword, map]);

  const handleSelectResult = (item: any) => {
    if (map?._selectPlace) {
      map._selectPlace(item);
      setSearchKeyword('');
      setSearchResults([]);
    }
  };

  useEffect(() => {
    if (!hasValidAmapKey || !mapContainerRef.current) return;

    let amapInstance: any = null;

    const initMap = async () => {
      try {
        const AMap = await AMapLoader.load({
          key: AMAP_KEY,
          version: '2.0',
          plugins: ['AMap.Geocoder', 'AMap.Marker', 'AMap.Geolocation', 'AMap.AutoComplete', 'AMap.PlaceSearch'],
        });

        if (!mapContainerRef.current) return;

        amapInstance = new AMap.Map(mapContainerRef.current, {
          viewMode: '3D',
          zoom: 15,
          center: [currentPos.lng, currentPos.lat],
        });

        const initialMarker = new AMap.Marker({
          position: [currentPos.lng, currentPos.lat],
          draggable: true,
          cursor: 'move',
        });

        amapInstance.add(initialMarker);
        setMap(amapInstance);
        setMarker(initialMarker);

        const geocoder = new AMap.Geocoder({
          city: '全国',
        });

        const autoComplete = new AMap.AutoComplete({
          city: '全国'
        });

        const geolocation = new AMap.Geolocation({
          enableHighAccuracy: true,
          timeout: 10000,
          zoomToAccuracy: true,
        });

        const updateAddress = (
          lng: number,
          lat: number,
          meta: Partial<AlbumLocationData> = {},
          preferredAddress?: string,
        ) => {
          setIsGeocoding(true);
          geocoder.getAddress([lng, lat], (status: string, result: any) => {
            let nextAddress = preferredAddress;
            if (status === 'complete' && result.regeocode) {
              nextAddress = preferredAddress || result.regeocode.formattedAddress;
            } else {
              nextAddress = preferredAddress || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            }
            setAddress(nextAddress);
            setCurrentPos({
              address: nextAddress,
              lat,
              lng,
              ...meta,
              locationCoordinateSystem: 'GCJ02',
            });
            setIsGeocoding(false);
          });
        };

        // Exposed search function
        (amapInstance as any)._search = (keyword: string, callback: (list: any[]) => void) => {
          autoComplete.search(keyword, (status: string, result: any) => {
            if (status === 'complete' && result.tips) {
              callback(result.tips.filter((item: any) => item.location));
            } else {
              callback([]);
            }
          });
        };

        (amapInstance as any)._selectPlace = (item: any) => {
          const { lng, lat } = item.location;
          amapInstance.setCenter([lng, lat]);
          initialMarker.setPosition([lng, lat]);
          updateAddress(
            lng,
            lat,
            {
              locationSource: 'amap_poi',
              locationPoiId: item.id,
              locationPoiName: item.name,
              locationAdcode: item.adcode,
            },
            item.name,
          );
        };

        // Function to perform auto-location
        const doAutoLocation = () => {
          setIsGeocoding(true);
          geolocation.getCurrentPosition((status: string, result: any) => {
            if (status === 'complete') {
              const { lng, lat } = result.position;
              amapInstance.setCenter([lng, lat]);
              initialMarker.setPosition([lng, lat]);
              updateAddress(lng, lat, {
                locationSource: 'amap_geolocation',
                locationAccuracyMeters: Number.isFinite(Number(result.accuracy)) ? Number(result.accuracy) : undefined,
              });
            } else {
              console.error('AMap geolocation failed:', result);
              updateAddress(currentPos.lng, currentPos.lat, {
                locationSource: currentPos.locationSource || 'manual_pin',
              }, currentPos.address);
            }
            setIsGeocoding(false);
          });
        };

        // Try auto location on start if no custom initial location
        if (!initialLocation) {
          doAutoLocation();
        } else {
          updateAddress(
            currentPos.lng,
            currentPos.lat,
            {
              locationSource: currentPos.locationSource || 'manual_pin',
              locationAccuracyMeters: currentPos.locationAccuracyMeters,
              locationPoiId: currentPos.locationPoiId,
              locationPoiName: currentPos.locationPoiName,
              locationAdcode: currentPos.locationAdcode,
            },
            currentPos.address === '正在获取地址...' ? undefined : currentPos.address,
          );
        }

        // Store locating function for the UI button
        (amapInstance as any)._doLocate = doAutoLocation;

        // Click to move marker
        amapInstance.on('click', (e: any) => {
          const { lng, lat } = e.lnglat;
          initialMarker.setPosition([lng, lat]);
          updateAddress(lng, lat, { locationSource: 'manual_pin' });
        });

        // Marker drag end
        initialMarker.on('dragend', (e: any) => {
          const { lng, lat } = e.lnglat;
          updateAddress(lng, lat, { locationSource: 'manual_pin' });
        });

      } catch (err) {
        console.error('AMap init error:', err);
        setLoadError(err instanceof Error ? err.message : '地图加载失败');
      }
    };

    initMap();

    return () => {
      if (amapInstance) {
        amapInstance.destroy();
      }
    };
  }, []);

  if (loadError) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-white/60 backdrop-blur-xl">
        <div className="bg-white rounded-[40px] p-8 shadow-2xl border border-pink-100 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <X size={32} />
          </div>
          <h2 className="text-xl font-black text-gray-800 mb-4">加载出错了</h2>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            {loadError}
          </p>
          <button 
            onClick={onClose}
            className="w-full bg-gray-100 text-gray-600 font-bold py-4 rounded-2xl"
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  if (!hasValidAmapKey) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-white/60 backdrop-blur-xl">
        <div className="bg-white rounded-[40px] p-8 shadow-2xl border border-pink-100 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-pink-100 text-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Navigation size={32} />
          </div>
          <h2 className="text-xl font-black text-gray-800 mb-4">需配置高德地图密钥</h2>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            为了提供更好的国内定位体验，请在 AI Studio 的 <b>Settings → Secrets</b> 中添加以下变量：
            <br />
            <code className="bg-pink-50 text-pink-600 px-1.5 py-0.5 rounded block mt-2 font-mono text-[10px]">VITE_AMAP_KEY</code>
            <code className="bg-pink-50 text-pink-600 px-1.5 py-0.5 rounded block mt-1 font-mono text-[10px]">VITE_AMAP_SECURITY_CODE</code>
          </p>
          <button 
            onClick={onClose}
            className="w-full bg-gray-100 text-gray-600 font-bold py-4 rounded-2xl mb-3"
          >
            返回
          </button>
          <a 
            href="https://console.amap.com/dev/key/app" 
            target="_blank" 
            rel="noopener"
            className="block text-xs text-pink-400 font-bold underline"
          >
            如何获取高德 API Key？
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-white">
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 shrink-0">
        <button onClick={onClose} className="p-2 -ml-2 text-gray-400">
          <X size={24} />
        </button>
        <h2 className="text-lg font-black text-gray-800">{title}</h2>
        <div className="w-10" />
      </div>

      {/* Map Content */}
      <div className="flex-1 relative overflow-hidden flex flex-col">
        {/* Search Bar */}
        <div className="absolute top-4 left-4 right-4 z-20 flex flex-col gap-2">
          <div className="relative group shadow-xl">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-pink-500 transition-colors">
              {isSearching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            </div>
            <input 
              type="text" 
              placeholder="搜索地点，例如：西湖、我的学校" 
              className="w-full bg-white/95 backdrop-blur-md h-14 pl-12 pr-12 rounded-2xl border border-white/20 outline-none text-sm font-medium shadow-2xl transition-all focus:ring-2 focus:ring-pink-100"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
            />
            {searchKeyword && (
              <button 
                onClick={() => setSearchKeyword('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-gray-300 hover:text-gray-500"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Search Results List */}
          <AnimatePresence>
            {searchResults.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white/95 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl max-h-[300px] overflow-y-auto overflow-hidden divide-y divide-gray-50"
              >
                {searchResults.map((item, idx) => (
                  <button 
                    key={idx}
                    onClick={() => handleSelectResult(item)}
                    className="w-full px-5 py-4 text-left hover:bg-pink-50/50 transition-colors flex items-start gap-3"
                  >
                    <div className="mt-1 text-pink-400 shrink-0">
                      <MapPin size={14} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800">{item.name}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{item.district}{item.address}</p>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

        {/* Locate Me Button */}
        <button 
          onClick={() => map?._doLocate?.()}
          className="absolute right-6 top-6 z-10 w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center text-gray-600 hover:text-pink-500 active:scale-90 transition-all border border-gray-100"
        >
          <Navigation size={22} />
        </button>

        {/* Address Floating Card */}
        <div className="absolute bottom-10 left-6 right-6 z-10">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white/90 backdrop-blur-xl rounded-[32px] p-6 shadow-2xl border border-white"
          >
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 bg-pink-100 text-pink-500 rounded-2xl flex items-center justify-center shrink-0">
                {isGeocoding ? <Loader2 size={24} className="animate-spin" /> : <MapPin size={24} />}
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">当前选点</p>
                <p className="text-sm font-bold text-gray-800 line-clamp-2 leading-relaxed">
                  {address}
                </p>
                <p className="mt-1 text-[10px] font-bold text-gray-400">
                  {currentPos.locationSource ? SOURCE_LABELS[currentPos.locationSource] : '待确认来源'}
                  {typeof currentPos.locationAccuracyMeters === 'number' ? ` · 约 ${Math.round(currentPos.locationAccuracyMeters)} 米` : ''}
                </p>
              </div>
            </div>
            
            <button 
              onClick={() => onSelect({ ...currentPos, address })}
              disabled={isGeocoding}
              className="w-full bg-pink-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-pink-100 flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
            >
              <Check size={20} />
              {confirmLabel}
            </button>
          </motion.div>
        </div>
        
        {/* Instruction overlay */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
            <p className="text-white text-[10px] font-bold uppercase tracking-widest">
              点击地图或拖动标记来选点
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
