"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Download,
  RotateCcw,
  Sparkles,
  Upload,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { POKEMON, spriteUrl } from "@/app/pokemon-data";
import type { PokemonType } from "@/app/pokemon-data";

const TIERS = [
  { name: "SS", color: "#e94661", soft: "#ffe3e8", key: "1" },
  { name: "S", color: "#ed6b3c", soft: "#ffeadf", key: "2" },
  { name: "A", color: "#e8a11b", soft: "#fff0c7", key: "3" },
  { name: "B", color: "#5ba94b", soft: "#e3f4de", key: "4" },
  { name: "C", color: "#358fbb", soft: "#dff2fb", key: "5" },
  { name: "D", color: "#7667c6", soft: "#ece8ff", key: "6" },
  { name: "F", color: "#787f90", soft: "#e9ebef", key: "7" },
] as const;

type Tier = (typeof TIERS)[number]["name"];
type Ratings = Record<number, Tier>;

const STORAGE_KEY = "poketiers-ratings-v1";

const TYPE_STYLES: Record<PokemonType, { background: string; color: string }> = {
  Normal: { background: "#e7e3dc", color: "#4e4b47" },
  Fighting: { background: "#f2d5ca", color: "#883b25" },
  Flying: { background: "#dfe7fb", color: "#435d9c" },
  Poison: { background: "#ebd9f2", color: "#75438b" },
  Ground: { background: "#efe0c6", color: "#74562f" },
  Rock: { background: "#e8dfbf", color: "#6f5e27" },
  Bug: { background: "#e4ecc9", color: "#536a1d" },
  Ghost: { background: "#e4dded", color: "#594373" },
  Steel: { background: "#dde6e8", color: "#455d64" },
  Fire: { background: "#ffded2", color: "#9d4025" },
  Water: { background: "#d9eaff", color: "#285f9c" },
  Grass: { background: "#dcefd8", color: "#326c33" },
  Electric: { background: "#fff0bd", color: "#7d5c00" },
  Psychic: { background: "#f8dce5", color: "#97405f" },
  Ice: { background: "#d9f0f1", color: "#2c6b70" },
  Dragon: { background: "#dedcf6", color: "#4e4696" },
  Dark: { background: "#dedad8", color: "#493f3b" },
  Fairy: { background: "#f6deed", color: "#8a4874" },
};

function nextUnratedIndex(current: number, ratings: Ratings) {
  for (let offset = 1; offset <= POKEMON.length; offset += 1) {
    const index = (current + offset) % POKEMON.length;
    if (!ratings[POKEMON[index].id]) return index;
  }
  return -1;
}

function formatTierList(ratings: Ratings) {
  return TIERS.map(({ name }) => {
    const names = POKEMON.filter((pokemon) => ratings[pokemon.id] === name).map(
      (pokemon) => `#${String(pokemon.id).padStart(4, "0")} ${pokemon.name}`,
    );
    return `${name}\n${names.length ? names.join(", ") : "—"}`;
  }).join("\n\n");
}

