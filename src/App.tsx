import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Crown,
  Sparkles,
  Shield,
  Gem,
  Flame,
  Sun,
  Swords,
  Cpu,
  Users,
  RotateCcw,
  Settings,
  Lightbulb,
  Play,
  Trophy,
  ChevronRight,
  CheckCircle2,
  Info,
  Volume2,
  VolumeX,
  CornerDownRight,
  SkipForward,
  Layers,
  Home,
  Zap,
  Brain,
  Skull,
  X
} from 'lucide-react';

// ==========================================
// 1. TYPES & INTERFACES
// ==========================================

type PlayerId = 1 | 2;
type GameMode = 'pvp' | 'ai';
type AIDifficulty = 'easy' | 'medium' | 'hard';
type DiagonalRule = 'alquerque' | 'full';
type IconName = 'gem' | 'crown' | 'shield' | 'flame' | 'sun' | 'sparkles';
type BoardThemeId = 'teak' | 'jade' | 'midnight' | 'terracotta';

interface Coord {
  r: number;
  c: number;
}

interface PlayerCustomization {
  name: string;
  colorId: string;
  icon: IconName;
}

interface GameConfig {
  rows: number;
  cols: number;
  beadsPerPlayer: number;
  mode: GameMode;
  difficulty: AIDifficulty;
  diagonalRule: DiagonalRule;
  theme: BoardThemeId;
  p1: PlayerCustomization;
  p2: PlayerCustomization;
}

interface SingleStepMove {
  from: Coord;
  to: Coord;
  isJump: boolean;
  captured?: Coord;
}

interface TurnActionSequence {
  steps: SingleStepMove[];
  totalCaptured: Coord[];
}

interface MoveHistoryEntry {
  turnNumber: number;
  player: PlayerId;
  steps: SingleStepMove[];
  capturedCount: number;
  boardSnapshot: (PlayerId | 0)[][];
}

// ==========================================
// 2. AESTHETIC PRESETS & THEMES
// ==========================================

const BEAD_COLORS: Record<
  string,
  {
    name: string;
    bgGrad: string;
    text: string;
    accentHex: string;
    ringHex: string;
  }
> = {
  ruby: {
    name: 'Crimson Ruby',
    bgGrad: 'from-rose-500 via-red-600 to-rose-900',
    text: 'text-rose-100',
    accentHex: '#f43f5e',
    ringHex: '#fda4af',
  },
  emerald: {
    name: 'Imperial Jade',
    bgGrad: 'from-emerald-400 via-emerald-600 to-teal-900',
    text: 'text-emerald-50',
    accentHex: '#10b981',
    ringHex: '#6ee7b7',
  },
  gold: {
    name: 'Sovereign Gold',
    bgGrad: 'from-amber-300 via-amber-500 to-yellow-800',
    text: 'text-amber-950',
    accentHex: '#f59e0b',
    ringHex: '#fde68a',
  },
  sapphire: {
    name: 'Royal Sapphire',
    bgGrad: 'from-sky-400 via-blue-600 to-indigo-950',
    text: 'text-sky-100',
    accentHex: '#3b82f6',
    ringHex: '#93c5fd',
  },
  obsidian: {
    name: 'Shadow Obsidian',
    bgGrad: 'from-zinc-600 via-zinc-800 to-black',
    text: 'text-zinc-100',
    accentHex: '#71717a',
    ringHex: '#d4d4d8',
  },
  pearl: {
    name: 'Celestial Pearl',
    bgGrad: 'from-white via-slate-100 to-slate-400',
    text: 'text-slate-800',
    accentHex: '#e2e8f0',
    ringHex: '#ffffff',
  },
};

const BOARD_THEMES: Record<
  BoardThemeId,
  {
    name: string;
    boardBg: string;
    boardBorder: string;
    lineStroke: string;
    centerLineStroke: string;
    nodeFill: string;
    nodeStroke: string;
    outerShellBg: string;
  }
> = {
  teak: {
    name: 'Royal Teak Wood',
    boardBg: 'bg-gradient-to-br from-[#3d2314] via-[#2b170c] to-[#1c0e07]',
    boardBorder: 'border-[#7c4d2b]',
    lineStroke: '#a47148',
    centerLineStroke: '#d4a373',
    nodeFill: '#26140a',
    nodeStroke: '#b07d52',
    outerShellBg: 'bg-[#120b07]',
  },
  jade: {
    name: 'Imperial Jade Marble',
    boardBg: 'bg-gradient-to-br from-[#0e362d] via-[#07241e] to-[#031411]',
    boardBorder: 'border-[#2d6a5b]',
    lineStroke: '#529482',
    centerLineStroke: '#eab308',
    nodeFill: '#06211b',
    nodeStroke: '#6eb5a2',
    outerShellBg: 'bg-[#04100d]',
  },
  midnight: {
    name: 'Midnight Obsidian Slate',
    boardBg: 'bg-gradient-to-br from-slate-900 via-slate-950 to-zinc-950',
    boardBorder: 'border-slate-700',
    lineStroke: '#475569',
    centerLineStroke: '#38bdf8',
    nodeFill: '#0f172a',
    nodeStroke: '#64748b',
    outerShellBg: 'bg-slate-950',
  },
  terracotta: {
    name: 'Ancient Terracotta',
    boardBg: 'bg-gradient-to-br from-[#6e2c1b] via-[#521e11] to-[#361108]',
    boardBorder: 'border-[#b85a3a]',
    lineStroke: '#d9825b',
    centerLineStroke: '#fcd34d',
    nodeFill: '#3b150b',
    nodeStroke: '#e69975',
    outerShellBg: 'bg-[#1f0a05]',
  },
};

const QUICK_PRESETS: {
  label: string;
  rows: number;
  cols: number;
  beads: number;
  diagonalRule: DiagonalRule;
}[] = [
  {
    label: '3x3 (3 Beads)',
    rows: 3,
    cols: 3,
    beads: 3,
    diagonalRule: 'alquerque',
  },
  {
    label: '5x5 (10 Beads)',
    rows: 5,
    cols: 5,
    beads: 10,
    diagonalRule: 'alquerque',
  },
  {
    label: '5x5 (12 Beads)',
    rows: 5,
    cols: 5,
    beads: 12,
    diagonalRule: 'alquerque',
  },
];

// ==========================================
// 3. SOUND SYNTHESIZER (WEB AUDIO API)
// ==========================================

class SoundEngine {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
  }

  public playButtonClick() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(640, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.045);
      gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.045);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch (error) {
      console.warn('Unable to play button sound', error);
    }
  }

  public playSelect() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(680, this.ctx.currentTime + 0.065);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.065);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.07);
    } catch (error) {
      console.warn('Unable to play selection sound', error);
    }
  }

  public playMove() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(190, this.ctx.currentTime + 0.09);
      gain.gain.setValueAtTime(0.14, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.09);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.095);
    } catch (error) {
      console.warn('Unable to play move sound', error);
    }
  }

  public playCapture() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(380, now);
      osc.frequency.exponentialRampToValueAtTime(760, now + 0.14);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.16);
    } catch (error) {
      console.warn('Unable to play capture sound', error);
    }
  }

  public playWin() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const now = this.ctx.currentTime + idx * 0.09;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
      });
    } catch (error) {
      console.warn('Unable to play victory sound', error);
    }
  }
}

const soundFX = new SoundEngine();

// ==========================================
// 4. GRAPH GEOMETRY & GAME ENGINE
// ==========================================

const DIRECTIONS: [number, number][] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];

function isInsideBoard(r: number, c: number, rows: number, cols: number): boolean {
  return r >= 0 && r < rows && c >= 0 && c < cols;
}

/**
 * Determines if two adjacent coordinates are connected on the Sholo Guti / Alquerque graph.
 */
function areNodesConnected(
  r1: number,
  c1: number,
  r2: number,
  c2: number,
  rows: number,
  cols: number,
  diagonalRule: DiagonalRule
): boolean {
  if (!isInsideBoard(r1, c1, rows, cols) || !isInsideBoard(r2, c2, rows, cols)) {
    return false;
  }
  const dr = Math.abs(r1 - r2);
  const dc = Math.abs(c1 - c2);
  if (dr === 0 && dc === 0) return false;
  if (dr > 1 || dc > 1) return false;

  // Orthogonal connections are always valid
  if (dr + dc === 1) return true;

  // Diagonal connection check
  if (diagonalRule === 'full') return true;

  // Traditional Alquerque / Sholo Guti alternating parity diagonals:
  // A diagonal exists between (r1, c1) and (r2, c2) when at least one endpoint has (r + c) even.
  return (r1 + c1) % 2 === 0 || (r2 + c2) % 2 === 0;
}

/**
 * Computes maximum beads per player for an R x C board while guaranteeing empty middle space.
 */
function getMaxBeadsForBoard(rows: number, cols: number): number {
  const totalNodes = rows * cols;
  if (rows % 2 === 1) {
    const halfRows = Math.floor(rows / 2);
    const leaveOnlyCenterEmpty = Math.floor((totalNodes - 1) / 2);
    // Allow up to traditional Alquerque capacity (leaving at least the center node empty)
    return Math.max(3, leaveOnlyCenterEmpty > halfRows * cols ? leaveOnlyCenterEmpty : halfRows * cols);
  } else {
    // For even rows, leave at least 2 central nodes or 1 row empty
    const maxByRows = Math.max(1, rows / 2 - 1) * cols;
    const maxByNodes = Math.floor((totalNodes - 2) / 2);
    return Math.max(3, Math.max(maxByRows, maxByNodes));
  }
}

/**
 * Creates the starting board with Player 2 on top rows and Player 1 on bottom rows,
 * leaving the middle area empty for initial tactical maneuvering.
 */
function createInitialBoard(
  rows: number,
  cols: number,
  beadsPerPlayer: number
): (PlayerId | 0)[][] {
  const board: (PlayerId | 0)[][] = Array.from({ length: rows }, () =>
    Array(cols).fill(0)
  );

  const safeBeads = Math.max(
    1,
    Math.min(beadsPerPlayer, Math.floor((rows * cols - 1) / 2))
  );

  // Place Player 2 (Top side) from top-most row downwards
  let placedP2 = 0;
  for (let r = 0; r < rows && placedP2 < safeBeads; r++) {
    for (let c = 0; c < cols && placedP2 < safeBeads; c++) {
      board[r][c] = 2;
      placedP2++;
    }
  }

  // Place Player 1 (Bottom side) from bottom-most row upwards
  let placedP1 = 0;
  for (let r = rows - 1; r >= 0 && placedP1 < safeBeads; r--) {
    for (let c = cols - 1; c >= 0 && placedP1 < safeBeads; c--) {
      if (board[r][c] === 0) {
        board[r][c] = 1;
        placedP1++;
      }
    }
  }

  return board;
}

