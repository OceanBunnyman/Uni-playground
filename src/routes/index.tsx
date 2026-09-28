import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft,
  BellRing,
  CloudSun,
  Eye,
  Flame,
  HandHeart,
  Map as MapIcon,
  Maximize2,
  Minus,
  PackageOpen,
  Plus,
  Sparkles,
  Star,
  TentTree,
  Waves,
  Wind,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "同行 · 四人协作旅程" },
      { name: "description", content: "四个人沿不同路线前行，在彼此的地图上发现同行者留下的痕迹。" },
      { property: "og:title", content: "同行 · 四人协作旅程" },
      { property: "og:description", content: "沿不同的路，看见彼此留下的篝火、风铃、星光与云开的痕迹，一起抵达营地。" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: JourneyGame,
});

type MemberId = "A" | "B" | "C" | "D";
type SignalKind = "help" | "resolve" | "reminder" | "thanks";
type Point = { x: number; y: number };

type Member = {
  id: MemberId;
  name: string;
  region: string;
  color: string;
  theme: string;
  route: string;
  overviewRoute: string;
};

type Signal = {
  id: number;
  from: MemberId;
  kind: SignalKind;
  note: string;
  position: Point;
};

type Discovery = {
  id: string;
  kind: "chest" | "help-task";
  position: Point;
  title: string;
  note: string;
};

const viewSize = { width: 420, height: 820 };
const minZoom = 0.55;
const maxZoom = 2.4;

const members: Member[] = [
  {
    id: "A",
    name: "小屿",
    region: "苔原浅滩",
    color: "bg-player-a",
    theme: "map-theme-a",
    route: "M198 820 C105 746 122 656 221 632 C323 608 322 489 208 466 C98 444 87 332 184 294 C270 259 280 139 218 0",
    overviewRoute: "M16 20 C72 28 52 93 113 108 C176 122 184 184 248 214",
  },
  {
    id: "B",
    name: "阿满",
    region: "蓝溪河道",
    color: "bg-player-b",
    theme: "map-theme-b",
    route: "M105 820 C250 767 298 686 186 622 C82 562 128 472 274 432 C357 410 307 298 172 278 C73 262 120 121 215 0",
    overviewRoute: "M244 18 C179 37 213 92 142 109 C78 125 72 180 12 214",
  },
  {
    id: "C",
    name: "禾子",
    region: "高风山脊",
    color: "bg-player-c",
    theme: "map-theme-c",
    route: "M302 820 C182 744 115 691 204 609 C300 522 289 440 175 414 C65 388 86 270 220 236 C302 215 295 93 226 0",
    overviewRoute: "M18 202 C77 178 67 125 126 110 C185 94 189 40 248 9",
  },
  {
    id: "D",
    name: "麦麦",
    region: "暖草坡地",
    color: "bg-player-d",
    theme: "map-theme-d",
    route: "M118 820 C71 726 197 682 279 629 C356 579 291 483 163 455 C49 430 106 318 235 283 C338 255 299 119 216 0",
    overviewRoute: "M243 202 C184 180 194 129 135 108 C74 87 72 38 12 9",
  },
];

const startingPositions: Record<MemberId, Point> = {
  A: { x: 198, y: 615 },
  B: { x: 186, y: 622 },
  C: { x: 204, y: 609 },
  D: { x: 163, y: 455 },
};

const initialSignals: Signal[] = [
  { id: 1, from: "B", kind: "reminder", position: { x: 238, y: 307 }, note: "河道边挂起一串风铃：转弯处有一阵顺风。" },
  { id: 2, from: "D", kind: "help", position: { x: 164, y: 530 }, note: "草坡背风处升起烟，麦麦在这里需要一点照应。" },
  { id: 3, from: "B", kind: "thanks", position: { x: 286, y: 165 }, note: "阿满把一颗星星挂到天上：谢谢你们刚才靠近。" },
];

const discoveries: Discovery[] = [
  { id: "chest-reeds", kind: "chest", position: { x: 318, y: 540 }, title: "芦苇里的小木箱", note: "里面有一枚温暖的路灯火种，可以留给下一段陌生的路。" },
  { id: "help-maimai", kind: "help-task", position: { x: 118, y: 448 }, title: "麦麦需要一阵顺风", note: "麦麦正在草坡上寻找避风处。走到她留下的烟附近，回应这次求助。" },
];

