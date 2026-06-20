import { store } from '../store';
import type { PracticeRecord, ReviewResult } from '../types';
import {
  REVIEW_RESULT_LABELS,
  REVIEW_RESULT_COLORS,
  STABILITY_THRESHOLD
} from '../types';
import { formatDuration } from '../utils/router';

export class ReviewModal {
  private overlay: HTMLElement;
  private el: HTMLElement;
  private cardId: string | null = null;

  constructor() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'modal-overlay';
    this.el = document.createElement('div');
    this.el.className = 'modal review-modal';
    this.overlay.appendChild(this.el);
  }

  getElement(): HTMLElement {
    return this.overlay;
  }

  open(cardId: string): void {
    this.cardId = cardId;
    this.render();
    this.overlay.style.display = 'flex';
  }

  close(): void {
    this.overlay.style.display = 'none';
    this.cardId = null;
  }

  private render(): void {
    if (!this.cardId) return;
    const card = store.getCard(this.cardId);
    if (!card) return;

    const records = store.getRecords(this.cardId);
    const stats = store.getCardReviewStats(this.cardId);
    const today = new Date().toISOString().slice(0, 10);

    this.el.innerHTML = `
      <div class="modal-header">
        <h2>📝 练习复盘 · ${card.patternNumber}</h2>
        <button class="btn-icon form-close" title="关闭">✕</button>
      </div>
      <div class="modal-body">
        <div class="review-stats">
          <div class="review-stat-card">
            <span class="review-stat-value">${stats.practiceCount}</span>
            <span class="review-stat-label">累计练习</span>
          </div>
          <div class="review-stat-card">
            <span class="review-stat-value">${stats.completedCount}</span>
            <span class="review-stat-label">完成次数</span>
          </div>
          <div class="review-stat-card">
            <span class="review-stat-value">${formatDuration(stats.totalDurationMin)}</span>
            <span class="review-stat-label">累计耗时</span>
          </div>
          <div class="review-stat-card ${stats.isStable ? 'stat-stable' : 'stat-unstable'}">
            <span class="review-stat-value">${stats.isStable ? '✅' : `${stats.completedCount}/${STABILITY_THRESHOLD}`}</span>
            <span class="review-stat-label">${stats.isStable ? '已稳定' : '距稳定'}</span>
          </div>
        </div>
        ${stats.lastPracticeDate ? `<div class="review-last-date">最近练习：${stats.lastPracticeDate}</div>` : ''}

        <div class="review-form-section">
          <h3 class="review-section-title">➕ 记录本次练习</h3>
          <form class="review-form">
            <div class="form-row">
              <div class="form-group">
                <label>练习日期 *</label>
                <input type="date" name="date" value="${today}" required />
              </div>
              <div class="form-group">
                <label>实际耗时(分钟) *</label>
                <input type="number" name="durationMin" min="1" value="${card.durationMin}" required />
              </div>
              <div class="form-group">
                <label>完成结果 *</label>
                <select name="result" required>
                  ${(['completed', 'partial', 'failed'] as ReviewResult[])
                    .map(
                      (r) =>
                        `<option value="${r}">${REVIEW_RESULT_LABELS[r]}</option>`
                    )
                    .join('')}
                </select>
              </div>
            </div>
            <div class="form-group">
              <label>问题备注</label>
              <textarea name="problems" rows="2" placeholder="本次练习遇到的问题..."></textarea>
            </div>
            <div class="form-group">
              <label>本次收获</label>
              <textarea name="gains" rows="2" placeholder="本次练习的收获与心得..."></textarea>
            </div>
            <div class="form-error" style="display:none"></div>
            <button type="submit" class="btn btn-primary review-submit">保存复盘记录</button>
          </form>
        </div>

        <div class="review-history-section">
          <h3 class="review-section-title">📋 复盘轨迹 (${records.length})</h3>
          ${
            records.length === 0
              ? '<div class="empty-state" style="padding:24px"><div class="empty-icon" style="font-size:32px">📝</div><p>暂无练习记录</p><p class="muted">完成练习后在此记录复盘</p></div>'
              : `<div class="review-timeline">
                  ${this.renderTimeline(records)}
                </div>`
          }
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost form-cancel">关闭</button>
      </div>
    `;

    this.bindEvents();
  }

  private renderTimeline(records: PracticeRecord[]): string {
    const sorted = [...records].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return sorted
      .map(
        (r) => `
      <div class="review-entry" data-id="${r.id}">
        <div class="review-entry-marker" style="background:${REVIEW_RESULT_COLORS[r.result]}"></div>
        <div class="review-entry-body">
          <div class="review-entry-head">
            <span class="review-entry-date">${r.date}</span>
            <span class="review-entry-badge" style="background:${REVIEW_RESULT_COLORS[r.result]}">${REVIEW_RESULT_LABELS[r.result]}</span>
            <span class="review-entry-duration">⏱ ${r.durationMin}分钟</span>
          </div>
          ${r.problems ? `<div class="review-entry-problems">⚠ ${r.problems}</div>` : ''}
          ${r.gains ? `<div class="review-entry-gains">💡 ${r.gains}</div>` : ''}
        </div>
        <button class="btn btn-tiny btn-danger review-del" title="删除此记录">✕</button>
      </div>
    `
      )
      .join('');
  }

  private bindEvents(): void {
    this.el.querySelector('.form-close')?.addEventListener('click', () => this.close());
    this.el.querySelector('.form-cancel')?.addEventListener('click', () => this.close());
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });
    document.addEventListener('keydown', this.handleEsc);

    this.el.querySelector('.review-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSave();
    });

    this.el.querySelectorAll<HTMLButtonElement>('.review-del').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const entry = btn.closest<HTMLElement>('.review-entry');
        const id = entry?.dataset.id;
        if (id && confirm('确认删除此条复盘记录？')) {
          store.deleteRecord(id);
          this.render();
        }
      });
    });
  }

  private handleEsc = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      this.close();
      document.removeEventListener('keydown', this.handleEsc);
    }
  };

  private handleSave(): void {
    const form = this.el.querySelector<HTMLFormElement>('.review-form');
    if (!form || !this.cardId) return;
    const fd = new FormData(form);
    const errEl = this.el.querySelector<HTMLElement>('.form-error');

    const date = String(fd.get('date') || '').trim();
    const durationMin = Number(fd.get('durationMin'));
    const result = String(fd.get('result')) as ReviewResult;
    const problems = String(fd.get('problems') || '').trim();
    const gains = String(fd.get('gains') || '').trim();

    if (!date) return this.showError('请选择练习日期', errEl);
    if (!durationMin || durationMin < 1) return this.showError('请填写有效的实际耗时', errEl);

    document.removeEventListener('keydown', this.handleEsc);
    store.addRecord({
      cardId: this.cardId,
      date,
      durationMin,
      result,
      problems,
      gains
    });
    this.render();
  }

  private showError(msg: string, el: HTMLElement | null): void {
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
    setTimeout(() => {
      el.style.display = 'none';
    }, 3000);
  }
}