function cloneBoard(board: (PlayerId | 0)[][]): (PlayerId | 0)[][] {
  return board.map((row) => [...row]);
}

/**
 * Returns all valid single-step moves (adjacent steps and capture jumps) for a specific bead.
 */
function getValidMovesForBead(
  board: (PlayerId | 0)[][],
  r: number,
  c: number,
  player: PlayerId,
  rows: number,
  cols: number,
  diagonalRule: DiagonalRule,
  onlyJumps: boolean = false
): SingleStepMove[] {
  const moves: SingleStepMove[] = [];
  if (!board[r] || board[r][c] !== player) return moves;

  const opponent: PlayerId = player === 1 ? 2 : 1;

  for (const [dr, dc] of DIRECTIONS) {
    const adjR = r + dr;
    const adjC = c + dc;

    if (!areNodesConnected(r, c, adjR, adjC, rows, cols, diagonalRule)) {
      continue;
    }

    const adjCell = board[adjR]?.[adjC];

    // 1. Normal adjacent move
    if (!onlyJumps && adjCell === 0) {
      moves.push({
        from: { r, c },
        to: { r: adjR, c: adjC },
        isJump: false,
      });
    }

    // 2. Capture jump over opponent bead along the same straight directional line
    if (adjCell === opponent) {
      const landR = r + dr * 2;
      const landC = c + dc * 2;
      if (
        areNodesConnected(adjR, adjC, landR, landC, rows, cols, diagonalRule) &&
        board[landR]?.[landC] === 0
      ) {
        moves.push({
          from: { r, c },
          to: { r: landR, c: landC },
          isJump: true,
          captured: { r: adjR, c: adjC },
        });
      }
    }
  }

  return moves;
}

/**
 * Applies a single step or jump to a cloned board and returns the new board.
 */
function applyStepMove(
  board: (PlayerId | 0)[][],
  move: SingleStepMove
): (PlayerId | 0)[][] {
  const next = cloneBoard(board);
  const piece = next[move.from.r][move.from.c];
  next[move.from.r][move.from.c] = 0;
  next[move.to.r][move.to.c] = piece;
  if (move.isJump && move.captured) {
    next[move.captured.r][move.captured.c] = 0;
  }
  return next;
}

/**
 * Generates all legal turn sequences (including multi-jump capture chains) for `player`.
 * Ordered by capture count descending for optimal Alpha-Beta pruning.
 */
function generateAllTurnSequences(
  board: (PlayerId | 0)[][],
  player: PlayerId,
  rows: number,
  cols: number,
  diagonalRule: DiagonalRule
): TurnActionSequence[] {
  const sequences: TurnActionSequence[] = [];

  const expandJumpChains = (
    currBoard: (PlayerId | 0)[][],
    currR: number,
    currC: number,
    stepsSoFar: SingleStepMove[],
    capturedSoFar: Coord[]
  ) => {
    const nextJumps = getValidMovesForBead(
      currBoard,
      currR,
      currC,
      player,
      rows,
      cols,
      diagonalRule,
      true
    );

    if (nextJumps.length === 0) {
      sequences.push({
        steps: stepsSoFar,
        totalCaptured: capturedSoFar,
      });
      return;
    }

    for (const jump of nextJumps) {
      const nextBoard = applyStepMove(currBoard, jump);
      expandJumpChains(
        nextBoard,
        jump.to.r,
        jump.to.c,
        [...stepsSoFar, jump],
        jump.captured ? [...capturedSoFar, jump.captured] : capturedSoFar
      );
    }
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r]?.[c] !== player) continue;
      const initialMoves = getValidMovesForBead(
        board,
        r,
        c,
        player,
        rows,
        cols,
        diagonalRule,
        false
      );

      for (const move of initialMoves) {
        if (move.isJump && move.captured) {
          const afterFirstJump = applyStepMove(board, move);
          expandJumpChains(
            afterFirstJump,
            move.to.r,
            move.to.c,
            [move],
            [move.captured]
          );
        } else {
          sequences.push({
            steps: [move],
            totalCaptured: [],
          });
        }
      }
    }
  }

  sequences.sort((a, b) => b.totalCaptured.length - a.totalCaptured.length);
  return sequences;
}

// ==========================================
// 5. MULTI-TIER AI ENGINE (EASY / MEDIUM / HARD)
// ==========================================

/**
 * Dynamic Heuristic Evaluation Function for any R x C graph.
 * Returns score from perspective of `maximizingPlayer`.
 * Weighs:
 * 1. Material Count & Ratio (dominant factor)
 * 2. Safe / Protected Beads (on perimeter or backed by friendly pieces)
 * 3. Center Control & Graph Connectivity (nodes with 8 connections vs 4 connections)
 * 4. Immediate Capture Threats & Mobility
 */
function evaluateBoardState(
  board: (PlayerId | 0)[][],
  maximizingPlayer: PlayerId,
  rows: number,
  cols: number,
  diagonalRule: DiagonalRule,
  difficulty: AIDifficulty = 'hard'
): number {
  let maxBeads = 0;
  let minBeads = 0;
  let maxPositional = 0;
  let minPositional = 0;
  let maxMobility = 0;
  let minMobility = 0;
  let maxJumpThreats = 0;
  let minJumpThreats = 0;

  const centerR = (rows - 1) / 2;
  const centerC = (cols - 1) / 2;
  const maxDist = Math.max(1, centerR + centerC);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = board[r][c];
      if (cell === 0) continue;

      // Center proximity bonus
      const distFromCenter = Math.abs(r - centerR) + Math.abs(c - centerC);
      const centerBonus = ((maxDist - distFromCenter) / maxDist) * 14;

      // Edge / Perimeter safety bonus (cannot be jumped over from outside the board)
      const isEdge = r === 0 || r === rows - 1 || c === 0 || c === cols - 1;
      const safetyBonus = isEdge ? 18 : 0;

      // High-connectivity hub bonus (nodes with diagonals have 8 directions instead of 4)
      const isHubNode =
        diagonalRule === 'full' ||
        areNodesConnected(r, c, r + 1, c + 1, rows, cols, diagonalRule) ||
        areNodesConnected(r, c, r - 1, c - 1, rows, cols, diagonalRule);
      const hubBonus = isHubNode ? 10 : 0;

      // Check local mobility and immediate jump opportunities
      const moves = getValidMovesForBead(board, r, c, cell, rows, cols, diagonalRule, false);
      let jumpCount = 0;
      for (const m of moves) {
        if (m.isJump) jumpCount++;
      }

      if (cell === maximizingPlayer) {
        maxBeads++;
        maxPositional += centerBonus + safetyBonus + hubBonus;
        maxMobility += moves.length * 6;
        maxJumpThreats += jumpCount * 45;
      } else {
        minBeads++;
        minPositional += centerBonus + safetyBonus + hubBonus;
        minMobility += moves.length * 6;
        minJumpThreats += jumpCount * 45;
      }
    }
  }

  // Terminal checks
  if (minBeads === 0 || minMobility === 0) return 99999;
  if (maxBeads === 0 || maxMobility === 0) return -99999;

  const materialDiff = (maxBeads - minBeads) * 320;

  // Easy AI only looks at basic material count and small random positional feel
  if (difficulty === 'easy') {
    return materialDiff + (maxMobility - minMobility) * 0.25;
  }

  // Medium AI weighs material + basic capture threats + light centrality
  if (difficulty === 'medium') {
    return (
      materialDiff +
      (maxPositional - minPositional) * 0.5 +
      (maxJumpThreats - minJumpThreats) * 0.65
    );
  }

  // Hard AI weighs material, non-linear trade-down bonus, perimeter safety, hub control, and mobility traps
  const ratioBonus =
    maxBeads !== minBeads
      ? ((maxBeads - minBeads) / (maxBeads + minBeads)) * 250
      : 0;

  return (
    materialDiff +
    ratioBonus +
    (maxPositional - minPositional) +
    (maxMobility - minMobility) +
    (maxJumpThreats - minJumpThreats)
  );
}

/**
 * Applies a full TurnActionSequence to a board.
 */
function applyTurnSequence(
  board: (PlayerId | 0)[][],
  seq: TurnActionSequence
): (PlayerId | 0)[][] {
  let current = board;
  for (const step of seq.steps) {
    current = applyStepMove(current, step);
  }
  return current;
}

/**
 * Executes AI search tailored to the selected difficulty ('easy' | 'medium' | 'hard').
 */
