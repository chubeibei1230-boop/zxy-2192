import { store } from '../store';
import type { FilterCriteria, CardStatus } from '../types';
import { STATUS_LABELS, METAL_SPECS, DIFFICULTY_LABELS } from '../types';
import { collectOwners, collectMetalSpecs } from '../utils/filters';

export class Toolbar {
  private el: HTMLElement;
  private onChange: (criteria: FilterCriteria) => void;
  private onAdd: () => void;
  private onExport: () => void;
  private onToggleRoute: () => void;
  private onBatchStatus: (status: CardStatus) => void;
  private criteria: FilterCriteria = {};
  private isRouteMode = false;
  private selectedCount = 0;

  constructor(
    onChange: (c: FilterCriteria) => void,
    onAdd: () => void,
    onExport: () => void,
    onToggleRoute: () => void,
    onBatchStatus: (s: CardStatus) => void
  ) {
    this.onChange = onChange;
    this.onAdd = onAdd;
    this.onExport = onExport;
    this.onToggleRoute = onToggleRoute;
    this.onBatchStatus = onBatchStatus;
    this.el = document.createElement('header');
    this.el.className = 'toolbar';
    this.render();
  }

  getElement(): HTMLElement {
    return this.el;
  }

  setSelectedCount(n: number): void {
    this.selectedCount = n;
    const batchBar = this.el.querySelector<HTMLElement>('.batch-bar');
    if (batchBar) {
      batchBar.style.display = n > 0 ? 'flex' : 'none';
      const countEl = batchBar.querySelector<HTMLElement>('.batch-count');
      if (countEl) countEl.textContent = `已选 ${n} 张`;
    }
  }

  setRouteMode(active: boolean): void {
    this.isRouteMode = active;
    const btn = this.el.querySelector<HTMLButtonElement>('.btn-route');
    if (btn) {
      btn.classList.toggle('active', active);
      btn.textContent = active ? '📋 返回列表' : '🗺️ 练习路线';
    }
  }

