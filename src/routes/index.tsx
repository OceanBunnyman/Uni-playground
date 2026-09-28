import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft,
  BellRing,
  Eye,
  Flame,
  Map as MapIcon,
  PackageOpen,
  Send,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { FogShaderCanvas } from "@/components/FogShaderCanvas";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Together · A Four-Person Journey" },
      { name: "description", content: "Four people travel different routes and discover the traces their companions leave on each other's maps." },
      { property: "og:title", content: "Together · A Four-Person Journey" },
      { property: "og:description", content: "Walk different paths, notice each other's campfires and wind chimes, discover hidden chests, and reach camp together." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: JourneyGame,
});

type MemberId = "A" | "B" | "C" | "D";
type SignalKind = "help" | "reminder";
type Point = { x: number; y: number };

type Member = {
  id: MemberId;
  name: string;
  region: string;
  color: string;
  theme: string;
  overviewRoute: string;
};

type Signal = {
  id: number;
  from: MemberId;
  kind: SignalKind;
  note: string;
  position: Point;
  to?: MemberId[] | undefined;
  resolved?: boolean;
  read?: boolean;
  helped?: boolean;
};

type Discovery = {
  id: string;
  kind: "chest";
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
    name: "Isla",
    region: "Tundra Shallows",
    color: "bg-player-a",
    theme: "map-theme-a",
    overviewRoute: "M16 20 C72 28 52 93 113 108 C176 122 184 184 248 214",
  },
  {
    id: "B",
    name: "Mako",
    region: "Bluebrook River",
    color: "bg-player-b",
    theme: "map-theme-b",
    overviewRoute: "M244 18 C179 37 213 92 142 109 C78 125 72 180 12 214",
  },
  {
    id: "C",
    name: "Hana",
    region: "Windy Ridge",
    color: "bg-player-c",
    theme: "map-theme-c",
    overviewRoute: "M18 202 C77 178 67 125 126 110 C185 94 189 40 248 9",
  },
  {
    id: "D",
    name: "Mimi",
    region: "Warm Meadow",
    color: "bg-player-d",
    theme: "map-theme-d",
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
  { id: 1, from: "B", kind: "reminder", position: { x: 320, y: 240 }, note: "Reminder: two days left until the prototype review deadline — don't forget to wrap up your part." },
  { id: 2, from: "D", kind: "help", position: { x: 96, y: 560 }, note: "Help needed: could someone take a look at my prototype draft and share quick feedback?" },
  { id: 3, from: "C", kind: "help", position: { x: 402, y: 435 }, note: "Help needed: I'm swamped by the user-survey summaries — could someone take over the next batch?" },
  { id: 4, from: "D", kind: "reminder", position: { x: 258, y: 128 }, note: "Reminder: the sprint retro starts in an hour — bring your notes and blockers." },
  { id: 5, from: "B", kind: "help", position: { x: 478, y: 668 }, note: "Help needed: my laptop battery is almost dead — does anyone have the spare charger?" },
  { id: 6, from: "C", kind: "reminder", position: { x: 142, y: 338 }, note: "Reminder: it's my turn to send the weekly status update today — nudging myself before I forget." },
];

const initialDiscoveries: Discovery[] = [
  { id: "chest-reeds", kind: "chest", position: { x: 460, y: 560 }, title: "A little crate in the reeds", note: "Help Others 5 times even though they (you) are not urgent." },
];

