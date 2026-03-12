import { Injectable } from '@nestjs/common';

export type PlayerColor = 'red' | 'blue' | 'yellow' | 'green';

/** Número de casa (1–4). La casa 1 siempre inicia. */
export type HouseNumber = 1 | 2 | 3 | 4;

/**
 * Casas activas según cantidad de jugadores:
 * - 2 jugadores → casas 1 y 3
 * - 3 jugadores → casas 1, 2 y 3
 * - 4 jugadores → casas 1, 2, 3 y 4
 */
const HOUSE_ASSIGNMENT: Record<number, HouseNumber[]> = {
  2: [1, 3],
  3: [1, 2, 3],
  4: [1, 2, 3, 4],
};

/** Color asociado a cada casa. */
const HOUSE_COLOR: Record<HouseNumber, PlayerColor> = {
  1: 'yellow',
  2: 'red',
  3: 'green',
  4: 'blue',
};

export interface Piece {
  id: number;
  position: number;
  isInJail: boolean;
  isInHome: boolean;
  isFinished: boolean;
}

export interface Player {
  id: string;
  userId: string;
  name: string;
  color: PlayerColor;
  /** Número de casa asignado (1–4). */
  house: HouseNumber;
  pieces: Piece[];
  isActive: boolean;
  consecutiveTurns: number;
  consecutiveDoubles: number;
  rollAttempts: number;
}

export interface DiceRoll {
  dice1: number;
  dice2: number;
  total: number;
  canRollAgain: boolean;
  releasedFromJail?: boolean;
  threeDoublesReward?: boolean;
  attemptsRemaining?: number;
}

export interface Move {
  pieceId: number;
  fromPosition: number;
  toPosition: number;
  captured?: boolean;
}

export interface GameState {
  id: string;
  roomId: string;
  players: Player[];
  currentPlayerIndex: number;
  diceValue: number | null;
  gameStarted: boolean;
  gameFinished: boolean;
  winner: string | null;
  lastRoll: DiceRoll | null;
}

// ────────────────────────────────────────────────────────────────────────────
// Board constants
// ────────────────────────────────────────────────────────────────────────────

/** Number of squares in the main circular track (1‒68). */
const BOARD_SIZE = 68;

/** Virtual position for pieces still in jail. */
const JAIL = 0;

/** Virtual position for pieces that have reached home. */
const FINISHED = 999;

interface ColorConfig {
  /** Position where pieces land when exiting jail. */
  exitPos: number;
  /** Last main‑track square before the home stretch. */
  homeEntry: number;
  /**
   * Base for home‑stretch positions.
   * homeBase+1 … homeBase+5 = home stretch squares
   * homeBase+6                = finished (piece removed)
   */
  homeBase: number;
  /**
   * Explicit cell IDs for the 5 home-stretch squares (casillas de llegada).
   * Only pieces of this color may enter these cells.
   */
  homeStretch: [number, number, number, number, number];
}

const COLOR_CONFIGS: Record<PlayerColor, ColorConfig> = {
  red:    { exitPos: 22, homeEntry: 17, homeBase: 100, homeStretch: [101, 102, 103, 104, 105] },
  blue:   { exitPos: 56, homeEntry: 51, homeBase: 200, homeStretch: [201, 202, 203, 204, 205] },
  green:  { exitPos: 39, homeEntry: 34, homeBase: 300, homeStretch: [301, 302, 303, 304, 305] },
  yellow: { exitPos:  5, homeEntry: 68, homeBase: 400, homeStretch: [401, 402, 403, 404, 405] },
};

/**
 * Maps each home-stretch cell ID to its owning color.
 * Only a piece of the matching color may enter these cells.
 */
const HOME_STRETCH_OWNER = new Map<number, PlayerColor>(
  (Object.entries(COLOR_CONFIGS) as [PlayerColor, ColorConfig][]).flatMap(
    ([color, cfg]) => cfg.homeStretch.map((pos) => [pos, color] as [number, PlayerColor]),
  ),
);

/**
 * Squares where pieces cannot be captured.
 * Includes exit squares and the fixed "seguro" squares.
 */
// Safe cells as marked on the board: the 4 exit cells + 4 mid-straight seguros.
const SAFE_POSITIONS = new Set([5, 12, 22, 29, 39, 46, 56, 63]);

// ────────────────────────────────────────────────────────────────────────────

@Injectable()
export class ParquesService {
  private games = new Map<string, GameState>();

  // ── Game lifecycle ──────────────────────────────────────────────────────