function JourneyGame() {
  const [selected, setSelected] = useState<MemberId | null>("A");
  const [positions, setPositions] = useState(startingPositions);
  const [signals, setSignals] = useState<Signal[]>(initialSignals);
  const [openedSignal, setOpenedSignal] = useState<number | null>(null);
  const [toast, setToast] = useState("");
  const [destination, setDestination] = useState<Point | null>(null);
  const [explored, setExplored] = useState<Point[]>([startingPositions.A]);
  const [weatherCleared, setWeatherCleared] = useState(false);
  const [openedDiscovery, setOpenedDiscovery] = useState<string | null>(null);
  const [completedDiscoveries, setCompletedDiscoveries] = useState<Set<string>>(() => new Set());
  const positionRef = useRef(startingPositions.A);
  const destinationRef = useRef<Point | null>(null);
  const selectedRef = useRef<MemberId | null>("A");
  const signalsRef = useRef(initialSignals);
  const openedSignalRef = useRef<number | null>(null);
  const openedDiscoveryRef = useRef<string | null>(null);
  const completedDiscoveriesRef = useRef(new Set<string>());
  const encounteredRef = useRef(new Set<number>());

  selectedRef.current = selected;
  signalsRef.current = signals;
  openedSignalRef.current = openedSignal;
  openedDiscoveryRef.current = openedDiscovery;
  completedDiscoveriesRef.current = completedDiscoveries;

  useEffect(() => {
    const timer = window.setInterval(() => {
      const target = destinationRef.current;
      if (!target || selectedRef.current !== "A" || openedSignalRef.current !== null || openedDiscoveryRef.current !== null) return;

      const current = positionRef.current;
      const dx = target.x - current.x;
      const dy = target.y - current.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 3) {
        destinationRef.current = null;
        setDestination(null);
        return;
      }

      const pace = 2.8;
      const next = {
        x: current.x + (dx / distance) * Math.min(pace, distance),
        y: current.y + (dy / distance) * Math.min(pace, distance),
      };
      positionRef.current = next;
      setPositions((currentPositions) => ({ ...currentPositions, A: next }));
      setExplored((currentExplored) => {
        const last = currentExplored[currentExplored.length - 1];
        if (last && Math.hypot(next.x - last.x, next.y - last.y) < 22) return currentExplored;
        return [...currentExplored, next];
      });

      const discovery = discoveries.find((item) => {
        if (completedDiscoveriesRef.current.has(item.id)) return false;
        return Math.hypot(next.x - item.position.x, next.y - item.position.y) <= 30;
      });

      if (discovery) {
        destinationRef.current = null;
        setDestination(null);
        setOpenedDiscovery(discovery.id);
        return;
      }

      const encountered = signalsRef.current.find((signal) => {
        if (signal.from === "A" || encounteredRef.current.has(signal.id)) return false;
        return Math.hypot(next.x - signal.position.x, next.y - signal.position.y) <= 34;
      });

      if (encountered) {
        encounteredRef.current.add(encountered.id);
        destinationRef.current = null;
        setDestination(null);
        setOpenedSignal(encountered.id);
      }
    }, 50);

    return () => window.clearInterval(timer);
  }, []);

  const active = members.find((member) => member.id === selected);
  const visibleSignals = useMemo(
    () => signals.filter((signal) => signal.from !== selected || signal.kind === "resolve"),
    [selected, signals],
  );

  const pushToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  };

  const leaveSignal = (kind: SignalKind) => {
    const current = positionRef.current;
    if (kind === "resolve") {
      const resolved: Signal = {
        id: Date.now(),
        from: "A",
        kind,
        position: current,
        note: "我们绕开了刚才的难点，云层慢慢打开，路面亮了起来。",
      };
      const thanks: Signal = {
        id: Date.now() + 1,
        from: "B",
        kind: "thanks",
        position: { x: current.x + 64, y: current.y - 118 },
        note: "阿满在天空挂起一颗星：谢谢你把这段路照亮。",
      };
      setWeatherCleared(true);
      setSignals((currentSignals) => [thanks, resolved, ...currentSignals]);
      pushToast("云雾从 A 与 B 的地图上散开，B 的星星也亮起来");
      return;
    }

    const signal: Signal = {
      id: Date.now(),
      from: "A",
      kind,
      position: current,
      note: kind === "help" ? "前面的路有些难，我先在这里燃一簇火。" : "我在这里挂起风铃：前方转向时，记得听风。",
    };
    setSignals((currentSignals) => [signal, ...currentSignals]);
    pushToast(kind === "help" ? "A 的火会在 B 的地图里化成远处烟雾" : "风铃会在 B 的路上变成可以看见的风");
  };

  if (active) {
    return (
      <MemberJourney
        member={active}
        position={positions[active.id]}
        signals={visibleSignals}
        openedSignal={openedSignal}
        toast={toast}
        destination={destination}
        explored={explored}
        weatherCleared={weatherCleared}
        openedDiscovery={openedDiscovery}
        completedDiscoveries={completedDiscoveries}
        isCurrentPlayer={active.id === "A"}
        onBack={() => {
          destinationRef.current = null;
          setDestination(null);
          setSelected(null);
          setOpenedSignal(null);
        }}
        onMoveTo={(point) => {
          destinationRef.current = point;
          setDestination(point);
        }}
        onSignal={leaveSignal}
        onOpenSignal={(id) => {
          destinationRef.current = null;
          setDestination(null);
          setOpenedSignal(id);
        }}
        onCloseSignal={() => setOpenedSignal(null)}
        onCloseDiscovery={() => setOpenedDiscovery(null)}
        onCompleteDiscovery={(id, kind) => {
          setCompletedDiscoveries((current) => new Set(current).add(id));
          setOpenedDiscovery(null);
          pushToast(kind === "chest" ? "收下了一枚路灯火种" : "已接下帮助麦麦的同行任务");
        }}
        onReply={(text) => {
          setOpenedSignal(null);
          pushToast(text);
        }}
        onOpenOverview={() => {
          destinationRef.current = null;
          setDestination(null);
          setSelected(null);
          setOpenedSignal(null);
        }}
      />
    );
  }

  return <Overview positions={positions} signals={signals} onSelect={setSelected} />;
}

