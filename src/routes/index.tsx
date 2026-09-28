import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, Flame, Footprints, MapPin, Signpost, Sparkles, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "同行 · 四人协作旅程" },
      { name: "description", content: "一场安静的四人协作旅程，在路上看见彼此、分享收获并一起抵达终点。" },
      { property: "og:title", content: "同行 · 四人协作旅程" },
      { property: "og:description", content: "在各自的路上留下温柔信号，与伙伴一起抵达终点。" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: JourneyGame,
});

type MemberId = "A" | "B" | "C" | "D";
type SignalKind = "fire" | "post";

type Member = {
  id: MemberId;
  name: string;
  chapter: string;
  color: string;
  progress: number;
};

type Signal = {
  id: number;
  from: MemberId;
  kind: SignalKind;
  note: string;
};

const members: Member[] = [
  { id: "A", name: "小屿", chapter: "穿过苔原", color: "bg-player-a", progress: 44 },
  { id: "B", name: "阿满", chapter: "沿溪而上", color: "bg-player-b", progress: 61 },
  { id: "C", name: "禾子", chapter: "寻找风口", color: "bg-player-c", progress: 33 },
  { id: "D", name: "麦麦", chapter: "翻过山脊", color: "bg-player-d", progress: 52 },
];

const initialSignals: Signal[] = [
  { id: 1, from: "B", kind: "post", note: "找到一条更平缓的路" },
  { id: 2, from: "D", kind: "fire", note: "在山脊前歇一会儿" },
];

