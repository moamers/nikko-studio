/**
 * The pattern field — a generative, living tile grid drawn on a canvas.
 *
 * Seven variants, all built from the same machinery. Three of them are
 * TEXTURES, meant to sit behind type at low strength and do quiet work; four
 * are SUBJECTS, strong enough to be the thing you are looking at.
 *
 *   quarters  texture  quarter discs on a square grid
 *   truchet   texture  concentric quarter arcs, Truchet-flipped — line, not
 *                      mass, so it stays legible under body copy
 *   wave      texture  a field of short strokes turned by the flow field.
 *                      The quietest of the three, and the only one whose
 *                      shape IS the motion
 *   najmeh    subject  the eight-point Levantine star and its cross, drawn as
 *                      light coming through a solid screen
 *   nested    subject  concentric polygons, alternately filled, with the fill
 *                      phase travelling outward like a ripple
 *   ribbon    subject  a triangular lattice with ribbons cut out of it by the
 *                      flow field, so the bands snake as it moves
 *   blocks    subject  isometric cubes with striped faces, rising and falling
 *                      on the field. The op-art one.
 *
 * WHY CANVAS AND NOT CSS OR SVG. A field this size is 400-1500 shapes, each
 * with its own spring. As DOM nodes that is 1500 elements the compositor has
 * to lay out; as SVG path data it is a document that has to be re-serialised
 * every frame. One canvas is one node and one paint. (docs/05 § "Performance
 * rules for motion".)
 *
 * ─── The six things that make it alive ──────────────────────────────────
 *
 *  1. AMBIENT FLOW    Two travelling sine waves crossed at an angle, so the
 *                     field is never still and never repeats on the grid.
 *                     This is the layer that runs when nobody is doing
 *                     anything, and it is the reason the piece reads as alive
 *                     rather than as a static image with a hover state. Three
 *                     variants use it as their SHAPE and not only their
 *                     motion: `wave` turns each stroke by it, `ribbon` cuts
 *                     its bands out of it, `blocks` takes its heights from it.
 *  2. POINTER FIELD   Local excitation under the cursor or finger. Falls off
 *                     with the square of the distance so the edge is soft.
 *  3. SCROLL ENERGY   Scroll velocity is injected as `energy`, which decays.
 *                     Scrolling the page stirs the pattern — the single thing
 *                     that makes it feel part of a website rather than an
 *                     embedded toy.
 *  4. DEAL-IN         Cells arrive on a diagonal stagger the first time the
 *                     field is seen, on the site's own `--nk-dur-deal` and
 *                     `--nk-stagger-deal`. The same motion the service cards
 *                     use, so the page has one vocabulary.
 *  5. ACCENT SWEEP    When the accent cycle turns over, the new colour crosses
 *                     the field as a diagonal wipe instead of snapping. The
 *                     cycle is 12s; a hard cut every 12s reads as a bug.
 *  6. MISREGISTRATION In analogue mode a coral ghost is printed a hair off
 *                     register, matching `--nk-misreg` on the hero H1.
 *
 * All six are off under `prefers-reduced-motion`: one still composition is
 * drawn, once, and no loop is ever created. The pattern is still there — it
 * just does not move. [P10]
 *
 * NO HEX LITERAL APPEARS IN THIS FILE. [P11] Every colour is read back off
 * the element with `getComputedStyle`, so `tokens.css` stays the one source
 * of truth and an accent change is a one-line edit there.
 */
import {
  createLifecycle,
  prefersReducedMotion,
  readDuration,
  readNumber,
  type Lifecycle,
} from './lifecycle';

const TAU = Math.PI * 2;

/** The shape drawn in each cell. */
export type PatternVariant =
  | 'quarters'
  | 'najmeh'
  | 'truchet'
  | 'wave'
  | 'nested'
  | 'ribbon'
  | 'blocks';

/**
 * Which colours the tiles take.
 *   `accent`  the live accent, mixed with the field's own ink or paper.
 *   `trio`    all three accent hues at once, banded on the diagonal.
 *   `mono`    ink or paper only. The quietest, and the right default behind
 *             body copy.
 */
export type PatternPalette = 'accent' | 'trio' | 'mono';

/**
 * The ground the field is drawn on, which decides what "the quiet colour"
 * means: on paper the tiles are ink, on ink they are paper.
 */
export type PatternTone = 'paper' | 'ink';

/** How `build()` lays the cells out. */
type Lattice = 'square' | 'tri' | 'iso';

/**
 * Per-variant facts the rest of the file reads rather than hard-codes.
 *
 * `cap` is the ceiling on cells for that variant specifically, because the
 * variants are not equally expensive: a `wave` stroke is one line and a
 * `blocks` cube is three clipped faces with a dozen stripes each. One global
 * cap would be either far too low for the cheap ones or ruinous for the
 * expensive one.
 */
const SPEC: Record<PatternVariant, { lattice: Lattice; cap: number; density: number }> = {
  quarters: { lattice: 'square', cap: 1500, density: 44 },
  truchet: { lattice: 'square', cap: 900, density: 58 },
  wave: { lattice: 'square', cap: 1500, density: 18 },
  najmeh: { lattice: 'square', cap: 1200, density: 72 },
  nested: { lattice: 'square', cap: 500, density: 74 },
  ribbon: { lattice: 'tri', cap: 1400, density: 44 },
  blocks: { lattice: 'iso', cap: 90, density: 62 },
};

/**
 * A cell is deliberately a plain object rather than a slot in a typed array.
 * At the sizes this field actually runs — capped above — the allocation is
 * paid once at build time and never again, and the readable version is the
 * one the next person can change. [P14]
 */
interface Cell {
  /** Centre, in CSS pixels. */
  x: number;
  y: number;
  /** Diagonal position 0-1, used by the deal-in stagger and the accent sweep. */
  diag: number;
  /** Which of the four quarter-turns this cell rests at. */
  turn: number;
  /** Empty, quarter, facing pair, full round. `quarters` only. */
  kind: number;
  /** Stable per-cell random, so a cell keeps its colour across a re-roll. */
  seed: number;
  /** Animated angle and its velocity. */
  ang: number;
  angV: number;
  /** Animated scale, aperture or height, and its velocity. */
  amp: number;
  ampV: number;
  /** The ripple that last touched this cell, so one wave re-rolls it once. */
  ripple: number;
  /** `tri`: which way up the triangle points. */
  up?: boolean;
  /** `iso`: lattice coordinates, used for painter's-algorithm ordering. */
  depth?: number;
}

