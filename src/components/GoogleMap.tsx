import { useEffect, useMemo, useRef, useState } from 'react';

type MapMarker = { id: string; label: string; latitude?: number; longitude?: number; place?: string; color?: string };
type Point = { lat: number; lng: number };
type MapInstance = { setCenter: (point: Point) => void; setZoom: (zoom: number) => void };
type MarkerInstance = { addListener: (event: string, callback: () => void) => void; setMap: (map: MapInstance | null) => void; setPosition?: (point: Point) => void; setTitle?: (title: string) => void };
type InfoWindowInstance = { setContent: (content: HTMLElement) => void; open: (options: { map: MapInstance; anchor: MarkerInstance }) => void };
type GoogleMapsApi = {
  Map: new (element: HTMLElement, options: { center: Point; zoom: number; mapTypeControl?: boolean; streetViewControl?: boolean; fullscreenControl?: boolean }) => MapInstance;
  Marker: new (options: { map: MapInstance; position: Point; title: string; icon?: { path: string; fillColor: string; fillOpacity: number; strokeColor: string; strokeWeight: number; scale: number } }) => MarkerInstance;
  InfoWindow: new () => InfoWindowInstance;
  Geocoder: new () => { geocode: (request: { address: string }, callback: (results: Array<{ geometry: { location: Point } }> | null, status: string) => void) => void };
  SymbolPath: { CIRCLE: string };
  importLibrary?: (name: 'maps' | 'geocoding') => Promise<Record<string, unknown>>;
};
type GoogleWindow = Window & { google?: { maps?: GoogleMapsApi }; __tripMatesMapsPromise?: Promise<GoogleMapsApi> };

async function resolveMapsLibraries(mapWindow: GoogleWindow): Promise<GoogleMapsApi> {
  const maps = mapWindow.google?.maps;
  if (!maps) throw new Error('Google Maps loaded without its Maps API namespace.');
  if (typeof maps.Map === 'function' && typeof maps.Geocoder === 'function' && typeof maps.Marker === 'function') return maps;
  if (!maps.importLibrary) throw new Error('Google Maps loaded without its map constructors. Check the Maps JavaScript API and Geocoding API restrictions.');

  const [mapsLibrary, geocodingLibrary] = await Promise.all([
    maps.importLibrary('maps'),
    maps.importLibrary('geocoding'),
  ]);
  const resolved = { ...maps, ...mapsLibrary, ...geocodingLibrary } as GoogleMapsApi;
  if (typeof resolved.Map !== 'function') throw new Error('Google Maps library did not provide the Map constructor.');
  if (typeof resolved.Geocoder !== 'function') throw new Error('Google Maps library did not provide Geocoder. Enable the Geocoding API for this key.');
  if (typeof resolved.Marker !== 'function') throw new Error('Google Maps library did not provide the Marker constructor. Enable the Maps JavaScript API for this key.');
  return resolved;
}