  private createGame(gameId: string, roomId = ''): GameState {
    const game: GameState = {
      id: gameId,
      roomId,
      players: [],
      currentPlayerIndex: 0,
      diceValue: null,
      gameStarted: false,
      gameFinished: false,
      winner: null,
      lastRoll: null,
    };
    this.games.set(gameId, game);
    return game;
  }

  /**
   * Pre-initialise a game from the room/meetup lifecycle (called by prepareGameData).
   * Players are added with placeholder socket IDs; they acquire real IDs when
   * they connect via joinGame (treated as a reconnection).
   */
  initGame(
    meetupId: string,
    players: { name: string; userId: string }[],
    roomId: string,
  ): GameState | null {
    if (players.length < 2) return null;
    // Always overwrite – a partial game may exist from an early socket connection.
    this.createGame(meetupId, roomId);
    for (const { name, userId } of players) {
      const result = this.joinGame(meetupId, name, `pending_${userId}`, userId);
      if ('error' in result) return null;
    }
    return this.startGame(meetupId);
  }

  joinGame(
    gameId: string,
    playerName: string,
    socketId: string,
    userId = '',
  ): { player: Player; game: GameState } | { error: string } {
    let game = this.games.get(gameId) ?? this.createGame(gameId);

    // Reconexión / actualización de socket ID (por userId si está disponible, sino por nombre)
    const existing = userId
      ? game.players.find((p) => p.userId === userId)
      : game.players.find((p) => p.name === playerName);
    if (existing) {
      existing.id = socketId;
      existing.isActive = true;
      return { player: existing, game };
    }

    if (game.gameStarted) return { error: 'La partida ya comenzó' };
    if (game.players.length >= 4) return { error: 'La sala está llena' };

    // Casa provisional en orden de llegada (1, 2, 3, 4).
    // Al iniciar el juego se reasignan según el total de jugadores.
    const provisionalHouse = (game.players.length + 1) as HouseNumber;
    const player: Player = {
      id: socketId,
      userId,
      name: playerName,
      color: HOUSE_COLOR[provisionalHouse],
      house: provisionalHouse,
      pieces: this.createPieces(),
      isActive: true,
      consecutiveTurns: 0,
      consecutiveDoubles: 0,
      rollAttempts: 0,
    };

    game.players.push(player);
    return { player, game };
  }

  /**
   * Inicia la partida y reasigna casas y colores según la cantidad de jugadores:
   * - 2 jugadores → casas 1 y 3
   * - 3 jugadores → casas 1, 2 y 3
   * - 4 jugadores → casas 1, 2, 3 y 4
   * El jugador de la casa 1 (primero en unirse) siempre inicia.
   */
  startGame(gameId: string): GameState | null {
    const game = this.games.get(gameId);
    if (!game || game.players.length < 2 || game.gameStarted) return null;

    const houses = HOUSE_ASSIGNMENT[game.players.length] ?? [1, 2, 3, 4];
    game.players.forEach((player, index) => {
      player.house = houses[index];
      player.color = HOUSE_COLOR[houses[index]];
    });

    // Ordenar jugadores por número de casa para que el turno siempre
    // avance en orden ascendente de casas (1 → 2 → 3 → 4).
    game.players.sort((a, b) => a.house - b.house);

    game.gameStarted = true;
    game.currentPlayerIndex = 0; // casa 1 siempre inicia
    return game;
  }

  // ── Dice ───────────────────────────────────────────────────────────────

