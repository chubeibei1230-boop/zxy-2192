import type { Card } from '../types';
import { STATUS_LABELS, STATUS_COLORS, DIFFICULTY_LABELS } from '../types';
import { formatDuration } from '../utils/router';

export class CardItem {
  private el: HTMLElement;
  private card: Card;
  private isSelected = false;
  private isHighlighted = false;
  private onEdit: (id: string) => void;
  private onDelete: (id: string) => void;
  private onDuplicate: (id: string) => void;
  private onToggleStar: (id: string) => void;
  private onToggleSelect: (id: string, selected: boolean) => void;

  constructor(
    card: Card,
    handlers: {
      onEdit: (id: string) => void;
      onDelete: (id: string) => void;
      onDuplicate: (id: string) => void;
      onToggleStar: (id: string) => void;
      onToggleSelect: (id: string, selected: boolean) => void;
    }
  ) {
    this.card = card;
    this.onEdit = handlers.onEdit;
    this.onDelete = handlers.onDelete;
    this.onDuplicate = handlers.onDuplicate;
    this.onToggleStar = handlers.onToggleStar;
    this.onToggleSelect = handlers.onToggleSelect;
    this.el = document.createElement('article');
    this.el.className = 'card-item';
    this.render();
  }

  getElement(): HTMLElement {
    return this.el;
  }

  getCardId(): string {
    return this.card.id;
  }

  setHighlighted(v: boolean): void {
    this.isHighlighted = v;
    this.el.classList.toggle('card-highlight', v);
    if (v) {
      this.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  setSelected(v: boolean): void {
    this.isSelected = v;
    this.el.classList.toggle('card-selected', v);
    const cb = this.el.querySelector<HTMLInputElement>('.card-select');
    if (cb) cb.checked = v;
  }

  update(card: Card): void {
    this.card = card;
    this.render();
    if (this.isSelected) this.el.classList.add('card-selected');
    if (this.isHighlighted) this.el.classList.add('card-highlight');
  }

  private render(): void {
    const c = this.card;
    const diffWidth = (c.difficulty / 5) * 100;
    const stepsPreview = c.steps.split('\n')[0].slice(0, 40);

    this.el.innerHTML = `
      <div class="card-header" style="border-left:4px solid ${STATUS_COLORS[c.status]}">
        <label class="card-select-wrap">
          <input type="checkbox" class="card-select" ${this.isSelected ? 'checked' : ''} />
        </label>
        <div class="card-title">
          <span class="card-number">${c.patternNumber}</span>
          <span class="card-spec">${c.metalSpec}</span>
        </div>
        <button class="btn-icon card-star" title="${c.starred ? '取消收藏' : '重点收藏'}">
          ${c.starred ? '⭐' : '☆'}
        </button>
      </div>
      <div class="card-body">
        <div class="card-difficulty">
          <span class="diff-label">难度 ${c.difficulty} · ${DIFFICULTY_LABELS[c.difficulty]}</span>
          <div class="diff-bar"><div class="diff-bar-fill" style="width:${diffWidth}%"></div></div>
        </div>
        <div class="card-meta">
          <span class="card-badge" style="background:${STATUS_COLORS[c.status]}">${STATUS_LABELS[c.status]}</span>
          <span class="card-duration">⏱ ${formatDuration(c.durationMin)}</span>
          <span class="card-owner">👤 ${c.owner || '未分配'}</span>
        </div>
        <div class="card-preview">
          ${stepsPreview ? `<p>${stepsPreview}${c.steps.length > 40 ? '...' : ''}</p>` : '<p class="muted">暂无步骤描述</p>'}
        </div>
        ${c.mistakes ? `<div class="card-mistakes">⚠ ${c.mistakes.slice(0, 30)}${c.mistakes.length > 30 ? '...' : ''}</div>` : ''}
        ${c.reviewNotes ? `<div class="card-review">💡 ${c.reviewNotes.slice(0, 30)}${c.reviewNotes.length > 30 ? '...' : ''}</div>` : ''}
      </div>
      <div class="card-actions">
        <button class="btn btn-small card-edit">编辑</button>
        <button class="btn btn-small card-dup">复制</button>
        <button class="btn btn-small btn-danger card-del">删除</button>
      </div>
    `;

    this.el.querySelector('.card-star')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onToggleStar(c.id);
    });
    this.el.querySelector<HTMLInputElement>('.card-select')?.addEventListener('change', (e) => {
      const cb = e.target as HTMLInputElement;
      this.isSelected = cb.checked;
      this.el.classList.toggle('card-selected', cb.checked);
      this.onToggleSelect(c.id, cb.checked);
    });
    this.el.querySelector('.card-edit')?.addEventListener('click', () => this.onEdit(c.id));
    this.el.querySelector('.card-dup')?.addEventListener('click', () => this.onDuplicate(c.id));
    this.el.querySelector('.card-del')?.addEventListener('click', () => {
      if (confirm(`确认删除卡片"${c.patternNumber}"？`)) this.onDelete(c.id);
    });
    this.el.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('button, input, label')) return;
      this.onEdit(c.id);
    });
  }
}
