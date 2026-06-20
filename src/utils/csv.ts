import type { Card } from '../types';
import { STATUS_LABELS, DIFFICULTY_LABELS } from '../types';

const HEADERS = [
  '图案编号',
  '金属规格',
  '难度',
  '錾刻步骤',
  '预计时长(分钟)',
  '常见失误',
  '责任人',
  '状态',
  '是否重点',
  '复盘提示'
];

export function exportToCSV(cards: Card[]): void {
  const rows = cards.map((c) => [
    c.patternNumber,
    c.metalSpec,
    DIFFICULTY_LABELS[c.difficulty],
    c.steps.replace(/\n/g, ' / '),
    String(c.durationMin),
    c.mistakes,
    c.owner,
    STATUS_LABELS[c.status],
    c.starred ? '是' : '否',
    c.reviewNotes
  ]);

  const csvContent =
    '\uFEFF' +
    [HEADERS, ...rows]
      .map((row) => row.map(escapeCSV).join(','))
      .join('\n');

  const blob = new Blob([csvContent], {
    type: 'text/csv;charset=utf-8;'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  a.setAttribute('href', url);
  a.setAttribute('download', `錾刻练习卡_${date}.csv`);
  a.style.visibility = 'hidden';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