  rollDice(
    gameId: string,
    playerId: string,
  ): { diceRoll: DiceRoll; validMoves: Move[] } | { error: string } | null {
    const game = this.games.get(gameId);
    if (!game?.gameStarted) return null;

    const playerIdx = game.players.findIndex((p) => p.id === playerId);
    if (playerIdx !== game.currentPlayerIndex)
      return { error: 'No es tu turno' };

    if (game.lastRoll && !game.lastRoll.canRollAgain)
      return { error: 'Ya tiraste los dados, mueve una ficha' };

    const player = game.players[playerIdx];
    const dice1 = this.randomDie();
    const dice2 = this.randomDie();
    const isDouble = dice1 === dice2;

    const allInJail = player.pieces.every((p) => p.isInJail || p.isFinished);

    let diceRoll: DiceRoll = {
      dice1,
      dice2,
      total: dice1 + dice2,
      canRollAgain: false,
    };

    if (allInJail) {
      player.rollAttempts++;

      if (isDouble) {
        // Sacó par → todas las fichas salen automáticamente a la casilla de salida.
        // El jugador conserva el turno para un lanzamiento extra (como cualquier par).
        const cfg = COLOR_CONFIGS[player.color];
        for (const p of player.pieces) {
          if (p.isInJail) {
            p.position = cfg.exitPos;
            p.isInJail = false;
          }
        }
        diceRoll.releasedFromJail = true;
        diceRoll.canRollAgain = true;
        diceRoll.attemptsRemaining = 0;
        player.rollAttempts = 0;
        player.consecutiveDoubles = 0;
        // Guardar el roll para que el próximo rollDice no sea rechazado.
        game.lastRoll = diceRoll;
        return { diceRoll, validMoves: [] };
      } else if (player.rollAttempts >= 3) {
        // Agotó los 3 intentos sin par → turno pasa al siguiente jugador.
        player.rollAttempts = 0;
        diceRoll.attemptsRemaining = 0;
        this.advanceTurn(game);
        return { diceRoll, validMoves: [] };
      } else {
        // Intento fallido (1° o 2°) — el jugador conserva el turno y puede volver a tirar.
        diceRoll.attemptsRemaining = 3 - player.rollAttempts;
        return { diceRoll, validMoves: [] };
      }
    } else {
      if (isDouble) {
        player.consecutiveDoubles++;
        if (player.consecutiveDoubles >= 3) {
          diceRoll.threeDoublesReward = true;
          diceRoll.canRollAgain = true;
          player.consecutiveDoubles = 0;
        } else {
          diceRoll.canRollAgain = true;
        }
      } else {
        player.consecutiveDoubles = 0;
      }
    }

    game.lastRoll = diceRoll;
    const validMoves = this.calculateValidMoves(game, player, diceRoll);

    // Auto‑advance when nothing can be done
    if (validMoves.length === 0 && !diceRoll.canRollAgain) {
      this.advanceTurn(game);
    }

    return { diceRoll, validMoves };
  }

  // ── Piece movement ─────────────────────────────────────────────────────

  movePiece(
    gameId: string,
    playerId: string,
    pieceId: number,
  ): { game: GameState; captured: boolean } | { error: string } | null {
    const game = this.games.get(gameId);
    if (!game?.lastRoll) return null;

    const playerIdx = game.players.findIndex((p) => p.id === playerId);
    if (playerIdx !== game.currentPlayerIndex)
      return { error: 'No es tu turno' };

    const player = game.players[playerIdx];
    const piece = player.pieces.find((p) => p.id === pieceId);
    if (!piece) return { error: 'Ficha no encontrada' };

    const validMoves = this.calculateValidMoves(game, player, game.lastRoll);
    const move = validMoves.find((m) => m.pieceId === pieceId);
    if (!move) return { error: 'Movimiento no válido' };

    const captured = move.captured ?? false;

    // Capture enemy pieces
    if (captured) {
      for (const other of game.players) {
        if (other.id === playerId) continue;
        for (const op of other.pieces) {
          if (
            op.position === move.toPosition &&
            !op.isInJail &&
            !op.isFinished
          ) {
            op.position = JAIL;
            op.isInJail = true;
            other.rollAttempts = 0;
          }
        }
      }
    }

    // threeDoublesReward: auto‑release all jail pieces
    if (game.lastRoll.threeDoublesReward) {
      const cfg = COLOR_CONFIGS[player.color];
      for (const p of player.pieces) {
        if (p.isInJail) {
          p.position = cfg.exitPos;
          p.isInJail = false;
          p.isInHome = false;
        }
      }
    }

    // Apply the move
    piece.position = move.toPosition;
    piece.isInJail = false;
    piece.isInHome = HOME_STRETCH_OWNER.has(move.toPosition);
    piece.isFinished = move.toPosition === FINISHED;

    // Check winner
    if (player.pieces.every((p) => p.isFinished)) {
      game.gameFinished = true;
      game.winner = player.name;
    }

    if (!game.lastRoll.canRollAgain || game.gameFinished) {
      this.advanceTurn(game);
    } else {
      game.lastRoll = null; // Same player rolls again
    }

    return { game, captured };
  }

  skipTurn(gameId: string, playerId: string): GameState | null {
    const game = this.games.get(gameId);
    if (!game) return null;
    const playerIdx = game.players.findIndex((p) => p.id === playerId);
    if (playerIdx !== game.currentPlayerIndex) return null;
    this.advanceTurn(game);
    return game;
  }

  disconnectPlayer(gameId: string, playerId: string): void {
    const game = this.games.get(gameId);
    if (!game) return;
    const player = game.players.find((p) => p.id === playerId);
    if (player) player.isActive = false;
  }

  getGame(gameId: string): GameState | undefined {
    return this.games.get(gameId);
  }

