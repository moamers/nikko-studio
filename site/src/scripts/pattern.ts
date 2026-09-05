/**
 * The pattern field — a generative, living tile grid drawn on a canvas.
 *
 * Two variants, both built from the same machinery:
 *
 *   `quarters`  quarter discs on a square grid. A texture. It sits behind
 *               type at low contrast and does quiet work.
 *   `najmeh`    the eight-point Levantine star and its cross, drawn as light
 *               coming through a solid screen. A subject, not a texture.
 *
 * WHY CANVAS AND NOT CSS OR SVG. A field this size is 400-1400 shapes, each
 * with its own spring. As DOM nodes that is 1400 elements the compositor has
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
 *                     rather than as a static image with a hover state.
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
export type PatternVariant = 'quarters' | 'najmeh';

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

/**
 * A cell is deliberately a plain object rather than a slot in a typed array.
 * At the sizes this field actually runs — capped below — the allocation is
 * paid once at build time and never again, and the readable version is the
 * one the next person can change. [P14]
 */
interface Cell {
  /** Centre, in CSS pixels. */
  x: number;
  y: number;
  /** Diagonal position 0-1, used by the deal-in stagger and the accent sweep. */
  diag: number;
  /** Which of the four quarter-turns this cell rests at. `quarters` only. */
  turn: number;
  /** Empty, quarter, facing pair, full round. `quarters` only. */
  kind: number;
  /** Stable per-cell random, so a cell keeps its colour across a re-roll. */
  seed: number;
  /** Animated angle and its velocity. */
  ang: number;
  angV: number;
  /** Animated scale, or aperture for `najmeh`, and its velocity. */
  amp: number;
  ampV: number;
  /** The ripple that last touched this cell, so one wave re-rolls it once. */
  ripple: number;
}

interface Options {
  variant: PatternVariant;
  palette: PatternPalette;
  tone: PatternTone;
  /** Cell size in CSS pixels before the cap is applied. */
  density: number;
  /** `quarters`: how broken up the field is. `najmeh`: the resting aperture. */
  amount: number;
}

interface Palette {
  quiet: string;
  ground: string;
  accent: string;
  trio: readonly string[];
  misreg: string;
}

const DEFAULTS: Options = {
  variant: 'quarters',
  palette: 'accent',
  tone: 'paper',
  density: 44,
  amount: 0.42,
};

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
 */
function flow(x: number, y: number, t: number): number {
  const a = Math.sin((x * 0.9 + y * 0.62) / 120 + t * 0.9);
  const b = Math.sin((y * 1.1 - x * 0.48) / 88 - t * 0.62);
  return (a * 0.5 + b * 0.5 + 1) / 2;
}

/** An eight-point star, or a four-point cross when `points` is 4. */
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

