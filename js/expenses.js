/**
 * FINANFLOW - EXPENSES MODULE (GASTOS)
 * Strict currency separation (PEN vs EUR)
 */

const ExpensesModule = {
  currentCurrency: 'PEN',
  currentFilter: {
    category: 'ALL',
    search: '',
    month: 'ALL'
  },

  init() {
    this.currentCurrency = App.currentCurrency || 'PEN';
    this.bindEvents();
    this.render();
  },

  bindEvents() {
    const searchInput = document.getElementById('expense-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.currentFilter.search = e.target.value.toLowerCase().trim();
        this.render();
      });
    }

    const catSelect = document.getElementById('expense-category-filter');
    if (catSelect) {
      catSelect.addEventListener('change', (e) => {
        this.currentFilter.category = e.target.value;
        this.render();
      });
    }

    const monthSelect = document.getElementById('expense-month-filter');
    if (monthSelect) {
      monthSelect.addEventListener('change', (e) => {
        this.currentFilter.month = e.target.value;
        this.render();
      });
    }

    const form = document.getElementById('expense-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSaveExpense();
      });
    }
  },

  populateMonthFilter() {
    const monthSelect = document.getElementById('expense-month-filter');
    if (!monthSelect) return;

    const expenses = Storage.getExpenses().filter(e => e.currency === this.currentCurrency);
    const monthsSet = new Set();
    expenses.forEach(e => {
      if (e.date && e.date.length >= 7) {
        monthsSet.add(e.date.substring(0, 7)); // 'YYYY-MM'
      }
    });

    const monthsArr = Array.from(monthsSet).sort().reverse();
    const currentVal = this.currentFilter.month;

    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    let optionsHtml = '<option value="ALL">Todos los meses</option>';
    monthsArr.forEach(m => {
      const parts = m.split('-');
      const y = parts[0];
      const mNum = parseInt(parts[1], 10);
      const name = monthNames[mNum - 1] || parts[1];
      const label = `${name} ${y}`;
      optionsHtml += `<option value="${m}" ${currentVal === m ? 'selected' : ''}>${label}</option>`;
    });

    const signature = `${this.currentCurrency}:${monthsArr.join(',')}`;
    if (monthSelect.dataset.renderedMonths !== signature) {
      monthSelect.innerHTML = optionsHtml;
      monthSelect.dataset.renderedMonths = signature;
      monthSelect.value = currentVal;
    }
  },

  resetFilters() {
    this.currentFilter = { category: 'ALL', search: '', month: 'ALL' };
    const searchInput = document.getElementById('expense-search');
    if (searchInput) searchInput.value = '';
    const catSelect = document.getElementById('expense-category-filter');
    if (catSelect) catSelect.value = 'ALL';
    const monthSelect = document.getElementById('expense-month-filter');
    if (monthSelect) monthSelect.value = 'ALL';
    this.render();
  },

  setCurrency(cur) {
    this.currentCurrency = cur;
    this.currentFilter.month = 'ALL';
    this.render();
  },

  getFilteredExpenses() {
    const list = Storage.getExpenses();
    return list.filter(item => {
      // STRICT currency isolation: ONLY match current currency
      const matchCur = (item.currency === this.currentCurrency);
      const matchCat = (this.currentFilter.category === 'ALL' || item.category === this.currentFilter.category);
      const matchSearch = !this.currentFilter.search || 
        item.title.toLowerCase().includes(this.currentFilter.search) || 
        (item.notes && item.notes.toLowerCase().includes(this.currentFilter.search));
      
      let matchMonth = true;
      if (this.currentFilter.month !== 'ALL' && item.date) {
        matchMonth = item.date.startsWith(this.currentFilter.month);
      }

      return matchCur && matchCat && matchSearch && matchMonth;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  render() {
    this.populateMonthFilter();

    const container = document.getElementById('expenses-table-body');
    const emptyState = document.getElementById('expenses-empty-state');
    const filtered = this.getFilteredExpenses();

    // Summary totals for active currency
    const totals = this.calculateTotals();
    const isFiltered = (this.currentFilter.month !== 'ALL' || this.currentFilter.category !== 'ALL' || this.currentFilter.search !== '');
    const filteredTotal = filtered.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const totalAll = (totals[this.currentCurrency] || 0);

    const activeTotalEl = document.getElementById('expense-total-active');
    const totalLabelEl = document.getElementById('expense-total-label');
    const curName = this.currentCurrency === 'PEN' ? 'Soles' : 'Euros';

    if (activeTotalEl) {
      activeTotalEl.textContent = Utils.formatCurrency(isFiltered ? filteredTotal : totalAll, this.currentCurrency);
    }

    if (totalLabelEl) {
      if (this.currentFilter.month !== 'ALL') {
        const parts = this.currentFilter.month.split('-');
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const mLabel = (monthNames[parseInt(parts[1], 10) - 1] || parts[1]) + ' ' + parts[0];
        totalLabelEl.innerHTML = `Total Gastos en <strong>${mLabel}</strong> (<span class="active-currency-name-text">${curName}</span>):`;
      } else if (isFiltered) {
        totalLabelEl.innerHTML = `Total Filtrado (<span class="active-currency-name-text">${curName}</span>):`;
      } else {
        totalLabelEl.innerHTML = `Total Gastos (<span class="active-currency-name-text">${curName}</span>):`;
      }
    }

    if (!container) return;

    if (filtered.length === 0) {
      container.innerHTML = '';
      if (emptyState) {
        emptyState.style.display = 'flex';
        const allExpenses = Storage.getExpenses();
        const otherCur = this.currentCurrency === 'PEN' ? 'EUR' : 'PEN';
        const otherCount = allExpenses.filter(e => e.currency === otherCur).length;
        if (otherCount > 0 && allExpenses.filter(e => e.currency === this.currentCurrency).length === 0) {
          emptyState.innerHTML = `
            <div class="empty-state-icon">${Utils.icon('wallet', 22)}</div>
            <p style="font-weight: 600; color: var(--text-primary);">No hay gastos en ${this.currentCurrency === 'PEN' ? 'Soles (S/)' : 'Euros (€)'}</p>
            <p style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 2px;">
              Tienes <strong>${otherCount}</strong> gasto(s) en <strong>${otherCur === 'PEN' ? 'Soles (S/)' : 'Euros (€)'}</strong>.
            </p>
            <button class="btn btn-primary btn-sm" style="margin-top: 10px;" onclick="App.setCurrency('${otherCur}')">
              Ver ${otherCur === 'PEN' ? 'Soles (S/)' : 'Euros (€)'} →
            </button>
          `;
        } else {
          emptyState.innerHTML = `
            <div class="empty-state-icon">${Utils.icon('info', 22)}</div>
            <p style="font-weight: 600; color: var(--text-primary);">Sin resultados para este filtro</p>
            <button class="btn btn-secondary btn-sm" style="margin-top: 8px;" onclick="ExpensesModule.resetFilters();">
              Limpiar Filtros
            </button>
          `;
        }
      }
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    container.innerHTML = filtered.map(item => {
      const catInfo = Utils.getCategoryInfo(item.category);
      return `
        <tr>
          <td>
            <div style="font-weight: 600; color: var(--text-primary);">${this.escapeHTML(item.title)}</div>
            ${item.notes ? `<div style="font-size: 0.76rem; color: var(--text-muted);">${this.escapeHTML(item.notes)}</div>` : ''}
          </td>
          <td>
            <span class="category-badge">
              <span class="cat-badge-icon">${catInfo.icon}</span>
              <span>${this.escapeHTML(item.category)}</span>
            </span>
          </td>
          <td>
            <span style="font-size: 0.82rem; color: var(--text-secondary);">
              ${item.paymentMethod || 'No especificado'}
            </span>
          </td>
          <td style="color: var(--text-secondary); font-size: 0.85rem;">
            ${Utils.formatDate(item.date)}
          </td>
          <td style="font-family: var(--font-heading); font-weight: 700; font-size: 1rem; color: var(--text-rose);">
            ${Utils.formatCurrency(item.amount, item.currency)}
          </td>
          <td style="text-align: right;">
            <div style="display: inline-flex; gap: 6px;">
              <button class="btn btn-secondary btn-icon btn-sm" title="Editar" onclick="ExpensesModule.openEditModal('${item.id}')">
                <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              </button>
              <button class="btn btn-danger-ghost btn-icon btn-sm" title="Eliminar" onclick="ExpensesModule.deleteExpense('${item.id}')">
                <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  calculateTotals() {
    const list = Storage.getExpenses();
    let pen = 0;
    let eur = 0;
    list.forEach(i => {
      if (i.currency === 'EUR') eur += Number(i.amount) || 0;
      else pen += Number(i.amount) || 0;
    });
    return { PEN: pen, EUR: eur };
  },

  openAddModal() {
    const form = document.getElementById('expense-form');
    if (form) form.reset();
    document.getElementById('expense-id').value = '';
    document.getElementById('expense-date').value = Utils.getTodayString();
    document.getElementById('expense-modal-title').textContent = `Nuevo Gasto (${this.currentCurrency === 'PEN' ? 'Soles S/' : 'Euros €'})`;
    
    // Set active currency in form
    this.selectCurrencyInForm(this.currentCurrency);
    App.openModal('modal-expense');
  },

  openEditModal(id) {
    const list = Storage.getExpenses();
    const item = list.find(x => x.id === id);
    if (!item) return;

    document.getElementById('expense-id').value = item.id;
    document.getElementById('expense-title').value = item.title;
    document.getElementById('expense-amount').value = item.amount;
    document.getElementById('expense-category').value = item.category;
    document.getElementById('expense-date').value = item.date;
    document.getElementById('expense-payment-method').value = item.paymentMethod || 'Tarjeta de Débito';
    document.getElementById('expense-notes').value = item.notes || '';
    document.getElementById('expense-modal-title').textContent = 'Editar Gasto';

    this.selectCurrencyInForm(item.currency || this.currentCurrency);
    App.openModal('modal-expense');
  },

  selectCurrencyInForm(currency) {
    const penBtn = document.getElementById('exp-cur-pen-label');
    const eurBtn = document.getElementById('exp-cur-eur-label');
    const penRadio = document.getElementById('exp-cur-pen');
    const eurRadio = document.getElementById('exp-cur-eur');

    if (currency === 'EUR') {
      eurRadio.checked = true;
      eurBtn.classList.add('selected-eur');
      penBtn.classList.remove('selected-pen');
    } else {
      penRadio.checked = true;
      penBtn.classList.add('selected-pen');
      eurBtn.classList.remove('selected-eur');
    }
  },

  handleSaveExpense() {
    const id = document.getElementById('expense-id').value;
    const title = document.getElementById('expense-title').value.trim();
    const amount = parseFloat(document.getElementById('expense-amount').value);
    const category = document.getElementById('expense-category').value;
    const date = document.getElementById('expense-date').value;
    const paymentMethod = document.getElementById('expense-payment-method').value;
    const notes = document.getElementById('expense-notes').value.trim();
    const currency = document.querySelector('input[name="expense-currency"]:checked')?.value || this.currentCurrency;

    if (!title || isNaN(amount) || amount <= 0 || !date) {
      Utils.showToast('Por favor completa todos los campos requeridos correctamente', 'warning');
      return;
    }

    const expenses = Storage.getExpenses();

    if (id) {
      // Edit existing
      const index = expenses.findIndex(x => x.id === id);
      if (index !== -1) {
        expenses[index] = {
          ...expenses[index],
          title,
          amount,
          category,
          date,
          paymentMethod,
          notes,
          currency
        };
        Utils.showToast('Gasto actualizado exitosamente', 'success');
      }
    } else {
      // Create new
      const newExpense = {
        id: Utils.generateId('exp'),
        title,
        amount,
        category,
        date,
        paymentMethod,
        notes,
        currency
      };
      expenses.unshift(newExpense);
      Utils.showToast(`Gasto registrado en ${currency === 'PEN' ? 'Soles (S/)' : 'Euros (€)'}`, 'success');
    }

    Storage.saveExpenses(expenses);
    App.closeModal('modal-expense');
    this.render();
    App.refreshDashboard();
  },

  deleteExpense(id) {
    if (!confirm('¿Estás seguro de que deseas eliminar este gasto?')) return;
    Storage.deleteExpense(id);
    Utils.showToast('Gasto eliminado exitosamente', 'info');
    this.render();
    App.refreshDashboard();
  },

  escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
};
