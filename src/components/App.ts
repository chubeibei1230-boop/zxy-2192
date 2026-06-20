import { store } from '../store';
import type { FilterCriteria, CardStatus, Card } from '../types';
import { Toolbar } from './Toolbar';
import { AlertPanel } from './AlertPanel';
import { CardGrid } from './CardGrid';
import { CardForm } from './CardForm';
import { RouteView } from './RouteView';
import { validateAll } from '../utils/validators';
import { filterCards } from '../utils/filters';
import { exportToCSV } from '../utils/csv';
import { generatePracticeRoute } from '../utils/router';

export class App {
  private root: HTMLElement;
  private toolbar: Toolbar;
  private alertPanel: AlertPanel;
  private cardGrid: CardGrid;
  private routeView: RouteView;
  private cardForm: CardForm;
  private criteria: FilterCriteria = {};
  private isRouteMode = false;
  private editingId: string | null = null;
  private unsubscribe: () => void;

  constructor(root: HTMLElement) {
    this.root = root;
    this.root.className = 'app';

    this.toolbar = new Toolbar(
      (c) => this.handleFilterChange(c),
      () => this.openForm(),
      () => this.handleExport(),
      () => this.toggleRouteMode(),
      (s) => this.handleBatchStatus(s)
    );
    this.alertPanel = new AlertPanel((ids) => this.handleLocate(ids));
    this.cardGrid = new CardGrid({
      onEdit: (id) => this.openForm(id),
      onDelete: (id) => store.deleteCard(id),
      onDuplicate: (id) => store.duplicateCard(id),
      onToggleStar: (id) => store.toggleStar(id),
      onSelectionChange: () => this.handleSelectionChange()
    });
    this.routeView = new RouteView((id) => this.openForm(id));
    this.cardForm = new CardForm(
      (data) => this.handleSave(data),
      () => (this.editingId = null)
    );

    this.render();
    this.unsubscribe = store.subscribe(() => this.refresh());
    this.refresh();
  }

  private render(): void {
    this.root.innerHTML = '';
    this.root.appendChild(this.toolbar.getElement());
    this.root.appendChild(this.alertPanel.getElement());
    const main = document.createElement('main');
    main.className = 'app-main';
    main.appendChild(this.cardGrid.getElement());
    main.appendChild(this.routeView.getElement());
    this.root.appendChild(main);
    document.body.appendChild(this.cardForm.getElement());
    this.updateViewMode();
  }

  private refresh(): void {
    const all = store.getCards();
    const alerts = validateAll(all);
    this.alertPanel.update(alerts);

    if (!this.isRouteMode) {
      const filtered = filterCards(all, this.criteria);
      this.cardGrid.update(filtered);
    } else {
      const route = generatePracticeRoute(
        this.criteria.starredOnly
          ? filterCards(all, { starredOnly: true })
          : all
      );
      this.routeView.update(route);
    }

    this.toolbar.refresh();
    this.toolbar.setRouteMode(this.isRouteMode);
    this.toolbar.setSelectedCount(this.cardGrid.getSelected().size);
    this.handleSelectionChange();
  }

  private handleFilterChange(c: FilterCriteria): void {
    this.criteria = c;
    this.refresh();
  }

  private handleExport(): void {
    const all = store.getCards();
    const data = this.isRouteMode
      ? generatePracticeRoute(all)
      : filterCards(all, this.criteria);
    if (data.length === 0) {
      alert('暂无数据可导出');
      return;
    }
    exportToCSV(data);
  }

  private toggleRouteMode(): void {
    this.isRouteMode = !this.isRouteMode;
    this.cardGrid.clearSelection();
    this.updateViewMode();
    this.refresh();
  }

  private updateViewMode(): void {
    this.cardGrid.getElement().style.display = this.isRouteMode ? 'none' : '';
    this.routeView.getElement().style.display = this.isRouteMode ? '' : 'none';
  }

  private handleBatchStatus(status: CardStatus): void {
    const ids = Array.from(this.cardGrid.getSelected());
    if (ids.length === 0) return;
    store.batchUpdateStatus(ids, status);
    this.cardGrid.clearSelection();
  }

  private handleSelectionChange(): void {
    this.toolbar.setSelectedCount(this.cardGrid.getSelected().size);
  }

  private handleLocate(ids: string[]): void {
    if (this.isRouteMode) {
      this.isRouteMode = false;
      this.updateViewMode();
      this.toolbar.setRouteMode(false);
    }
    this.criteria = {};
    this.toolbar.refresh();
    this.toolbar.setRouteMode(false);
    const all = store.getCards();
    this.cardGrid.update(all);
    setTimeout(() => this.cardGrid.highlightCards(ids), 100);
  }

  private openForm(id?: string): void {
    if (id) {
      const card = store.getCard(id);
      if (card) {
        this.editingId = id;
        this.cardForm.open(card);
      }
    } else {
      this.editingId = null;
      this.cardForm.open();
    }
  }

  private handleSave(data: Omit<Card, 'id' | 'createdAt' | 'updatedAt'>): void {
    if (this.editingId) {
      store.updateCard(this.editingId, data);
    } else {
      store.addCard(data);
    }
    this.cardForm.close();
    this.editingId = null;
  }

  destroy(): void {
    this.unsubscribe();
  }
}
