import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft,
  Eye,
  Flame,
  Signpost,
  TentTree,
  Waves,
  Wind,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "同行 · 四人协作旅程" },
      { name: "description", content: "四个人沿不同路线前行，在彼此的地图上发现同行者留下的痕迹。" },
      { property: "og:title", content: "同行 · 四人协作旅程" },
      { property: "og:description", content: "沿不同的路，看见彼此留下的篝火、溪流与路标，一起抵达营地。" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: JourneyGame,
});

type MemberId = "A" | "B" | "C" | "D";
type SignalKind = "fire" | "post";
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
};

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
  A: { x: 47, y: 75 },
  B: { x: 26, y: 66 },
  C: { x: 65, y: 69 },
  D: { x: 34, y: 72 },
};

const initialSignals: Signal[] = [
  { id: 1, from: "B", kind: "post", note: "河道边插下一根木桩：这里的水比想象中平缓。" },
  { id: 2, from: "D", kind: "fire", note: "在草坡背风处歇一会儿，火还暖着。" },
];

function JourneyGame() {
  const [selected, setSelected] = useState<MemberId | null>(null);
  const [positions, setPositions] = useState(startingPositions);
  const [signals, setSignals] = useState<Signal[]>(initialSignals);
  const [openedSignal, setOpenedSignal] = useState<number | null>(null);
  const [toast, setToast] = useState("");

  const active = members.find((member) => member.id === selected);
  const visibleSignals = useMemo(
    () => signals.filter((signal) => signal.from !== selected),
    [selected, signals],
  );

  const leaveSignal = (kind: SignalKind) => {
    const signal: Signal = {
      id: Date.now(),
      from: "A",
      kind,
      note: kind === "fire" ? "前面的路有些难，我先在这里燃一簇火。" : "在浅滩发现了新的方向，留根木桩给大家。",
    };
    setSignals((current) => [signal, ...current]);
    setToast(kind === "fire" ? "火光会在伙伴的地图里化成远处的烟" : "木桩会在伙伴经过的地貌里留下线索");
    window.setTimeout(() => setToast(""), 2800);
  };

  if (active) {
    return (
      <MemberJourney
        member={active}
        position={positions[active.id]}
        signals={visibleSignals}
        openedSignal={openedSignal}
        toast={toast}
        isCurrentPlayer={active.id === "A"}
        onBack={() => {
          setSelected(null);
          setOpenedSignal(null);
        }}
        onMoveTo={(point) =>
          setPositions((current) => ({
            ...current,
            A: {
              x: Math.min(94, Math.max(6, point.x)),
              y: Math.min(92, Math.max(10, point.y)),
            },
          }))
        }
        onSignal={leaveSignal}
        onOpenSignal={setOpenedSignal}
        onCloseSignal={() => setOpenedSignal(null)}
        onReply={(text) => {
          setOpenedSignal(null);
          setToast(text);
          window.setTimeout(() => setToast(""), 2200);
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
            <h1 className="font-display text-3xl font-semibold sm:text-4xl">我们走在不同的路上</h1>
          </div>
          <p className="hidden text-xs text-muted-foreground sm:block">点击地图，看看伙伴沿途看见了什么</p>
        </header>

        <section className="relative overflow-hidden rounded-3xl border border-border bg-map p-2 shadow-map sm:p-3" aria-label="四人路线总览">
          <div className="grid grid-cols-2 gap-1.5 overflow-hidden rounded-2xl bg-border/60 sm:gap-2">
            {members.map((member, index) => {
              const latest = signals.find((signal) => signal.from === member.id);
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
                      {latest.kind === "fire" ? <Flame className="h-4 w-4" /> : <Signpost className="h-4 w-4" />}
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
          <p>四条不同的路，沿途的变化会悄悄抵达彼此。</p>
          <span className="shrink-0 font-semibold text-foreground">A 可行动</span>
        </footer>
      </div>
    </main>
  );
}

function OverviewMap({ member, position, quadrant }: { member: Member; position: Point; quadrant: number }) {
  const markerX = quadrant % 2 === 0 ? 24 + position.x * 1.7 : 236 - position.x * 1.7;
  const markerY = quadrant < 2 ? 18 + position.y * 1.9 : 204 - position.y * 1.9;
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
  isCurrentPlayer,
  onBack,
  onMoveTo,
  onSignal,
  onOpenSignal,
  onCloseSignal,
  onReply,
}: {
  member: Member;
  position: Point;
  signals: Signal[];
  openedSignal: number | null;
  toast: string;
  isCurrentPlayer: boolean;
  onBack: () => void;
  onMoveTo: (point: Point) => void;
  onSignal: (kind: SignalKind) => void;
  onOpenSignal: (id: number) => void;
  onCloseSignal: () => void;
  onReply: (text: string) => void;
}) {
  const open = signals.find((signal) => signal.id === openedSignal);
  const source = members.find((item) => item.id === open?.from);

  return (
    <main className={cn("relative mx-auto min-h-dvh max-w-3xl overflow-hidden text-foreground sm:my-6 sm:min-h-[calc(100vh-3rem)] sm:rounded-3xl sm:border sm:border-border sm:shadow-map", member.theme)}>
      <header className="absolute inset-x-0 top-0 z-30 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 pb-5 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
        <Button variant="secondary" size="icon" className="rounded-full bg-surface/90 shadow-soft backdrop-blur" onClick={onBack} aria-label="返回四人路线总览">
          <ArrowLeft />
        </Button>
        <div className="min-w-0 text-center">
          <p className="truncate text-sm font-semibold">{member.name} · {member.region}</p>
          <p className="text-[10px] text-muted-foreground">{isCurrentPlayer ? "长按方向，在自己的路上自由行走" : "正在查看伙伴的路途"}</p>
        </div>
        <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold text-player-ink", member.color)}>{member.id}</div>
      </header>

      <div
        className={cn("journey-map absolute inset-0", isCurrentPlayer && "touch-none cursor-crosshair")}
        aria-label={`${member.name}的个人地图`}
        onPointerDown={(event) => {
          if (!isCurrentPlayer || event.button !== 0 || (event.target as Element).closest("button")) return;
          const map = event.currentTarget;
          const pointerId = event.pointerId;
          const timer = window.setTimeout(() => {
            const bounds = map.getBoundingClientRect();
            onMoveTo({
              x: ((event.clientX - bounds.left) / bounds.width) * 100,
              y: ((event.clientY - bounds.top) / bounds.height) * 100,
            });
            map.dataset.longPressComplete = String(pointerId);
          }, 420);
          map.dataset.longPressTimer = String(timer);
        }}
        onPointerUp={(event) => clearLongPress(event.currentTarget)}
        onPointerCancel={(event) => clearLongPress(event.currentTarget)}
        onPointerLeave={(event) => clearLongPress(event.currentTarget)}
      >
        <PersonalLandscape member={member} />
        {signals.slice(0, 3).map((signal, index) => (
          <MappedSignal
            key={signal.id}
            signal={signal}
            viewer={member.id}
            index={index}
            onOpen={() => onOpenSignal(signal.id)}
          />
        ))}

        <div
          className="player-piece absolute z-20 -translate-x-1/2 -translate-y-1/2 transition-[left,top] duration-150"
          style={{ left: `${position.x}%`, top: `${position.y}%` }}
        >
          <span className="absolute -inset-3 rounded-full border border-foreground/10 bg-surface/45" />
          <span className={cn("relative grid h-11 w-11 place-items-center rounded-full border-2 border-surface text-xs font-bold text-player-ink shadow-player", member.color)}>{member.id}</span>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-30 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-6">
        {toast && <div className="mx-auto mb-3 w-fit max-w-[90%] rounded-full bg-foreground/90 px-4 py-2 text-center text-xs text-background shadow-soft">{toast}</div>}
        {isCurrentPlayer ? (
          <div className="grid grid-cols-[1fr_auto] items-end gap-3 rounded-2xl border border-border bg-surface/95 p-3 shadow-dock backdrop-blur-md">
            <div className="grid grid-cols-2 gap-2">
              <Button variant="ghost" className="h-14 flex-col gap-1 rounded-xl bg-fire-soft text-foreground hover:bg-fire-soft/80" onClick={() => onSignal("fire")}>
                <Flame className="text-fire" /><span className="text-[11px]">燃起篝火</span>
              </Button>
              <Button variant="ghost" className="h-14 flex-col gap-1 rounded-xl bg-post-soft text-foreground hover:bg-post-soft/80" onClick={() => onSignal("post")}>
                <Signpost className="text-post" /><span className="text-[11px]">埋下木桩</span>
              </Button>
            </div>
            <div className="flex h-14 w-24 shrink-0 items-center justify-center rounded-xl bg-secondary/75 px-2 text-center text-[10px] leading-relaxed text-muted-foreground">
              长按地图<br />移动到该处
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface/92 px-4 py-3 text-xs text-muted-foreground shadow-dock backdrop-blur-md">
            <Eye className="h-4 w-4" />这是 {member.name} 的路，你可以观察沿途痕迹
          </div>
        )}
      </div>

      {open && source && (
        <div className="absolute inset-0 z-40 flex items-end bg-overlay p-4 sm:items-center sm:justify-center" onClick={onCloseSignal}>
          <section className="w-full rounded-2xl bg-surface p-5 shadow-dock sm:max-w-sm" onClick={(event) => event.stopPropagation()}>
            <div className="mb-5 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
              <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-bold text-player-ink", source.color)}>{source.id}</div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">这是 {source.name} 留下的痕迹</p>
                <p className="text-xs text-muted-foreground">它在你的地貌里换了一种模样</p>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full" onClick={onCloseSignal} aria-label="关闭"><X /></Button>
            </div>
            <p className="mb-5 font-display text-xl leading-relaxed">“{open.note}”</p>
            {isCurrentPlayer && (
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" onClick={() => onReply(`已让${source.name}知道：我看见了`)}>我看见了</Button>
                <Button onClick={() => onReply(`为${source.name}留了一盏灯`)}>为你留盏灯</Button>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

function PersonalLandscape({ member }: { member: Member }) {
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 420 820" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {member.id === "A" && (
        <>
          <path d="M-30 276 C47 231 84 284 143 246 C209 204 270 250 450 164" fill="none" stroke="var(--member-water)" strokeWidth="32" strokeLinecap="round" opacity=".8" />
          <g fill="var(--member-detail)" opacity=".72"><circle cx="53" cy="134" r="49"/><circle cx="354" cy="293" r="62"/><circle cx="44" cy="649" r="70"/><circle cx="350" cy="713" r="52"/></g>
        </>
      )}
      {member.id === "B" && (
        <>
          <path d="M78 -30 C157 83 51 174 133 278 C218 386 92 488 172 603 C235 694 190 758 146 850" fill="none" stroke="var(--member-water)" strokeWidth="72" strokeLinecap="round" opacity=".9" />
          <path d="M80 -30 C157 83 54 174 135 278 C219 386 95 488 174 603 C235 694 190 758 146 850" fill="none" stroke="var(--surface)" strokeWidth="3" strokeDasharray="3 16" opacity=".5" />
          <g fill="var(--member-detail)" opacity=".62"><circle cx="344" cy="170" r="70"/><circle cx="349" cy="573" r="57"/><circle cx="45" cy="456" r="31"/></g>
        </>
      )}
      {member.id === "C" && (
        <g fill="none" stroke="var(--member-detail)" opacity=".62">
          <path d="M-40 154 Q78 76 195 146 T467 123" strokeWidth="3"/><path d="M-45 193 Q73 115 191 185 T462 162"/><path d="M-38 466 Q70 386 195 453 T466 432" strokeWidth="3"/><path d="M-42 505 Q69 425 194 492 T462 471"/>
          <path d="M42 681 C107 644 149 686 202 651" strokeWidth="4" strokeLinecap="round"/><path d="M250 246 C308 212 341 247 394 217" strokeWidth="4" strokeLinecap="round"/>
        </g>
      )}
      {member.id === "D" && (
        <g fill="var(--member-detail)" opacity=".64">
          <circle cx="57" cy="153" r="61"/><circle cx="350" cy="232" r="71"/><circle cx="70" cy="533" r="54"/><circle cx="346" cy="681" r="78"/>
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

function MappedSignal({ signal, viewer, index, onOpen }: { signal: Signal; viewer: MemberId; index: number; onOpen: () => void }) {
  const positions = ["mapped-signal-one", "mapped-signal-two", "mapped-signal-three"];
  const isRiverTrace = viewer === "A" && signal.from === "B" && signal.kind === "post";
  const isSmoke = signal.kind === "fire";

  return (
    <Button
      variant="ghost"
      onClick={onOpen}
      className={cn("signal-marker absolute z-20 h-auto w-auto rounded-full p-0 hover:bg-transparent", positions[index])}
      aria-label={`查看${signal.from}在这张地图留下的痕迹`}
    >
      {isRiverTrace ? (
        <span className="relative flex items-center gap-1.5 rounded-full bg-post-soft/90 px-3 py-2 text-[10px] font-semibold text-post shadow-soft backdrop-blur">
          <Waves className="h-4 w-4" /><Signpost className="h-4 w-4" />B 的河流木桩
        </span>
      ) : isSmoke ? (
        <span className="smoke-trace relative flex flex-col items-center text-signal-foreground">
          <span className="h-5 w-5 rounded-full bg-signal/35" />
          <span className="-mt-2 h-4 w-4 rounded-full bg-signal/55" />
          <Flame className="mt-0.5 h-5 w-5 text-fire" />
        </span>
      ) : (
        <span className="grid h-11 w-11 place-items-center rounded-full bg-post-soft text-post shadow-signal"><Wind className="h-5 w-5" /></span>
      )}
    </Button>
  );
}

function clearLongPress(element: HTMLElement) {
  const timer = Number(element.dataset.longPressTimer);
  if (Number.isFinite(timer)) window.clearTimeout(timer);
  delete element.dataset.longPressTimer;
}