function computeBestAIMove(
  board: (PlayerId | 0)[][],
  aiPlayer: PlayerId,
  rows: number,
  cols: number,
  diagonalRule: DiagonalRule,
  difficulty: AIDifficulty = 'hard'
): { bestSequence: TurnActionSequence | null; evalScore: number } {
  const humanPlayer: PlayerId = aiPlayer === 1 ? 2 : 1;

  const rootMoves = generateAllTurnSequences(board, aiPlayer, rows, cols, diagonalRule);
  if (rootMoves.length === 0) {
    return {
      bestSequence: null,
      evalScore: -9999,
    };
  }

  // Determine search depth based on difficulty
  const totalNodes = rows * cols;
  const targetDepth =
    difficulty === 'easy'
      ? 1
      : difficulty === 'medium'
      ? 3
      : totalNodes <= 16 && rootMoves.length <= 18
      ? 6
      : totalNodes >= 49 || rootMoves.length > 38
      ? 4
      : 5;

  const minimax = (
    currBoard: (PlayerId | 0)[][],
    depth: number,
    alpha: number,
    beta: number,
    isMaximizing: boolean
  ): number => {
    if (depth === 0) {
      return evaluateBoardState(currBoard, aiPlayer, rows, cols, diagonalRule, difficulty);
    }

    const activePlayer = isMaximizing ? aiPlayer : humanPlayer;
    const legalSequences = generateAllTurnSequences(
      currBoard,
      activePlayer,
      rows,
      cols,
      diagonalRule
    );

    if (legalSequences.length === 0) {
      return isMaximizing ? -90000 - depth * 100 : 90000 + depth * 100;
    }

    const maxBranches = difficulty === 'hard' ? (depth <= 2 ? 18 : 28) : 16;
    const branches =
      legalSequences.length > maxBranches
        ? legalSequences.slice(0, maxBranches)
        : legalSequences;

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const seq of branches) {
        const nextBoard = applyTurnSequence(currBoard, seq);
        const evaluation = minimax(nextBoard, depth - 1, alpha, beta, false);
        if (evaluation > maxEval) maxEval = evaluation;
        if (evaluation > alpha) alpha = evaluation;
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const seq of branches) {
        const nextBoard = applyTurnSequence(currBoard, seq);
        const evaluation = minimax(nextBoard, depth - 1, alpha, beta, true);
        if (evaluation < minEval) minEval = evaluation;
        if (evaluation < beta) beta = evaluation;
        if (beta <= alpha) break;
      }
      return minEval;
    }
  };

  let bestSequence = rootMoves[0];
  let bestScore = -Infinity;
  let alpha = -Infinity;
  const beta = Infinity;

  // Noise factor makes Easy forgiving and Medium occasionally human-like, while Hard is razor-sharp
  const jitterMagnitude =
    difficulty === 'easy' ? 290 : difficulty === 'medium' ? 45 : 3;

  for (const seq of rootMoves) {
    const nextBoard = applyTurnSequence(board, seq);
    const jitter = (Math.random() - 0.5) * jitterMagnitude;
    const score = minimax(nextBoard, targetDepth - 1, alpha, beta, false) + jitter;

    if (score > bestScore) {
      bestScore = score;
      bestSequence = seq;
    }
    if (difficulty === 'hard' && score > alpha) {
      alpha = score;
    }
  }

  // In Easy mode, 30% chance to pick a random safe non-blunder move so beginners can build combos
  if (difficulty === 'easy' && rootMoves.length > 1 && Math.random() < 0.3) {
    const poolSize = Math.min(rootMoves.length, 4);
    bestSequence = rootMoves[Math.floor(Math.random() * poolSize)];
  }

  const trueEval = Math.round(
    evaluateBoardState(
      applyTurnSequence(board, bestSequence),
      aiPlayer,
      rows,
      cols,
      diagonalRule,
      'hard'
    )
  );

  return {
    bestSequence,
    evalScore: trueEval,
  };
}

function formatCoord(coord: Coord): string {
  const colLetter = String.fromCharCode(65 + coord.c);
  return `${colLetter}${coord.r + 1}`;
}

// ==========================================
// 6. HELPER UI COMPONENTS
// ==========================================

const BeadIcon: React.FC<{ icon: IconName; className?: string }> = ({
  icon,
  className = 'w-4 h-4',
}) => {
  switch (icon) {
    case 'crown':
      return <Crown className={className} />;
    case 'shield':
      return <Shield className={className} />;
    case 'flame':
      return <Flame className={className} />;
    case 'sun':
      return <Sun className={className} />;
    case 'sparkles':
      return <Sparkles className={className} />;
    case 'gem':
    default:
      return <Gem className={className} />;
  }
};

/**
 * Renders a mini live SVG preview of the configured board in the Setup Modal.
 */
const LiveBoardPreview: React.FC<{ config: GameConfig }> = ({ config }) => {
  const { rows, cols, beadsPerPlayer, diagonalRule, theme, p1, p2 } = config;
  const safeBeads = Math.max(
    1,
    Math.min(beadsPerPlayer, getMaxBeadsForBoard(rows, cols), Math.floor((rows * cols - 1) / 2))
  );
  const previewBoard = useMemo(
    () => createInitialBoard(rows, cols, safeBeads),
    [rows, cols, safeBeads]
  );
  const themeStyle = BOARD_THEMES[theme];
  const p1Style = BEAD_COLORS[p1.colorId];
  const p2Style = BEAD_COLORS[p2.colorId];

  const pad = 28;
  const width = 280;
  const height = 280;
  const stepX = cols > 1 ? (width - pad * 2) / (cols - 1) : 0;
  const stepY = rows > 1 ? (height - pad * 2) / (rows - 1) : 0;

  const getXY = (r: number, c: number) => ({
    x: pad + c * stepX,
    y: pad + r * stepY,
  });

  // Collect edges
  const edges: { x1: number; y1: number; x2: number; y2: number; isDiag: boolean }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const neighbors: [number, number][] = [
        [r, c + 1],
        [r + 1, c],
        [r + 1, c + 1],
        [r + 1, c - 1],
      ];
      for (const [nr, nc] of neighbors) {
        if (areNodesConnected(r, c, nr, nc, rows, cols, diagonalRule)) {
          const pA = getXY(r, c);
          const pB = getXY(nr, nc);
          edges.push({
            x1: pA.x,
            y1: pA.y,
            x2: pB.x,
            y2: pB.y,
            isDiag: r !== nr && c !== nc,
          });
        }
      }
    }
  }

  const beadRadius = Math.max(6, Math.min(13, Math.min(stepX, stepY) * 0.34));

  return (
    <div
      className={`relative rounded-2xl border-2 ${themeStyle.boardBorder} ${themeStyle.boardBg} p-3 shadow-2xl flex flex-col items-center justify-center`}
    >
      <div className="flex items-center justify-between w-full mb-1.5 px-1 text-xs text-slate-300/90 font-medium">
        <span>
          {rows}×{cols} Grid ({rows * cols} nodes)
        </span>
        <span>
          {rows * cols - safeBeads * 2} empty center nodes
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-[250px] h-auto">
        {edges.map((e, i) => (
          <line
            key={i}
            x1={e.x1}
            y1={e.y1}
            x2={e.x2}
            y2={e.y2}
            stroke={e.isDiag ? themeStyle.centerLineStroke : themeStyle.lineStroke}
            strokeWidth={e.isDiag ? 1.5 : 2}
            strokeOpacity={e.isDiag ? 0.65 : 0.85}
          />
        ))}
        {previewBoard.map((row, r) =>
          row.map((cell, c) => {
            const { x, y } = getXY(r, c);
            return (
              <g key={`${r}-${c}`}>
                <circle
                  cx={x}
                  cy={y}
                  r={beadRadius * 0.45}
                  fill={themeStyle.nodeFill}
                  stroke={themeStyle.nodeStroke}
                  strokeWidth={1.5}
                />
                {cell !== 0 && (
                  <circle
                    cx={x}
                    cy={y}
                    r={beadRadius}
                    fill={cell === 1 ? p1Style.accentHex : p2Style.accentHex}
                    stroke={cell === 1 ? p1Style.ringHex : p2Style.ringHex}
                    strokeWidth={2}
                  />
                )}
              </g>
            );
          })
        )}
      </svg>
    </div>
  );
};

// ==========================================
// 7. MAIN APPLICATION COMPONENT
// ==========================================

const DIFFICULTY_META: Record<
  AIDifficulty,
  {
    label: string;
    colorClass: string;
    borderClass: string;
  }
> = {
  easy: {
    label: 'Easy',
    colorClass: 'text-emerald-300',
    borderClass: 'border-emerald-400/60',
  },
  medium: {
    label: 'Medium',
    colorClass: 'text-sky-300',
    borderClass: 'border-sky-400/60',
  },
  hard: {
    label: 'Hard',
    colorClass: 'text-rose-300',
    borderClass: 'border-rose-400/60',
  },
};

