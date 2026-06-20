export type CardStatus =
  | 'pending'
  | 'in_progress'
  | 'need_help'
  | 'showcase'
  | 'postponed';

export interface Card {
  id: string;
  patternNumber: string;
  metalSpec: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  steps: string;
  durationMin: number;
  mistakes: string;
  owner: string;
  status: CardStatus;
  starred: boolean;
  reviewNotes: string;
  createdAt: string;
  updatedAt: string;
}

export const STATUS_LABELS: Record<CardStatus, string> = {
  pending: '待练习',
  in_progress: '练习中',
  need_help: '需讲解',
  showcase: '可展示',
  postponed: '暂缓'
};

export const STATUS_COLORS: Record<CardStatus, string> = {
  pending: '#7F8C8D',
  in_progress: '#3498DB',
  need_help: '#E67E22',
  showcase: '#27AE60',
  postponed: '#9B59B6'
};

export const METAL_SPECS = [
  '30x30x0.8mm 铜',
  '50x50x1mm 铜',
  '50x50x1mm 银',
  '60x40x1mm 铜',
  '80x80x1.2mm 银',
  '其他'
] as const;

export const DIFFICULTY_LABELS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: '入门',
  2: '初级',
  3: '中级',
  4: '进阶',
  5: '高级'
};

export interface FilterCriteria {
  metalSpec?: string;
  difficulty?: number;
  status?: CardStatus;
  owner?: string;
  minDuration?: number;
  maxDuration?: number;
  starredOnly?: boolean;
}

export type AlertType =
  | 'duplicate_number'
  | 'duration_too_long'
  | 'mistakes_empty'
  | 'owner_overloaded'
  | 'starred_no_notes';

export interface ValidationAlert {
  type: AlertType;
  severity: 'warning' | 'error';
  message: string;
  cardIds: string[];
}
