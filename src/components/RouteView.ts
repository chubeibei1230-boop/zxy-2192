import type { Card } from '../types';
import {
  STATUS_LABELS,
  STATUS_COLORS,
  DIFFICULTY_LABELS
} from '../types';
import { formatDuration, estimateTotalDuration } from '../utils/router';
import { store } from '../store';

export class RouteView {
  private el: HTMLElement;
  private onCardClick: (id: string) => void;
  private done: Set<string> = new Set();

  constructor(onCardClick: (id: string) => void) {
    this.onCardClick = onCardClick;
    this.el = document.createElement('section');
    this.el.className = 'route-view';
  }

  getElement(): HTMLElement {
    return this.el;
  }

  update(route: Card[]): void {
    const total = estimateTotalDuration(route);
    const doneCount = this.done.size;

    this.el.innerHTML = `
      <div class="route-header">
        <div class="route-info">
          <h2>🗺️ 练习路线</h2>
          <p class="muted">按难度递增排列，共 ${route.length} 张卡片 · 预计总时长 ${formatDuration(total)}</p>
        </div>
        <div class="route-progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width:${route.length ? (doneCount / route.length) * 100 : 0}%"></div>
          </div>
          <span class="progress-text">${doneCount} / ${route.length}</span>
        </div>
      </div>
      <div class="route-timeline">
        ${
          route.length === 0
            ? `<div class="empty-state"><div class="empty-icon">📋</div><p>暂无可安排的练习卡片</p></div>`
            : route
                .map(
                  (c, idx) => {
                    const stats = store.getCardReviewStats(c.id);
                    return `
              <div class="route-step ${this.done.has(c.id) ? 'is-done' : ''}" data-id="${c.id}">
                <div class="route-marker" style="background:var(--diff-${c.difficulty})">
                  <span>${idx + 1}</span>
                </div>
                <div class="route-line"></div>
                <div class="route-card" style="border-left:3px solid var(--diff-${c.difficulty})">
                  <div class="route-card-head">
                    <div>
                      <span class="card-number">${c.patternNumber}</span>
                      <span class="diff-tag diff-${c.difficulty}">${DIFFICULTY_LABELS[c.difficulty]}</span>
                      <span class="card-badge" style="background:${STATUS_COLORS[c.status]}">${STATUS_LABELS[c.status]}</span>
                      ${stats.isStable ? '<span class="route-stable-badge">✅ 稳定</span>' : ''}
                    </div>
                    <label class="route-check">
                      <input type="checkbox" ${this.done.has(c.id) ? 'checked' : ''} />
                      <span>已练</span>
                    </label>
                  </div>
                  <div class="route-card-body">
                    <div class="meta-row">
                      <span>📏 ${c.metalSpec}</span>
                      <span>⏱ ${formatDuration(c.durationMin)}</span>
                      <span>👤 ${c.owner || '未分配'}</span>
                      ${c.starred ? '<span>⭐ 重点</span>' : ''}
                      ${stats.practiceCount > 0 ? `<span>📝 ${stats.practiceCount}次</span>` : ''}
                    </div>
                    ${c.steps ? `<p class="route-steps">${c.steps.split('\n').slice(0, 2).join(' / ')}</p>` : ''}
                    ${c.mistakes ? `<div class="route-mistakes">⚠ ${c.mistakes}</div>` : ''}
                  </div>
                </div>
              </div>
            `;
                  }
                )
                .join('')
        }
      </div>
    `;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.el.querySelectorAll<HTMLElement>('.route-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('input, label')) return;
        const step = card.closest<HTMLElement>('.route-step');
        const id = step?.dataset.id;
        if (id) this.onCardClick(id);
      });
    });

    this.el.querySelectorAll<HTMLInputElement>('.route-check input').forEach((cb) => {
      cb.addEventListener('change', (e) => {
        const step = (e.target as HTMLElement).closest<HTMLElement>('.route-step');
        const id = step?.dataset.id;
        if (!id) return;
        if (cb.checked) this.done.add(id);
        else this.done.delete(id);
        step?.classList.toggle('is-done', cb.checked);
        this.updateProgress();
      });
    });
  }

  private updateProgress(): void {
    const total = this.el.querySelectorAll('.route-step').length;
    const done = this.done.size;
    const fill = this.el.querySelector<HTMLElement>('.progress-fill');
    const text = this.el.querySelector<HTMLElement>('.progress-text');
    if (fill) fill.style.width = total ? `${(done / total) * 100}%` : '0%';
    if (text) text.textContent = `${done} / ${total}`;
  }
}
