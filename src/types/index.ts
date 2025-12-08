export type Song = string;

export interface PlayRequest {
  filename: string;
  startTime: number;
}

export interface DeckState {
  isActive: boolean;
  song: string | null;
}