import AMapLoader from '@amap/amap-jsapi-loader';

export const AMAP_KEY = import.meta.env.VITE_AMAP_KEY || '';
export const AMAP_SECURITY_CODE = import.meta.env.VITE_AMAP_SECURITY_CODE || '';
export const hasValidAmapKey = Boolean(AMAP_KEY);

export function configureAmapSecurity() {
  if (typeof window === 'undefined' || !hasValidAmapKey) return;
  (window as any)._AMapSecurityConfig = {
    securityJsCode: AMAP_SECURITY_CODE,
  };
}

export async function loadAmap(plugins: string[] = []) {
  configureAmapSecurity();
  if (!hasValidAmapKey) throw new Error('AMap key is not configured');
  return AMapLoader.load({
    key: AMAP_KEY,
    version: '2.0',
    plugins,
  });
}

export async function convertGpsToGcj02(lng: number, lat: number): Promise<{ lng: number; lat: number }> {
  const AMap = await loadAmap();
  return new Promise((resolve, reject) => {
    AMap.convertFrom([lng, lat], 'gps', (status: string, result: any) => {
      const location = result?.locations?.[0];
      if (status === 'complete' && result?.info === 'ok' && location) {
        resolve({ lng: location.lng, lat: location.lat });
        return;
      }
      reject(new Error('GPS coordinate conversion failed'));
    });
  });
}

export async function reverseGeocodeGcj02(lng: number, lat: number): Promise<string> {
  const AMap = await loadAmap(['AMap.Geocoder']);
  const geocoder = new AMap.Geocoder({ city: '全国' });
  return new Promise((resolve) => {
    geocoder.getAddress([lng, lat], (status: string, result: any) => {
      if (status === 'complete' && result?.regeocode?.formattedAddress) {
        resolve(result.regeocode.formattedAddress);
        return;
      }
      resolve(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    });
  });
}
