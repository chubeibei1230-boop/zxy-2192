import type {
  Card,
  CardStatus,
  PracticeRecord,
  CardReviewStats,
  DailyPlan,
  DailyPlanItem,
  DailyPlanSummary
} from '../types';
import { STABILITY_THRESHOLD } from '../types';
import {
  loadCards,
  saveCards,
  loadRecords,
  saveRecords,
  loadDailyPlans,
  saveDailyPlans,
  generateId
} from '../utils/storage';
import { formatDuration } from '../utils/router';

type Listener = () => void;

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysSince(dateStr: string | null): number {
  if (!dateStr) return 9999;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

class Store {
  private cards: Card[] = [];
  private records: PracticeRecord[] = [];
  private dailyPlans: DailyPlan[] = [];
  private listeners: Set<Listener> = new Set();

  constructor() {
    this.cards = loadCards();
    this.records = loadRecords();
    this.dailyPlans = loadDailyPlans();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    saveCards(this.cards);
    saveRecords(this.records);
    saveDailyPlans(this.dailyPlans);
    for (const l of this.listeners) l();
  }

  getCards(): Card[] {
    return [...this.cards];
  }

  getCard(id: string): Card | undefined {
    return this.cards.find((c) => c.id === id);
  }

  addCard(
    data: Omit<Card, 'id' | 'createdAt' | 'updatedAt'>
  ): Card {
    const now = new Date().toISOString();
    const card: Card = {
      ...data,
      id: generateId(),
      createdAt: now,
      updatedAt: now
    };
    this.cards.push(card);
    this.notify();
    return card;
  }

  updateCard(id: string, patch: Partial<Card>): void {
    const idx = this.cards.findIndex((c) => c.id === id);
    if (idx === -1) return;
    const now = new Date().toISOString();
    this.cards[idx] = { ...this.cards[idx], ...patch, updatedAt: now };
    this.notify();
  }

  deleteCard(id: string): void {
    this.cards = this.cards.filter((c) => c.id !== id);
    this.records = this.records.filter((r) => r.cardId !== id);
    this.notify();
  }

  duplicateCard(id: string): Card | null {
    const original = this.cards.find((c) => c.id === id);
    if (!original) return null;
    const now = new Date().toISOString();
    const copy: Card = {
      ...original,
      id: generateId(),
      patternNumber: original.patternNumber + ' (副本)',
      createdAt: now,
      updatedAt: now
    };
    this.cards.push(copy);
    this.notify();
    return copy;
  }

  batchUpdateStatus(ids: string[], status: CardStatus): void {
    const now = new Date().toISOString();
    const idSet = new Set(ids);
    for (let i = 0; i < this.cards.length; i++) {
      if (idSet.has(this.cards[i].id)) {
        this.cards[i] = { ...this.cards[i], status, updatedAt: now };
      }
    }
    this.notify();
  }

  toggleStar(id: string): void {
    const idx = this.cards.findIndex((c) => c.id === id);
    if (idx === -1) return;
    this.cards[idx] = {
      ...this.cards[idx],
      starred: !this.cards[idx].starred,
      updatedAt: new Date().toISOString()
    };
    this.notify();
  }

  getRecords(cardId?: string): PracticeRecord[] {
    if (cardId) return this.records.filter((r) => r.cardId === cardId);
    return [...this.records];
  }

  addRecord(data: Omit<PracticeRecord, 'id' | 'createdAt'>): PracticeRecord {
    const now = new Date().toISOString();
    const record: PracticeRecord = {
      ...data,
      id: generateId(),
      createdAt: now
    };
    this.records.push(record);

    if (data.result === 'completed') {
      const stats = this.getCardReviewStats(data.cardId);
      if (stats.completedCount >= STABILITY_THRESHOLD) {
        const card = this.cards.find((c) => c.id === data.cardId);
        if (card && card.status !== 'showcase') {
          const idx = this.cards.indexOf(card);
          this.cards[idx] = { ...card, status: 'showcase', updatedAt: now };
        }
      }
    }

    this.notify();
    return record;
  }

  deleteRecord(recordId: string): void {
    const record = this.records.find((r) => r.id === recordId);
    if (!record) return;
    const cardId = record.cardId;

    this.records = this.records.filter((r) => r.id !== recordId);

    const now = new Date().toISOString();
    const stats = this.getCardReviewStats(cardId);
    if (stats.completedCount < STABILITY_THRESHOLD) {
      const card = this.cards.find((c) => c.id === cardId);
      if (card && card.status === 'showcase') {
        const idx = this.cards.indexOf(card);
        this.cards[idx] = { ...card, status: 'in_progress', updatedAt: now };
      }
    }

    this.notify();
  }

  getCardReviewStats(cardId: string): CardReviewStats {
    const cardRecords = this.records.filter((r) => r.cardId === cardId);
    const completedRecords = cardRecords.filter((r) => r.result === 'completed');
    const dates = cardRecords.map((r) => r.date).sort();
    const totalDuration = cardRecords.reduce((sum, r) => sum + r.durationMin, 0);

    return {
      practiceCount: cardRecords.length,
      lastPracticeDate: dates.length > 0 ? dates[dates.length - 1] : null,
      isStable: completedRecords.length >= STABILITY_THRESHOLD,
      completedCount: completedRecords.length,
      totalDurationMin: totalDuration
    };
  }

  getTodayPlan(): DailyPlan | null {
    const today = getTodayStr();
    return this.dailyPlans.find((p) => p.date === today) || null;
  }

  getDailyPlans(): DailyPlan[] {
    return [...this.dailyPlans];
  }

  recommendTodayCards(limit: number = 10): Card[] {
    const todayPlan = this.getTodayPlan();
    const existingCardIds = new Set(todayPlan?.items.map((i) => i.cardId) || []);

    const scored = this.cards
      .filter((c) => !existingCardIds.has(c.id))
      .map((card) => {
        const stats = this.getCardReviewStats(card.id);
        let score = 0;

        if (!stats.isStable) score += 50;
        const days = daysSince(stats.lastPracticeDate);
        if (days >= 14) score += 30;
        else if (days >= 7) score += 20;
        else if (days >= 3) score += 10;

        if (card.starred) score += 20;

        if (card.status === 'in_progress') score += 15;
        if (card.status === 'need_help') score += 10;

        score += Math.min(card.difficulty, 5) * 2;

        return { card, score };
      });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((s) => s.card);
  }

  createTodayPlan(cardIds?: string[]): DailyPlan {
    const today = getTodayStr();
    const existing = this.dailyPlans.find((p) => p.date === today);
    if (existing) return existing;

    const ids = cardIds && cardIds.length > 0
      ? cardIds
      : this.recommendTodayCards(8).map((c) => c.id);

    const now = new Date().toISOString();
    const items: DailyPlanItem[] = ids.map((cardId, idx) => ({
      cardId,
      order: idx,
      status: 'pending'
    }));

    const plan: DailyPlan = {
      id: generateId(),
      date: today,
      goal: '',
      items,
      status: 'planning',
      createdAt: now,
      updatedAt: now
    };

    this.dailyPlans.push(plan);
    this.notify();
    return plan;
  }

  updateTodayPlan(patch: Partial<DailyPlan>): void {
    const today = getTodayStr();
    const idx = this.dailyPlans.findIndex((p) => p.date === today);
    if (idx === -1) return;

    const now = new Date().toISOString();
    this.dailyPlans[idx] = {
      ...this.dailyPlans[idx],
      ...patch,
      updatedAt: now
    };
    this.notify();
  }

  addCardsToTodayPlan(cardIds: string[]): void {
    const plan = this.getTodayPlan();
    if (!plan) {
      this.createTodayPlan(cardIds);
      return;
    }

    const existingIds = new Set(plan.items.map((i) => i.cardId));
    const newItems: DailyPlanItem[] = cardIds
      .filter((id) => !existingIds.has(id))
      .map((cardId, idx) => ({
        cardId,
        order: plan.items.length + idx,
        status: 'pending' as const
      }));

    if (newItems.length > 0) {
      this.updateTodayPlan({
        items: [...plan.items, ...newItems]
      });
    }
  }

  removeCardFromTodayPlan(cardId: string): void {
    const plan = this.getTodayPlan();
    if (!plan) return;

    const items = plan.items
      .filter((i) => i.cardId !== cardId)
      .map((item, idx) => ({ ...item, order: idx }));

    this.updateTodayPlan({ items });
  }

  reorderTodayPlanItem(cardId: string, newIndex: number): void {
    const plan = this.getTodayPlan();
    if (!plan) return;

    const items = [...plan.items];
    const fromIdx = items.findIndex((i) => i.cardId === cardId);
    if (fromIdx === -1) return;

    const [moved] = items.splice(fromIdx, 1);
    items.splice(newIndex, 0, moved);

    const reordered = items.map((item, idx) => ({ ...item, order: idx }));
    this.updateTodayPlan({ items: reordered });
  }

  updateTodayPlanItem(cardId: string, patch: Partial<DailyPlanItem>): void {
    const plan = this.getTodayPlan();
    if (!plan) return;

    const items = plan.items.map((item) =>
      item.cardId === cardId ? { ...item, ...patch } : item
    );

    this.updateTodayPlan({ items });
  }

  startTodayPlan(): void {
    const plan = this.getTodayPlan();
    if (!plan || plan.status !== 'planning') return;

    const now = new Date().toISOString();
    this.updateTodayPlan({
      status: 'in_progress',
      startedAt: now
    });
  }

  completeTodayPlanItem(cardId: string, actualDurationMin: number, note?: string): void {
    const plan = this.getTodayPlan();
    if (!plan || plan.status !== 'in_progress') return;

    const now = new Date().toISOString();
    this.updateTodayPlanItem(cardId, {
      status: 'completed',
      actualDurationMin,
      completedAt: now,
      note
    });

    const cardPlanItem = plan.items.find((i) => i.cardId === cardId);
    if (!cardPlanItem || cardPlanItem.status === 'completed') return;

    const card = this.getCard(cardId);
    if (card) {
      this.addRecord({
        cardId,
        date: getTodayStr(),
        durationMin: actualDurationMin,
        result: 'completed',
        problems: note || '',
        gains: ''
      });
    }
  }

  skipTodayPlanItem(cardId: string): void {
    const plan = this.getTodayPlan();
    if (!plan || plan.status !== 'in_progress') return;

    this.updateTodayPlanItem(cardId, {
      status: 'skipped'
    });
  }

  finishTodayPlan(): DailyPlanSummary {
    const plan = this.getTodayPlan();
    if (!plan) {
      return {
        totalCount: 0,
        completedCount: 0,
        skippedCount: 0,
        pendingCount: 0,
        totalDurationMin: 0,
        followUpCardIds: [],
        summaryText: '暂无今日计划'
      };
    }

    const items = plan.items;
    const totalCount = items.length;
    const completedItems = items.filter((i) => i.status === 'completed');
    const skippedItems = items.filter((i) => i.status === 'skipped');
    const pendingItems = items.filter((i) => i.status === 'pending' || i.status === 'in_progress');
    const completedCount = completedItems.length;
    const skippedCount = skippedItems.length;
    const pendingCount = pendingItems.length;

    const totalDurationMin = completedItems.reduce(
      (sum, i) => sum + (i.actualDurationMin || 0),
      0
    );

    const followUpCardIds = [
      ...pendingItems.map((i) => i.cardId),
      ...skippedItems.map((i) => i.cardId)
    ];

    const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    let summaryText = `今日计划共 ${totalCount} 张卡片，完成 ${completedCount} 张，完成率 ${completionRate}%。`;
    if (skippedCount > 0) summaryText += ` 跳过 ${skippedCount} 张。`;
    if (pendingCount > 0) summaryText += ` ${pendingCount} 张待下次继续。`;
    summaryText += ` 总耗时 ${formatDuration(totalDurationMin)}。`;

    if (completionRate >= 80) {
      summaryText += ' 今天表现很棒，继续保持！';
    } else if (completionRate >= 50) {
      summaryText += ' 还不错，下次争取更高完成率。';
    } else {
      summaryText += ' 明天继续加油！';
    }

    const summary: DailyPlanSummary = {
      totalCount,
      completedCount,
      skippedCount,
      pendingCount,
      totalDurationMin,
      followUpCardIds,
      summaryText
    };

    const now = new Date().toISOString();
    this.updateTodayPlan({
      status: 'completed',
      endedAt: now,
      summary
    });

    return summary;
  }

  isCardInTodayPlan(cardId: string): boolean {
    const plan = this.getTodayPlan();
    if (!plan) return false;
    return plan.items.some((i) => i.cardId === cardId);
  }

  getTodayPlanItemStatus(cardId: string): DailyPlanItem['status'] | null {
    const plan = this.getTodayPlan();
    if (!plan) return null;
    const item = plan.items.find((i) => i.cardId === cardId);
    return item?.status || null;
  }
}

export const store = new Store();