function JourneyGame() {
  const [selected, setSelected] = useState<MemberId | null>(null);
  const [progress, setProgress] = useState<Record<MemberId, number>>({ A: 44, B: 61, C: 33, D: 52 });
  const [signals, setSignals] = useState<Signal[]>(initialSignals);
  const [openedSignal, setOpenedSignal] = useState<number | null>(null);
  const [toast, setToast] = useState("");

  const active = members.find((member) => member.id === selected);
  const visibleSignals = useMemo(
    () => signals.filter((signal) => signal.from !== selected),
    [selected, signals],
  );

  const leaveSignal = (kind: SignalKind) => {
    if (!selected) return;
    const signal: Signal = {
      id: Date.now(),
      from: selected,
      kind,
      note: kind === "fire" ? "在这里停一停，想听听大家的声音" : "这里有一个值得分享的新发现",
    };
    setSignals((current) => [signal, ...current]);
    setToast(kind === "fire" ? "篝火已经燃起，伙伴们会远远看见" : "木桩已经埋下，伙伴路过时会发现");
    window.setTimeout(() => setToast(""), 2800);
  };

  if (active) {
    return (
      <MemberJourney
        member={active}
        progress={progress[active.id]}
        signals={visibleSignals}
        openedSignal={openedSignal}
        toast={toast}
        onBack={() => {
          setSelected(null);
          setOpenedSignal(null);
        }}
        onWalk={() => setProgress((value) => ({ ...value, [active.id]: Math.min(92, value[active.id] + 7) }))}
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

  return <Overview progress={progress} signals={signals} onSelect={setSelected} />;
}

function Overview({
  progress,
  signals,
  onSelect,
}: {
  progress: Record<MemberId, number>;
  signals: Signal[];
  onSelect: (id: MemberId) => void;
}) {
  return (
    <main className="min-h-dvh bg-background px-4 py-6 text-foreground sm:px-8 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex items-end justify-between sm:mb-8">
          <div>
            <p className="mb-1 text-xs font-semibold text-muted-foreground">第 03 天 · 晨雾散去</p>
            <h1 className="font-display text-3xl font-semibold sm:text-4xl">我们在路上</h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-alive" />4 人同行
          </div>
        </header>

        <section className="relative overflow-hidden rounded-[1.75rem] border border-border bg-map p-2 shadow-map sm:p-3">
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[6px] border-map bg-primary text-primary-foreground shadow-soft">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[1.35rem] bg-border">
            {members.map((member, index) => {
              const latest = signals.find((signal) => signal.from === member.id);
              return (
                <Button
                  key={member.id}
                  variant="ghost"
                  onClick={() => onSelect(member.id)}
                  className="group relative h-[min(42vw,20rem)] min-h-48 w-full whitespace-normal rounded-none bg-map p-0 text-left hover:bg-map-hover"
                >
                  <MiniMap member={member} progress={progress[member.id]} flip={index % 2 === 1} />
                  <div className="absolute left-4 top-4 z-10 sm:left-6 sm:top-6">
                    <div className="flex items-center gap-2">
                      <span className={cn("grid h-7 w-7 place-items-center rounded-full text-xs font-bold text-player-ink", member.color)}>{member.id}</span>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{member.name}</p>
                        <p className="text-[10px] text-muted-foreground">{member.chapter}</p>
                      </div>
                    </div>
                  </div>
                  {latest && (
                    <div className="absolute bottom-4 left-4 flex items-center gap-1.5 rounded-full bg-signal/90 px-2.5 py-1 text-[10px] font-medium text-signal-foreground shadow-soft sm:bottom-6 sm:left-6">
                      {latest.kind === "fire" ? <Flame className="h-3 w-3" /> : <Signpost className="h-3 w-3" />}
                      {latest.kind === "fire" ? "燃着一簇火" : "留下了发现"}
                    </div>
                  )}
                  <ChevronRight className="absolute bottom-5 right-4 h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 sm:right-6" />
                </Button>
              );
            })}
          </div>
        </section>

        <footer className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 text-xs text-muted-foreground">
          <p className="min-w-0">每个人走着不同的路，也能看见彼此留下的微光。</p>
          <div className="shrink-0 font-semibold text-foreground">共同旅程 · 48%</div>
        </footer>
      </div>
    </main>
  );
}

function MiniMap({ member, progress, flip }: { member: Member; progress: number; flip: boolean }) {
  const y = 158 - progress * 1.05;
  return (
    <svg className="h-full w-full" viewBox="0 0 260 220" role="img" aria-label={`${member.name}的地图，进度${progress}%`}>
      <path d={flip ? "M238 210 C205 177 226 145 174 129 C119 111 142 71 88 55 C60 47 37 28 28 3" : "M22 210 C57 180 36 144 91 128 C142 113 122 73 174 55 C204 45 224 29 235 3"} fill="none" stroke="var(--trail)" strokeWidth="10" strokeLinecap="round" />
      <path d="M20 58 C45 39 62 53 78 40 C100 22 116 40 128 26" fill="none" stroke="var(--water)" strokeWidth="8" strokeLinecap="round" opacity=".55" />
      <g fill="var(--terrain)">
        <circle cx="42" cy="172" r="18" /><circle cx="210" cy="175" r="25" /><circle cx="200" cy="88" r="14" /><circle cx="73" cy="91" r="11" />
      </g>
      <g transform={`translate(${flip ? 238 - (y / 210) * 210 : 22 + (y / 210) * 210} ${y})`}>
        <circle r="12" fill="var(--map)" stroke="var(--foreground)" strokeWidth="2" />
        <circle r="7" className={member.color} fill="currentColor" />
      </g>
      <g transform={flip ? "translate(28 15)" : "translate(235 15)"}>
        <path d="M0 12 L0 -7 M0 -7 L13 -3 L0 3" fill="none" stroke="var(--foreground)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

function MemberJourney({ member, progress, signals, openedSignal, toast, onBack, onWalk, onSignal, onOpenSignal, onCloseSignal, onReply }: {
  member: Member;
  progress: number;
  signals: Signal[];
  openedSignal: number | null;
  toast: string;
  onBack: () => void;
  onWalk: () => void;
  onSignal: (kind: SignalKind) => void;
  onOpenSignal: (id: number) => void;
  onCloseSignal: () => void;
  onReply: (text: string) => void;
}) {
  const open = signals.find((signal) => signal.id === openedSignal);
  const source = members.find((item) => item.id === open?.from);
  const markerPositions = [{ left: "67%", top: "30%" }, { left: "24%", top: "56%" }, { left: "70%", top: "69%" }];
  const playerTop = `${Math.max(16, 84 - progress * 0.7)}%`;

  return (
    <main className="relative mx-auto min-h-dvh max-w-3xl overflow-hidden bg-map text-foreground sm:my-6 sm:min-h-[calc(100vh-3rem)] sm:rounded-[2rem] sm:border sm:border-border sm:shadow-map">
      <header className="absolute inset-x-0 top-0 z-30 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 pb-5 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
        <Button variant="secondary" size="icon" className="rounded-full bg-surface/90 shadow-soft backdrop-blur" onClick={onBack} aria-label="返回四人地图">
          <ArrowLeft />
        </Button>
        <div className="min-w-0 text-center">
          <p className="truncate text-sm font-semibold">{member.name} · {member.chapter}</p>
          <p className="text-[10px] text-muted-foreground">离山顶还有 {100 - progress}%</p>
        </div>
        <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold text-player-ink", member.color)}>{member.id}</div>
      </header>

      <div className="journey-map absolute inset-0">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 420 820" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <path d="M185 820 C130 740 301 711 244 626 C196 554 97 584 120 484 C137 413 305 441 288 332 C277 257 167 274 184 186 C196 123 258 92 231 0" fill="none" stroke="var(--trail-edge)" strokeWidth="34" strokeLinecap="round" />
          <path d="M185 820 C130 740 301 711 244 626 C196 554 97 584 120 484 C137 413 305 441 288 332 C277 257 167 274 184 186 C196 123 258 92 231 0" fill="none" stroke="var(--trail)" strokeWidth="28" strokeLinecap="round" strokeDasharray="3 8" />
          <path d="M-15 308 C57 265 86 292 131 266 C184 234 218 249 263 211 C308 174 356 190 438 142" fill="none" stroke="var(--water)" strokeWidth="28" strokeLinecap="round" opacity=".75" />
          <g fill="var(--terrain)"><circle cx="67" cy="154" r="48"/><circle cx="360" cy="253" r="58"/><circle cx="52" cy="661" r="72"/><circle cx="354" cy="711" r="66"/><circle cx="338" cy="469" r="27"/></g>
          <g fill="var(--terrain-deep)" opacity=".65"><circle cx="45" cy="110" r="7"/><circle cx="76" cy="119" r="5"/><circle cx="371" cy="218" r="8"/><circle cx="331" cy="674" r="6"/><circle cx="77" cy="623" r="8"/></g>
          <g transform="translate(231 48)"><path d="M0 15 V-12 M0-12 L25-4 L0 4" fill="none" stroke="var(--foreground)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/><ellipse cy="19" rx="33" ry="9" fill="var(--finish)" opacity=".7"/></g>
        </svg>

        {signals.slice(0, 3).map((signal, index) => (
          <Button
            key={signal.id}
            variant="ghost"
            size="icon"
            style={markerPositions[index]}
            className="signal-marker absolute z-20 h-11 w-11 rounded-full bg-signal text-signal-foreground shadow-signal hover:bg-signal"
            onClick={() => onOpenSignal(signal.id)}
            aria-label={`查看${signal.from}留下的信号`}
          >
            {signal.kind === "fire" ? <Flame className="h-5 w-5" /> : <Signpost className="h-5 w-5" />}
          </Button>
        ))}

        <div className="player-piece absolute left-1/2 z-20 -translate-x-1/2 transition-[top] duration-700" style={{ top: playerTop }}>
          <span className="absolute -inset-3 rounded-full border border-foreground/10 bg-map/80" />
          <span className={cn("relative grid h-11 w-11 place-items-center rounded-full border-2 border-map text-xs font-bold text-player-ink shadow-player", member.color)}>{member.id}</span>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-30 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-6">
        {toast && <div className="mx-auto mb-3 w-fit max-w-[90%] rounded-full bg-foreground/90 px-4 py-2 text-center text-xs text-background shadow-soft">{toast}</div>}
        <div className="grid grid-cols-[1fr_auto] items-end gap-3 rounded-2xl border border-border bg-surface/95 p-3 shadow-dock backdrop-blur-md">
          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" className="h-14 flex-col gap-1 rounded-xl bg-fire-soft text-foreground hover:bg-fire-soft/80" onClick={() => onSignal("fire")}>
              <Flame className="text-fire" /><span className="text-[11px]">燃起篝火</span>
            </Button>
            <Button variant="ghost" className="h-14 flex-col gap-1 rounded-xl bg-post-soft text-foreground hover:bg-post-soft/80" onClick={() => onSignal("post")}>
              <Signpost className="text-post" /><span className="text-[11px]">埋下木桩</span>
            </Button>
          </div>
          <Button size="icon" onClick={onWalk} className="h-14 w-14 rounded-full shadow-player" aria-label="向前走一段">
            <Footprints className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {open && source && (
        <div className="absolute inset-0 z-40 flex items-end bg-overlay p-4 sm:items-center sm:justify-center" onClick={onCloseSignal}>
          <section className="w-full rounded-2xl bg-surface p-5 shadow-dock sm:max-w-sm" onClick={(event) => event.stopPropagation()}>
            <div className="mb-5 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
              <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-bold text-player-ink", source.color)}>{source.id}</div>
              <div className="min-w-0"><p className="text-sm font-semibold">{source.name}留下的{open.kind === "fire" ? "篝火" : "木桩"}</p><p className="text-xs text-muted-foreground">你可以回应，也可以安静路过</p></div>
              <Button variant="ghost" size="icon" className="rounded-full" onClick={onCloseSignal} aria-label="关闭"><X /></Button>
            </div>
            <p className="mb-5 font-display text-xl leading-relaxed">“{open.note}”</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => onReply(`已让${source.name}知道：我看见了`)}>我看见了</Button>
              <Button onClick={() => onReply(`为${source.name}留了一盏灯`)}>为你留盏灯</Button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}