export function App() {
  // ---- Navigation Screen State: 'home' vs 'game' ----
  const [activeScreen, setActiveScreen] = useState<'home' | 'game'>('home');
  const [showDifficultyPickerOnHome, setShowDifficultyPickerOnHome] = useState<boolean>(false);

  // ---- Draft Setup Configuration State (Modified in Settings Modal on Home Screen) ----
  const [config, setConfig] = useState<GameConfig>({
    rows: 5,
    cols: 5,
    beadsPerPlayer: 10,
    mode: 'ai',
    difficulty: 'hard',
    diagonalRule: 'alquerque',
    theme: 'teak',
    p1: {
      name: 'Player 1',
      colorId: 'ruby',
      icon: 'crown',
    },
    p2: {
      name: 'Grandmaster AI',
      colorId: 'gold',
      icon: 'gem',
    },
  });

  // ---- Active Match Configuration State (Locked during gameplay) ----
  const [matchConfig, setMatchConfig] = useState<GameConfig>(() => ({
    rows: 5,
    cols: 5,
    beadsPerPlayer: 10,
    mode: 'ai',
    difficulty: 'hard',
    diagonalRule: 'alquerque',
    theme: 'teak',
    p1: {
      name: 'Player 1',
      colorId: 'ruby',
      icon: 'crown',
    },
    p2: {
      name: 'Grandmaster AI',
      colorId: 'gold',
      icon: 'gem',
    },
  }));

  // ---- Modal & Audio States ----
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // ---- Active Match State ----
  const [board, setBoard] = useState<(PlayerId | 0)[][]>(() =>
    createInitialBoard(5, 5, 10)
  );
  const [currentTurn, setCurrentTurn] = useState<PlayerId>(1);
  const [selectedNode, setSelectedNode] = useState<Coord | null>(null);
  const [chainLockNode, setChainLockNode] = useState<Coord | null>(null);
  const [currentChainSteps, setCurrentChainSteps] = useState<SingleStepMove[]>([]);

  // ---- History, Hint & AI Evaluation ----
  const [moveHistory, setMoveHistory] = useState<MoveHistoryEntry[]>([]);
  const [lastMoveTrail, setLastMoveTrail] = useState<SingleStepMove[]>([]);
  const [isAIThinking, setIsAIThinking] = useState<boolean>(false);
  const [evalScore, setEvalScore] = useState<number>(0);
  const [hintMove, setHintMove] = useState<SingleStepMove | null>(null);

  const aiTimeoutRef = useRef<number | null>(null);

  // Keep sound engine synced
  useEffect(() => {
    soundFX.enabled = soundEnabled;
  }, [soundEnabled]);

  const toggleSound = () => {
    const next = !soundEnabled;
    soundFX.enabled = next;
    setSoundEnabled(next);
    setShowDifficultyPickerOnHome(false);
    if (next) soundFX.playButtonClick();
  };

  // Dynamically enforce valid bead count when rows/cols change in setup config
  const maxBeadsAllowed = useMemo(
    () => getMaxBeadsForBoard(config.rows, config.cols),
    [config.rows, config.cols]
  );

  // Start or restart a match with given config and switch to 'game' screen
  const startNewMatch = useCallback(
    (requestedConfig: GameConfig = config) => {
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current);
      }
      const maxForBoard = getMaxBeadsForBoard(requestedConfig.rows, requestedConfig.cols);
      const clampedBeads = Math.max(
        3,
        Math.min(
          requestedConfig.beadsPerPlayer,
          maxForBoard,
          Math.floor((requestedConfig.rows * requestedConfig.cols - 1) / 2)
        )
      );

      // Name the opponent appropriately if default AI / Player 2 names are used
      let p2Name = requestedConfig.p2.name.trim() || 'Player 2';
      const defaultAINames = ['Grandmaster AI', 'Tactician AI', 'Novice Bot', 'Player 2'];
      if (requestedConfig.mode === 'ai' && defaultAINames.includes(p2Name)) {
        p2Name =
          requestedConfig.difficulty === 'easy'
            ? 'Novice Bot'
            : requestedConfig.difficulty === 'medium'
            ? 'Tactician AI'
            : 'Grandmaster AI';
      } else if (requestedConfig.mode === 'pvp' && defaultAINames.includes(p2Name)) {
        p2Name = 'Player 2';
      }

      const sanitizedConfig: GameConfig = {
        ...requestedConfig,
        beadsPerPlayer: clampedBeads,
        p1: {
          ...requestedConfig.p1,
          name: requestedConfig.p1.name.trim() || 'Player 1',
        },
        p2: {
          ...requestedConfig.p2,
          name: p2Name,
        },
      };

      const freshBoard = createInitialBoard(
        sanitizedConfig.rows,
        sanitizedConfig.cols,
        clampedBeads
      );

      // Randomly decide which player (1 or 2) gets the first turn in both modes
      const randomStartingPlayer: PlayerId = Math.random() < 0.5 ? 1 : 2;

      setConfig(sanitizedConfig);
      setMatchConfig(sanitizedConfig);
      setBoard(freshBoard);
      setCurrentTurn(randomStartingPlayer);
      setSelectedNode(null);
      setChainLockNode(null);
      setCurrentChainSteps([]);
      setMoveHistory([]);
      setLastMoveTrail([]);
      setIsAIThinking(false);
      setHintMove(null);
      setEvalScore(0);
      setShowSettingsModal(false);
      setShowDifficultyPickerOnHome(false);
      setActiveScreen('game');
    },
    [config]
  );

  // Return cleanly to the Home Screen and collapse Vs Computer difficulty options
  const returnToHomeScreen = () => {
    soundFX.playButtonClick();
    if (aiTimeoutRef.current) {
      clearTimeout(aiTimeoutRef.current);
    }
    setIsAIThinking(false);
    setShowDifficultyPickerOnHome(false);
    setActiveScreen('home');
  };

  // Count remaining beads on active match board using matchConfig dimensions
  const beadCounts = useMemo(() => {
    let p1Count = 0;
    let p2Count = 0;
    for (let r = 0; r < board.length; r++) {
      for (let c = 0; c < (board[r]?.length || 0); c++) {
        if (board[r][c] === 1) p1Count++;
        else if (board[r][c] === 2) p2Count++;
      }
    }
    return { p1: p1Count, p2: p2Count };
  }, [board]);

  const winner = useMemo<{ player: PlayerId; reason: string } | null>(() => {
    if (
      activeScreen !== 'game' ||
      showSettingsModal ||
      chainLockNode ||
      board.length !== matchConfig.rows ||
      (board[0]?.length || 0) !== matchConfig.cols
    ) {
      return null;
    }

    if (beadCounts.p2 === 0) {
      return {
        player: 1,
        reason: `Captured all ${matchConfig.beadsPerPlayer} opponent beads!`,
      };
    }
    if (beadCounts.p1 === 0) {
      return {
        player: 2,
        reason: `Captured all ${matchConfig.beadsPerPlayer} opponent beads!`,
      };
    }

    const availableSequences = generateAllTurnSequences(
      board,
      currentTurn,
      matchConfig.rows,
      matchConfig.cols,
      matchConfig.diagonalRule
    );
    if (availableSequences.length === 0) {
      return {
        player: currentTurn === 1 ? 2 : 1,
        reason: `${
          currentTurn === 1 ? matchConfig.p1.name : matchConfig.p2.name
        } is completely trapped with no legal moves!`,
      };
    }

    return null;
  }, [
    activeScreen,
    showSettingsModal,
    chainLockNode,
    board,
    matchConfig.rows,
    matchConfig.cols,
    matchConfig.diagonalRule,
    matchConfig.beadsPerPlayer,
    matchConfig.p1.name,
    matchConfig.p2.name,
    currentTurn,
    beadCounts.p1,
    beadCounts.p2,
  ]);

  useEffect(() => {
    if (winner) soundFX.playWin();
  }, [winner]);

  // Valid moves for the currently selected node
  const validMovesForSelection = useMemo(() => {
    if (
      !selectedNode ||
      winner ||
      isAIThinking ||
      activeScreen !== 'game' ||
      showSettingsModal
    )
      return [];
    const onlyJumps = chainLockNode !== null;
    return getValidMovesForBead(
      board,
      selectedNode.r,
      selectedNode.c,
      currentTurn,
      matchConfig.rows,
      matchConfig.cols,
      matchConfig.diagonalRule,
      onlyJumps
    );
  }, [
    board,
    selectedNode,
    winner,
    isAIThinking,
    activeScreen,
    showSettingsModal,
    chainLockNode,
    currentTurn,
    matchConfig.rows,
    matchConfig.cols,
    matchConfig.diagonalRule,
  ]);

  // Finalize a player's turn and pass control
  const finalizeTurn = useCallback(
    (
      boardBeforeTurn: (PlayerId | 0)[][],
      completedSteps: SingleStepMove[],
      playerWhoMoved: PlayerId
    ) => {
      const capturedCount = completedSteps.filter((s) => s.isJump).length;
      setMoveHistory((prev) => [
        ...prev,
        {
          turnNumber: prev.length + 1,
          player: playerWhoMoved,
          steps: completedSteps,
          capturedCount,
          boardSnapshot: boardBeforeTurn,
        },
      ]);
      setLastMoveTrail(completedSteps);
      setSelectedNode(null);
      setChainLockNode(null);
      setCurrentChainSteps([]);
      setHintMove(null);
      setCurrentTurn(playerWhoMoved === 1 ? 2 : 1);
    },
    []
  );

  // Trigger AI Turn when mode === 'ai' and currentTurn === 2 on the 'game' screen
  useEffect(() => {
    if (
      activeScreen === 'game' &&
      matchConfig.mode === 'ai' &&
      currentTurn === 2 &&
      !winner &&
      !showSettingsModal &&
      !chainLockNode
    ) {
      const executeAIMove = () => {
        const snapshotBeforeAI = cloneBoard(board);
        const { bestSequence, evalScore: nextEval } = computeBestAIMove(
          board,
          2,
          matchConfig.rows,
          matchConfig.cols,
          matchConfig.diagonalRule,
          matchConfig.difficulty
        );

        setEvalScore(nextEval);

        if (!bestSequence || bestSequence.steps.length === 0) {
          setIsAIThinking(false);
          return;
        }

        // Execute steps sequentially if it's a multi-jump chain so the user can watch the combo!
        const steps = bestSequence.steps;
        let workingBoard = cloneBoard(board);

        const executeStepIndex = (idx: number) => {
          const step = steps[idx];
          workingBoard = applyStepMove(workingBoard, step);
          setBoard(cloneBoard(workingBoard));
          setLastMoveTrail(steps.slice(0, idx + 1));
          setSelectedNode(step.to);

          if (step.isJump) {
            soundFX.playCapture();
          } else {
            soundFX.playMove();
          }

          if (idx + 1 < steps.length) {
            aiTimeoutRef.current = window.setTimeout(() => {
              executeStepIndex(idx + 1);
            }, 420);
          } else {
            setIsAIThinking(false);
            finalizeTurn(snapshotBeforeAI, steps, 2);
          }
        };

        executeStepIndex(0);
      };

      aiTimeoutRef.current = window.setTimeout(() => {
        setIsAIThinking(true);
        aiTimeoutRef.current = window.setTimeout(executeAIMove, 280);
      }, 0);
    }

    return () => {
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current);
      }
    };
  }, [
    activeScreen,
    currentTurn,
    matchConfig.mode,
    matchConfig.rows,
    matchConfig.cols,
    matchConfig.diagonalRule,
    matchConfig.difficulty,
    winner,
    showSettingsModal,
    chainLockNode,
    board,
    finalizeTurn,
  ]);

  // Keep a ref of the board at the start of a human turn so undo restores the whole turn cleanly
  const turnStartBoardRef = useRef<(PlayerId | 0)[][]>(board);
  useEffect(() => {
    if (!chainLockNode) {
      turnStartBoardRef.current = cloneBoard(board);
    }
  }, [currentTurn, chainLockNode, board]);

  // Handle clicking a node on the board
  const handleNodeClick = (r: number, c: number) => {
    if (winner || isAIThinking || activeScreen !== 'game') return;
    if (matchConfig.mode === 'ai' && currentTurn === 2) return;

    const clickedMove = validMovesForSelection.find(
      (m) => m.to.r === r && m.to.c === c
    );

    // 1. If the user clicked a valid destination node for the currently selected bead
    if (selectedNode && clickedMove) {
      const nextBoard = applyStepMove(board, clickedMove);
      const updatedSteps = [...currentChainSteps, clickedMove];
      setBoard(nextBoard);
      setHintMove(null);

      if (clickedMove.isJump) {
        soundFX.playCapture();
        const followUpJumps = getValidMovesForBead(
          nextBoard,
          clickedMove.to.r,
          clickedMove.to.c,
          currentTurn,
          matchConfig.rows,
          matchConfig.cols,
          matchConfig.diagonalRule,
          true
        );

        if (followUpJumps.length > 0) {
          setSelectedNode(clickedMove.to);
          setChainLockNode(clickedMove.to);
          setCurrentChainSteps(updatedSteps);
          setLastMoveTrail(updatedSteps);
          return;
        }
      } else {
        soundFX.playMove();
      }

      finalizeTurn(turnStartBoardRef.current, updatedSteps, currentTurn);
      return;
    }

    // 2. If in chain-capture lock, cannot switch to a different bead
    if (chainLockNode) {
      return;
    }

    // 3. Selecting one of the active player's own beads
    if (board[r][c] === currentTurn) {
      soundFX.playSelect();
      setSelectedNode({ r, c });
      setHintMove(null);
    } else {
      setSelectedNode(null);
    }
  };

  // Allow player to manually end a chain capture turn if they don't want to take the next jump
  const handleEndChainTurn = () => {
    if (!chainLockNode || currentChainSteps.length === 0) return;
    soundFX.playButtonClick();
    finalizeTurn(turnStartBoardRef.current, currentChainSteps, currentTurn);
  };

  // Undo last turn (in AI mode, undoes both AI's response and Human's move)
  const handleUndo = () => {
    if (isAIThinking || (moveHistory.length === 0 && !chainLockNode)) return;
    soundFX.playButtonClick();

    if (chainLockNode) {
      setBoard(turnStartBoardRef.current);
      setChainLockNode(null);
      setCurrentChainSteps([]);
      setSelectedNode(null);
      return;
    }

    if (matchConfig.mode === 'ai') {
      const lastHumanEntryIndex =
        moveHistory.length >= 2 ? moveHistory.length - 2 : 0;
      const targetEntry = moveHistory[lastHumanEntryIndex];
      if (targetEntry) {
        setBoard(cloneBoard(targetEntry.boardSnapshot));
        setMoveHistory((prev) => prev.slice(0, lastHumanEntryIndex));
        setCurrentTurn(1);
        setSelectedNode(null);
        setLastMoveTrail([]);
        setHintMove(null);
      }
    } else {
      const lastEntry = moveHistory[moveHistory.length - 1];
      setBoard(cloneBoard(lastEntry.boardSnapshot));
      setMoveHistory((prev) => prev.slice(0, -1));
      setCurrentTurn(lastEntry.player);
      setSelectedNode(null);
      setLastMoveTrail([]);
      setHintMove(null);
    }
  };

  // Request AI tactical hint for the current human player (always uses Hard evaluation)
  const handleRequestHint = () => {
    if (winner || isAIThinking || activeScreen !== 'game') return;
    const { bestSequence } = computeBestAIMove(
      board,
      currentTurn,
      matchConfig.rows,
      matchConfig.cols,
      matchConfig.diagonalRule,
      'hard'
    );
    if (bestSequence && bestSequence.steps.length > 0) {
      const firstStep = bestSequence.steps[0];
      setSelectedNode(firstStep.from);
      setHintMove(firstStep);
      soundFX.playSelect();
    }
  };

  // ---- Geometry & SVG Board Layout Calculation ----
  const activeThemeId = activeScreen === 'home' ? config.theme : matchConfig.theme;
  const themeStyle = BOARD_THEMES[activeThemeId];
  const p1Color = BEAD_COLORS[matchConfig.p1.colorId];
  const p2Color = BEAD_COLORS[matchConfig.p2.colorId];

  const svgPadding = 48;
  const cellSpacing = 84;
  const svgWidth = svgPadding * 2 + (matchConfig.cols - 1) * cellSpacing;
  const svgHeight = svgPadding * 2 + (matchConfig.rows - 1) * cellSpacing;

  const getCoordXY = (r: number, c: number) => ({
    x: svgPadding + c * cellSpacing,
    y: svgPadding + r * cellSpacing,
  });

  // Compute all connected lines for the active board
  const boardGraphLines = useMemo(() => {
    const lines: {
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      isDiag: boolean;
      isCenterCross: boolean;
    }[] = [];

    const centerR = Math.floor(matchConfig.rows / 2);
    const centerC = Math.floor(matchConfig.cols / 2);

    for (let r = 0; r < matchConfig.rows; r++) {
      for (let c = 0; c < matchConfig.cols; c++) {
        const candidates: [number, number][] = [
          [r, c + 1],
          [r + 1, c],
          [r + 1, c + 1],
          [r + 1, c - 1],
        ];
        for (const [nr, nc] of candidates) {
          if (
            areNodesConnected(
              r,
              c,
              nr,
              nc,
              matchConfig.rows,
              matchConfig.cols,
              matchConfig.diagonalRule
            )
          ) {
            const pA = getCoordXY(r, c);
            const pB = getCoordXY(nr, nc);
            const isDiag = r !== nr && c !== nc;
            const touchesCenter =
              isDiag &&
              ((r === centerR && c === centerC) ||
                (nr === centerR && nc === centerC));
            lines.push({
              x1: pA.x,
              y1: pA.y,
              x2: pB.x,
              y2: pB.y,
              isDiag,
              isCenterCross: touchesCenter,
            });
          }
        }
      }
    }
    return lines;
  }, [matchConfig.rows, matchConfig.cols, matchConfig.diagonalRule]);

  // Normalized evaluation bar percentage (50% = equal, >50% favors P1, <50% favors P2)
  const evalBarPercentP1 = useMemo(() => {
    const clamped = Math.max(-1500, Math.min(1500, -evalScore));
    return Math.round(50 + (clamped / 1500) * 45);
  }, [evalScore]);

  return (
    <div
      className={`min-h-screen ${themeStyle.outerShellBg} text-slate-100 flex flex-col font-sans selection:bg-amber-500/30 relative overflow-x-hidden`}
    >
      {/* =====================================================================
          SCREEN 1: DEDICATED HOME SCREEN
         ===================================================================== */}
      {activeScreen === 'home' && (
        <div className="min-h-screen flex flex-col justify-between p-4 sm:p-6 relative">
          {/* Decorative Ambient Background Glows */}
          <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
            <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl" />
            <div className="absolute top-1/3 -right-32 w-96 h-96 rounded-full bg-rose-500/10 blur-3xl" />
            <div className="absolute -bottom-32 left-1/3 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl" />
          </div>

          {/* TOP BAR: TOP-LEFT SETTINGS ICON + MUTE/UNMUTE RIGHT NEXT TO IT */}
          <div className="relative z-20 flex items-center justify-between w-full max-w-6xl mx-auto">
            {/* Top-Left Corner Group: Settings Button + Mute/Unmute Button on its right side */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => {
                  soundFX.playButtonClick();
                  setShowDifficultyPickerOnHome(false);
                  setShowSettingsModal(true);
                }}
                title="Customize Board, Beads & Tokens"
                aria-label="Settings and Customization"
                className="group flex items-center gap-2.5 p-3 sm:px-4 sm:py-2.5 rounded-2xl bg-white/10 hover:bg-amber-500/20 border border-white/15 hover:border-amber-400/50 text-slate-100 shadow-lg backdrop-blur-md transition-all duration-200 cursor-pointer active:scale-95"
              >
                <Settings className="w-5 h-5 text-amber-400 group-hover:rotate-45 transition-transform duration-300" />
              </button>

              <button
                onClick={toggleSound}
                title={soundEnabled ? 'Mute Audio' : 'Unmute Audio'}
                aria-label={soundEnabled ? 'Mute Audio' : 'Unmute Audio'}
                className="flex items-center justify-center p-3 sm:px-3.5 sm:py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-slate-200 shadow-lg backdrop-blur-md transition-all duration-200 cursor-pointer active:scale-95"
              >
                {soundEnabled ? (
                  <Volume2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <VolumeX className="w-5 h-5 text-rose-400" />
                )}
              </button>
            </div>

            {/* Top-Right: Rules Info Button */}
            <button
              onClick={() => {
                soundFX.playButtonClick();
                setShowDifficultyPickerOnHome(false);
                setShowRulesModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/10 text-xs font-semibold text-slate-300 transition cursor-pointer"
            >
              <Info className="w-4 h-4 text-amber-400" />
              <span>How to Play</span>
            </button>
          </div>

          {/* CENTER OF HOME SCREEN: BRAND HERO & "OPPONENT MODE" IN 2 ROWS */}
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center my-4 px-2">
            {/* Game Emblem & Title */}
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 p-0.5 shadow-[0_0_40px_rgba(245,158,11,0.35)] mb-2">
                <div className="w-full h-full bg-slate-950/90 rounded-[22px] flex items-center justify-center">
                  <Swords className="w-8 h-8 sm:w-10 sm:h-10 text-amber-400" />
                </div>
              </div>

              <h1 className="text-3xl sm:text-5xl font-black tracking-tight bg-gradient-to-r from-amber-200 via-white to-amber-300 bg-clip-text text-transparent drop-shadow">
                SHOLO GUTI
              </h1>
              

              {/* Current Active Board Spec Pill (Configured via Top-Left Settings) */}
              <div className="mt-4 inline-flex flex-wrap items-center justify-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300">
                <span className="font-semibold text-amber-300">
                  {config.rows}×{config.cols} Grid
                </span>
                <span className="text-white/25">•</span>
                <span>{config.beadsPerPlayer} Beads / Player</span>
                <span className="text-white/25">•</span>
                <span>{BOARD_THEMES[config.theme].name}</span>
              </div>
            </div>

            {/* MAIN CENTER CARD: "Opponent Mode" in 2 Rows */}
            <div className="w-full max-w-md rounded-3xl bg-slate-900/85 border-2 border-white/15 p-6 sm:p-8 shadow-[0_25px_70px_rgba(0,0,0,0.75)] backdrop-blur-xl">
              <div className="text-center mb-4">
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-400 block mb-1">
                  Select Match Type
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Opponent Mode
                </h2>
              </div>

              {/* 2 Stacked Rows for "Vs Computer" and "2 Players" */}
              <div className="flex flex-col gap-4">
                {/* ROW 1: Vs Computer */}
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.playButtonClick();
                      setShowDifficultyPickerOnHome((prev) => !prev);
                    }}
                    className={`w-full group relative overflow-hidden rounded-2xl p-4 sm:p-5 border-2 transition-all duration-200 flex items-center justify-between cursor-pointer ${
                      showDifficultyPickerOnHome
                        ? 'bg-gradient-to-r from-purple-600/30 via-indigo-600/25 to-amber-500/20 border-amber-400 shadow-lg shadow-amber-500/15'
                        : 'bg-gradient-to-r from-white/10 to-white/5 hover:from-purple-500/20 hover:to-indigo-500/15 border-white/15 hover:border-purple-400/60'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-purple-500/25 border border-purple-400/40 flex items-center justify-center text-purple-300 shadow-inner">
                        <Cpu className="w-6 h-6" />
                      </div>
                      <div className="text-left">
                        <div className="text-lg sm:text-xl font-black text-white group-hover:text-amber-200 transition">
                          Vs Computer
                        </div>
                        <div className="text-xs text-slate-300/80">
                          Challenge AI • Easy, Medium, or Hard
                        </div>
                      </div>
                    </div>
                    <ChevronRight
                      className={`w-6 h-6 text-amber-300 transition-transform duration-300 ${
                        showDifficultyPickerOnHome ? 'rotate-90' : 'group-hover:translate-x-1'
                      }`}
                    />
                  </button>

                  {/* Expandable Difficulty Level Selector when "Vs Computer" is clicked */}
                  {showDifficultyPickerOnHome && (
                    <div className="mt-3 p-3.5 rounded-2xl bg-black/50 border border-white/15 space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                          Choose AI Difficulty Level
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Click to launch
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        {/* EASY */}
                        <button
                          type="button"
                          onClick={() => {
                            soundFX.playButtonClick();
                            startNewMatch({
                              ...config,
                              mode: 'ai',
                              difficulty: 'easy',
                            });
                          }}
                          className="w-full p-3 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-900/30 hover:from-emerald-500/35 hover:to-teal-800/40 border border-emerald-400/40 hover:border-emerald-300 flex items-center justify-between text-left transition group cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-emerald-500/25 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
                              <Zap className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-sm font-black text-white flex items-center gap-2">
                                <span>Easy</span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300">
                                  Novice
                                </span>
                              </div>
                            </div>
                          </div>
                          <Play className="w-4 h-4 text-emerald-300 group-hover:translate-x-0.5 transition" />
                        </button>

                        {/* MEDIUM */}
                        <button
                          type="button"
                          onClick={() => {
                            soundFX.playButtonClick();
                            startNewMatch({
                              ...config,
                              mode: 'ai',
                              difficulty: 'medium',
                            });
                          }}
                          className="w-full p-3 rounded-xl bg-gradient-to-r from-sky-500/20 to-blue-900/30 hover:from-sky-500/35 hover:to-blue-800/40 border border-sky-400/40 hover:border-sky-300 flex items-center justify-between text-left transition group cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-sky-500/25 border border-sky-400/40 flex items-center justify-center text-sky-300">
                              <Brain className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-sm font-black text-white flex items-center gap-2">
                                <span>Medium</span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/25 text-sky-300">
                                  Tactician
                                </span>
                              </div>
                            </div>
                          </div>
                          <Play className="w-4 h-4 text-sky-300 group-hover:translate-x-0.5 transition" />
                        </button>

                        {/* HARD */}
                        <button
                          type="button"
                          onClick={() => {
                            soundFX.playButtonClick();
                            startNewMatch({
                              ...config,
                              mode: 'ai',
                              difficulty: 'hard',
                            });
                          }}
                          className="w-full p-3 rounded-xl bg-gradient-to-r from-rose-500/25 to-purple-900/40 hover:from-rose-500/40 hover:to-purple-800/50 border border-rose-400/50 hover:border-rose-300 flex items-center justify-between text-left transition group cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-rose-500/25 border border-rose-400/40 flex items-center justify-center text-rose-300">
                              <Skull className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-sm font-black text-white flex items-center gap-2">
                                <span>Hard</span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/30 text-rose-200">
                                  Grandmaster
                                </span>
                              </div>
                            </div>
                          </div>
                          <Play className="w-4 h-4 text-rose-300 group-hover:translate-x-0.5 transition" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* ROW 2: 2 Players */}
                <button
                  type="button"
                  onClick={() => {
                    soundFX.playButtonClick();
                    setShowDifficultyPickerOnHome(false);
                    startNewMatch({
                      ...config,
                      mode: 'pvp',
                    });
                  }}
                  className="w-full group relative overflow-hidden rounded-2xl p-4 sm:p-5 bg-gradient-to-r from-white/10 to-white/5 hover:from-emerald-500/25 hover:to-teal-500/15 border-2 border-white/15 hover:border-emerald-400/60 transition-all duration-200 flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/25 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shadow-inner">
                      <Users className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <div className="text-lg sm:text-xl font-black text-white group-hover:text-emerald-200 transition">
                        2 Players
                      </div>
                      <div className="text-xs text-slate-300/80">
                        Offline with Local Player
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-6 h-6 text-emerald-300 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Home Footer */}
          <div className="relative z-10 text-center text-xs text-slate-400/80 py-2">
            Use the <strong className="text-amber-300">Settings (⚙️)</strong> button at the top-left corner to customize board size, bead count, colors &amp; themes.
          </div>
        </div>
      )}

      {/* =====================================================================
          SCREEN 2: IN-GAME MATCH VIEW (CUSTOMIZE BUTTON REMOVED)
         ===================================================================== */}
      {activeScreen === 'game' && (
        <>
          {/* TOP NAVIGATION & STATUS HEADER (NO CUSTOMIZE BUTTON HERE) */}
          <header className="border-b border-white/10 bg-black/40 backdrop-blur-md sticky top-0 z-30">
            <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              {/* Left: Home Button & Match Badge */}
              <div className="flex items-center gap-3">
                <button
                  onClick={returnToHomeScreen}
                  title="Return to Home Screen"
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-100 border border-white/15 text-xs font-bold transition cursor-pointer"
                >
                  <Home className="w-4 h-4 text-amber-400" />
                  <span>Home</span>
                </button>

                <div className="flex items-center gap-2">
                  <h1 className="hidden sm:block text-base sm:text-lg font-bold tracking-tight bg-gradient-to-r from-amber-200 via-amber-100 to-amber-400 bg-clip-text text-transparent">
                    SHOLO GUTI
                  </h1>
                  <span className="hidden md:inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    {matchConfig.rows}×{matchConfig.cols} • {matchConfig.beadsPerPlayer} Beads
                  </span>
                  {matchConfig.mode === 'ai' && (
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                        DIFFICULTY_META[matchConfig.difficulty].colorClass
                      } ${DIFFICULTY_META[matchConfig.difficulty].borderClass} bg-white/5`}
                    >
                      {DIFFICULTY_META[matchConfig.difficulty].label}
                    </span>
                  )}
                </div>
              </div>

              {/* Right: In-Game Action Toolbar (Hint, Undo, Restart, Rules, Mute/Unmute) */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRequestHint}
                  disabled={winner !== null || isAIThinking}
                  title="Ask AI for best move hint"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 border border-amber-500/30 transition disabled:opacity-40 cursor-pointer"
                >
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                  <span className="hidden md:inline">Hint</span>
                </button>

                <button
                  onClick={handleUndo}
                  disabled={
                    isAIThinking || (moveHistory.length === 0 && !chainLockNode)
                  }
                  title="Undo Move"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition disabled:opacity-40 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="hidden md:inline">Undo</span>
                </button>

                <button
                  onClick={() => {
                    soundFX.playButtonClick();
                    startNewMatch(matchConfig);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition cursor-pointer"
                >
                  <Play className="w-4 h-4 text-emerald-400" />
                  <span className="hidden sm:inline">Restart</span>
                </button>

                <button
                  onClick={() => {
                    soundFX.playButtonClick();
                    setShowRulesModal(true);
                  }}
                  title="Game Rules"
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition cursor-pointer"
                >
                  <Info className="w-4 h-4" />
                </button>

                <button
                  onClick={toggleSound}
                  title={soundEnabled ? 'Mute Audio' : 'Unmute Audio'}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition cursor-pointer"
                >
                  {soundEnabled ? (
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-rose-400" />
                  )}
                </button>
              </div>
            </div>
          </header>

          {/* MAIN GAMEPLAY WORKSPACE: CURRENT TURN ABOVE BOARD, CLEAN FULL-FOCUS LAYOUT */}
          <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-4 flex flex-col gap-4 items-center">
            {/* CURRENT TURN & ADVANTAGE SECTION (ABOVE BOARD & BELOW MENU) */}
            <div className="w-full rounded-2xl p-4 bg-black/45 border border-white/10 flex flex-col gap-3 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Current Turn
                </span>
                {isAIThinking ? (
                  <span className="flex items-center gap-2 text-xs font-semibold text-amber-300 animate-pulse">
                    <Cpu className="w-4 h-4 animate-spin" />
                    AI Thinking ({DIFFICULTY_META[matchConfig.difficulty].label})...
                  </span>
                ) : chainLockNode ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                    Chain Jump Active!
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-emerald-400">
                    Turn #{moveHistory.length + 1}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between bg-white/5 rounded-xl p-3 border border-white/5">
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-3.5 h-3.5 rounded-full"
                    style={{
                      backgroundColor:
                        currentTurn === 1
                          ? p1Color.accentHex
                          : p2Color.accentHex,
                    }}
                  />
                  <span className="font-bold text-sm text-white">
                    {currentTurn === 1
                      ? matchConfig.p1.name
                      : matchConfig.mode === 'ai'
                      ? 'AI'
                      : matchConfig.p2.name}
                    &apos;s Move
                  </span>
                </div>

                {chainLockNode && (
                  <button
                    onClick={handleEndChainTurn}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow transition cursor-pointer"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                    End Chain Turn
                  </button>
                )}
              </div>

              {/* Advantage Bar with Merged Player 1 and Player 2 / AI Remaining/Total Beads */}
              <div>
                <div className="flex justify-between items-center text-xs font-semibold text-slate-200 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block"
                      style={{ backgroundColor: p1Color.accentHex }}
                    />
                    {matchConfig.p1.name} ({beadCounts.p1}/{matchConfig.beadsPerPlayer})
                  </span>
                  <span className="flex items-center gap-1.5">
                    {matchConfig.mode === 'ai' ? 'AI' : matchConfig.p2.name} ({beadCounts.p2}/{matchConfig.beadsPerPlayer})
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block"
                      style={{ backgroundColor: p2Color.accentHex }}
                    />
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden flex border border-white/10">
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${evalBarPercentP1}%`,
                      backgroundColor: p1Color.accentHex,
                    }}
                  />
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${100 - evalBarPercentP1}%`,
                      backgroundColor: p2Color.accentHex,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* INTERACTIVE SVG & BEAD BOARD */}
            <div className="w-full flex flex-col items-center justify-center">
              <div
                className={`w-full rounded-3xl border-4 ${themeStyle.boardBorder} ${themeStyle.boardBg} p-3 sm:p-6 shadow-[0_25px_70px_rgba(0,0,0,0.75)] relative overflow-hidden flex flex-col items-center justify-center`}
              >
                <div className="w-full flex items-center justify-between text-xs text-white/50 mb-2 px-2">
                  <span>
                    Theme: <strong className="text-white/80">{themeStyle.name}</strong>
                  </span>
                  <span>
                    {selectedNode
                      ? `Selected: ${formatCoord(selectedNode)} (${validMovesForSelection.length} legal targets)`
                      : 'Select a bead to inspect legal graph lines'}
                  </span>
                </div>

                {/* Responsive Board Container */}
                <div className="relative w-full flex items-center justify-center">
                  <svg
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                    className="w-full max-h-[72vh] h-auto select-none touch-manipulation"
                  >
                    <defs>
                      <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
                      </radialGradient>
                    </defs>

                    {/* Coordinate Labels along Top & Left */}
                    {Array.from({ length: matchConfig.cols }).map((_, c) => {
                      const { x } = getCoordXY(0, c);
                      return (
                        <text
                          key={`col-label-${c}`}
                          x={x}
                          y={18}
                          textAnchor="middle"
                          fill="rgba(255,255,255,0.35)"
                          fontSize="12"
                          fontWeight="600"
                          fontFamily="monospace"
                        >
                          {String.fromCharCode(65 + c)}
                        </text>
                      );
                    })}
                    {Array.from({ length: matchConfig.rows }).map((_, r) => {
                      const { y } = getCoordXY(r, 0);
                      return (
                        <text
                          key={`row-label-${r}`}
                          x={16}
                          y={y + 4}
                          textAnchor="middle"
                          fill="rgba(255,255,255,0.35)"
                          fontSize="12"
                          fontWeight="600"
                          fontFamily="monospace"
                        >
                          {r + 1}
                        </text>
                      );
                    })}

                    {/* 1. Graph Connection Lines */}
                    {boardGraphLines.map((line, idx) => (
                      <line
                        key={idx}
                        x1={line.x1}
                        y1={line.y1}
                        x2={line.x2}
                        y2={line.y2}
                        stroke={
                          line.isCenterCross
                            ? themeStyle.centerLineStroke
                            : themeStyle.lineStroke
                        }
                        strokeWidth={
                          line.isCenterCross ? 3.2 : line.isDiag ? 2.2 : 3
                        }
                        strokeOpacity={line.isDiag ? 0.78 : 0.92}
                        strokeLinecap="round"
                      />
                    ))}

                    {/* 2. Last Move Trail Highlight */}
                    {lastMoveTrail.map((step, idx) => {
                      const pFrom = getCoordXY(step.from.r, step.from.c);
                      const pTo = getCoordXY(step.to.r, step.to.c);
                      return (
                        <g key={`trail-${idx}`}>
                          <line
                            x1={pFrom.x}
                            y1={pFrom.y}
                            x2={pTo.x}
                            y2={pTo.y}
                            stroke="#38bdf8"
                            strokeWidth={4.5}
                            strokeDasharray="6 6"
                            strokeOpacity={0.75}
                          />
                          <circle
                            cx={pFrom.x}
                            cy={pFrom.y}
                            r={7}
                            fill="#38bdf8"
                            fillOpacity={0.45}
                          />
                        </g>
                      );
                    })}

                    {/* 3. Tactical Hint Arrow */}
                    {hintMove && (
                      <g>
                        <line
                          x1={getCoordXY(hintMove.from.r, hintMove.from.c).x}
                          y1={getCoordXY(hintMove.from.r, hintMove.from.c).y}
                          x2={getCoordXY(hintMove.to.r, hintMove.to.c).x}
                          y2={getCoordXY(hintMove.to.r, hintMove.to.c).y}
                          stroke="#fbbf24"
                          strokeWidth={6}
                          strokeLinecap="round"
                        />
                      </g>
                    )}

                    {/* 4. Board Intersections, Move Targets & Beads */}
                    {board.map((row, r) =>
                      row.map((cell, c) => {
                        const { x, y } = getCoordXY(r, c);
                        const isSelected =
                          selectedNode?.r === r && selectedNode?.c === c;
                        const moveTarget = validMovesForSelection.find(
                          (m) => m.to.r === r && m.to.c === c
                        );
                        const isCapturedPreview = validMovesForSelection.some(
                          (m) =>
                            m.isJump &&
                            m.captured?.r === r &&
                            m.captured?.c === c
                        );

                        const pStyle = cell === 1 ? p1Color : p2Color;
                        const pIcon =
                          cell === 1
                            ? matchConfig.p1.icon
                            : matchConfig.p2.icon;

                        return (
                          <g
                            key={`node-${r}-${c}`}
                            onClick={() => handleNodeClick(r, c)}
                            className="cursor-pointer group"
                          >
                            {/* Invisible larger hit target for effortless mobile touch */}
                            <circle
                              cx={x}
                              cy={y}
                              r={34}
                              fill="transparent"
                            />

                            {/* Base Intersection Socket */}
                            <circle
                              cx={x}
                              cy={y}
                              r={10}
                              fill={themeStyle.nodeFill}
                              stroke={themeStyle.nodeStroke}
                              strokeWidth={2.5}
                            />

                            {/* Valid Move Target Indicator (Empty Node) */}
                            {moveTarget && (
                              <g>
                                <circle
                                  cx={x}
                                  cy={y}
                                  r={24}
                                  fill={
                                    moveTarget.isJump
                                      ? 'rgba(244, 63, 94, 0.22)'
                                      : 'rgba(52, 211, 153, 0.2)'
                                  }
                                  stroke={
                                    moveTarget.isJump ? '#fb7185' : '#34d399'
                                  }
                                  strokeWidth={2.5}
                                  strokeDasharray={
                                    moveTarget.isJump ? '5 3' : undefined
                                  }
                                />
                                <circle
                                  cx={x}
                                  cy={y}
                                  r={9}
                                  fill={
                                    moveTarget.isJump ? '#f43f5e' : '#10b981'
                                  }
                                />
                              </g>
                            )}

                            {/* Vulnerable Enemy Bead Highlight (About to be Jumped) */}
                            {isCapturedPreview && (
                              <circle
                                cx={x}
                                cy={y}
                                r={31}
                                fill="none"
                                stroke="#ef4444"
                                strokeWidth={3.5}
                                strokeDasharray="6 4"
                              />
                            )}

                            {/* Selected Bead Halo */}
                            {isSelected && (
                              <circle
                                cx={x}
                                cy={y}
                                r={33}
                                fill="url(#nodeGlow)"
                                stroke="#fbbf24"
                                strokeWidth={3}
                              />
                            )}

                            {/* Player Bead Token */}
                            {cell !== 0 && (
                              <g
                                transform={`translate(${x}, ${y})`}
                                className="transition-transform duration-200"
                              >
                                <circle
                                  cx={0}
                                  cy={3}
                                  r={25}
                                  fill="rgba(0,0,0,0.55)"
                                />
                                <circle
                                  cx={0}
                                  cy={0}
                                  r={24}
                                  fill={pStyle.accentHex}
                                  stroke={
                                    isSelected ? '#fde047' : pStyle.ringHex
                                  }
                                  strokeWidth={isSelected ? 4 : 2.5}
                                />
                                <circle
                                  cx={0}
                                  cy={0}
                                  r={18}
                                  fill="none"
                                  stroke="rgba(255,255,255,0.35)"
                                  strokeWidth={1.2}
                                />
                                <ellipse
                                  cx={-6}
                                  cy={-8}
                                  rx={8}
                                  ry={4}
                                  fill="rgba(255,255,255,0.3)"
                                  transform="rotate(-25)"
                                />
                                <foreignObject
                                  x={-10}
                                  y={-10}
                                  width={20}
                                  height={20}
                                >
                                  <div className="w-full h-full flex items-center justify-center pointer-events-none">
                                    <BeadIcon
                                      icon={pIcon}
                                      className={`w-4 h-4 ${pStyle.text} drop-shadow`}
                                    />
                                  </div>
                                </foreignObject>
                              </g>
                            )}
                          </g>
                        );
                      })
                    )}
                  </svg>
                </div>

                {/* Bottom Legend Bar inside Board Frame */}
                <div className="w-full mt-2 pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300/80 px-2">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                      Adjacent Step
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                      Capture Jump Target
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full border border-red-400 inline-block" />
                      Jumpable Enemy
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Chain captures automatically continue when another jump is available
                  </div>
                </div>
              </div>
            </div>
          </main>
        </>
      )}

      {/* =====================================================================
          SETTINGS / CUSTOMIZATION MODAL (OPENED ONLY FROM HOME SCREEN TOP-LEFT)
         ===================================================================== */}
      {showSettingsModal && activeScreen === 'home' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-start justify-center overflow-y-auto overscroll-contain p-2 sm:p-4">
          <div className="bg-slate-900 border border-white/15 rounded-3xl max-w-5xl w-full min-w-0 p-4 sm:p-6 lg:p-8 shadow-2xl my-2 sm:my-4">
            <div className="flex items-start justify-between gap-3 pb-4 mb-5 sm:mb-6 border-b border-white/10">
              <div className="flex min-w-0 items-start gap-3">
                <div className="w-11 h-11 shrink-0 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                  <Settings className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-2xl leading-tight font-bold text-white">
                    Game Settings &amp; Board Customization
                  </h2>
                  <p className="mt-1 text-xs sm:text-sm text-slate-400">
                    Customize dimensions, bead counts, themes, and player tokens
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  soundFX.playButtonClick();
                  setShowSettingsModal(false);
                }}
                className="shrink-0 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 transition cursor-pointer"
                title="Close Settings"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left 7 Cols: Controls */}
              <div className="lg:col-span-7 space-y-5">
                {/* Quick Presets (3 Compact Cards in 1 Row) */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-amber-300 mb-2">
                    Quick Board Presets
                  </label>
                  <div className="grid grid-cols-1 min-[420px]:grid-cols-3 gap-2">
                    {QUICK_PRESETS.map((preset) => {
                      const isActive =
                        config.rows === preset.rows &&
                        config.cols === preset.cols &&
                        config.beadsPerPlayer === preset.beads;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => {
                            soundFX.playButtonClick();
                            setConfig((prev) => ({
                              ...prev,
                              rows: preset.rows,
                              cols: preset.cols,
                              beadsPerPlayer: preset.beads,
                              diagonalRule: preset.diagonalRule,
                            }));
                          }}
                          className={`px-2 py-2.5 rounded-xl border text-center transition cursor-pointer flex items-center justify-center gap-1 ${
                            isActive
                              ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold'
                              : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 font-semibold'
                          }`}
                        >
                          <span className="text-[11px] sm:text-xs truncate">
                            {preset.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Sliders: Rows, Columns, Beads */}
                <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex flex-wrap justify-between gap-x-2 text-xs font-semibold mb-1">
                        <span className="text-slate-300">Rows (R)</span>
                        <span className="text-amber-300 font-mono">
                          {config.rows} Rows
                        </span>
                      </div>
                      <input
                        type="range"
                        min={3}
                        max={9}
                        value={config.rows}
                        onChange={(e) => {
                          const newRows = Number(e.target.value);
                          const newMax = getMaxBeadsForBoard(newRows, config.cols);
                          setConfig((prev) => ({
                            ...prev,
                            rows: newRows,
                            beadsPerPlayer: Math.min(prev.beadsPerPlayer, newMax),
                          }));
                        }}
                        className="w-full accent-amber-400 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex flex-wrap justify-between gap-x-2 text-xs font-semibold mb-1">
                        <span className="text-slate-300">Columns (C)</span>
                        <span className="text-amber-300 font-mono">
                          {config.cols} Cols
                        </span>
                      </div>
                      <input
                        type="range"
                        min={3}
                        max={9}
                        value={config.cols}
                        onChange={(e) => {
                          const newCols = Number(e.target.value);
                          const newMax = getMaxBeadsForBoard(config.rows, newCols);
                          setConfig((prev) => ({
                            ...prev,
                            cols: newCols,
                            beadsPerPlayer: Math.min(prev.beadsPerPlayer, newMax),
                          }));
                        }}
                        className="w-full accent-amber-400 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Bead Count Slider */}
                  <div>
                    <div className="flex flex-wrap justify-between gap-x-2 text-xs font-semibold mb-1">
                      <span className="text-slate-300">
                        Beads per Player (Min 3, Max {maxBeadsAllowed})
                      </span>
                      <span className="text-emerald-300 font-mono font-bold">
                        {config.beadsPerPlayer} Beads each (
                        {config.beadsPerPlayer * 2} total)
                      </span>
                    </div>
                    <input
                      type="range"
                      min={3}
                      max={maxBeadsAllowed}
                      value={Math.min(config.beadsPerPlayer, maxBeadsAllowed)}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          beadsPerPlayer: Number(e.target.value),
                        }))
                      }
                      className="w-full accent-emerald-400 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Board Material Theme */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Board Material Theme
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {Object.entries(BOARD_THEMES).map(([id, t]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          soundFX.playButtonClick();
                          setConfig((prev) => ({
                            ...prev,
                            theme: id as BoardThemeId,
                          }));
                        }}
                        className={`p-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer text-center ${
                          config.theme === id
                            ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                            : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        {t.name.split(' ')[1] || t.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Player 1 & Player 2 Token Customizers */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Player 1 */}
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
                    <div className="text-xs font-bold text-white flex items-center justify-between">
                      <span>Player 1 (Bottom)</span>
                      <BeadIcon
                        icon={config.p1.icon}
                        className="w-4 h-4 text-amber-300"
                      />
                    </div>
                    <input
                      type="text"
                      maxLength={18}
                      value={config.p1.name}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          p1: { ...prev.p1, name: e.target.value },
                        }))
                      }
                      placeholder="Player 1 Name"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                    <div className="flex gap-1.5 flex-wrap">
                      {Object.entries(BEAD_COLORS).map(([cid, cObj]) => (
                        <button
                          key={cid}
                          type="button"
                          onClick={() =>
                            setConfig((prev) => ({
                              ...prev,
                              p1: { ...prev.p1, colorId: cid },
                            }))
                          }
                          title={cObj.name}
                          className={`w-6 h-6 rounded-full bg-gradient-to-br ${cObj.bgGrad} border-2 transition cursor-pointer ${
                            config.p1.colorId === cid
                              ? 'scale-110 border-white ring-2 ring-amber-400'
                              : 'border-transparent opacity-70 hover:opacity-100'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex gap-1.5">
                      {(
                        [
                          'crown',
                          'gem',
                          'shield',
                          'flame',
                          'sun',
                          'sparkles',
                        ] as IconName[]
                      ).map((ic) => (
                        <button
                          key={ic}
                          type="button"
                          onClick={() =>
                            setConfig((prev) => ({
                              ...prev,
                              p1: { ...prev.p1, icon: ic },
                            }))
                          }
                          className={`p-1.5 rounded-lg border transition cursor-pointer ${
                            config.p1.icon === ic
                              ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                              : 'bg-black/30 border-white/10 text-slate-400'
                          }`}
                        >
                          <BeadIcon icon={ic} className="w-3.5 h-3.5" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Player 2 */}
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
                    <div className="text-xs font-bold text-white flex items-center justify-between">
                      <span>Player 2 / AI (Top)</span>
                      <BeadIcon
                        icon={config.p2.icon}
                        className="w-4 h-4 text-amber-300"
                      />
                    </div>
                    <input
                      type="text"
                      maxLength={18}
                      value={config.p2.name}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          p2: { ...prev.p2, name: e.target.value },
                        }))
                      }
                      placeholder="Player 2 / AI Name"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                    <div className="flex gap-1.5 flex-wrap">
                      {Object.entries(BEAD_COLORS).map(([cid, cObj]) => (
                        <button
                          key={cid}
                          type="button"
                          onClick={() =>
                            setConfig((prev) => ({
                              ...prev,
                              p2: { ...prev.p2, colorId: cid },
                            }))
                          }
                          title={cObj.name}
                          className={`w-6 h-6 rounded-full bg-gradient-to-br ${cObj.bgGrad} border-2 transition cursor-pointer ${
                            config.p2.colorId === cid
                              ? 'scale-110 border-white ring-2 ring-amber-400'
                              : 'border-transparent opacity-70 hover:opacity-100'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex gap-1.5">
                      {(
                        [
                          'crown',
                          'gem',
                          'shield',
                          'flame',
                          'sun',
                          'sparkles',
                        ] as IconName[]
                      ).map((ic) => (
                        <button
                          key={ic}
                          type="button"
                          onClick={() =>
                            setConfig((prev) => ({
                              ...prev,
                              p2: { ...prev.p2, icon: ic },
                            }))
                          }
                          className={`p-1.5 rounded-lg border transition cursor-pointer ${
                            config.p2.icon === ic
                              ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                              : 'bg-black/30 border-white/10 text-slate-400'
                          }`}
                        >
                          <BeadIcon icon={ic} className="w-3.5 h-3.5" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right 5 Cols: Live Interactive Graph Preview & Save Button */}
              <div className="lg:col-span-5 flex flex-col justify-between bg-black/30 rounded-2xl p-4 border border-white/10">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-amber-400" />
                      Live Starting Graph Preview
                    </span>
                  </div>
                  <LiveBoardPreview config={config} />

                  {/* Graph Diagonal Mode Toggle */}
                  <div className="mt-4">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Diagonal Graph Geometry
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setConfig((prev) => ({
                            ...prev,
                            diagonalRule: 'alquerque',
                          }))
                        }
                        className={`p-2 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                          config.diagonalRule === 'alquerque'
                            ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                            : 'bg-white/5 border-white/10 text-slate-400'
                        }`}
                      >
                        Traditional Sholo Guti
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setConfig((prev) => ({
                            ...prev,
                            diagonalRule: 'full',
                          }))
                        }
                        className={`p-2 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                          config.diagonalRule === 'full'
                            ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                            : 'bg-white/5 border-white/10 text-slate-400'
                        }`}
                      >
                        Full 8-Way Diagonals
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    soundFX.playButtonClick();
                    setShowSettingsModal(false);
                  }}
                  className="mt-6 w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black text-sm tracking-wide shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>SAVE</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          VICTORY / GAME OVER MODAL
         ===================================================================== */}
      {winner && activeScreen === 'game' && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-400/50 rounded-3xl max-w-md w-full p-6 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center mx-auto mb-4 text-amber-300 shadow-lg shadow-amber-500/20">
              <Trophy className="w-9 h-9" />
            </div>

            <h2 className="text-2xl font-black text-white mb-1">
              {winner.player === 1 ? matchConfig.p1.name : matchConfig.p2.name} Wins!
            </h2>
            <p className="text-sm text-amber-200/90 mb-5">{winner.reason}</p>

            <div className="grid grid-cols-3 gap-2 bg-black/40 rounded-2xl p-3 border border-white/10 mb-6 text-xs">
              <div>
                <div className="text-slate-400">Total Turns</div>
                <div className="font-bold text-base text-white">
                  {moveHistory.length}
                </div>
              </div>
              <div>
                <div className="text-slate-400">{matchConfig.p1.name} Left</div>
                <div className="font-bold text-base text-emerald-300">
                  {beadCounts.p1}
                </div>
              </div>
              <div>
                <div className="text-slate-400">{matchConfig.p2.name} Left</div>
                <div className="font-bold text-base text-amber-300">
                  {beadCounts.p2}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  soundFX.playButtonClick();
                  startNewMatch(matchConfig);
                }}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg cursor-pointer"
              >
                Play Again
              </button>
              <button
                onClick={returnToHomeScreen}
                className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm border border-white/15 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Home Screen</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          RULES & STRATEGY GUIDE MODAL
         ===================================================================== */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/15 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Info className="w-5 h-5 text-amber-400" />
                Sholo Guti / Bead 16 Rules
              </h3>
              <button
                onClick={() => setShowRulesModal(false)}
                className="text-xs px-2.5 py-1 rounded-lg bg-white/10 text-slate-300 hover:bg-white/20 cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
              <p className="flex items-start gap-2">
                <CornerDownRight className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Movement:</strong> Players alternate turns moving one bead along any connected graph line (horizontal, vertical, or valid diagonal) to an adjacent empty intersection.
                </span>
              </p>
              <p className="flex items-start gap-2">
                <CornerDownRight className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Capturing (Jumping):</strong> Jump over an adjacent opponent bead into an immediately empty node directly on the opposite side along the same straight connected line.
                </span>
              </p>
              <p className="flex items-start gap-2">
                <CornerDownRight className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Chain Captures:</strong> If your bead lands on a node from which another immediate capture jump is available, you can chain multiple jumps in a single turn!
                </span>
              </p>
              <p className="flex items-start gap-2">
                <CornerDownRight className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Winning the Game:</strong> Capture all of your opponent&apos;s beads OR immobilize their remaining beads so they have no legal moves left.
                </span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;