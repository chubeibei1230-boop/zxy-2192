import type { Card, CardStatus } from '../types';
import { loadCards, saveCards, generateId } from '../utils/storage';

type Listener = () => void;

class Store {
  private cards: Card[] = [];
  private listeners: Set<Listener> = new Set();

  constructor() {
    this.cards = loadCards();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    saveCards(this.cards);
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
}

export const store = new Store();
