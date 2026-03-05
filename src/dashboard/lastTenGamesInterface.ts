export enum LastTenGamesWinType {
  EQUAL = 'EQUAL',
  WIN = 'WIN',
  LOSE = 'LOSE',
}

export interface LastTenGamesType {
  id: number;
  name: string;
  bet: number;
  win: LastTenGamesWinType;
}

export interface WeeklyGamesType {
  categoria: string;
  Ganador: number;
  Empate: number;
  Perdedor: number;
}