function loadMapsApi(key: string): Promise<GoogleMapsApi> {
  const mapWindow = window as GoogleWindow;
  if (mapWindow.google?.maps) return resolveMapsLibraries(mapWindow);
  if (mapWindow.__tripMatesMapsPromise) return mapWindow.__tripMatesMapsPromise;
  const existing = document.querySelector<HTMLScriptElement>('script[data-tripmates-google-maps="true"]');
  mapWindow.__tripMatesMapsPromise = new Promise<GoogleMapsApi>((resolve, reject) => {
    const script = existing ?? document.createElement('script');
    const handleLoad = () => { void resolveMapsLibraries(mapWindow).then(resolve, reject); };
    const handleError = () => reject(new Error('Google Maps failed to load. Check the API key and API restrictions.'));
    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', handleError, { once: true });
    if (!existing) {
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly`;
      script.async = true;
      script.defer = true;
      script.dataset.tripmatesGoogleMaps = 'true';
      document.head.appendChild(script);
    } else if (mapWindow.google?.maps) {
      handleLoad();
    } else if (script.readyState === 'complete') {
      handleError();
    }
  }).catch((error: unknown) => {
    mapWindow.__tripMatesMapsPromise = undefined;
    throw error;
  });
  return mapWindow.__tripMatesMapsPromise;
}

export default function GoogleMap({ markers, className = 'h-[420px]' }: { markers: MapMarker[]; className?: string }) {
  const elementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const mapsRef = useRef<GoogleMapsApi | null>(null);
  const geocoderRef = useRef<InstanceType<GoogleMapsApi['Geocoder']> | null>(null);
  const infoWindowRef = useRef<InfoWindowInstance | null>(null);
  const markerRefs = useRef(new Map<string, MarkerInstance>());
  const markerSpecRefs = useRef(new Map<string, string>());
  const resolvedAddressRefs = useRef(new Map<string, Point>());
  const hasCenteredRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState('');
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const markerSignature = useMemo(() => JSON.stringify(markers), [markers]);

  useEffect(() => {
    if (!apiKey) { setMessage('Add VITE_GOOGLE_MAPS_API_KEY to User/.env to enable maps.'); return; }
    let disposed = false;
    void loadMapsApi(apiKey).then((maps) => {
      if (disposed || !elementRef.current) return;
      if (typeof maps.Map !== 'function') throw new Error('Google Maps Map constructor is unavailable.');
      mapsRef.current = maps;
      mapRef.current = new maps.Map(elementRef.current, { center: { lat: 20.5937, lng: 78.9629 }, zoom: 5, mapTypeControl: false, streetViewControl: false, fullscreenControl: false });
      resolvedAddressRefs.current.clear();
      geocoderRef.current = new maps.Geocoder();
      infoWindowRef.current = new maps.InfoWindow();
      setMessage('');
      setReady(true);
    }).catch((loadError: unknown) => {
      if (!disposed) setMessage(loadError instanceof Error ? loadError.message : 'Map could not be loaded.');
    });
    return () => {
      disposed = true;
      markerRefs.current.forEach((marker) => marker.setMap(null));
      markerRefs.current.clear();
      markerSpecRefs.current.clear();
      resolvedAddressRefs.current.clear();
      hasCenteredRef.current = false;
      mapRef.current = null;
      mapsRef.current = null;
      geocoderRef.current = null;
      infoWindowRef.current = null;
    };
  }, [apiKey]);

  useEffect(() => {
    const maps = mapsRef.current;
    const map = mapRef.current;
    const geocoder = geocoderRef.current;
    if (!ready || !maps || !map || !geocoder) return;
    const activeIds = new Set(markers.map((marker) => marker.id));
    for (const [id, marker] of markerRefs.current) {
      if (!activeIds.has(id)) {
        marker.setMap(null);
        markerRefs.current.delete(id);
        markerSpecRefs.current.delete(id);
      }
    }

    const addOrUpdate = (item: MapMarker, position: Point, spec: string) => {
      if (mapRef.current !== map) return;
      const existing = markerRefs.current.get(item.id);
      if (existing && markerSpecRefs.current.get(item.id) === spec) return;
      existing?.setMap(null);
      const pin = new maps.Marker({
        map,
        position,
        title: item.label,
        icon: { path: maps.SymbolPath.CIRCLE, fillColor: item.color || '#059669', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 2, scale: 8 },
      });
      markerRefs.current.set(item.id, pin);
      markerSpecRefs.current.set(item.id, spec);
      pin.addListener('click', () => {
        const content = document.createElement('div');
        content.textContent = item.label;
        infoWindowRef.current?.setContent(content);
        if (mapRef.current) infoWindowRef.current?.open({ map, anchor: pin });
      });
      if (!hasCenteredRef.current) {
        map.setCenter(position);
        map.setZoom(markers.length > 1 ? 6 : 11);
        hasCenteredRef.current = true;
      }
    };

    for (const item of markers) {
      const spec = JSON.stringify(item);
      if (typeof item.latitude === 'number' && typeof item.longitude === 'number') {
        addOrUpdate(item, { lat: item.latitude, lng: item.longitude }, spec);
        continue;
      }
      if (!item.place) continue;
      const cached = resolvedAddressRefs.current.get(item.place);
      if (cached) { addOrUpdate(item, cached, spec); continue; }
      if (markerSpecRefs.current.get(item.id) === spec) continue;
      markerSpecRefs.current.set(item.id, spec);
      geocoder.geocode({ address: item.place }, (results, status) => {
        if (status !== 'OK' || !results?.[0] || mapRef.current !== map) {
          markerSpecRefs.current.delete(item.id);
          return;
        }
        const position = results[0].geometry.location;
        resolvedAddressRefs.current.set(item.place!, position);
        addOrUpdate(item, position, spec);
      });
    }
  }, [ready, markerSignature]);

  return <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100"><div ref={elementRef} className={className} />{message && <div className="absolute inset-0 flex items-center justify-center bg-slate-50/95 p-6 text-center text-sm text-slate-600">{message}</div>}</div>;
}