export function parseTierList(text: string) {
  const imported: Ratings = {};
  const invalidIds = new Set<number>();
  let activeTier: Tier | null = null;

  text
    .replace(/\r/g, "")
    .split("\n")
    .forEach((line) => {
      const trimmed = line.trim();
      const heading = trimmed.match(/^(?:#{1,3}\s*)?(SS|S|A|B|C|D|F)\s*:?\s*$/i);
      if (heading) {
        activeTier = heading[1].toUpperCase() as Tier;
        return;
      }
      if (!activeTier) return;

      for (const match of line.matchAll(/#(\d{1,4})\b/g)) {
        const id = Number(match[1]);
        if (id >= 1 && id <= POKEMON.length) imported[id] = activeTier;
        else invalidIds.add(id);
      }
    });

  return { imported, invalidIds: [...invalidIds] };
}

export default function Home() {
  const [ratings, setRatings] = useState<Ratings>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeTab, setActiveTab] = useState("rate");
  const [ready, setReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  const [importNotice, setImportNotice] = useState("");

  const current = POKEMON[currentIndex];
  const ratedCount = Object.keys(ratings).length;
  const remaining = POKEMON.length - ratedCount;
  const progress = (ratedCount / POKEMON.length) * 100;

  const tierCounts = useMemo(() => {
    const counts = Object.fromEntries(TIERS.map(({ name }) => [name, 0])) as Record<
      Tier,
      number
    >;
    Object.values(ratings).forEach((tier) => {
      counts[tier] += 1;
    });
    return counts;
  }, [ratings]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { ratings?: Ratings; currentIndex?: number };
        const validTiers = new Set<string>(TIERS.map(({ name }) => name));
        const cleanRatings = Object.fromEntries(
          Object.entries(parsed.ratings ?? {}).filter(
            ([id, tier]) =>
              Number(id) >= 1 &&
              Number(id) <= POKEMON.length &&
              validTiers.has(String(tier)),
          ),
        ) as Ratings;
        const savedIndex = Math.min(
          Math.max(Number(parsed.currentIndex) || 0, 0),
          POKEMON.length - 1,
        );
        setRatings(cleanRatings);
        setCurrentIndex(savedIndex);
        if (Object.keys(cleanRatings).length === POKEMON.length) setActiveTab("results");
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ratings, currentIndex }),
    );
  }, [currentIndex, ratings, ready]);

  const rateCurrent = useCallback(
    (tier: Tier) => {
      const nextRatings = { ...ratings, [current.id]: tier };
      setRatings(nextRatings);
      const next = nextUnratedIndex(currentIndex, nextRatings);
      if (next === -1) {
        setActiveTab("results");
      } else {
        setCurrentIndex(next);
      }
    },
    [current.id, currentIndex, ratings],
  );

  const goPrevious = useCallback(() => {
    setCurrentIndex((index) => (index - 1 + POKEMON.length) % POKEMON.length);
  }, []);

  const skipCurrent = useCallback(() => {
    const next = nextUnratedIndex(currentIndex, ratings);
    if (next !== -1) setCurrentIndex(next);
  }, [currentIndex, ratings]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (activeTab !== "rate" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
      const tier = TIERS.find(({ key }) => key === event.key);
      if (tier) {
        event.preventDefault();
        rateCurrent(tier.name);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrevious();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        skipCurrent();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeTab, goPrevious, rateCurrent, skipCurrent]);

  const copyResults = async () => {
    await navigator.clipboard.writeText(formatTierList(ratings));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const downloadResults = () => {
    const file = new Blob([formatTierList(ratings)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = "pokemon-tier-list.txt";
    link.click();
    URL.revokeObjectURL(url);
  };

  const importTierList = () => {
    const { imported, invalidIds } = parseTierList(importText);
    const importedCount = Object.keys(imported).length;
    if (!importedCount) {
      setImportError("I couldn’t find any ratings. Keep each tier heading on its own line and use Pokédex numbers such as #0054.");
      return;
    }

    const nextRatings = { ...ratings, ...imported };
    const firstUnrated = POKEMON.findIndex((pokemon) => !nextRatings[pokemon.id]);
    setRatings(nextRatings);
    setCurrentIndex(firstUnrated === -1 ? 0 : firstUnrated);
    setActiveTab(firstUnrated === -1 ? "results" : "rate");
    setImportOpen(false);
    setImportText("");
    setImportError("");
    const nextName = firstUnrated === -1
      ? "Your list is complete."
      : `Next up: #${String(POKEMON[firstUnrated].id).padStart(4, "0")} ${POKEMON[firstUnrated].name}.`;
    const invalidNote = invalidIds.length ? ` ${invalidIds.length} invalid number${invalidIds.length === 1 ? " was" : "s were"} ignored.` : "";
    setImportNotice(`${importedCount.toLocaleString()} ratings imported. ${nextName}${invalidNote}`);
    window.setTimeout(() => setImportNotice(""), 6000);
  };

  const editPokemon = (id: number) => {
    const index = POKEMON.findIndex((pokemon) => pokemon.id === id);
    if (index >= 0) {
      setCurrentIndex(index);
      setActiveTab("rate");
    }
  };

  const resetAll = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setRatings({});
    setCurrentIndex(0);
    setActiveTab("rate");
  };

  return (
    <main className="pokemon-shell min-h-screen px-4 py-4 text-foreground sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="app-header mb-4 flex flex-wrap items-center justify-between gap-4 rounded-[1.35rem] px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3">
            <div className="brand-mark" aria-hidden="true">
              PT
            </div>
            <div>
              <h1 className="text-lg font-black tracking-[-0.03em] sm:text-xl">PokéTiers</h1>
              <p className="text-xs font-medium text-muted-foreground">Your complete National Dex ranking</p>
            </div>
          </div>

          <div className="flex min-w-[15rem] flex-1 items-center gap-3 sm:max-w-sm">
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex items-center justify-between gap-2 text-xs font-bold">
                <span>{ratedCount.toLocaleString()} rated</span>
                <span className="text-muted-foreground">{remaining.toLocaleString()} left</span>
              </div>
              <Progress value={progress} aria-label={`${ratedCount} of ${POKEMON.length} rated`} />
            </div>
            <Dialog open={importOpen} onOpenChange={(open) => {
              setImportOpen(open);
              if (!open) setImportError("");
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" className="hidden sm:inline-flex">
                  <Upload /> Import list
                </Button>
              </DialogTrigger>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="sm:hidden" aria-label="Import tier list">
                  <Upload />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Import a tier list</DialogTitle>
                  <DialogDescription>
                    Paste a list in the same format PokéTiers exports. Imported ratings replace matching Pokémon and leave your other ratings untouched.
                  </DialogDescription>
                </DialogHeader>
                <Textarea
                  value={importText}
                  onChange={(event) => {
                    setImportText(event.target.value);
                    setImportError("");
                  }}
                  className="min-h-64 resize-y font-mono text-sm"
                  placeholder={"SS\n#0054 Psyduck, #0069 Bellsprout\n\nS\n#0001 Bulbasaur, #0006 Charizard"}
                  aria-invalid={Boolean(importError)}
                  aria-describedby={importError ? "import-error" : undefined}
                />
                {importError && (
                  <p id="import-error" role="alert" className="text-sm font-medium text-destructive">
                    {importError}
                  </p>
                )}
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button onClick={importTierList} disabled={!importText.trim()}>
                    <Upload /> Import and continue
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Reset all ratings">
                  <RotateCcw />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Start over?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes all {ratedCount.toLocaleString()} saved ratings from this device.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep my list</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" onClick={resetAll}>
                    Reset everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {importNotice && (
            <div role="status" className="mb-4 rounded-xl border border-emerald-300/50 bg-emerald-400/15 px-4 py-3 text-sm font-semibold text-emerald-100">
              <Check className="mr-2 inline size-4" aria-hidden="true" />
              {importNotice}
            </div>
          )}
          <div className="mb-4 flex items-center justify-between gap-3">
            <TabsList className="h-11 rounded-xl bg-white/10 p-1" aria-label="App sections">
              <TabsTrigger value="rate" className="h-9 rounded-lg px-4 text-white/65 data-[state=active]:bg-white data-[state=active]:text-slate-950">
                Rate Pokémon
              </TabsTrigger>
              <TabsTrigger value="results" className="h-9 rounded-lg px-4 text-white/65 data-[state=active]:bg-white data-[state=active]:text-slate-950">
                Tier list
              </TabsTrigger>
            </TabsList>
            <p className="hidden text-xs font-semibold text-white/55 md:block">
              Keys 1–7 rate · ← previous · → skip
            </p>
          </div>

          <TabsContent value="rate">
            <section className="rate-layout grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(22rem,.75fr)]">
              <article className="pokemon-card relative overflow-hidden rounded-[2rem] border bg-card p-5 shadow-2xl sm:p-7 lg:min-h-[36rem]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="dex-number">#{String(current.id).padStart(4, "0")}</p>
                    <h2 className="mt-1 text-4xl font-black tracking-[-0.045em] sm:text-5xl">
                      {current.name}
                    </h2>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {current.types.map((type) => (
                        <span
                          key={type}
                          className="type-pill"
                          style={TYPE_STYLES[type]}
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                  {ratings[current.id] && (
                    <div className="current-rating" aria-label={`Currently rated ${ratings[current.id]}`}>
                      <span>Current</span>
                      <strong>{ratings[current.id]}</strong>
                    </div>
                  )}
                </div>

                <div className="sprite-stage" key={current.id}>
                  <div className="sprite-index" aria-hidden="true">{String(current.id).padStart(3, "0")}</div>
                  <img
                    src={spriteUrl(current.id)}
                    alt={`${current.name} sprite`}
                    width={256}
                    height={256}
                    className="pokemon-sprite"
                    draggable={false}
                  />
                </div>

                <div className="mt-2 flex items-center justify-between gap-3">
                  <Button variant="outline" className="rounded-xl" onClick={goPrevious}>
                    <ChevronLeft /> Previous
                  </Button>
                  <span className="hidden text-sm font-semibold text-muted-foreground sm:inline">
                    {currentIndex + 1} of {POKEMON.length.toLocaleString()}
                  </span>
                  <Button variant="ghost" className="rounded-xl" onClick={skipCurrent} disabled={remaining <= 1 && !ratings[current.id]}>
                    Decide later <ChevronRight />
                  </Button>
                </div>
              </article>

              <aside className="rating-panel rounded-[2rem] p-4 sm:p-5">
                <div className="mb-4 flex items-end justify-between gap-4 px-1">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/50">Your verdict</p>
                    <h3 className="mt-1 text-2xl font-black tracking-tight text-white">Pick a tier</h3>
                  </div>
                  <p className="text-right text-xs font-medium leading-5 text-white/50">Autosaved<br />on this device</p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-1">
                  {TIERS.map((tier) => {
                    const selected = ratings[current.id] === tier.name;
                    return (
                      <button
                        key={tier.name}
                        type="button"
                        className="tier-button group"
                        data-selected={selected || undefined}
                        onClick={() => rateCurrent(tier.name)}
                        style={{
                          "--tier-color": tier.color,
                          "--tier-soft": tier.soft,
                        } as CSSProperties}
                        aria-label={`Rate ${current.name} ${tier.name} tier`}
                      >
                        <span className="tier-key">{tier.key}</span>
                        <span className="tier-letter">{tier.name}</span>
                        <span className="tier-count">{tierCounts[tier.name]}</span>
                        {selected && <Check className="tier-check" aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
              </aside>
            </section>
          </TabsContent>

          <TabsContent value="results">
            <section className="results-panel rounded-[2rem] bg-card p-4 shadow-2xl sm:p-6">
              <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    {remaining === 0 && <Sparkles className="size-5 text-amber-500" />}
                    <h2 className="text-3xl font-black tracking-[-0.04em]">
                      {remaining === 0 ? "Your tier list is complete" : "Your tier list so far"}
                    </h2>
                  </div>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                    {remaining === 0
                      ? `All ${POKEMON.length.toLocaleString()} Pokémon ranked. Select any name to change its tier.`
                      : `${remaining.toLocaleString()} Pokémon still need a rating. Select any ranked name to edit it.`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {remaining > 0 && (
                    <Button variant="outline" onClick={() => setActiveTab("rate")}>
                      Continue rating
                    </Button>
                  )}
                  <Button variant="outline" onClick={copyResults}>
                    {copied ? <Check /> : <Clipboard />}
                    {copied ? "Copied" : "Copy list"}
                  </Button>
                  <Button onClick={downloadResults}>
                    <Download /> Download .txt
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {TIERS.map((tier) => {
                  const members = POKEMON.filter((pokemon) => ratings[pokemon.id] === tier.name);
                  return (
                    <div className="tier-row" key={tier.name}>
                      <div className="tier-row-label" style={{ background: tier.color }}>
                        <strong>{tier.name}</strong>
                        <span>{members.length}</span>
                      </div>
                      <div className="tier-members">
                        {members.length ? (
                          members.map((pokemon) => (
                            <button
                              key={pokemon.id}
                              type="button"
                              className="pokemon-chip"
                              onClick={() => editPokemon(pokemon.id)}
                              title={`Edit ${pokemon.name}`}
                            >
                              <span>#{String(pokemon.id).padStart(4, "0")}</span>
                              {pokemon.name}
                            </button>
                          ))
                        ) : (
                          <span className="px-2 text-sm font-medium text-muted-foreground">No Pokémon here yet</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </TabsContent>
        </Tabs>

        <footer className="px-2 py-5 text-center text-xs font-medium text-white/45">
          National Pokédex data and sprites from PokéAPI · Progress stays in this browser
        </footer>
      </div>
    </main>
  );
}
