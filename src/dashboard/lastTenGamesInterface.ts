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
