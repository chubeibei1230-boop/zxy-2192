import type { Card, CardStatus, PracticeRecord, CardReviewStats } from '../types';
import { STABILITY_THRESHOLD } from '../types';
import { loadCards, saveCards, loadRecords, saveRecords, generateId } from '../utils/storage';

type Listener = () => void;

class Store {
  private cards: Card[] = [];
  private records: PracticeRecord[] = [];
  private listeners: Set<Listener> = new Set();

  constructor() {
    this.cards = loadCards();
    this.records = loadRecords();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    saveCards(this.cards);
    saveRecords(this.records);
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
}

export const store = new Store();
