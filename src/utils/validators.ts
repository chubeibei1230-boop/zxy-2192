import type { Card, ValidationAlert } from '../types';

const TOO_LONG_MINUTES = 180;
const OWNER_OVERLOAD_THRESHOLD = 5;

export function validateAll(cards: Card[]): ValidationAlert[] {
  const alerts: ValidationAlert[] = [];

  const dupAlert = checkDuplicateNumbers(cards);
  if (dupAlert) alerts.push(dupAlert);

  const longAlert = checkDurationTooLong(cards);
  if (longAlert) alerts.push(longAlert);

  const emptyAlert = checkEmptyMistakes(cards);
  if (emptyAlert) alerts.push(emptyAlert);

  const overloadAlert = checkOwnerOverload(cards);
  if (overloadAlert) alerts.push(overloadAlert);

  const starredAlert = checkStarredNoNotes(cards);
  if (starredAlert) alerts.push(starredAlert);

  return alerts;
}

function checkDuplicateNumbers(cards: Card[]): ValidationAlert | null {
  const map = new Map<string, string[]>();
  for (const c of cards) {
    const key = c.patternNumber.trim();
    if (!key) continue;
    const list = map.get(key) || [];
    list.push(c.id);
    map.set(key, list);
  }
  const dupIds: string[] = [];
  for (const ids of map.values()) {
    if (ids.length > 1) dupIds.push(...ids);
  }
  if (dupIds.length === 0) return null;
  return {
    type: 'duplicate_number',
    severity: 'error',
    message: `发现 ${dupIds.length} 张卡片存在图案编号重复`,
    cardIds: dupIds
  };
}

function checkDurationTooLong(cards: Card[]): ValidationAlert | null {
  const ids = cards
    .filter((c) => c.durationMin > TOO_LONG_MINUTES)
    .map((c) => c.id);
  if (ids.length === 0) return null;
  return {
    type: 'duration_too_long',
    severity: 'warning',
    message: `${ids.length} 张卡片预计时长超过 ${TOO_LONG_MINUTES} 分钟，建议拆分`,
    cardIds: ids
  };
}

function checkEmptyMistakes(cards: Card[]): ValidationAlert | null {
  const ids = cards
    .filter((c) => !c.mistakes.trim())
    .map((c) => c.id);
  if (ids.length === 0) return null;
  return {
    type: 'mistakes_empty',
    severity: 'warning',
    message: `${ids.length} 张卡片未填写"常见失误"，不利于复盘`,
    cardIds: ids
  };
}

function checkOwnerOverload(cards: Card[]): ValidationAlert | null {
  const active = cards.filter(
    (c) => c.status === 'pending' || c.status === 'in_progress'
  );
  const countMap = new Map<string, string[]>();
  for (const c of active) {
    const o = c.owner.trim();
    if (!o) continue;
    const list = countMap.get(o) || [];
    list.push(c.id);
    countMap.set(o, list);
  }
  const ids: string[] = [];
  for (const [owner, cardIds] of countMap) {
    if (cardIds.length > OWNER_OVERLOAD_THRESHOLD) {
      ids.push(...cardIds);
      void owner;
    }
  }
  if (ids.length === 0) return null;
  return {
    type: 'owner_overloaded',
    severity: 'warning',
    message: `部分责任人待办任务超过 ${OWNER_OVERLOAD_THRESHOLD} 项，请注意分配`,
    cardIds: ids
  };
}

function checkStarredNoNotes(cards: Card[]): ValidationAlert | null {
  const ids = cards
    .filter((c) => c.starred && !c.reviewNotes.trim())
    .map((c) => c.id);
  if (ids.length === 0) return null;
  return {
    type: 'starred_no_notes',
    severity: 'warning',
    message: `${ids.length} 张重点卡片缺少复盘提示`,
    cardIds: ids
  };
}