  // ── Private helpers ────────────────────────────────────────────────────

  private randomDie(): number {
    return Math.floor(Math.random() * 6) + 1;
  }

  private createPieces(): Piece[] {
    return Array.from({ length: 4 }, (_, i) => ({
      id: i,
      position: JAIL,
      isInJail: true,
      isInHome: false,
      isFinished: false,
    }));
  }

  private advanceTurn(game: GameState): void {
    game.lastRoll = null;
    game.currentPlayerIndex =
      (game.currentPlayerIndex + 1) % game.players.length;
  }

  private calculateValidMoves(
    game: GameState,
    player: Player,
    diceRoll: DiceRoll,
  ): Move[] {
    const moves: Move[] = [];
    const cfg = COLOR_CONFIGS[player.color];

    for (const piece of player.pieces) {
      if (piece.isFinished) continue;

      if (piece.isInJail) {
        if (diceRoll.releasedFromJail || diceRoll.threeDoublesReward) {
          if (this.canMoveTo(game, player, cfg.exitPos)) {
            moves.push({
              pieceId: piece.id,
              fromPosition: JAIL,
              toPosition: cfg.exitPos,
            });
          }
        }
        continue;
      }

      const newPos = this.advancePosition(
        piece.position,
        diceRoll.total,
        player.color,
      );
      if (newPos === null) continue;
      if (!this.canMoveTo(game, player, newPos)) continue;

      moves.push({
        pieceId: piece.id,
        fromPosition: piece.position,
        toPosition: newPos,
        captured: this.wouldCapture(game, player, newPos),
      });
    }

    return moves;
  }

  /**
   * Returns the new position after advancing `steps` from `from` for `color`.
   * Returns null if the move is impossible (overshoot).
   */
  private advancePosition(
    from: number,
    steps: number,
    color: PlayerColor,
  ): number | null {
    const cfg = COLOR_CONFIGS[color];

    // Already on home stretch
    if (from > cfg.homeBase && from <= cfg.homeBase + 6) {
      const currentStep = from - cfg.homeBase;
      const newStep = currentStep + steps;
      if (newStep > 6) return null;
      if (newStep === 6) return FINISHED;
      return cfg.homeBase + newStep;
    }

    // Main track: how far is homeEntry going clockwise?
    const distToHome = this.circularDistance(from, cfg.homeEntry);

    if (steps <= distToHome) {
      // Normal main‑track advance (or landing exactly on homeEntry)
      return ((from - 1 + steps) % BOARD_SIZE) + 1;
    }

    // Entering home stretch
    const stepsIntoHome = steps - distToHome;
    if (stepsIntoHome > 6) return null; // Overshoot
    if (stepsIntoHome === 6) return FINISHED;
    return cfg.homeBase + stepsIntoHome;
  }

  /** Clockwise distance from `from` to `to` on the BOARD_SIZE circle. */
  private circularDistance(from: number, to: number): number {
    if (from === to) return 0;
    if (to > from) return to - from;
    return BOARD_SIZE - from + to;
  }

  private canMoveTo(
    game: GameState,
    mover: Player,
    position: number,
  ): boolean {
    if (position === FINISHED) return true;

    // Home-stretch cells: only the owning color may enter
    const homeOwner = HOME_STRETCH_OWNER.get(position);
    if (homeOwner !== undefined && homeOwner !== mover.color) return false;

    // Own pieces: no stacking beyond 2 (creates a blockade, still legal)
    const ownCount = mover.pieces.filter(
      (p) => p.position === position && !p.isFinished,
    ).length;
    if (ownCount >= 2) return false;

    // Enemy blockade (2+ enemy pieces on same non‑safe square)
    if (!SAFE_POSITIONS.has(position) && !this.isHomePosition(position)) {
      for (const other of game.players) {
        if (other.id === mover.id) continue;
        const enemyCount = other.pieces.filter(
          (p) => p.position === position && !p.isInJail && !p.isFinished,
        ).length;
        if (enemyCount >= 2) return false;
      }
    }

    return true;
  }

  private wouldCapture(
    game: GameState,
    mover: Player,
    position: number,
  ): boolean {
    if (SAFE_POSITIONS.has(position)) return false;
    if (this.isHomePosition(position)) return false;

    for (const other of game.players) {
      if (other.id === mover.id) continue;
      if (
        other.pieces.some(
          (p) => p.position === position && !p.isInJail && !p.isFinished,
        )
      )
        return true;
    }
    return false;
  }

  private isHomePosition(position: number): boolean {
    return HOME_STRETCH_OWNER.has(position);
  }
}