  private render(): void {
    const cards = store.getCards();
    const owners = collectOwners(cards);
    const allSpecs = Array.from(new Set([...METAL_SPECS, ...collectMetalSpecs(cards)]));
    const routeBtnLabel = this.isRouteMode ? '📋 返回列表' : '🗺️ 练习路线';
    const routeBtnActive = this.isRouteMode ? ' active' : '';
    const batchBarDisplay = this.selectedCount > 0 ? 'flex' : 'none';

    this.el.innerHTML = `
      <div class="toolbar-main">
        <div class="brand">
          <span class="brand-icon">🔨</span>
          <h1 class="brand-title">金工錾刻练习卡</h1>
        </div>
        <div class="toolbar-actions">
          <button class="btn btn-ghost btn-route${routeBtnActive}" title="按难度生成练习路线">
            ${routeBtnLabel}
          </button>
          <button class="btn btn-ghost btn-export" title="导出CSV">
            📤 导出CSV
          </button>
          <button class="btn btn-primary btn-add" title="新增卡片">
            ➕ 新增卡片
          </button>
        </div>
      </div>
      <div class="filter-bar">
        <div class="filter-group">
          <label>金属规格</label>
          <select class="filter-select" data-filter="metalSpec">
            <option value="">全部</option>
            ${allSpecs.map((s) => `<option value="${s}">${s}</option>`).join('')}
          </select>
        </div>
        <div class="filter-group">
          <label>难度</label>
          <select class="filter-select" data-filter="difficulty">
            <option value="">全部</option>
            ${([1, 2, 3, 4, 5] as const)
              .map((d) => `<option value="${d}">${d} - ${DIFFICULTY_LABELS[d]}</option>`)
              .join('')}
          </select>
        </div>
        <div class="filter-group">
          <label>状态</label>
          <select class="filter-select" data-filter="status">
            <option value="">全部</option>
            ${(Object.keys(STATUS_LABELS) as CardStatus[])
              .map((s) => `<option value="${s}">${STATUS_LABELS[s]}</option>`)
              .join('')}
          </select>
        </div>
        <div class="filter-group">
          <label>责任人</label>
          <select class="filter-select" data-filter="owner">
            <option value="">全部</option>
            ${owners.map((o) => `<option value="${o}">${o}</option>`).join('')}
          </select>
        </div>
        <div class="filter-group filter-duration">
          <label>时长范围(分钟)</label>
          <div class="duration-inputs">
            <input type="number" min="0" class="filter-input" data-filter="minDuration" placeholder="最小" />
            <span>~</span>
            <input type="number" min="0" class="filter-input" data-filter="maxDuration" placeholder="最大" />
          </div>
        </div>
        <div class="filter-group">
          <label class="starred-toggle">
            <input type="checkbox" data-filter="starredOnly" />
            <span>仅重点 ⭐</span>
          </label>
        </div>${batchBarDisplay}
        <button class="btn btn-small ${this.selectedCount}tn-reset" title="重置筛选">重置</button>
      </div>
      <div class="batch-bar" style="display:none">
        <span class="batch-count">已选 0 张</span>
        <div class="batch-actions">
          <span>批量改状态：</span>
          ${(Object.keys(STATUS_LABELS) as CardStatus[])
            .map(
              (s) =>
                `<button class="btn btn-tiny batch-status" data-status="${s}" style="border-left:3px solid var(--status-${s})">${STATUS_LABELS[s]}</button>`
            )
            .join('')}
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.el.querySelector('.btn-add')?.addEventListener('click', () => this.onAdd());
    this.el.querySelector('.btn-export')?.addEventListener('click', () => this.onExport());
    this.el.querySelector('.btn-route')?.addEventListener('click', () => this.onToggleRoute());
    this.el.querySelector('.btn-reset')?.addEventListener('click', () => this.resetFilters());

    this.el.querySelectorAll<HTMLSelectElement>('select[data-filter]').forEach((sel) => {
      sel.addEventListener('change', () => this.updateFilterFromDom());
    });
    this.el.querySelectorAll<HTMLInputElement>('input[data-filter]').forEach((inp) => {
      inp.addEventListener('input', () => this.updateFilterFromDom());
      inp.addEventListener('change', () => this.updateFilterFromDom());
    });

    this.el.querySelectorAll<HTMLButtonElement>('.batch-status').forEach((btn) => {
      btn.addEventListener('click', () => {
        const s = btn.dataset.status as CardStatus;
        if (s) this.onBatchStatus(s);
      });
    });
  }

  private updateFilterFromDom(): void {
    const get = <T extends HTMLSelectElement | HTMLInputElement>(key: string): T | null =>
      this.el.querySelector(`[data-filter="${key}"]`);

    const metalSpec = get<HTMLSelectElement>('metalSpec')?.value || undefined;
    const difficultyRaw = get<HTMLSelectElement>('difficulty')?.value;
    const difficulty = difficultyRaw ? Number(difficultyRaw) : undefined;
    const status = (get<HTMLSelectElement>('status')?.value as CardStatus) || undefined;
    const owner = get<HTMLSelectElement>('owner')?.value || undefined;
    const minDurationRaw = get<HTMLInputElement>('minDuration')?.value;
    const minDuration = minDurationRaw ? Number(minDurationRaw) : undefined;
    const maxDurationRaw = get<HTMLInputElement>('maxDuration')?.value;
    const maxDuration = maxDurationRaw ? Number(maxDurationRaw) : undefined;
    const starredOnly = get<HTMLInputElement>('starredOnly')?.checked || undefined;

    this.criteria = {
      metalSpec,
      difficulty,
      status,
      owner,
      minDuration,
      maxDuration,
      starredOnly
    };
    this.onChange(this.criteria);
  }

  private resetFilters(): void {
    this.el.querySelectorAll<HTMLSelectElement>('select[data-filter]').forEach((s) => (s.value = ''));
    this.el.querySelectorAll<HTMLInputElement>('input[data-filter]').forEach((i) => {
      if (i.type === 'checkbox') i.checked = false;
      else i.value = '';
    });
    this.criteria = {};
    this.onChange(this.criteria);
  }

  refresh(): void {
    this.render();
  }
}