function Overview({
  positions,
  signals,
  onSelect,
}: {
  positions: Record<MemberId, Point>;
  signals: Signal[];
  onSelect: (id: MemberId) => void;
}) {
  return (
    <main className="min-h-dvh bg-background px-4 py-6 text-foreground sm:px-8 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-5 flex items-end justify-between sm:mb-7">
          <div>
            <p className="mb-1 text-xs font-semibold text-muted-foreground">第 03 天 · 四条路，一处营地</p>
            <h1 className="font-display text-3xl font-semibold sm:text-4xl">四个人正在靠近同一个终点</h1>
          </div>
          <p className="hidden text-xs text-muted-foreground sm:block">点击地图，查看每个人的路途</p>
        </header>

        <section className="relative overflow-hidden rounded-3xl border border-border bg-map p-2 shadow-map sm:p-3" aria-label="四人路线总览">
          <div className="grid grid-cols-2 gap-1.5 overflow-hidden rounded-2xl bg-border/60 sm:gap-2">
            {members.map((member, index) => {
              const latest = signals.find((signal) => signal.from === member.id || signal.kind === "thanks");
              return (
                <Button
                  key={member.id}
                  variant="ghost"
                  onClick={() => onSelect(member.id)}
                  className={cn(
                    "group relative h-[min(43vw,20rem)] min-h-52 w-full overflow-hidden whitespace-normal rounded-none p-0 text-left",
                    member.theme,
                  )}
                >
                  <OverviewMap member={member} position={positions[member.id]} quadrant={index} />
                  <div className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-full bg-surface/85 py-1 pl-1 pr-3 shadow-soft backdrop-blur sm:left-5 sm:top-5">
                    <span className={cn("grid h-7 w-7 place-items-center rounded-full text-xs font-bold text-player-ink", member.color)}>{member.id}</span>
                    <span className="text-xs font-semibold text-foreground">{member.name}{member.id === "A" ? " · 你" : ""}</span>
                  </div>
                  <p className="absolute bottom-3 left-3 z-10 text-[10px] font-medium text-foreground/70 sm:bottom-5 sm:left-5">{member.region}</p>
                  {latest && (
                    <span className="absolute bottom-3 right-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-signal text-signal-foreground shadow-signal sm:bottom-5 sm:right-5">
                      <SignalIcon kind={latest.kind} className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              );
            })}
          </div>

          <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-[7px] border-map bg-surface text-primary shadow-map sm:h-24 sm:w-24">
            <TentTree className="h-6 w-6 sm:h-7 sm:w-7" />
            <span className="mt-1 text-[9px] font-bold text-foreground">共同营地</span>
          </div>
        </section>

        <footer className="mt-5 flex items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>右下角浮标可以从个人地图回到这里。</p>
          <Button variant="secondary" className="shrink-0 rounded-full" onClick={() => onSelect("A")}>回到 A</Button>
        </footer>
      </div>
    </main>
  );
}

function OverviewMap({ member, position, quadrant }: { member: Member; position: Point; quadrant: number }) {
  const markerX = quadrant % 2 === 0 ? 24 + (position.x % 100) * 1.7 : 236 - (position.x % 100) * 1.7;
  const markerY = quadrant < 2 ? 18 + (position.y % 100) * 1.9 : 204 - (position.y % 100) * 1.9;
  return (
    <svg className="h-full w-full" viewBox="0 0 260 220" role="img" aria-label={`${member.name}的${member.region}路线`}>
      {member.id === "A" && <path d="M-10 68 C55 35 86 82 145 58 C193 38 226 50 274 21" fill="none" stroke="var(--member-water)" strokeWidth="15" opacity=".72" />}
      {member.id === "B" && <path d="M62 -8 C87 42 39 74 79 115 C118 155 75 188 97 230" fill="none" stroke="var(--member-water)" strokeWidth="24" opacity=".82" />}
      {member.id === "C" && <g fill="none" stroke="var(--member-detail)" opacity=".5"><path d="M3 56 Q65 17 126 53 T264 42"/><path d="M-4 82 Q72 43 133 79 T266 67"/><path d="M0 172 Q59 135 120 165 T265 154"/></g>}
      {member.id === "D" && <g fill="var(--member-detail)" opacity=".55"><circle cx="38" cy="67" r="18"/><circle cx="198" cy="47" r="23"/><circle cx="211" cy="169" r="31"/><circle cx="72" cy="181" r="14"/></g>}
      <path d={member.overviewRoute} fill="none" stroke="var(--member-trail-edge)" strokeWidth="14" strokeLinecap="round" />
      <path d={member.overviewRoute} fill="none" stroke="var(--member-trail)" strokeWidth="9" strokeLinecap="round" strokeDasharray="2 7" />
      <g transform={`translate(${markerX} ${markerY})`}>
        <circle r="13" fill="var(--surface)" stroke="var(--foreground)" strokeWidth="1.5" />
        <circle r="7" fill={`var(--player-${member.id.toLowerCase()})`} />
      </g>
    </svg>
  );
}

function MemberJourney({
  member,
  position,
  signals,
  openedSignal,
  toast,
  destination,
  explored,
  weatherCleared,
  openedDiscovery,
  completedDiscoveries,
  isCurrentPlayer,
  onBack,
  onMoveTo,
  onSignal,
  onOpenSignal,
  onCloseSignal,
  onCloseDiscovery,
  onCompleteDiscovery,
  onReply,
  onOpenOverview,
}: {
  member: Member;
  position: Point;
  signals: Signal[];
  openedSignal: number | null;
  toast: string;
  destination: Point | null;
  explored: Point[];
  weatherCleared: boolean;
  openedDiscovery: string | null;
  completedDiscoveries: Set<string>;
  isCurrentPlayer: boolean;
  onBack: () => void;
  onMoveTo: (point: Point) => void;
  onSignal: (kind: SignalKind) => void;
  onOpenSignal: (id: number) => void;
  onCloseSignal: () => void;
  onCloseDiscovery: () => void;
  onCompleteDiscovery: (id: string, kind: Discovery["kind"]) => void;
  onReply: (text: string) => void;
  onOpenOverview: () => void;
}) {
  const open = signals.find((signal) => signal.id === openedSignal);
  const source = members.find((item) => item.id === open?.from);
  const openDiscovery = discoveries.find((item) => item.id === openedDiscovery);
  const [zoom, setZoom] = useState(1);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const zoomRef = useRef(zoom);
  const pointersRef = useRef(new Map<number, Point>());
  const pinchDistanceRef = useRef<number | null>(null);

  zoomRef.current = zoom;

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 100 : 1);
      setZoom((current) => clampZoom(current * Math.exp(-delta * 0.0015)));
    };

    map.addEventListener("wheel", handleWheel, { passive: false });
    return () => map.removeEventListener("wheel", handleWheel);
  }, []);

  const changeZoom = (factor: number) => setZoom((current) => clampZoom(current * factor));

  return (
    <main className={cn("relative mx-auto min-h-dvh max-w-3xl overflow-hidden text-foreground sm:my-6 sm:min-h-[calc(100vh-3rem)] sm:rounded-3xl sm:border sm:border-border sm:shadow-map", member.theme)}>
      <header className="absolute inset-x-0 top-0 z-40 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 pb-5 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
        {isCurrentPlayer ? (
          <span className="h-10 w-10" aria-hidden="true" />
        ) : (
          <Button variant="secondary" size="icon" className="rounded-full bg-surface/90 shadow-soft backdrop-blur" onClick={onBack} aria-label="返回四人路线总览">
            <ArrowLeft />
          </Button>
        )}
        <div className="min-w-0 text-center">
          <p className="truncate text-sm font-semibold">{member.name} · {member.region}</p>
          <p className="text-[10px] text-muted-foreground">{isCurrentPlayer ? (destination ? "正在穿过迷雾" : "长按地图，走向新的地方") : "正在查看伙伴的路途"}</p>
        </div>
        <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold text-player-ink", member.color)}>{member.id}</div>
      </header>

      <div
        ref={mapRef}
        className={cn("journey-map absolute inset-0 touch-none", isCurrentPlayer && "cursor-crosshair")}
        aria-label={`${member.name}的个人地图`}
        onContextMenu={(event) => event.preventDefault()}
        onPointerDown={(event) => {
          const map = event.currentTarget;
          pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
          map.setPointerCapture(event.pointerId);
          if (pointersRef.current.size > 1) {
            clearLongPress(map);
            const points = [...pointersRef.current.values()];
            pinchDistanceRef.current = distanceBetweenFirstTwo(points);
            return;
          }
          if (!isCurrentPlayer || event.button !== 0 || (event.target as Element).closest("button")) return;
          const timer = window.setTimeout(() => {
            const bounds = map.getBoundingClientRect();
            const currentZoom = zoomRef.current;
            onMoveTo({
              x: position.x + (((event.clientX - bounds.left) / bounds.width) - 0.5) * (viewSize.width / currentZoom),
              y: position.y + (((event.clientY - bounds.top) / bounds.height) - 0.5) * (viewSize.height / currentZoom),
            });
          }, 420);
          map.dataset["longPressTimer"] = String(timer);
        }}
        onPointerMove={(event) => {
          if (!pointersRef.current.has(event.pointerId)) return;
          pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
          if (pointersRef.current.size !== 2) return;
          clearLongPress(event.currentTarget);
          const points = [...pointersRef.current.values()];
          const distance = distanceBetweenFirstTwo(points);
          if (distance === null) return;
          const previousDistance = pinchDistanceRef.current;
          if (previousDistance && previousDistance > 0) {
            setZoom((current) => clampZoom(current * (distance / previousDistance)));
          }
          pinchDistanceRef.current = distance;
        }}
        onPointerUp={(event) => finishMapPointer(event.currentTarget, event.pointerId, pointersRef, pinchDistanceRef)}
        onPointerCancel={(event) => finishMapPointer(event.currentTarget, event.pointerId, pointersRef, pinchDistanceRef)}
      >
        <PersonalLandscape member={member} camera={isCurrentPlayer ? position : startingPositions[member.id]} zoom={zoom} />
        <WeatherLayer member={member} cleared={weatherCleared} />
        {signals.slice(0, 8).map((signal, index) => (
          <MappedSignal
            key={signal.id}
            signal={signal}
            viewer={member.id}
            camera={isCurrentPlayer ? position : startingPositions[member.id]}
            zoom={zoom}
            index={index}
            onOpen={() => onOpenSignal(signal.id)}
          />
        ))}
        {isCurrentPlayer && discoveries.map((discovery) => (
          <DiscoveryMarker
            key={discovery.id}
            discovery={discovery}
            camera={position}
            zoom={zoom}
            completed={completedDiscoveries.has(discovery.id)}
          />
        ))}
        {isCurrentPlayer && <FogLayer camera={position} explored={explored} zoom={zoom} />}

        {isCurrentPlayer && destination && <DestinationMarker camera={position} destination={destination} zoom={zoom} />}

        <div className="player-piece absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 transition-[left,top] duration-75">
          <span className="absolute -inset-3 rounded-full border border-foreground/10 bg-surface/45" />
          <span className={cn("relative grid h-11 w-11 place-items-center rounded-full border-2 border-surface text-xs font-bold text-player-ink shadow-player", member.color)}>{member.id}</span>
        </div>
      </div>

      <div className="absolute left-4 top-[22%] z-50 flex flex-col overflow-hidden rounded-full border border-border bg-surface/95 shadow-soft backdrop-blur">
        <Button variant="ghost" size="icon" className="rounded-none border-b border-border" onClick={() => changeZoom(1.25)} disabled={zoom >= maxZoom} aria-label="放大地图" title="放大地图">
          <Plus />
        </Button>
        <Button variant="ghost" size="icon" className="rounded-none border-b border-border" onClick={() => changeZoom(0.8)} disabled={zoom <= minZoom} aria-label="缩小地图" title="缩小地图">
          <Minus />
        </Button>
        <Button variant="ghost" size="icon" className="rounded-none" onClick={() => setZoom(minZoom)} disabled={zoom === minZoom} aria-label="查看地图全景" title="查看地图全景">
          <Maximize2 />
        </Button>
      </div>

      <Button variant="secondary" size="icon" className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-50 rounded-full bg-surface/95 shadow-dock backdrop-blur" onClick={onOpenOverview} aria-label="进入四人路线总览">
        <MapIcon />
      </Button>

      <div className="absolute inset-x-0 bottom-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pr-20 sm:px-6 sm:pb-6 sm:pr-24">
        {toast && <div className="mx-auto mb-3 w-fit max-w-[90%] rounded-full bg-foreground/90 px-4 py-2 text-center text-xs text-background shadow-soft">{toast}</div>}
        {isCurrentPlayer ? (
          <div className="grid grid-cols-3 gap-2 rounded-2xl border border-border bg-surface/95 p-3 shadow-dock backdrop-blur-md">
            <Button variant="ghost" className="h-14 flex-col gap-1 rounded-xl bg-fire-soft text-foreground hover:bg-fire-soft/80" onClick={() => onSignal("help")}>
              <Flame className="text-fire" /><span className="text-[11px]">发出求助</span>
            </Button>
            <Button variant="ghost" className="h-14 flex-col gap-1 rounded-xl bg-post-soft text-foreground hover:bg-post-soft/80" onClick={() => onSignal("reminder")}>
              <BellRing className="text-post" /><span className="text-[11px]">提出提醒</span>
            </Button>
            <Button variant="ghost" className="h-14 flex-col gap-1 rounded-xl bg-signal/35 text-foreground hover:bg-signal/45" onClick={() => onSignal("resolve")}>
              <CloudSun className="text-primary" /><span className="text-[11px]">完成求助</span>
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface/92 px-4 py-3 text-xs text-muted-foreground shadow-dock backdrop-blur-md">
            <Eye className="h-4 w-4" />这是 {member.name} 的路，你可以观察沿途痕迹
          </div>
        )}
      </div>

      {open && source && (
        <div className="absolute inset-0 z-[60] flex items-end bg-overlay p-4 sm:items-center sm:justify-center" onClick={onCloseSignal}>
          <section className="w-full rounded-2xl bg-surface p-5 shadow-dock sm:max-w-sm" onClick={(event) => event.stopPropagation()}>
            <div className="mb-5 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
              <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-bold text-player-ink", source.color)}>{source.id}</div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">这是 {source.name} 留下的痕迹</p>
                <p className="text-xs text-muted-foreground">{effectCopy(open.kind, member.id, source.id)}</p>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full" onClick={onCloseSignal} aria-label="关闭"><X /></Button>
            </div>
            <p className="mb-5 font-display text-xl leading-relaxed">“{open.note}”</p>
            {isCurrentPlayer && (
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" onClick={() => onReply(`已让${source.name}知道：我看见了`)}>我看见了</Button>
                <Button onClick={() => onReply(`为${source.name}留下一颗星`)}>留一颗星</Button>
              </div>
            )}
          </section>
        </div>
      )}

      {openDiscovery && (
        <div className="absolute inset-0 z-[60] flex items-end bg-overlay p-4 sm:items-center sm:justify-center" onClick={onCloseDiscovery}>
          <section className="w-full rounded-2xl bg-surface p-5 shadow-dock sm:max-w-sm" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-signal/45 text-signal-foreground">
                {openDiscovery.kind === "chest" ? <PackageOpen /> : <HandHeart />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold text-muted-foreground">迷雾之下的新发现</p>
                <h2 className="font-display text-lg font-semibold">{openDiscovery.title}</h2>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full" onClick={onCloseDiscovery} aria-label="关闭发现"><X /></Button>
            </div>
            <p className="mb-5 text-sm leading-relaxed text-muted-foreground">{openDiscovery.note}</p>
            <Button className="w-full" onClick={() => onCompleteDiscovery(openDiscovery.id, openDiscovery.kind)}>
              {openDiscovery.kind === "chest" ? "收下火种" : "接下任务"}
            </Button>
          </section>
        </div>
      )}
    </main>
  );
}

