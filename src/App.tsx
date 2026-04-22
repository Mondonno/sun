import { createSignal, onMount, Show } from 'solid-js';
import { Lock, Unlock } from 'lucide-solid';
import { getClosestEvent, getRelativeTimeString, type SunEventType, getSunTimes } from './utils/sun';

const App = () => {
  const [now, setNow] = createSignal(new Date());
  const [coords, setCoords] = createSignal<{ lat: number; lng: number } | null>(null);
  const [lockedType, setLockedType] = createSignal<SunEventType | null>(null);
  const [error, setError] = createSignal<string | null>(null);

  onMount(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (err) => {
          setError("Location access required for sun data.");
          console.error(err);
        }
      );
    } else {
      setError("Geolocation not supported.");
    }

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

    if (lock && closest.type !== lock) {
      const events = [
        { type: lock, time: getEventTime(c.lat, c.lng, new Date(t.getTime() - 24*60*60*1000), lock) },
        { type: lock, time: getEventTime(c.lat, c.lng, t, lock) },
        { type: lock, time: getEventTime(c.lat, c.lng, new Date(t.getTime() + 24*60*60*1000), lock) },
      ];
      
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

  const toggleLock = () => {
    const current = currentDisplay();
    if (!current) return;
    setLockedType(lockedType() ? null : current.type);
  };

  const bgColorClass = () => {
    const display = currentDisplay();
    if (!display) return 'bg-neutral-900';
    
    if (display.type === 'sunrise') {
      return 'from-orange-400 via-rose-400 to-indigo-600';
    } else {
      return 'from-indigo-900 via-purple-900 to-black';
    }
  };

  return (
    <div 
      class={`h-full w-full flex flex-col items-center justify-center transition-all duration-1000 text-white bg-gradient-to-br ${bgColorClass()}`}
    >
      <div class="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <Show when={coords()} fallback={
          <p class="text-xl font-extralight opacity-60 animate-pulse">
            {error() || "Waiting for your location..."}
          </p>
        }>
          <button 
            class="group relative outline-none focus:outline-none"
            onClick={toggleLock}
          >
            <h1 class="text-6xl md:text-8xl font-extralight tracking-tighter mb-4 transition-transform group-active:scale-95">
              {getRelativeTimeString(currentDisplay()?.diffMs || 0)}
            </h1>
            <p class="text-xl md:text-2xl font-extralight opacity-70 uppercase tracking-[0.3em]">
              {currentDisplay()?.type}
            </p>
            
            <div class="absolute -right-16 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-40 transition-opacity">
              {lockedType() ? <Lock size={24} stroke-width={1} /> : <Unlock size={24} stroke-width={1} />}
            </div>
          </button>
        </Show>
      </div>

      <div class="pb-16 flex flex-col items-center gap-6">
        <Show when={lockedType()}>
          <div class="flex items-center gap-2 text-[10px] uppercase tracking-[0.4em] opacity-40">
            <Lock size={10} stroke-width={1} />
            <span>Locked</span>
          </div>
        </Show>
        
        <div class="text-[10px] font-mono opacity-30 tracking-[0.5em] uppercase">
          {now().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
        </div>
      </div>
    </div>
  );
};

export default App;