function JourneyGame() {
  const [selected, setSelected] = useState<MemberId | null>("A");
  const [positions, setPositions] = useState(startingPositions);
  const [signals, setSignals] = useState<Signal[]>(initialSignals);
  const [openedSignal, setOpenedSignal] = useState<number | null>(null);
  const [toast, setToast] = useState("");
  const [destination, setDestination] = useState<Point | null>(null);
  const [explored, setExplored] = useState<Point[]>([startingPositions.A]);
  const [openedDiscovery, setOpenedDiscovery] = useState<string | null>(null);
  const [completedDiscoveries, setCompletedDiscoveries] = useState<Set<string>>(() => new Set());
  const [discoveries, setDiscoveries] = useState<Discovery[]>(initialDiscoveries);
  const positionRef = useRef(startingPositions.A);
  const destinationRef = useRef<Point | null>(null);
  const selectedRef = useRef<MemberId | null>("A");
  const signalsRef = useRef(initialSignals);
  const openedSignalRef = useRef<number | null>(null);
  const openedDiscoveryRef = useRef<string | null>(null);
  const completedDiscoveriesRef = useRef(new Set<string>());
  const discoveriesRef = useRef(initialDiscoveries);
  const encounteredRef = useRef(new Set<number>());

  selectedRef.current = selected;
  signalsRef.current = signals;
  openedSignalRef.current = openedSignal;
  openedDiscoveryRef.current = openedDiscovery;
  completedDiscoveriesRef.current = completedDiscoveries;
  discoveriesRef.current = discoveries;

  useEffect(() => {
    const angle = Math.random() * Math.PI * 2;
    const distance = 300 + Math.random() * 220;
    setDiscoveries(initialDiscoveries.map((discovery) => ({
      ...discovery,
      position: {
        x: startingPositions.A.x + Math.cos(angle) * distance,
        y: startingPositions.A.y + Math.sin(angle) * distance,
      },
    })));
  }, []);

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

      const pace = 9.5;
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

      const discovery = discoveriesRef.current.find((item) => {
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
    () => signals,
    [selected, signals],
  );

  const pushToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  };

  const leaveSignal = (kind: SignalKind, note?: string, to?: MemberId[]) => {
    const current = positionRef.current;
    const signal: Signal = {
      id: Date.now(),
      from: "A",
      kind,
      position: { x: current.x + 34, y: current.y - 26 },
      to: to && to.length ? to : undefined,
      note: note?.trim() || (kind === "help" ? "Help needed: could someone take a look at my work and give a hand?" : "Reminder: a deadline is coming up — keep it in mind."),
    };
    setSignals((currentSignals) => [signal, ...currentSignals]);
    const names = to && to.length ? to.map((id) => members.find((m) => m.id === id)?.name ?? id).join(", ") : "everyone";
    pushToast(kind === "help" ? `Your fire rises as smoke on ${names}'s map` : `Your chime drifts as wind toward ${names}`);
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
        openedDiscovery={openedDiscovery}
        discoveries={discoveries}
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
        onResolve={(signalId) => {
          setOpenedSignal(null);
          setSignals((currentSignals) => currentSignals.map((signal) => signal.id === signalId ? { ...signal, resolved: true } : signal));
          pushToast("Marked as resolved");
        }}
        onHelp={(signalId) => {
          setOpenedSignal(null);
          setSignals((currentSignals) => currentSignals.map((signal) => signal.id === signalId ? { ...signal, helped: true } : signal));
          pushToast("You offered to help");
        }}
        onRead={(signalId) => {
          setOpenedSignal(null);
          setSignals((currentSignals) => currentSignals.map((signal) => signal.id === signalId ? { ...signal, read: true } : signal));
          pushToast("Reminder marked as read");
        }}
        onOpenSignal={(id) => {
          destinationRef.current = null;
          setDestination(null);
          setOpenedSignal(id);
        }}
        onCloseSignal={() => setOpenedSignal(null)}
        onCloseDiscovery={() => setOpenedDiscovery(null)}
        onCompleteDiscovery={(id) => {
          setCompletedDiscoveries((current) => new Set(current).add(id));
          setOpenedDiscovery(null);
          pushToast("Chest opened");
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
            <p className="mb-1 text-xs font-semibold text-muted-foreground">Day 03 · Four paths, one camp</p>
            <h1 className="font-display text-3xl font-semibold sm:text-4xl">Four people, heading to the same place</h1>
          </div>
          <p className="hidden text-xs text-muted-foreground sm:block">Tap a map to see each journey</p>
        </header>

        <section className="relative overflow-hidden rounded-3xl border border-border bg-map p-2 shadow-map sm:p-3" aria-label="Overview of all four routes">
          <div className="grid grid-cols-2 gap-1.5 overflow-hidden rounded-2xl bg-border/60 sm:gap-2">
            {members.map((member, index) => {
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
                    <span className="text-xs font-semibold text-foreground">{member.name}{member.id === "A" ? " · You" : ""}</span>
                  </div>
                  <p className="absolute bottom-3 left-3 z-10 text-[10px] font-medium text-foreground/70 sm:bottom-5 sm:left-5">{member.region}</p>
                </Button>
              );
            })}
          </div>

        </section>

        <footer className="mt-5 flex items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>Use the button at the bottom right of your map to come back here.</p>
          <Button variant="secondary" className="shrink-0 rounded-full" onClick={() => onSelect("A")}>Back to A</Button>
        </footer>
      </div>
    </main>
  );
}

function OverviewMap({ member, position, quadrant }: { member: Member; position: Point; quadrant: number }) {
  const markerX = quadrant % 2 === 0 ? 24 + (position.x % 100) * 1.7 : 236 - (position.x % 100) * 1.7;
  const markerY = quadrant < 2 ? 18 + (position.y % 100) * 1.9 : 204 - (position.y % 100) * 1.9;
  return (
    <svg className="h-full w-full" viewBox="0 0 260 220" role="img" aria-label={`${member.name}'s route through ${member.region}`}>
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
  openedDiscovery,
  discoveries,
  completedDiscoveries,
  isCurrentPlayer,
  onBack,
  onMoveTo,
  onSignal,
  onResolve,
  onHelp,
  onRead,
  onOpenSignal,
  onCloseSignal,
  onCloseDiscovery,
  onCompleteDiscovery,
  onOpenOverview,
}: {
  member: Member;
  position: Point;
  signals: Signal[];
  openedSignal: number | null;
  toast: string;
  destination: Point | null;
  explored: Point[];
  openedDiscovery: string | null;
  discoveries: Discovery[];
  completedDiscoveries: Set<string>;
  isCurrentPlayer: boolean;
  onBack: () => void;
  onMoveTo: (point: Point) => void;
  onSignal: (kind: SignalKind, note?: string, to?: MemberId[]) => void;
  onResolve: (signalId: number) => void;
  onHelp: (signalId: number) => void;
  onRead: (signalId: number) => void;
  onOpenSignal: (id: number) => void;
  onCloseSignal: () => void;
  onCloseDiscovery: () => void;
  onCompleteDiscovery: (id: string) => void;
  onOpenOverview: () => void;
}) {
  const open = signals.find((signal) => signal.id === openedSignal);
  const source = members.find((item) => item.id === open?.from);
  const openDiscovery = discoveries.find((item) => item.id === openedDiscovery);
  const [composer, setComposer] = useState<SignalKind | null>(null);
  const [draft, setDraft] = useState("");
  const [recipients, setRecipients] = useState<MemberId[]>([]);
  const draftRef = useRef<HTMLInputElement | null>(null);
  const [zoom, setZoomState] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [mapViewport, setMapViewport] = useState<Point>({ x: viewSize.width, y: viewSize.height });
  const offsetRef = useRef(offset);
  offsetRef.current = offset;
  const mapRef = useRef<HTMLDivElement | null>(null);
  const zoomRef = useRef(zoom);
  const pointersRef = useRef(new Map<number, Point>());
  const pinchDistanceRef = useRef<number | null>(null);
  const tapStartRef = useRef<{ id: number; x: number; y: number } | null>(null);

  zoomRef.current = zoom;
  const basePosition = startingPositions[member.id];
  // Follow the current player while keeping every map element in one world-space camera.
  const cameraAnchor = isCurrentPlayer ? position : basePosition;
  const camera = { x: cameraAnchor.x + offset.x, y: cameraAnchor.y + offset.y };
  const cameraAnchorRef = useRef(cameraAnchor);
  cameraAnchorRef.current = cameraAnchor;
  const mapViewportRef = useRef(mapViewport);
  mapViewportRef.current = mapViewport;

  // Zoom the whole map around a focal point (fractions of the viewport), not around the player.
  const zoomAt = (nextZoomRaw: number, fx = 0.5, fy = 0.5) => {
    const prev = zoomRef.current;
    const next = clampZoom(nextZoomRaw);
    if (next === prev) return;
    const base = cameraAnchorRef.current;
    const off = offsetRef.current;
    const cam = { x: base.x + off.x, y: base.y + off.y };
    const viewport = mapViewportRef.current;
    const wx = cam.x + (fx - 0.5) * (viewport.x / prev);
    const wy = cam.y + (fy - 0.5) * (viewport.y / prev);
    const nextOffset = {
      x: wx - (fx - 0.5) * (viewport.x / next) - base.x,
      y: wy - (fy - 0.5) * (viewport.y / next) - base.y,
    };
    zoomRef.current = next;
    offsetRef.current = nextOffset;
    setZoomState(next);
    setOffset(nextOffset);
  };
  const worldPointFromClient = (clientX: number, clientY: number) => {
    const bounds = mapRef.current?.getBoundingClientRect();
    if (!bounds) return null;
    const currentZoom = zoomRef.current;
    return {
      x: cameraAnchorRef.current.x + offsetRef.current.x + (((clientX - bounds.left) / bounds.width) - 0.5) * (mapViewportRef.current.x / currentZoom),
      y: cameraAnchorRef.current.y + offsetRef.current.y + (((clientY - bounds.top) / bounds.height) - 0.5) * (mapViewportRef.current.y / currentZoom),
    };
  };
  const focusOf = (clientX: number, clientY: number) => {
    const bounds = mapRef.current?.getBoundingClientRect();
    if (!bounds) return { fx: 0.5, fy: 0.5 };
    return { fx: (clientX - bounds.left) / bounds.width, fy: (clientY - bounds.top) / bounds.height };
  };
  const zoomAtRef = useRef(zoomAt);
  zoomAtRef.current = zoomAt;

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const syncViewport = () => {
      const bounds = map.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) return;
      const next = { x: viewSize.height * (bounds.width / bounds.height), y: viewSize.height };
      mapViewportRef.current = next;
      setMapViewport(next);
    };
    syncViewport();
    const resizeObserver = new ResizeObserver(syncViewport);
    resizeObserver.observe(map);

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 100 : 1);
      const { fx, fy } = focusOf(event.clientX, event.clientY);
      zoomAtRef.current(zoomRef.current * Math.exp(-delta * 0.0015), fx, fy);
    };

    map.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      resizeObserver.disconnect();
      map.removeEventListener("wheel", handleWheel);
    };
  }, []);


  return (
    <main className={cn("relative mx-auto min-h-dvh max-w-3xl overflow-hidden text-foreground sm:my-6 sm:min-h-[calc(100vh-3rem)] sm:rounded-3xl sm:border sm:border-border sm:shadow-map", member.theme)}>
      <header className="absolute inset-x-0 top-0 z-40 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 pb-5 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
        {isCurrentPlayer ? (
          <span className="h-10 w-10" aria-hidden="true" />
        ) : (
          <Button variant="secondary" size="icon" className="rounded-full bg-surface/90 shadow-soft backdrop-blur" onClick={onBack} aria-label="Back to the route overview">
            <ArrowLeft />
          </Button>
        )}
        <div className="min-w-0 text-center">
          <p className="truncate text-sm font-semibold">{member.name} · {member.region}</p>
          <p className="text-[10px] text-muted-foreground">{isCurrentPlayer ? (destination ? "Walking through the mist" : "Tap the map to walk somewhere new") : "Viewing a companion's journey"}</p>
        </div>
        <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold text-player-ink", member.color)}>{member.id}</div>
      </header>

      <div
        ref={mapRef}
        className={cn("journey-map absolute inset-0 touch-none", isCurrentPlayer && "cursor-crosshair")}
        aria-label={`${member.name}'s map`}
        onContextMenu={(event) => event.preventDefault()}
        onPointerDown={(event) => {
          const map = event.currentTarget;
          const onMarker = Boolean((event.target as Element).closest("button"));
          pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
          if (!onMarker) map.setPointerCapture(event.pointerId);
          if (pointersRef.current.size > 1) {
            tapStartRef.current = null;
            const points = [...pointersRef.current.values()];
            pinchDistanceRef.current = distanceBetweenFirstTwo(points);
            return;
          }
          if (!isCurrentPlayer || event.button !== 0 || (event.target as Element).closest("button")) return;
          tapStartRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
        }}
        onPointerMove={(event) => {
          const previousPoint = pointersRef.current.get(event.pointerId);
          if (!previousPoint) return;
          pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
          if (pointersRef.current.size === 1 && !isCurrentPlayer) {
            // Companions' maps: one-finger drag pans the camera in world space.
            const bounds = event.currentTarget.getBoundingClientRect();
            const scale = mapViewportRef.current.y / zoomRef.current / bounds.height;
            const nextOffset = {
              x: offsetRef.current.x - (event.clientX - previousPoint.x) * scale,
              y: offsetRef.current.y - (event.clientY - previousPoint.y) * scale,
            };
            offsetRef.current = nextOffset;
            setOffset(nextOffset);
            return;
          }
          if (pointersRef.current.size !== 2) return;
          tapStartRef.current = null;
          const points = [...pointersRef.current.values()];
          const distance = distanceBetweenFirstTwo(points);
          if (distance === null) return;
          const previousDistance = pinchDistanceRef.current;
          if (previousDistance && previousDistance > 0) {
            const [a, b] = points;
            const { fx, fy } = focusOf((a!.x + b!.x) / 2, (a!.y + b!.y) / 2);
            zoomAt(zoomRef.current * (distance / previousDistance), fx, fy);
          }
          pinchDistanceRef.current = distance;
        }}
        onPointerUp={(event) => {
          finishMapPointer(event.currentTarget, event.pointerId, pointersRef, pinchDistanceRef);
          const tap = tapStartRef.current;
          tapStartRef.current = null;
          if (!tap || tap.id !== event.pointerId || pointersRef.current.size > 0) return;
          if (Math.hypot(event.clientX - tap.x, event.clientY - tap.y) > 12) return;
          const point = worldPointFromClient(event.clientX, event.clientY);
          if (point) onMoveTo(point);
        }}
        onPointerCancel={(event) => {
          tapStartRef.current = null;
          finishMapPointer(event.currentTarget, event.pointerId, pointersRef, pinchDistanceRef);
        }}
      >
        <PersonalLandscape member={member} camera={camera} zoom={zoom} viewport={mapViewport} />
        {signals.filter((signal) => !signal.to || signal.from === member.id || signal.to.includes(member.id)).slice(0, 12).map((signal, index) => (
          <MappedSignal
            key={signal.id}
            signal={signal}
            viewer={member.id}
            camera={camera}
            zoom={zoom}
            viewport={mapViewport}
            index={index}
            onOpen={() => onOpenSignal(signal.id)}
          />
        ))}
        {isCurrentPlayer && discoveries.map((discovery) => (
          <DiscoveryMarker
            key={discovery.id}
            discovery={discovery}
            camera={camera}
            zoom={zoom}
            viewport={mapViewport}
            completed={completedDiscoveries.has(discovery.id)}
          />
        ))}
        {isCurrentPlayer && (
          <FogShaderCanvas camera={camera} explored={explored} zoom={zoom} viewSize={mapViewport} />
        )}

        {isCurrentPlayer && destination && <DestinationMarker camera={camera} destination={destination} zoom={zoom} viewport={mapViewport} />}

        <div className="player-piece absolute z-30 -translate-x-1/2 -translate-y-1/2" style={{ left: `${toScreen(isCurrentPlayer ? position : basePosition, camera, zoom, mapViewport).x}%`, top: `${toScreen(isCurrentPlayer ? position : basePosition, camera, zoom, mapViewport).y}%` }}>
          <span className="absolute -inset-3 rounded-full border border-foreground/10 bg-surface/45" />
          <span className={cn("relative grid h-11 w-11 place-items-center rounded-full border-2 border-surface text-xs font-bold text-player-ink shadow-player", member.color)}>{member.id}</span>
        </div>
      </div>


      <div className="absolute left-4 top-[calc(max(1rem,env(safe-area-inset-top))+0.5rem)] z-50 flex w-fit flex-col items-start gap-2 sm:left-6 sm:top-6">
        <Button variant="secondary" size="icon" className="h-11 w-11 rounded-full bg-surface/95 shadow-dock backdrop-blur" onClick={onOpenOverview} aria-label="Open the route overview">
          <MapIcon />
        </Button>
        {!isCurrentPlayer && (
          <div className="flex max-w-[11rem] items-center gap-2 rounded-full border border-border bg-surface/92 px-4 py-2.5 text-[11px] leading-snug text-muted-foreground shadow-dock backdrop-blur-md">
            <Eye className="h-4 w-4 shrink-0" />Viewing {member.name}'s path — look around at the traces
          </div>
        )}
      </div>

      {isCurrentPlayer && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-6">
        <div className="pointer-events-auto mx-auto flex w-fit flex-col items-center gap-2">
          {composer && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                onSignal(composer, draft, recipients);
                setComposer(null);
                setDraft("");
                setRecipients([]);
              }}
              className="flex flex-col items-stretch gap-2 rounded-3xl border border-border bg-surface/95 p-2 shadow-dock backdrop-blur-md"
            >
              <div className="flex flex-wrap items-center gap-1.5 px-1 text-[10px] text-muted-foreground">
                <span>To</span>
                <button type="button" onClick={() => setRecipients([])} className={cn("rounded-full px-2.5 py-1 font-semibold", recipients.length === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")}>Everyone</button>
                {members.filter((m) => m.id !== member.id).map((m) => {
                  const on = recipients.includes(m.id);
                  return (
                    <button key={m.id} type="button" aria-pressed={on} onClick={() => setRecipients((cur) => on ? cur.filter((id) => id !== m.id) : [...cur, m.id])} className={cn("rounded-full px-2.5 py-1 font-semibold", on ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")}>{m.name}</button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 pl-2">
              <input
                ref={draftRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                autoFocus
                maxLength={80}
                placeholder={composer === "help" ? "Need help with… e.g. reviewing my prototype" : "Remind the team of… e.g. an upcoming deadline"}
                className="w-44 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground/70 sm:w-56"
              />
              <Button type="submit" size="icon" className="h-8 w-8 shrink-0 rounded-full" aria-label="Leave the signal">
                <Send className="h-4 w-4" />
              </Button>
              </div>
            </form>
          )}
          <div className="flex items-center gap-2">
            <Button variant="ghost" className={cn("h-11 gap-2 rounded-full bg-fire-soft px-4 text-foreground shadow-dock backdrop-blur-md hover:bg-fire-soft/80", composer === "help" && "ring-1 ring-fire/40")} onClick={() => setComposer(composer === "help" ? null : "help")}>
              <Flame className="text-fire" /><span className="text-[11px]">Ask for help</span>
            </Button>
            <Button variant="ghost" className={cn("h-11 gap-2 rounded-full bg-post-soft px-4 text-foreground shadow-dock backdrop-blur-md hover:bg-post-soft/80", composer === "reminder" && "ring-1 ring-post/40")} onClick={() => setComposer(composer === "reminder" ? null : "reminder")}>
              <BellRing className="text-post" /><span className="text-[11px]">Remind</span>
            </Button>
          </div>
        </div>
        </div>
      )}

      {toast && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-6">
          <div className="mx-auto w-fit max-w-[90%] rounded-full bg-foreground/90 px-4 py-2 text-center text-xs text-background shadow-soft">{toast}</div>
        </div>
      )}

      {open && source && (
        <div className="absolute inset-0 z-[60] flex items-end bg-overlay p-4 sm:items-center sm:justify-center" onClick={onCloseSignal}>
          <section className="w-full rounded-2xl bg-surface p-5 shadow-dock sm:max-w-sm" onClick={(event) => event.stopPropagation()}>
            <div className="mb-5 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
              <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-bold text-player-ink", source.color)}>{source.id}</div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">A trace left by {source.name}</p>
                <p className="text-xs text-muted-foreground">{effectCopy(open.kind, member.id, source.id)}</p>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full" onClick={onCloseSignal} aria-label="Close"><X /></Button>
            </div>
            <p className="mb-5 font-display text-xl leading-relaxed">“{open.note}”</p>
            {open.kind === "help" && !open.resolved && !open.helped && open.from === member.id && (
              <Button className="w-full" onClick={() => onResolve(open.id)}>Mark as resolved</Button>
            )}
            {open.kind === "help" && !open.resolved && !open.helped && open.from !== member.id && (
              <div className="grid grid-cols-2 gap-3">
                <Button className="w-full" onClick={() => onHelp(open.id)}>I can help</Button>
                <Button variant="outline" className="w-full" onClick={onCloseSignal}>Later</Button>
              </div>
            )}
            {open.kind === "reminder" && !open.read && open.from !== member.id && (
              <Button className="w-full" onClick={() => onRead(open.id)}>Mark as read</Button>
            )}
          </section>
        </div>
      )}

      {openDiscovery && (
        <div className="absolute inset-0 z-[60] flex items-end bg-overlay p-4 sm:items-center sm:justify-center" onClick={onCloseDiscovery}>
          <section className="w-full rounded-2xl bg-surface p-5 shadow-dock sm:max-w-sm" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-signal/45 text-signal-foreground">
                <PackageOpen />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold text-muted-foreground">Found beneath the mist</p>
                <h2 className="font-display text-lg font-semibold">{openDiscovery.title}</h2>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full" onClick={onCloseDiscovery} aria-label="Close discovery"><X /></Button>
            </div>
            <p className="mb-5 text-sm leading-relaxed text-muted-foreground">{openDiscovery.note}</p>
            <Button className="w-full" onClick={() => onCompleteDiscovery(openDiscovery.id)}>
              Open chest
            </Button>
          </section>
        </div>
      )}
    </main>
  );
}

function PersonalLandscape({ member, camera, zoom, viewport }: { member: Member; camera: Point; zoom: number; viewport: Point }) {
  const width = viewport.x / zoom;
  const height = viewport.y / zoom;
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
      <g transform="translate(218 54)">
        <ellipse cy="19" rx="37" ry="11" fill="var(--finish)" opacity=".7" />
        <path d="M-18 9 L0-14 L19 9 M-12 9 V-1 H13 V9 M0-14 V-27" fill="none" stroke="var(--foreground)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M0-27 L19-21 L0-15" fill="var(--signal)" stroke="var(--foreground)" strokeWidth="2" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

function DiscoveryMarker({ discovery, camera, zoom, viewport, completed }: { discovery: Discovery; camera: Point; zoom: number; viewport: Point; completed: boolean }) {
  const screen = toScreen(discovery.position, camera, zoom, viewport);
  if (screen.x < -15 || screen.x > 115 || screen.y < -15 || screen.y > 115) return null;
  return (
    <span className={cn("discovery-marker pointer-events-none absolute z-30 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center text-signal-foreground", !completed && "rounded-full bg-signal/35 shadow-signal")} style={{ left: `${screen.x}%`, top: `${screen.y}%` }} aria-label={completed ? "Opened chest" : "Unopened chest"}>
      <PackageOpen className={cn("h-6 w-6", completed && "opacity-65")} />
    </span>
  );
}

function DestinationMarker({ camera, destination, zoom, viewport }: { camera: Point; destination: Point; zoom: number; viewport: Point }) {
  const screen = toScreen(destination, camera, zoom, viewport);
  return (
    <span
      className="destination-marker pointer-events-none absolute z-40 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary/55"
      style={{ left: `${screen.x}%`, top: `${screen.y}%` }}
      aria-hidden="true"
    />
  );
}

function MappedSignal({ signal, viewer, camera, zoom, viewport, index, onOpen }: { signal: Signal; viewer: MemberId; camera: Point; zoom: number; viewport: Point; index: number; onOpen: () => void }) {
  const screen = toScreen(signal.position, camera, zoom, viewport);
  if (screen.x < -18 || screen.x > 118 || screen.y < -18 || screen.y > 118) return null;
  const isOwn = viewer === signal.from;
  const isChanged = signal.kind === "help" ? Boolean(signal.resolved || signal.helped) : signal.read;
  const Icon = signal.kind === "help" ? Flame : BellRing;

  return (
    <Button
      variant="ghost"
      onClick={onOpen}
      className={cn("absolute z-30 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full p-0 hover:bg-transparent", !isOwn && "signal-marker", index > 3 && "opacity-80")}
      style={{ left: `${screen.x}%`, top: `${screen.y}%` }}
      aria-label={`View the trace ${signal.from} left on this map`}
    >
      <span className={cn(
        "grid h-11 w-11 place-items-center",
        signal.kind === "help" ? "text-fire" : "text-post",
        !isOwn && "rounded-full border border-surface/80 bg-surface/90 shadow-signal backdrop-blur",
        isChanged && "border-dashed opacity-60 saturate-50",
      )}>
        <Icon className={cn("h-7 w-7", signal.kind === "help" && "fill-current", isChanged && "stroke-[2.5]")} strokeDasharray={isChanged ? "3 3" : undefined} />
      </span>
    </Button>
  );
}


function SignalIcon({ kind, className }: { kind: SignalKind; className?: string }) {
  if (kind === "help") return <Flame className={className} />;
  if (kind === "reminder") return <BellRing className={className} />;
  return null;
}

function effectCopy(kind: SignalKind, viewer: MemberId, source: MemberId) {
  if (kind === "help") return viewer === source ? "Your help message" : `A help message from ${source}`;
  return viewer === source ? "Your reminder point" : `A reminder point from ${source}`;
}

function toScreen(point: Point, camera: Point, zoom = 1, viewport: Point = { x: viewSize.width, y: viewSize.height }) {
  return {
    x: 50 + ((point.x - camera.x) / viewport.x) * 100 * zoom,
    y: 50 + ((point.y - camera.y) / viewport.y) * 100 * zoom,
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
  void element;
  pointersRef.current.delete(pointerId);
  if (pointersRef.current.size < 2) pinchDistanceRef.current = null;
}