interface Options {
  variant: PatternVariant;
  palette: PatternPalette;
  tone: PatternTone;
  /** Cell size in CSS pixels before the cap is applied. */
  density: number;
  /**
   * The variant's one taste knob:
   *   quarters  how broken up the field is
   *   najmeh    the resting aperture
   *   truchet   how many concentric arcs per corner
   *   wave      stroke length against the pitch
   *   nested    how many rings per cell
   *   ribbon    how much of the lattice the ribbons occupy
   *   blocks    how much of the cluster is solid
   */
  amount: number;
}

interface Palette {
  quiet: string;
  ground: string;
  accent: string;
  trio: readonly string[];
  misreg: string;
}

/** A spring step. Returns the new position and velocity. */
function spring(
  value: number,
  velocity: number,
  target: number,
  stiffness: number,
  damping: number,
): [number, number] {
  const v = (velocity + (target - value) * stiffness) * damping;
  return [value + v, v];
}

/**
 * Two travelling waves crossed at an angle no multiple of the grid, so the
 * interference never lands back on the tile pitch and the field never shows a
 * seam. Returns 0-1.
 *
 * This is the whole ambient layer. Three variants also take their SHAPE from
 * it, which is why it is a free function rather than a method: it has to be
 * callable at a point that is not a cell centre.
 */
function flow(x: number, y: number, t: number): number {
  const a = Math.sin((x * 0.9 + y * 0.62) / 120 + t * 0.9);
  const b = Math.sin((y * 1.1 - x * 0.48) / 88 - t * 0.62);
  return (a * 0.5 + b * 0.5 + 1) / 2;
}

