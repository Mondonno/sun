import { createSignal, onMount, Show } from 'solid-js';
import { Lock, Unlock, RotateCcw, Settings, X, ExternalLink, Mail } from 'lucide-solid';
import { getClosestEvent, getRelativeTimeString, type SunEventType, getSunTimes } from './utils/sun';
import { getSettings, saveSettings, type ProSettings } from './utils/db';

const App = () => {
  const [now, setNow] = createSignal(new Date());
  const [coords, setCoords] = createSignal<{ lat: number; lng: number } | null>(null);
  const [lockedType, setLockedType] = createSignal<SunEventType | null>(null);
  const [error, setError] = createSignal<string | null>(null);
  const [showSettings, setShowSettings] = createSignal(false);
  const [settings, setSettings] = createSignal<ProSettings>({ isPro: false });

  interface ExtendedProSettings extends ProSettings {
    uiOpacity?: number;
    highContrast?: boolean;
  }

  const STRIPE_LINK = "https://buy.stripe.com/9B6aEY9dVf5o54Fdmba3u06";
  const CONTACT_EMAIL = "m@mikolajmocek.com";

  const requestLocation = () => {
    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
      setError("Secure connection (HTTPS) required.");
      return;
    }
    
    if ("geolocation" in navigator) {
      setError(null);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (err) => {
          let msg = "Location access required.";
          if (err.code === 1) msg = "Location denied. Please enable in settings.";
          else if (err.code === 2) msg = "Position unavailable.";
          else if (err.code === 3) msg = "Request timed out.";
          setError(msg);
          console.error(err);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else {
      setError("Geolocation not supported.");
    }
  };

  onMount(async () => {
    // Load settings from IndexedDB
    const savedSettings = await getSettings();
    setSettings(savedSettings);

    // Check for payment success
    if (window.location.pathname === '/payment-success') {
      const newSettings = { ...savedSettings, isPro: true };
      await saveSettings(newSettings);
      setSettings(newSettings);
      // Clean up URL without reload
      window.history.replaceState({}, '', '/');
      setShowSettings(true); // Show them their new powers
    }

    const interval = setInterval(() => setNow(new Date()), 60000);
    setTimeout(requestLocation, 500);
    return () => clearInterval(interval);
  });

  const getEventTime = (lat: number, lng: number, date: Date, type: SunEventType) => {
    const times = getSunTimes(lat, lng, date);
    return type === 'sunrise' ? times.sunrise : times.sunset;
  };

  const currentDisplay = () => {
    const c = coords();
    if (!c) return null;
    
    const t = now();
    const closest = getClosestEvent(c.lat, c.lng, t);
    const lock = lockedType();

    if (lock) {
      const events = [
        { type: lock, time: getEventTime(c.lat, c.lng, t, lock) },
        { type: lock, time: getEventTime(c.lat, c.lng, new Date(t.getTime() + 24*60*60*1000), lock) },
      ].filter(e => !isNaN(e.time.getTime()));
      
      if (events.length === 0) return null;

      let best = events[0];
      let minDiff = Math.abs(t.getTime() - best.time.getTime());
      for (const e of events) {
        const diff = Math.abs(t.getTime() - e.time.getTime());
        if (diff < minDiff) {
          minDiff = diff;
          best = e;
        }
      }
      return { type: lock, time: best.time, diffMs: t.getTime() - best.time.getTime() };
    }
    
    return closest;
  };

  const toggleView = () => {
    const current = currentDisplay();
    if (!current) return;
    const nextType: SunEventType = current.type === 'sunrise' ? 'sunset' : 'sunrise';
    setLockedType(nextType);
  };

  const clearLock = (e: MouseEvent) => {
    e.stopPropagation();
    setLockedType(null);
  };

  const bgColorStyle = () => {
    const display = currentDisplay();
    const s = settings() as ExtendedProSettings;
    
    if (s.isPro) {
      if (display?.type === 'sunrise' && s.sunriseWallpaper) {
        return { 'background-image': `url(${s.sunriseWallpaper})`, 'background-size': 'cover', 'background-position': 'center' };
      }
      if (display?.type === 'sunset' && s.sunsetWallpaper) {
        return { 'background-image': `url(${s.sunsetWallpaper})`, 'background-size': 'cover', 'background-position': 'center' };
      }
    }

    if (!display) return { background: '#171717' };
    
    if (display.type === 'sunrise') {
      return { background: 'linear-gradient(to bottom right, #fb923c, #fb7185, #4f46e5)' };
    } else {
      return { background: 'linear-gradient(to bottom right, #312e81, #581c87, #000000)' };
    }
  };

  const updateSetting = async (key: keyof ExtendedProSettings, value: any) => {
    const newSettings = { ...settings(), [key]: value };
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  const uiStyle = () => {
    const s = settings() as ExtendedProSettings;
    if (!s.isPro) return {};
    return {
      opacity: s.uiOpacity !== undefined ? s.uiOpacity : 1,
      filter: s.highContrast ? 'contrast(1.2) brightness(1.1)' : 'none'
    };
  };

  return (
    <div 
      class="h-full w-full flex flex-col items-center justify-center transition-all duration-1000 text-white"
      style={{
        ...bgColorStyle(),
        "font-family": settings().isPro && settings().fontFamily ? settings().fontFamily : 'inherit'
      }}
    >
      <div class="absolute top-8 right-8 z-10">
        <button 
          onClick={() => setShowSettings(true)}
          class="p-2 opacity-40 hover:opacity-100 transition-opacity cursor-pointer"
        >
          <Settings size={24} stroke-width={1} />
        </button>
      </div>

      <div class="flex-1 flex flex-col items-center justify-center p-8 text-center" style={uiStyle()}>
        <Show when={coords()} fallback={
          <div class="flex flex-col items-center gap-6">
            <p class="text-xl font-extralight opacity-60 animate-pulse">
              {error() || "Waiting for your location..."}
            </p>
            <button 
              onClick={requestLocation}
              class="px-8 py-3 border border-white/20 rounded-full text-[10px] uppercase tracking-[0.4em] hover:bg-white/10 active:scale-95 transition-all"
            >
              {error() ? "Try Again" : "Enable Location"}
            </button>
          </div>
        }>
          <button 
            class="group relative outline-none focus:outline-none cursor-pointer"
            onClick={toggleView}
            title="Switch View & Lock"
          >
            <h1 class="text-6xl md:text-8xl font-extralight tracking-tighter mb-4 transition-transform group-active:scale-95">
              {getRelativeTimeString(currentDisplay()?.diffMs || 0)}
            </h1>
            <p class="text-xl md:text-2xl font-extralight opacity-70 uppercase tracking-[0.3em] flex items-center justify-center gap-4">
              {currentDisplay()?.type}
            </p>
            
            <div class="absolute -right-16 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-40 transition-opacity">
              <RotateCcw size={24} stroke-width={1} />
            </div>
          </button>
        </Show>
      </div>

      <div class="pb-16 flex flex-col items-center gap-8">
        <Show when={lockedType()} fallback={
          <div class="flex items-center gap-2 text-[10px] uppercase tracking-[0.4em] opacity-20">
            <Unlock size={10} stroke-width={1} />
            <span>Auto Switching</span>
          </div>
        }>
          <button 
            onClick={clearLock}
            class="flex items-center gap-2 text-[10px] uppercase tracking-[0.4em] opacity-40 hover:opacity-100 transition-opacity cursor-pointer group"
          >
            <Lock size={10} stroke-width={1} />
            <span>Locked</span>
            <span class="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">(Unlock)</span>
          </button>
        </Show>
        
        <div class="text-[10px] font-mono opacity-30 tracking-[0.5em] uppercase">
          {now().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
        </div>
      </div>

      {/* Settings Modal */}
      <Show when={showSettings()}>
        <div class="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex flex-col">
          <div class="flex justify-between items-center p-8">
            <h2 class="text-[10px] uppercase tracking-[0.4em] opacity-50">Settings</h2>
            <button 
              onClick={() => setShowSettings(false)}
              class="p-2 opacity-40 hover:opacity-100 transition-opacity cursor-pointer"
            >
              <X size={24} stroke-width={1} />
            </button>
          </div>

          <div class="flex-1 overflow-y-auto px-8 pb-12 max-w-lg mx-auto w-full space-y-12">
            {/* Pro Status Section */}
            <section class="space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-2xl font-extralight">Pro Version</h3>
                  <p class="text-sm opacity-50">Unlock custom wallpapers and fonts.</p>
                </div>
                <Show when={settings().isPro} fallback={
                  <span class="text-[10px] bg-white text-black px-3 py-1 rounded-full font-bold uppercase tracking-widest">Free</span>
                }>
                  <span class="text-[10px] bg-yellow-400 text-black px-3 py-1 rounded-full font-bold uppercase tracking-widest">Pro</span>
                </Show>
              </div>
              
              <Show when={!settings().isPro}>
                <a 
                  href={STRIPE_LINK}
                  target="_blank"
                  class="flex items-center justify-between w-full p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors group"
                >
                  <span class="text-lg">Upgrade to Pro — $9.99</span>
                  <ExternalLink size={20} class="opacity-30 group-hover:opacity-100 transition-opacity" />
                </a>
              </Show>
            </section>

            {/* Customization Section */}
            <section class={`space-y-8 transition-opacity ${!settings().isPro ? 'opacity-20 pointer-events-none' : ''}`}>
              <div class="space-y-4">
                <h4 class="text-[10px] uppercase tracking-[0.4em] opacity-50">Wallpapers</h4>
                <div class="grid gap-4">
                  <div class="space-y-2">
                    <label class="text-xs opacity-50">Sunrise Wallpaper URL</label>
                    <input 
                      type="text" 
                      placeholder="https://..."
                      value={settings().sunriseWallpaper || ''}
                      onInput={(e) => updateSetting('sunriseWallpaper', e.currentTarget.value)}
                      class="w-full bg-white/5 border border-white/10 rounded-xl p-3 outline-none focus:border-white/30 transition-colors"
                    />
                  </div>
                  <div class="space-y-2">
                    <label class="text-xs opacity-50">Sunset Wallpaper URL</label>
                    <input 
                      type="text" 
                      placeholder="https://..."
                      value={settings().sunsetWallpaper || ''}
                      onInput={(e) => updateSetting('sunsetWallpaper', e.currentTarget.value)}
                      class="w-full bg-white/5 border border-white/10 rounded-xl p-3 outline-none focus:border-white/30 transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div class="space-y-4">
                <h4 class="text-[10px] uppercase tracking-[0.4em] opacity-50">Typography</h4>
                <div class="grid grid-cols-2 gap-4">
                  {[
                    { name: 'Default', value: 'inherit' },
                    { name: 'Serif', value: 'serif' },
                    { name: 'Mono', value: 'monospace' },
                    { name: 'Display', value: '"Playfair Display", serif' }
                  ].map(font => (
                    <button 
                      onClick={() => updateSetting('fontFamily', font.value)}
                      class={`p-4 rounded-xl border transition-all text-left ${settings().fontFamily === font.value ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10 hover:border-white/30'}`}
                      style={{ "font-family": font.value }}
                    >
                      {font.name}
                    </button>
                  ))}
                </div>
              </div>

              <div class="space-y-4">
                <h4 class="text-[10px] uppercase tracking-[0.4em] opacity-50">Custom Look</h4>
                <div class="space-y-6">
                  <div class="space-y-2">
                    <div class="flex justify-between text-xs opacity-50">
                      <label>UI Opacity</label>
                      <span>{Math.round(((settings() as ExtendedProSettings).uiOpacity ?? 1) * 100)}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0.1" 
                      max="1" 
                      step="0.05"
                      value={(settings() as ExtendedProSettings).uiOpacity ?? 1}
                      onInput={(e) => updateSetting('uiOpacity', parseFloat(e.currentTarget.value))}
                      class="w-full accent-white"
                    />
                  </div>
                  <button 
                    onClick={() => updateSetting('highContrast', !(settings() as ExtendedProSettings).highContrast)}
                    class="flex items-center justify-between w-full p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
                  >
                    <span class="text-sm">High Contrast Mode</span>
                    <div class={`w-10 h-5 rounded-full transition-colors relative ${(settings() as ExtendedProSettings).highContrast ? 'bg-white' : 'bg-white/10'}`}>
                      <div class={`absolute top-1 left-1 w-3 h-3 rounded-full transition-transform ${(settings() as ExtendedProSettings).highContrast ? 'translate-x-5 bg-black' : 'bg-white/40'}`} />
                    </div>
                  </button>
                </div>
              </div>
            </section>

            {/* Restore/Contact Section */}
            <section class="pt-8 border-t border-white/10 space-y-4">
              <h4 class="text-[10px] uppercase tracking-[0.4em] opacity-50">Support</h4>
              <p class="text-xs opacity-40 leading-relaxed">
                If you need to restore your purchase or have any issues, please contact me directly.
              </p>
              <a 
                href={`mailto:${CONTACT_EMAIL}`}
                class="flex items-center gap-3 text-sm opacity-60 hover:opacity-100 transition-opacity"
              >
                <Mail size={16} />
                <span>{CONTACT_EMAIL}</span>
              </a>
            </section>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default App;