function PersonalLandscape({ member, camera, zoom }: { member: Member; camera: Point; zoom: number }) {
  const width = viewSize.width / zoom;
  const height = viewSize.height / zoom;
  const viewBox = `${camera.x - width / 2} ${camera.y - height / 2} ${width} ${height}`;
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox={viewBox} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <pattern id={`soft-dots-${member.id}`} width="92" height="92" patternUnits="userSpaceOnUse">
          <circle cx="18" cy="24" r="2.5" fill="var(--surface)" opacity=".62" />
          <circle cx="70" cy="58" r="1.7" fill="var(--member-detail)" opacity=".38" />
        </pattern>
      </defs>
      <rect x={camera.x - 900} y={camera.y - 1400} width="1800" height="2800" fill={`url(#soft-dots-${member.id})`} />
      {member.id === "A" && (
        <>
          <path d="M-430 276 C-210 196 -58 312 143 246 C352 178 506 268 850 114" fill="none" stroke="var(--member-water)" strokeWidth="32" strokeLinecap="round" opacity=".8" />
          <g fill="var(--member-detail)" opacity=".72"><circle cx="53" cy="134" r="49"/><circle cx="354" cy="293" r="62"/><circle cx="44" cy="649" r="70"/><circle cx="350" cy="713" r="52"/><circle cx="-186" cy="512" r="58"/><circle cx="642" cy="498" r="76"/></g>
        </>
      )}
      {member.id === "B" && (
        <>
          <path d="M78 -430 C157 -317 51 -226 133 -122 C218 -14 92 88 172 203 C235 294 190 358 146 450 C74 592 198 710 135 936 C96 1074 158 1196 78 1320" fill="none" stroke="var(--member-water)" strokeWidth="72" strokeLinecap="round" opacity=".9" />
          <path d="M80 -430 C157 -317 54 -226 135 -122 C219 -14 95 88 174 203 C235 294 190 358 146 450 C74 592 198 710 135 936" fill="none" stroke="var(--surface)" strokeWidth="3" strokeDasharray="3 16" opacity=".5" />
          <g fill="var(--member-detail)" opacity=".62"><circle cx="344" cy="170" r="70"/><circle cx="349" cy="573" r="57"/><circle cx="45" cy="456" r="31"/><circle cx="-160" cy="90" r="54"/><circle cx="586" cy="812" r="73"/></g>
        </>
      )}
      {member.id === "C" && (
        <g fill="none" stroke="var(--member-detail)" opacity=".62">
          <path d="M-440 154 Q-210 38 -10 132 T467 123 T892 146" strokeWidth="3"/><path d="M-445 193 Q-206 72 -28 184 T462 162 T870 196"/><path d="M-438 466 Q-185 342 0 439 T466 432 T846 467" strokeWidth="3"/><path d="M-442 505 Q-190 382 4 487 T462 471 T850 514"/>
          <path d="M42 681 C107 644 149 686 202 651" strokeWidth="4" strokeLinecap="round"/><path d="M250 246 C308 212 341 247 394 217" strokeWidth="4" strokeLinecap="round"/>
        </g>
      )}
      {member.id === "D" && (
        <g fill="var(--member-detail)" opacity=".64">
          <circle cx="57" cy="153" r="61"/><circle cx="350" cy="232" r="71"/><circle cx="70" cy="533" r="54"/><circle cx="346" cy="681" r="78"/><circle cx="-118" cy="390" r="68"/><circle cx="620" cy="428" r="83"/>
          <circle cx="168" cy="101" r="9"/><circle cx="295" cy="387" r="12"/><circle cx="185" cy="707" r="8"/>
        </g>
      )}
      <path d={member.route} fill="none" stroke="var(--member-trail-edge)" strokeWidth="39" strokeLinecap="round" />
      <path d={member.route} fill="none" stroke="var(--member-trail)" strokeWidth="31" strokeLinecap="round" strokeDasharray="3 9" />
      <g transform="translate(218 54)">
        <ellipse cy="19" rx="37" ry="11" fill="var(--finish)" opacity=".7" />
        <path d="M-18 9 L0-14 L19 9 M-12 9 V-1 H13 V9 M0-14 V-27" fill="none" stroke="var(--foreground)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M0-27 L19-21 L0-15" fill="var(--signal)" stroke="var(--foreground)" strokeWidth="2" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

function WeatherLayer({ member, cleared }: { member: Member; cleared: boolean }) {
  if (member.id !== "A" && member.id !== "B") return null;
  return (
    <div className={cn("pointer-events-none absolute inset-0 z-10", cleared ? "weather-clear" : "weather-clouds")} aria-hidden="true">
      <span className="absolute left-[10%] top-[15%] h-24 w-48 rounded-full bg-surface/55 blur-xl" />
      <span className="absolute right-[4%] top-[30%] h-20 w-52 rounded-full bg-surface/50 blur-xl" />
      {cleared && <CloudSun className="absolute right-[16%] top-[12%] h-14 w-14 text-primary/70" />}
    </div>
  );
}

function FogLayer({ camera, explored, zoom }: { camera: Point; explored: Point[]; zoom: number }) {
  const width = viewSize.width / zoom;
  const height = viewSize.height / zoom;
  const viewBox = `${camera.x - width / 2} ${camera.y - height / 2} ${width} ${height}`;
  return (
    <svg className="fog-layer pointer-events-none absolute inset-0 z-[35] h-full w-full" viewBox={viewBox} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <mask id="explored-fog-mask">
          <rect x={camera.x - 1200} y={camera.y - 1600} width="2400" height="3200" fill="white" />
          {explored.map((point, index) => <circle key={`${point.x}-${point.y}-${index}`} cx={point.x} cy={point.y} r="72" fill="black" />)}
          <circle cx={startingPositions.A.x} cy={startingPositions.A.y} r="92" fill="black" />
        </mask>
      </defs>
      <rect x={camera.x - 1200} y={camera.y - 1600} width="2400" height="3200" mask="url(#explored-fog-mask)" />
    </svg>
  );
}

function DiscoveryMarker({ discovery, camera, zoom, completed }: { discovery: Discovery; camera: Point; zoom: number; completed: boolean }) {
  if (completed) return null;
  const screen = toScreen(discovery.position, camera, zoom);
  if (screen.x < -15 || screen.x > 115 || screen.y < -15 || screen.y > 115) return null;
  return (
    <span className="discovery-marker pointer-events-none absolute z-30 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-surface text-signal-foreground shadow-signal" style={{ left: `${screen.x}%`, top: `${screen.y}%` }} aria-hidden="true">
      {discovery.kind === "chest" ? <PackageOpen className="h-5 w-5" /> : <HandHeart className="h-5 w-5" />}
    </span>
  );
}

function DestinationMarker({ camera, destination, zoom }: { camera: Point; destination: Point; zoom: number }) {
  const screen = toScreen(destination, camera, zoom);
  return (
    <span
      className="destination-marker pointer-events-none absolute z-40 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary/55"
      style={{ left: `${screen.x}%`, top: `${screen.y}%` }}
      aria-hidden="true"
    />
  );
}

function MappedSignal({ signal, viewer, camera, zoom, index, onOpen }: { signal: Signal; viewer: MemberId; camera: Point; zoom: number; index: number; onOpen: () => void }) {
  const screen = toScreen(signal.position, camera, zoom);
  if (screen.x < -18 || screen.x > 118 || screen.y < -18 || screen.y > 118) return null;
  const isSmoke = signal.kind === "help" && viewer === "B";
  const isWind = signal.kind === "reminder" && viewer === "B";
  const isCloudClear = signal.kind === "resolve" && (viewer === "A" || viewer === "B");
  const isStar = signal.kind === "thanks";

  return (
    <Button
      variant="ghost"
      onClick={onOpen}
      className={cn("signal-marker absolute z-30 h-auto w-auto -translate-x-1/2 -translate-y-1/2 rounded-full p-0 hover:bg-transparent", index > 3 && "opacity-80")}
      style={{ left: `${screen.x}%`, top: `${screen.y}%` }}
      aria-label={`查看${signal.from}在这张地图留下的痕迹`}
    >
      {isSmoke ? (
        <span className="smoke-trace relative flex flex-col items-center text-signal-foreground">
          <span className="h-6 w-6 rounded-full bg-signal/35" />
          <span className="-mt-2 h-5 w-5 rounded-full bg-signal/55" />
          <Flame className="mt-0.5 h-5 w-5 text-fire" />
        </span>
      ) : isWind ? (
        <span className="wind-current relative flex items-center gap-1.5 rounded-full bg-post-soft/90 px-3 py-2 text-[10px] font-semibold text-post shadow-soft backdrop-blur">
          <Wind className="h-4 w-4" />风铃的风
        </span>
      ) : isCloudClear ? (
        <span className="cloud-clear-marker grid h-12 w-12 place-items-center rounded-full bg-surface/85 text-primary shadow-signal backdrop-blur">
          <CloudSun className="h-6 w-6" />
        </span>
      ) : isStar ? (
        <span className="star-hang relative grid h-12 w-12 place-items-center rounded-full bg-signal/40 text-signal-foreground shadow-signal backdrop-blur">
          <Star className="h-6 w-6 fill-current" />
        </span>
      ) : signal.kind === "reminder" ? (
        <span className="chime-sway grid h-11 w-11 place-items-center rounded-full bg-post-soft text-post shadow-signal"><BellRing className="h-5 w-5" /></span>
      ) : (
        <span className="relative flex items-center gap-1.5 rounded-full bg-post-soft/90 px-3 py-2 text-[10px] font-semibold text-post shadow-soft backdrop-blur">
          <Waves className="h-4 w-4" /><SignalIcon kind={signal.kind} className="h-4 w-4" />同行痕迹
        </span>
      )}
    </Button>
  );
}

function SignalIcon({ kind, className }: { kind: SignalKind; className?: string }) {
  if (kind === "help") return <Flame className={className} />;
  if (kind === "resolve") return <CloudSun className={className} />;
  if (kind === "reminder") return <BellRing className={className} />;
  return <Star className={className} />;
}

function effectCopy(kind: SignalKind, viewer: MemberId, source: MemberId) {
  if (kind === "help" && viewer === "B") return "A 的火在 B 的地图里变成烟";
  if (kind === "resolve" && (viewer === "A" || viewer === "B")) return "云雾拨开，阴天变晴";
  if (kind === "reminder" && viewer === "B") return "风铃在 B 的路上变成风";
  if (kind === "thanks") return `${source} 挂起的星星，所有人都能看见`;
  return "它在你的地貌里换了一种模样";
}

function toScreen(point: Point, camera: Point, zoom = 1) {
  return {
    x: 50 + ((point.x - camera.x) / viewSize.width) * 100 * zoom,
    y: 50 + ((point.y - camera.y) / viewSize.height) * 100 * zoom,
  };
}

function clampZoom(zoom: number) {
  return Math.min(maxZoom, Math.max(minZoom, zoom));
}

function distanceBetweenFirstTwo(points: Point[]) {
  const first = points[0];
  const second = points[1];
  if (!first || !second) return null;
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function finishMapPointer(
  element: HTMLElement,
  pointerId: number,
  pointersRef: { current: Map<number, Point> },
  pinchDistanceRef: { current: number | null },
) {
  clearLongPress(element);
  pointersRef.current.delete(pointerId);
  if (pointersRef.current.size < 2) pinchDistanceRef.current = null;
}

function clearLongPress(element: HTMLElement) {
  const timer = Number(element.dataset["longPressTimer"]);
  if (Number.isFinite(timer)) window.clearTimeout(timer);
  delete element.dataset["longPressTimer"];
}