/** A star of `points` points, or a regular polygon when `inner` equals `outer`. */
function starPath(
  ctx: CanvasRenderingContext2D,
  outer: number,
  inner: number,
  points: number,
  rotation: number,
): void {
  const step = Math.PI / points;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = rotation + i * step;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** A regular polygon, centred on the origin. */
function polygonPath(
  ctx: CanvasRenderingContext2D,
  radius: number,
  sides: number,
  rotation: number,
): void {
  ctx.beginPath();
  for (let i = 0; i < sides; i += 1) {
    const angle = rotation + (i / sides) * TAU;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** Read the options a component wrote onto the canvas as `data-*`. */
function readOptions(canvas: HTMLCanvasElement): Options {
  const data = canvas.dataset;
  const raw = data.patternVariant ?? '';
  const variant: PatternVariant = raw in SPEC ? (raw as PatternVariant) : 'quarters';
  const number = (value: string | undefined, fallback: number): number => {
    const parsed = Number.parseFloat(value ?? '');
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  return {
    variant,
    palette:
      data.patternPalette === 'trio' || data.patternPalette === 'mono'
        ? data.patternPalette
        : 'accent',
    tone: data.patternTone === 'ink' ? 'ink' : 'paper',
    density: number(data.patternDensity, SPEC[variant].density),
    amount: number(data.patternAmount, 0.42),
  };
}

class PatternField {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly life: Lifecycle;
  private readonly still: boolean;

  private options: Options;
  private cells: Cell[] = [];
  private colours: Palette;
  /** The accent as it was before the cycle last turned over. */
  private previousAccent: string;

  private width = 0;
  private height = 0;
  private cell = 0;
  private originX = 0;
  private originY = 0;

  private pointerX: number | null = null;
  private pointerY: number | null = null;
  private pointerAt = -1e9;

  private ripple: { x: number; y: number; at: number } | null = null;

  /** Stirred by scrolling, decays every frame. Layer 3. */
  private energy = 0;
  private lastScrollY = 0;

  /** 0 until the field has been seen, then ramps to 1. Layer 4. */
  private deal = 0;
  private dealStart = 0;
  private seen = false;

  /** 0-1 while the accent sweep crosses the field. Layer 5. */
  private sweepStart = -1e9;

  private visible = false;
  private ghost = false;

  private readonly dealMs: number;
  private readonly staggerMs: number;
  private readonly sweepMs: number;

  constructor(canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('pattern: no 2d context');

    this.canvas = canvas;
    this.ctx = context;
    this.options = readOptions(canvas);
    this.still = prefersReducedMotion();
    this.life = createLifecycle();

    this.dealMs = readDuration('--nk-dur-deal', 220);
    this.staggerMs = readDuration('--nk-stagger-deal', 60);
    this.sweepMs = readDuration('--nk-dur-accent', 2600);

    this.colours = this.readColours();
    this.previousAccent = this.colours.accent;

    // The ghost pass costs a second full draw, so it is spent only where the
    // site already spends on analogue treatment. Below 768px the grain is off
    // for the same reason. (docs/06 § Q9a.)
    this.ghost = window.matchMedia('(min-width: 768px)').matches;

    this.mount();
  }

  /**
   * Every colour comes back off the element, so a token change in
   * `tokens.css` reaches the canvas with no edit here. [P11]
   */
  private readColours(): Palette {
    const style = getComputedStyle(this.canvas);
    const value = (name: string): string => style.getPropertyValue(name).trim();
    const ink = value('--nk-ink');
    const paper = value('--nk-paper');
    return {
      quiet: this.options.tone === 'ink' ? paper : ink,
      ground: this.options.tone === 'ink' ? ink : paper,
      accent: value('--nk-accent'),
      trio: [value('--nk-yellow'), value('--nk-coral'), value('--nk-cobalt')],
      misreg: value('--nk-coral'),
    };
  }

  private mount(): void {
    const canvas = this.canvas;

    // Pointer. `pointerleave` releases the field rather than freezing it, so
    // the ambient flow takes back over instead of leaving a dead hot spot.
    this.life.on(canvas, 'pointermove', (event) => {
      const rect = canvas.getBoundingClientRect();
      this.pointerX = event.clientX - rect.left;
      this.pointerY = event.clientY - rect.top;
      this.pointerAt = performance.now();
    });
    this.life.on(canvas, 'pointerleave', () => {
      this.pointerX = null;
      this.pointerY = null;
    });
    this.life.on(canvas, 'pointerdown', (event) => {
      const rect = canvas.getBoundingClientRect();
      this.pointerX = event.clientX - rect.left;
      this.pointerY = event.clientY - rect.top;
      this.pointerAt = performance.now();
      this.ping(this.pointerX, this.pointerY);
    });

    // Layer 3. Passive, and it does no work of its own — it only leaves a
    // number behind for the next frame to read.
    this.lastScrollY = window.scrollY;
    this.life.on(
      window,
      'scroll',
      () => {
        const delta = Math.abs(window.scrollY - this.lastScrollY);
        this.lastScrollY = window.scrollY;
        this.energy = Math.min(1, this.energy + delta * 0.006);
      },
      { passive: true },
    );

    const resizeObserver = new ResizeObserver(() => this.resize());
    resizeObserver.observe(canvas);
    this.life.add(() => resizeObserver.disconnect());

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        this.visible = entry.isIntersecting;
        // Layer 4 starts the first time the field is actually on screen, not
        // when the script happens to run. A deal nobody saw is a deal wasted.
        if (this.visible && !this.seen) {
          this.seen = true;
          this.dealStart = performance.now();
          if (this.still) this.deal = 1;
        }
      },
      { rootMargin: '160px' },
    );
    intersectionObserver.observe(canvas);
    this.life.add(() => intersectionObserver.disconnect());

    // Layer 5, and the analogue ghost. `accent.ts` and `mode.ts` each write
    // one attribute on <html> and know nothing about this file; watching the
    // attribute is how a field subscribes without either of them growing a
    // dependency. (docs/05 § 1.)
    const rootObserver = new MutationObserver(() => {
      const next = this.readColours();
      if (next.accent !== this.colours.accent) {
        this.previousAccent = this.colours.accent;
        this.sweepStart = performance.now();
      }
      this.colours = next;
      if (this.still) this.draw(performance.now());
    });
    rootObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-accent', 'data-mode'],
    });
    this.life.add(() => rootObserver.disconnect());

    this.resize();

    if (this.still) {
      this.deal = 1;
      this.draw(performance.now());
    } else {
      this.life.loop(() => {
        if (this.visible) this.draw(performance.now());
      });
    }

    this.life.add(() => {
      this.cells = [];
    });
  }

  private resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    // Two device pixels is the point past which nobody can see the
    // difference and everybody can feel the fill rate. [P4]
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = Math.round(rect.width * ratio);
    this.canvas.height = Math.round(rect.height * ratio);
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    this.build();
    if (this.still) this.draw(performance.now());
  }

  /**
   * Lay out the grid. The cell cap is the one hard performance guarantee in
   * this file: whatever density is asked for, a field never draws more than
   * its variant's ceiling, because a 4K viewport at a small pitch would
   * otherwise ask for tens of thousands.
   */
  private build(): void {
    const spec = SPEC[this.options.variant];
    const cap = Math.min(spec.cap, readNumber('--nk-pattern-max-cells', 1500));
    const size = Math.max(8, this.options.density);
    this.cells = [];

    if (spec.lattice === 'tri') this.buildTriangles(size, cap);
    else if (spec.lattice === 'iso') this.buildCubes(size, cap);
    else this.buildSquares(size, cap);
  }

  private buildSquares(requested: number, cap: number): void {
    const najmeh = this.options.variant === 'najmeh';
    let size = requested;
    let columns = Math.max(2, Math.ceil(this.width / size) + (najmeh ? 1 : 0));
    let rows = Math.max(2, Math.ceil(this.height / size) + (najmeh ? 1 : 0));

    if (columns * rows > cap) {
      size = Math.sqrt((this.width * this.height) / cap);
      columns = Math.max(2, Math.ceil(this.width / size) + (najmeh ? 1 : 0));
      rows = Math.max(2, Math.ceil(this.height / size) + (najmeh ? 1 : 0));
    }

    this.cell = size;
    // The star lattice is centred so the arch never cuts a star in half at
    // the crown. Every other square variant is corner-anchored, because a cut
    // shape at the edge is exactly what the references do.
    this.originX = najmeh ? (this.width - (columns - 1) * size) / 2 : size / 2;
    this.originY = najmeh ? (this.height - (rows - 1) * size) / 2 : size / 2;

    const span = Math.max(1, columns + rows - 2);
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        this.cells.push(
          this.makeCell(
            this.originX + column * size,
            this.originY + row * size,
            (column + row) / span,
          ),
        );
      }
    }
  }

  /**
   * The triangular lattice `ribbon` is cut from. Rows of alternating up and
   * down triangles sharing edges — the same lattice the reference draws its
   * wireframe on, so the ribbons run along real edges rather than floating
   * over a square grid pretending to be isometric.
   */
  private buildTriangles(requested: number, cap: number): void {
    let size = requested;
    let rowHeight = size * 0.866;
    let rows = Math.max(2, Math.ceil(this.height / rowHeight) + 1);
    let perRow = Math.max(2, Math.ceil((this.width / size) * 2) + 2);

    if (rows * perRow > cap) {
      // Widen the triangle until the count fits. Solving exactly needs a
      // quadratic; two passes of this get within a few cells and cost
      // nothing, because it only runs on resize.
      size *= Math.sqrt((rows * perRow) / cap);
      rowHeight = size * 0.866;
      rows = Math.max(2, Math.ceil(this.height / rowHeight) + 1);
      perRow = Math.max(2, Math.ceil((this.width / size) * 2) + 2);
    }

    this.cell = size;
    this.originX = 0;
    this.originY = 0;

    const span = Math.max(1, perRow + rows - 2);
    for (let row = 0; row < rows; row += 1) {
      for (let index = 0; index < perRow; index += 1) {
        const up = index % 2 === 0;
        const base = (index * size) / 2;
        // The centroid, which is what the flow field and the pointer are
        // measured against. A triangle's centroid sits a third of the way up.
        const cx = base + size / 2;
        const cy = row * rowHeight + (up ? rowHeight * 0.667 : rowHeight * 0.333);
        const cell = this.makeCell(cx, cy, (index + row) / span);
        cell.up = up;
        cell.turn = row;
        this.cells.push(cell);
      }
    }
  }

  /**
   * The isometric cube lattice `blocks` stands on. `(i, j)` maps to the
   * screen the standard way — x by the difference, y by the sum — which is
   * what makes the cubes interlock instead of merely overlapping.
   *
   * Cells are pushed in increasing `depth` so the draw loop is already in
   * painter's order: back to front, no per-frame sort.
   */
  private buildCubes(requested: number, cap: number): void {
    // How many cubes actually LAND on the canvas, which is the number that
    // matters. An earlier version counted the whole (2r+1)² lattice square
    // before culling — that overshoots by several times over, so the sizing
    // loop kept growing the cube until a handful of enormous ones filled the
    // box. A cube's footprint is 2·halfW by 2·halfH, so it is one division.
    let size = requested;
    const footprint = (edge: number): number => 2 * edge * edge;
    if (footprint(size) > 0 && (this.width * this.height) / footprint(size) > cap) {
      size = Math.sqrt((this.width * this.height) / (2 * cap));
    }

    const halfW = size;
    const halfH = size * 0.5;
    const range = Math.ceil(Math.max(this.width / (2 * halfW), this.height / (2 * halfH))) + 2;

    this.cell = size;
    this.originX = this.width / 2;
    this.originY = this.height / 2;

    const span = Math.max(1, 4 * range);
    for (let sum = -2 * range; sum <= 2 * range; sum += 1) {
      for (let i = -range; i <= range; i += 1) {
        const j = sum - i;
        if (j < -range || j > range) continue;
        const x = this.originX + (i - j) * halfW;
        const y = this.originY + (i + j) * halfH;
        if (x < -2 * halfW || x > this.width + 2 * halfW) continue;
        if (y < -3 * halfH || y > this.height + 3 * halfH) continue;
        const cell = this.makeCell(x, y, (sum + 2 * range) / span);
        cell.depth = sum;
        this.cells.push(cell);
      }
    }
  }

  private makeCell(x: number, y: number, diag: number): Cell {
    const cell: Cell = {
      x,
      y,
      diag,
      turn: 0,
      kind: 1,
      seed: Math.random(),
      ang: 0,
      angV: 0,
      amp: this.options.variant === 'najmeh' ? this.options.amount : 1,
      ampV: 0,
      ripple: -1,
    };
    this.roll(cell);
    cell.ang = (cell.turn * Math.PI) / 2;
    return cell;
  }

  /** Give a cell a fresh shape and quarter-turn. */
  private roll(cell: Cell): void {
    const chaos = this.options.amount;
    const draw = Math.random();
    if (draw < 0.1 + chaos * 0.26) cell.kind = 0;
    else if (draw < 0.86 - chaos * 0.2) cell.kind = 1;
    else if (draw < 0.97 - chaos * 0.04) cell.kind = 2;
    else cell.kind = 3;
    cell.turn = Math.floor(Math.random() * 4);
  }

  /** Send a wave out from a point. */
  ping(x: number, y: number): void {
    if (this.still) {
      this.cells.forEach((cell) => {
        this.roll(cell);
        cell.ang = (cell.turn * Math.PI) / 2;
      });
      this.draw(performance.now());
      return;
    }
    this.ripple = { x, y, at: performance.now() };
  }

  /**
   * Where the field is currently being excited from. A real pointer wins;
   * with none for a beat, a slow attractor wanders instead, so the piece is
   * alive on a phone that nobody is touching — which is most phones.
   */
  private focus(now: number): { x: number; y: number } | null {
    if (this.still) return null;
    if (this.pointerX !== null && this.pointerY !== null && now - this.pointerAt < 2600) {
      return { x: this.pointerX, y: this.pointerY };
    }
    const t = now / 1000;
    return {
      x: this.width * (0.5 + 0.34 * Math.sin(t * 0.21)),
      y: this.height * (0.5 + 0.32 * Math.sin(t * 0.29 + 1.1)),
    };
  }

  /** The colour a cell rests at, before the accent sweep is applied. */
  private restColour(cell: Cell, accent: string): string {
    if (this.options.palette === 'mono') return this.colours.quiet;
    if (this.options.palette === 'trio') {
      return cell.seed < 0.4
        ? this.colours.quiet
        : (this.colours.trio[Math.floor(cell.seed * 7) % 3] ?? accent);
    }
    return cell.seed < 0.72 ? this.colours.quiet : accent;
  }

  private draw(now: number): void {
    if (!this.width || !this.height) return;

    // Layer 3 decays here rather than on a timer, so a field that is not
    // being drawn is not burning a decay either.
    this.energy *= 0.94;

    // Layer 4.
    if (this.still) {
      this.deal = 1;
    } else if (this.seen) {
      const total = this.dealMs + this.staggerMs * 6;
      this.deal = Math.min(1, (now - this.dealStart) / total);
    }

    // Layer 5. `sweep` is where across the diagonal the new accent has got to.
    const sweep = Math.min(1, (now - this.sweepStart) / this.sweepMs);

    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // THE CANVAS NEVER PAINTS ITS OWN GROUND. For `najmeh` the "screen" the
    // light comes through is the section's own background, set by whoever
    // placed the field — which is the only version that composites correctly
    // when the field is partly transparent, and the only version where a
    // field can sit over an image rather than a flat colour.
    //
    // `strength` is likewise NOT a per-shape alpha. Applied per fill it
    // double-darkens everywhere two scaled tiles overlap, which reads as
    // dirty patches rather than as a lighter pattern. It is one opacity on
    // the whole canvas instead — `--nk-pattern-strength`, written by
    // `PatternField.astro` — so the field composites once, as a single
    // image, and costs nothing extra to do it.
    this.paint(now, sweep, 0, 0, null);

    // Layer 6. One offset pass in coral, the same misregistration the hero's
    // H1 takes in analogue mode, so the field belongs to the same print.
    if (
      this.ghost &&
      !this.still &&
      document.documentElement.getAttribute('data-mode') === 'analogue'
    ) {
      ctx.globalAlpha = 0.16;
      this.paint(now, sweep, 1.5, -1.5, this.colours.misreg);
      ctx.globalAlpha = 1;
    }
  }

  /**
   * One pass over the field. `override` paints every cell in a single colour,
   * which is what the misregistration ghost wants; a null override lets each
   * cell keep its own.
   *
   * The shared work — deal-in, excitation, the ripple, the flow sample and
   * the accent sweep — is done once here, and only the geometry is dispatched
   * per variant. That is the whole reason seven variants cost one loop.
   */
  private paint(
    now: number,
    sweep: number,
    offsetX: number,
    offsetY: number,
    override: string | null,
  ): void {
    const ctx = this.ctx;
    const variant = this.options.variant;
    const size = this.cell;
    const focus = this.focus(now);
    const reach = Math.max(variant === 'najmeh' ? 120 : 96, Math.min(this.width, this.height) * 0.4);
    const flowT = this.still ? 0 : now / 1000;
    const drift = this.still ? 0 : now / 9000;

    // Layer 1's amplitude rises with layer 3: a still page breathes, a page
    // being scrolled surges.
    const swell = 0.35 + this.energy * 0.65;

    let rippleRadius = -1;
    const band = size * (variant === 'najmeh' ? 2.6 : 2.2);
    if (this.ripple) {
      rippleRadius = (now - this.ripple.at) * (variant === 'najmeh' ? 0.72 : 0.9);
      if (rippleRadius > Math.hypot(this.width, this.height) + band) this.ripple = null;
    }

    // Layer 3 again, as displacement rather than energy: the whole field
    // slides a few pixels against the page, which is what sells it as depth.
    const parallax = this.still ? 0 : Math.sin(window.scrollY / 220) * 3;

    // `wave` and `truchet` are line work, so their weight is set once here
    // rather than per cell.
    if (variant === 'wave') ctx.lineCap = 'round';
    if (variant === 'truchet' || variant === 'wave') ctx.lineJoin = 'round';

    for (let index = 0; index < this.cells.length; index += 1) {
      const cell = this.cells[index];
      if (!cell) continue;

      // Layer 4. Each cell waits its turn on the diagonal, then eases in.
      const dealt = this.still ? 1 : Math.max(0, Math.min(1, (this.deal - cell.diag * 0.55) * 2.6));
      if (dealt <= 0) continue;

      let excite = 0;
      if (focus) {
        const distance = Math.hypot(cell.x - focus.x, cell.y - focus.y);
        if (distance < reach) {
          excite = 1 - distance / reach;
          excite *= excite;
        }
      }

      let pop = 0;
      if (this.ripple) {
        const distance = Math.hypot(cell.x - this.ripple.x, cell.y - this.ripple.y);
        const edge = rippleRadius - distance;
        if (edge > 0 && edge < band) {
          const crest = Math.sin((edge / band) * Math.PI);
          if (variant === 'najmeh' || variant === 'ribbon' || variant === 'blocks') {
            excite = Math.max(excite, crest * 0.95);
          } else {
            pop = crest * 0.3;
            if (cell.ripple !== this.ripple.at) {
              cell.ripple = this.ripple.at;
              this.roll(cell);
            }
          }
        }
      }

      // Layer 1.
      const wave = this.still ? 0.5 : flow(cell.x, cell.y, flowT);

      // Layer 5. A cell adopts the new accent when the wipe has passed it.
      const accent = sweep >= 1 || sweep > cell.diag ? this.colours.accent : this.previousAccent;
      const colour = override ?? this.restColour(cell, accent);

      const x = cell.x + offsetX;
      const y = cell.y + offsetY + parallax;

      switch (variant) {
        case 'najmeh':
          this.drawNajmeh(cell, x, y, wave, excite, dealt, swell, drift, colour, override);
          break;
        case 'truchet':
          this.drawTruchet(cell, x, y, wave, excite, dealt, swell, colour, accent, override);
          break;
        case 'wave':
          this.drawWave(cell, x, y, focus, flowT, excite, dealt, swell, pop, colour, accent);
          break;
        case 'nested':
          this.drawNested(cell, x, y, wave, excite, dealt, swell, drift, colour, accent, override);
          break;
        case 'ribbon':
          this.drawRibbon(cell, x, y, wave, excite, dealt, swell, colour, override);
          break;
        case 'blocks':
          this.drawBlock(cell, x, y, wave, excite, dealt, swell, now, colour, accent, override);
          break;
        default:
          this.drawQuarter(cell, x, y, wave, excite, dealt, swell, pop, colour, accent, override);
      }
    }
  }

  // ── quarters ───────────────────────────────────────────────────────────
  private drawQuarter(
    cell: Cell,
    x: number,
    y: number,
    wave: number,
    excite: number,
    dealt: number,
    swell: number,
    pop: number,
    colour: string,
    accent: string,
    override: string | null,
  ): void {
    const ctx = this.ctx;
    const size = this.cell;
    const half = size / 2;

    // The split-flap. A cell turns over on its own now and then, more often
    // the more the page is being scrolled, which is what keeps a texture
    // from reading as wallpaper.
    if (!this.still && Math.random() < 0.0004 + this.energy * 0.0035) cell.turn += 1;

    const targetAngle =
      (cell.turn * Math.PI) / 2 + excite * (Math.PI / 2) + (wave - 0.5) * 0.34 * swell;
    const targetScale = (1 + excite * 0.17 + pop + (wave - 0.5) * 0.06 * swell) * dealt;

    if (this.still) {
      cell.ang = (cell.turn * Math.PI) / 2;
      cell.amp = 1;
    } else {
      [cell.ang, cell.angV] = spring(cell.ang, cell.angV, targetAngle, 0.12, 0.78);
      [cell.amp, cell.ampV] = spring(cell.amp, cell.ampV, targetScale, 0.16, 0.72);
    }

    if (cell.kind === 0) return;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(cell.ang);
    ctx.scale(cell.amp, cell.amp);
    ctx.beginPath();
    if (cell.kind === 3) {
      ctx.arc(0, 0, half, 0, TAU);
    } else {
      ctx.moveTo(-half, -half);
      ctx.arc(-half, -half, size, 0, Math.PI / 2);
      ctx.closePath();
      if (cell.kind === 2) {
        ctx.moveTo(half, half);
        ctx.arc(half, half, size, Math.PI, Math.PI * 1.5);
        ctx.closePath();
      }
    }
    ctx.fillStyle = colour;
    ctx.fill();

    // Under the pointer a cell takes the accent outright, so the cursor
    // leaves a lit trail rather than only a geometric one.
    if (!override && excite > 0.03 && this.options.palette !== 'mono') {
      ctx.save();
      ctx.globalAlpha *= Math.min(1, excite * 1.25);
      ctx.fillStyle = accent;
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  // ── najmeh ─────────────────────────────────────────────────────────────
  private drawNajmeh(
    cell: Cell,
    x: number,
    y: number,
    wave: number,
    excite: number,
    dealt: number,
    swell: number,
    drift: number,
    colour: string,
    override: string | null,
  ): void {
    const ctx = this.ctx;
    const size = this.cell;
    const half = size / 2;
    const amount = this.options.amount;

    const rest = amount + (wave - 0.5) * 0.3 * swell;
    const target = Math.max(0, Math.min(1, rest + excite * (1 - amount * 0.55)));
    if (this.still) cell.amp = target;
    else [cell.amp, cell.ampV] = spring(cell.amp, cell.ampV, target, 0.1, 0.8);

    // At full aperture the outer radius reaches half a cell, which is the
    // point where four neighbouring stars just touch — the moment a real
    // screen is open.
    const outer = half * (0.46 + 0.52 * cell.amp) * dealt;
    const inner = outer * 0.58; // the najmeh's proportion: fat points, not spikes
    const rotation = drift + cell.amp * (Math.PI / 4);

    ctx.save();
    ctx.translate(x, y);

    if (cell.amp > amount + 0.14) {
      ctx.save();
      ctx.globalAlpha *= (cell.amp - amount) * 0.15;
      ctx.fillStyle = colour;
      starPath(ctx, outer * 1.32, inner * 1.32, 8, rotation);
      ctx.fill();
      ctx.restore();
    }

    ctx.fillStyle = colour;
    starPath(ctx, outer, inner, 8, rotation);
    ctx.fill();

    // The strapwork. A concentric star cut back out in the screen's own
    // colour is what the timber does in a real panel, and it is the line
    // that stops each star reading as a flat sticker.
    if (!override) {
      ctx.strokeStyle = this.colours.ground;
      ctx.lineWidth = Math.max(1, size * 0.055);
      ctx.lineJoin = 'miter';
      starPath(ctx, outer * 0.62, inner * 0.62, 8, rotation);
      ctx.stroke();
    }
    ctx.restore();

    // The cross that fills the space between four stars — the other half of a
    // star-and-cross tessellation, and the reason the field reads as one
    // pattern rather than a grid of separate motifs.
    ctx.save();
    ctx.translate(x + half, y + half);
    ctx.fillStyle = colour;
    starPath(
      ctx,
      size * 0.21 * (0.45 + cell.amp) * dealt,
      size * 0.09 * (0.45 + cell.amp) * dealt,
      4,
      Math.PI / 4 - drift,
    );
    ctx.fill();
    ctx.restore();
  }

  // ── truchet ────────────────────────────────────────────────────────────
  /**
   * Concentric quarter arcs on a Truchet flip.
   *
   * The continuity trick is the whole pattern: an arc of radius `r` centred
   * on one corner meets an arc of radius `size - r` centred on the OPPOSITE
   * corner exactly at the cell edge, so lines run unbroken from tile to tile
   * and the field reads as one drawing rather than as a grid of tiles. Flip a
   * tile and every line through it re-routes — which is why this variant's
   * split-flap is worth so much more than it is on `quarters`.
   */
  private drawTruchet(
    cell: Cell,
    x: number,
    y: number,
    wave: number,
    excite: number,
    dealt: number,
    swell: number,
    colour: string,
    accent: string,
    override: string | null,
  ): void {
    const ctx = this.ctx;
    const size = this.cell;
    const half = size / 2;

    if (!this.still && Math.random() < 0.0006 + this.energy * 0.006) cell.turn += 1;

    const targetAngle = (cell.turn * Math.PI) / 2 + excite * (Math.PI / 2);
    if (this.still) cell.ang = (cell.turn * Math.PI) / 2;
    else [cell.ang, cell.angV] = spring(cell.ang, cell.angV, targetAngle, 0.11, 0.8);

    // The rings tighten and loosen on the flow field, which is what stops a
    // line texture from looking printed.
    const rings = Math.max(2, Math.round(2 + this.options.amount * 7));
    const weight = Math.max(0.75, size * 0.02 * (1 + excite * 1.2 + (wave - 0.5) * 0.5 * swell));

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(cell.ang);
    ctx.lineWidth = weight;
    ctx.strokeStyle = override ?? (excite > 0.35 ? accent : colour);
    ctx.globalAlpha *= dealt;

    for (let k = 0; k < rings; k += 1) {
      const r = (size * (k + 0.5)) / rings;
      ctx.beginPath();
      ctx.arc(-half, -half, r, 0, Math.PI / 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(half, half, size - r, Math.PI, Math.PI * 1.5);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── wave ───────────────────────────────────────────────────────────────
  /**
   * A field of short strokes, each turned by the flow field at its own
   * position. The only variant whose SHAPE is the ambient layer — which is
   * why it is the quietest of the three textures and the one that reads as
   * weather rather than as pattern.
   *
   * The pointer adds a vortex rather than a highlight: strokes near it turn
   * to run AROUND it, so dragging across leaves a wake.
   */
  private drawWave(
    cell: Cell,
    x: number,
    y: number,
    focus: { x: number; y: number } | null,
    flowT: number,
    excite: number,
    dealt: number,
    swell: number,
    pop: number,
    colour: string,
    accent: string,
  ): void {
    const ctx = this.ctx;
    const size = this.cell;

    let angle = flow(cell.x, cell.y, flowT) * TAU;

    if (focus && excite > 0.01) {
      // Tangent to the circle around the focus — a swirl, not a starburst.
      const swirl = Math.atan2(cell.y - focus.y, cell.x - focus.x) + Math.PI / 2;
      const shortest = Math.atan2(Math.sin(swirl - angle), Math.cos(swirl - angle));
      angle += shortest * excite;
    }

    if (this.still) cell.ang = angle;
    else [cell.ang, cell.angV] = spring(cell.ang, cell.angV, angle, 0.2, 0.7);

    const length = size * (0.42 + this.options.amount * 0.5) * (1 + excite * 0.5 + pop) * dealt;
    const weight = Math.max(1, size * 0.1 * (1 + excite * 0.8 + (swell - 0.35) * 0.5));

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(cell.ang);
    ctx.lineWidth = weight;
    ctx.strokeStyle = excite > 0.4 && this.options.palette !== 'mono' ? accent : colour;
    ctx.beginPath();
    ctx.moveTo(-length / 2, 0);
    ctx.lineTo(length / 2, 0);
    ctx.stroke();
    ctx.restore();
  }

  // ── nested ─────────────────────────────────────────────────────────────
  /**
   * Concentric polygons, alternately filled. The fill phase travels outward
   * on the flow field, so each cell pulses like a ripple in a pond rather
   * than sitting there as a target.
   *
   * Drawn largest first: each ring paints over the middle of the one under
   * it, which is what leaves a band rather than a stack of discs.
   */
  private drawNested(
    cell: Cell,
    x: number,
    y: number,
    wave: number,
    excite: number,
    dealt: number,
    swell: number,
    drift: number,
    colour: string,
    accent: string,
    override: string | null,
  ): void {
    const ctx = this.ctx;
    const half = this.cell / 2;
    const rings = Math.max(3, Math.round(3 + this.options.amount * 5));
    const sides = 6;

    const target = 1 + excite * 0.22 + (wave - 0.5) * 0.12 * swell;
    if (this.still) cell.amp = 1;
    else [cell.amp, cell.ampV] = spring(cell.amp, cell.ampV, target, 0.14, 0.74);

    // The travelling phase. Without it this is a static bullseye.
    const phase = this.still ? 0 : wave * rings + this.energy * 2;
    const rotation = drift * 2 + (cell.seed - 0.5) * TAU + excite * 0.6;

    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha *= dealt;

    for (let k = rings; k >= 1; k -= 1) {
      const radius = half * 0.94 * (k / rings) * cell.amp;
      const lit = (Math.floor(k + phase) % 2) === 0;
      ctx.fillStyle = override ?? (lit ? (excite > 0.3 ? accent : colour) : this.colours.ground);
      polygonPath(ctx, radius, sides, rotation);
      ctx.fill();
    }
    ctx.restore();
  }

  // ── ribbon ─────────────────────────────────────────────────────────────
  /**
   * The isometric ribbon grid. A triangular lattice, drawn as a hairline
   * wireframe, with triangles filled where the flow field crosses a
   * threshold — so the filled cells form snaking chevron bands that MOVE,
   * which no static version of this pattern can do.
   *
   * The threshold is what `amount` controls: low and the ribbons are thin
   * traces, high and the lattice is mostly solid with holes cut in it.
   */
  private drawRibbon(
    cell: Cell,
    x: number,
    y: number,
    wave: number,
    excite: number,
    dealt: number,
    swell: number,
    colour: string,
    override: string | null,
  ): void {
    const ctx = this.ctx;
    const size = this.cell;
    const rowHeight = size * 0.866;
    const up = cell.up === true;

    // The lattice the ribbons run on. Drawn for every cell, so it survives
    // wherever the ribbon does not reach.
    const base = x - size / 2;
    const top = y - (up ? rowHeight * 0.667 : rowHeight * 0.333);
    const bottom = top + rowHeight;

    const path = (): void => {
      ctx.beginPath();
      if (up) {
        ctx.moveTo(base, bottom);
        ctx.lineTo(base + size, bottom);
        ctx.lineTo(base + size / 2, top);
      } else {
        ctx.moveTo(base, top);
        ctx.lineTo(base + size, top);
        ctx.lineTo(base + size / 2, bottom);
      }
      ctx.closePath();
    };

    if (!override) {
      ctx.save();
      ctx.globalAlpha *= 0.22 * dealt;
      ctx.strokeStyle = colour;
      ctx.lineWidth = 1;
      path();
      ctx.stroke();
      ctx.restore();
    }

    // The ribbon itself. `amount` sets how much of the lattice it occupies
    // and excitation widens it locally, so a finger drags the bands open.
    // `swell` raises the whole field slightly while the page is being
    // scrolled, which makes the ribbons thicken as you move.
    const cut = 0.74 - this.options.amount * 0.38 - excite * 0.3 - (swell - 0.35) * 0.06;
    if (wave < cut) return;

    ctx.save();
    ctx.globalAlpha *= dealt;
    ctx.fillStyle = colour;
    path();
    ctx.fill();
    ctx.restore();
  }

  // ── blocks ─────────────────────────────────────────────────────────────
  /**
   * Isometric cubes with striped faces — the op-art one.
   *
   * Three faces, each with its stripes running in a different direction, is
   * what makes the cube read as a solid rather than as a hexagon: the eye
   * takes the change of stripe angle as a change of plane. The stripe phase
   * scrolls with time, so the faces shimmer the way the printed version only
   * pretends to.
   *
   * Cubes rise and fall on the flow field, and cells the field leaves below
   * the threshold are simply absent — which is what gives the loose cluster
   * of the reference rather than a solid isometric floor.
   */
  private drawBlock(
    cell: Cell,
    x: number,
    y: number,
    wave: number,
    excite: number,
    dealt: number,
    swell: number,
    now: number,
    colour: string,
    accent: string,
    override: string | null,
  ): void {
    // Which cubes exist at all. Stable per cell — driven by the seed, not the
    // flow — because a cluster whose MEMBERSHIP flickered would read as a
    // rendering fault rather than as motion.
    if (cell.seed > 0.3 + this.options.amount * 0.62) return;

    const ctx = this.ctx;
    const halfW = this.cell;
    const halfH = this.cell * 0.5;

    // Height is the living part: the cluster undulates like a skyline.
    const target = (0.5 + wave * 0.55 * swell + excite * 0.7) * dealt;
    if (this.still) cell.amp = 0.8 * dealt;
    else [cell.amp, cell.ampV] = spring(cell.amp, cell.ampV, target, 0.09, 0.82);

    const height = Math.max(6, this.cell * 0.9 * cell.amp);
    const top = y - height / 2;
    const bottom = y + height / 2;

    // The six vertices a cube needs. Named for where they are, because the
    // face definitions below are unreadable otherwise.
    const backTop = [x, top - halfH];
    const rightTop = [x + halfW, top];
    const frontTop = [x, top + halfH];
    const leftTop = [x - halfW, top];
    const rightBottom = [x + halfW, bottom];
    const frontBottom = [x, bottom + halfH];
    const leftBottom = [x - halfW, bottom];

    const face = (points: number[][]): void => {
      ctx.beginPath();
      points.forEach((point, index) => {
        const px = point[0] ?? 0;
        const py = point[1] ?? 0;
        if (index === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
    };

    // The stripe pitch is set off the CUBE, not off the face's reach: a few
    // pixels, so the faces read as ruled rather than as banded. Coarse bands
    // are what makes this variant look like a mistake.
    const pitch = Math.max(3, this.cell * (0.26 - this.options.amount * 0.12));
    const phase = this.still ? 0 : (now / 900) % 1;
    const reach = (halfW + height) * 2.2;
    const steps = Math.ceil(reach / pitch) + 2;

    /** Stripe one face: clip to it, then rule lines across at `angle`. */
    const stripe = (points: number[][], angle: number, ink: string): void => {
      ctx.save();
      face(points);
      ctx.clip();
      ctx.fillStyle = this.colours.ground;
      ctx.fill();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillStyle = ink;
      for (let k = -steps; k <= steps; k += 1) {
        ctx.fillRect(-reach / 2, (k + phase) * pitch, reach, pitch * 0.5);
      }
      ctx.restore();
    };

    const lit = override ?? (excite > 0.3 && this.options.palette !== 'mono' ? accent : colour);

    // Top face reads lightest, the two sides darker — the stripe pitch does
    // the shading, so no second colour is needed.
    stripe([backTop, rightTop, frontTop, leftTop], Math.PI / 6, lit);
    stripe([leftTop, frontTop, frontBottom, leftBottom], -Math.PI / 3, lit);
    stripe([frontTop, rightTop, rightBottom, frontBottom], Math.PI / 3, lit);

    // The silhouette. Without it neighbouring cubes merge into one striped
    // blob at small sizes.
    if (!override) {
      ctx.save();
      ctx.strokeStyle = this.colours.ground;
      ctx.lineWidth = Math.max(1, this.cell * 0.03);
      ctx.lineJoin = 'round';
      face([backTop, rightTop, rightBottom, frontBottom, leftBottom, leftTop]);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(frontTop[0] ?? 0, frontTop[1] ?? 0);
      ctx.lineTo(frontBottom[0] ?? 0, frontBottom[1] ?? 0);
      ctx.moveTo(frontTop[0] ?? 0, frontTop[1] ?? 0);
      ctx.lineTo(leftTop[0] ?? 0, leftTop[1] ?? 0);
      ctx.moveTo(frontTop[0] ?? 0, frontTop[1] ?? 0);
      ctx.lineTo(rightTop[0] ?? 0, rightTop[1] ?? 0);
      ctx.stroke();
      ctx.restore();
    }
  }

  destroy(): void {
    this.life.destroy();
  }
}

/**
 * Which canvas is currently owned by which field.
 *
 * The registry exists so a field can be torn down by the element it draws on,
 * without whoever mounted it having to keep a reference. `PatternField.astro`
 * mounts fields from its own inline script and hands nothing back, so without
 * this there is no way to reclaim one.
 */
const mounted = new WeakMap<HTMLCanvasElement, PatternField>();

/**
 * Mount every pattern field under `root`. Safe to call more than once: a
 * canvas is marked as it is claimed, so a second call adopts only what is new.
 */
export function initPatternFields(root: ParentNode = document): PatternField[] {
  const canvases = Array.from(root.querySelectorAll<HTMLCanvasElement>('canvas[data-pattern]'));
  const fields: PatternField[] = [];

  canvases.forEach((canvas) => {
    if (canvas.dataset.patternReady === 'true') return;
    try {
      const field = new PatternField(canvas);
      mounted.set(canvas, field);
      fields.push(field);
      // The wrapper fades the canvas up over its CSS fallback only once a
      // field is genuinely running, so a browser with no 2d context keeps the
      // static texture instead of being handed a blank rectangle. [P3]
      canvas.dataset.patternReady = 'true';
    } catch {
      // A field is decoration. If it cannot start, the page is unharmed and
      // the CSS fallback stays where it is. [P1]
    }
  });

  return fields;
}

/**
 * Tear down every field under `root` and hand its canvas back unclaimed, so a
 * later `initPatternFields()` re-reads the options and rebuilds. Used by
 * anything that changes a field's `data-*` after mount, and by any future
 * client-side navigation, which would otherwise leave a loop running against
 * a canvas that is no longer in the document.
 */
export function destroyPatternFields(root: ParentNode = document): void {
  root.querySelectorAll<HTMLCanvasElement>('canvas[data-pattern]').forEach((canvas) => {
    mounted.get(canvas)?.destroy();
    mounted.delete(canvas);
    delete canvas.dataset.patternReady;
  });
}

export type { PatternField };