/** Read the options a component wrote onto the canvas as `data-*`. */
function readOptions(canvas: HTMLCanvasElement): Options {
  const data = canvas.dataset;
  const number = (raw: string | undefined, fallback: number): number => {
    const value = Number.parseFloat(raw ?? '');
    return Number.isFinite(value) ? value : fallback;
  };
  return {
    variant: data.patternVariant === 'najmeh' ? 'najmeh' : 'quarters',
    palette:
      data.patternPalette === 'trio' || data.patternPalette === 'mono'
        ? data.patternPalette
        : 'accent',
    tone: data.patternTone === 'ink' ? 'ink' : 'paper',
    density: number(data.patternDensity, DEFAULTS.density),
    amount: number(data.patternAmount, DEFAULTS.amount),
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

  /** 0 until the field has been seen, then springs to 1. Layer 4. */
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
   * `--nk-pattern-max-cells` shapes, because a 4K viewport at a small pitch
   * would otherwise ask for tens of thousands.
   */
  private build(): void {
    const max = readNumber('--nk-pattern-max-cells', 1500);
    const najmeh = this.options.variant === 'najmeh';

    let size = Math.max(12, this.options.density);
    let columns = Math.max(2, Math.ceil(this.width / size) + (najmeh ? 1 : 0));
    let rows = Math.max(2, Math.ceil(this.height / size) + (najmeh ? 1 : 0));

    if (columns * rows > max) {
      size = Math.sqrt((this.width * this.height) / max);
      columns = Math.max(2, Math.ceil(this.width / size) + (najmeh ? 1 : 0));
      rows = Math.max(2, Math.ceil(this.height / size) + (najmeh ? 1 : 0));
    }

    this.cell = size;

    // The star lattice is centred so the arch never cuts a star in half at
    // the crown. The quarter grid is corner-anchored, because a cut quarter
    // disc at the edge is exactly what the reference does.
    this.originX = najmeh ? (this.width - (columns - 1) * size) / 2 : size / 2;
    this.originY = najmeh ? (this.height - (rows - 1) * size) / 2 : size / 2;

    const span = Math.max(1, columns + rows - 2);
    this.cells = [];

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const cell: Cell = {
          x: this.originX + column * size,
          y: this.originY + row * size,
          diag: (column + row) / span,
          turn: 0,
          kind: 1,
          seed: Math.random(),
          ang: 0,
          angV: 0,
          amp: najmeh ? this.options.amount : 1,
          ampV: 0,
          ripple: -1,
        };
        this.roll(cell);
        cell.ang = (cell.turn * Math.PI) / 2;
        this.cells.push(cell);
      }
    }
  }

  /** Give a cell a fresh shape and quarter-turn. `quarters` only. */
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
      if (this.options.variant === 'quarters') {
        this.cells.forEach((cell) => {
          this.roll(cell);
          cell.ang = (cell.turn * Math.PI) / 2;
        });
      }
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
   */
  private paint(
    now: number,
    sweep: number,
    offsetX: number,
    offsetY: number,
    override: string | null,
  ): void {
    const ctx = this.ctx;
    const size = this.cell;
    const half = size / 2;
    const najmeh = this.options.variant === 'najmeh';

    const focus = this.focus(now);
    const reach = Math.max(najmeh ? 120 : 96, Math.min(this.width, this.height) * 0.4);
    const flowT = this.still ? 0 : now / 1000;
    const drift = this.still ? 0 : now / 9000;

    // Layer 1's amplitude rises with layer 3: a still page breathes, a page
    // being scrolled surges.
    const swell = 0.35 + this.energy * 0.65;

    let rippleRadius = -1;
    const band = size * (najmeh ? 2.6 : 2.2);
    if (this.ripple) {
      rippleRadius = (now - this.ripple.at) * (najmeh ? 0.72 : 0.9);
      if (rippleRadius > Math.hypot(this.width, this.height) + band) this.ripple = null;
    }

    // Layer 3 again, as displacement rather than energy: the whole field
    // slides a few pixels against the page, which is what sells it as depth.
    const parallax = this.still ? 0 : Math.sin(window.scrollY / 220) * 3;

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
          if (najmeh) excite = Math.max(excite, crest * 0.95);
          else {
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

      if (najmeh) {
        const rest = this.options.amount + (wave - 0.5) * 0.3 * swell;
        const target = Math.max(0, Math.min(1, rest + excite * (1 - this.options.amount * 0.55)));
        if (this.still) cell.amp = target;
        else {
          const [amp, ampV] = spring(cell.amp, cell.ampV, target, 0.1, 0.8);
          cell.amp = amp;
          cell.ampV = ampV;
        }

        // At full aperture the outer radius reaches half a cell, which is the
        // point where four neighbouring stars just touch — the moment a real
        // screen is open.
        const outer = half * (0.46 + 0.52 * cell.amp) * dealt;
        const inner = outer * 0.58; // the najmeh's proportion: fat points, not spikes
        const rotation = drift + cell.amp * (Math.PI / 4);

        ctx.save();
        ctx.translate(x, y);

        if (cell.amp > this.options.amount + 0.14) {
          ctx.save();
          ctx.globalAlpha *= (cell.amp - this.options.amount) * 0.15;
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

        // The cross that fills the space between four stars — the other half
        // of a star-and-cross tessellation, and the reason the field reads as
        // one pattern rather than a grid of separate motifs.
        ctx.save();
        ctx.translate(x + half, y + half);
        ctx.fillStyle = colour;
        starPath(
          ctx,
          size * 0.21 * (0.45 + cell.amp) * dealt,
          size * 0.09 * (0.45 + cell.amp) * dealt,
          4,
          Math.PI / 4 - rotation,
        );
        ctx.fill();
        ctx.restore();
        continue;
      }

      // ── quarters ──────────────────────────────────────────────────────
      // The split-flap. A cell turns over on its own now and then, more often
      // the more the page is being scrolled, which is what keeps a texture
      // from reading as wallpaper.
      if (!this.still && Math.random() < 0.0004 + this.energy * 0.0035) {
        cell.turn += 1;
      }

      const targetAngle =
        (cell.turn * Math.PI) / 2 + excite * (Math.PI / 2) + (wave - 0.5) * 0.34 * swell;
      const targetScale = (1 + excite * 0.17 + pop + (wave - 0.5) * 0.06 * swell) * dealt;

      if (this.still) {
        cell.ang = (cell.turn * Math.PI) / 2;
        cell.amp = 1;
      } else {
        const [ang, angV] = spring(cell.ang, cell.angV, targetAngle, 0.12, 0.78);
        cell.ang = ang;
        cell.angV = angV;
        const [amp, ampV] = spring(cell.amp, cell.ampV, targetScale, 0.16, 0.72);
        cell.amp = amp;
        cell.ampV = ampV;
      }

      if (cell.kind === 0) continue;

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
        ctx.fillStyle = this.colours.accent;
        ctx.fill();
        ctx.restore();
      }
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
