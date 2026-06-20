import type { Card, FilterCriteria } from '../types';

export function filterCards(
  cards: Card[],
  criteria: FilterCriteria
): Card[] {
  return cards.filter((card) => {
    if (criteria.metalSpec && criteria.metalSpec !== card.metalSpec) {
      return false;
    }
    if (
      criteria.difficulty !== undefined &&
      criteria.difficulty !== card.difficulty
    ) {
      return false;
    }
    if (criteria.status && criteria.status !== card.status) {
      return false;
    }
    if (criteria.owner && criteria.owner !== card.owner) {
      return false;
    }
    if (
      criteria.minDuration !== undefined &&
      card.durationMin < criteria.minDuration
    ) {
      return false;
    }
    if (
      criteria.maxDuration !== undefined &&
      card.durationMin > criteria.maxDuration
    ) {
      return false;
    }
    if (criteria.starredOnly && !card.starred) {
      return false;
    }
    return true;
  });
}

export function collectOwners(cards: Card[]): string[] {
  const set = new Set<string>();
  for (const c of cards) {
    if (c.owner.trim()) set.add(c.owner.trim());
  }
  return Array.from(set).sort();
}

export function collectMetalSpecs(cards: Card[]): string[] {
  const set = new Set<string>();
  for (const c of cards) {
    if (c.metalSpec.trim()) set.add(c.metalSpec.trim());
  }
  return Array.from(set).sort();
}
