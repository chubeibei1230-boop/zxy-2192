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

export type ReviewResult = 'completed' | 'partial' | 'failed';

export const REVIEW_RESULT_LABELS: Record<ReviewResult, string> = {
  completed: '完成',
  partial: '部分完成',
  failed: '未完成'
};

export const REVIEW_RESULT_COLORS: Record<ReviewResult, string> = {
  completed: '#27AE60',
  partial: '#F39C12',
  failed: '#E74C3C'
};

export const STABILITY_THRESHOLD = 3;

export interface PracticeRecord {
  id: string;
  cardId: string;
  date: string;
  durationMin: number;
  result: ReviewResult;
  problems: string;
  gains: string;
  createdAt: string;
}

export interface CardReviewStats {
  practiceCount: number;
  lastPracticeDate: string | null;
  isStable: boolean;
  completedCount: number;
  totalDurationMin: number;
}

export interface FilterCriteria {
  metalSpec?: string;
  difficulty?: number;
  status?: CardStatus;
  owner?: string;
  minDuration?: number;
  maxDuration?: number;
  starredOnly?: boolean;
  sortBy?: 'default' | 'lastPracticeDate' | 'practiceCount' | 'isStable';
  stableFilter?: 'all' | 'stable' | 'unstable';
  minPracticeCount?: number;
  maxPracticeCount?: number;
  lastPracticeDaysAgo?: number;
  minLastPracticeDate?: string;
  maxLastPracticeDate?: string;
}

export type AlertType =
  | 'duplicate_number'
  | 'duration_too_long'
  | 'total_duration_too_long'
  | 'mistakes_empty'
  | 'owner_overloaded'
  | 'starred_no_notes'
  | 'stable_achieved';

export interface ValidationAlert {
  type: AlertType;
  severity: 'warning' | 'error';
  message: string;
  cardIds: string[];
}

export type DailyPlanStatus = 'planning' | 'in_progress' | 'completed';

export type DailyPlanItemStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface DailyPlanItem {
  cardId: string;
  order: number;
  status: DailyPlanItemStatus;
  actualDurationMin?: number;
  completedAt?: string;
  note?: string;
}

export interface DailyPlanSummary {
  totalCount: number;
  completedCount: number;
  skippedCount: number;
  pendingCount: number;
  totalDurationMin: number;
  followUpCardIds: string[];
  summaryText: string;
}

export interface DailyPlan {
  id: string;
  date: string;
  goal: string;
  items: DailyPlanItem[];
  status: DailyPlanStatus;
  startedAt?: string;
  endedAt?: string;
  summary?: DailyPlanSummary;
  createdAt: string;
  updatedAt: string;
}
