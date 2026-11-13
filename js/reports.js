/**
 * FINANFLOW - REPORTS & ANALYTICS MODULE
 * Strict currency separation (PEN vs EUR) + Native Excel (.xlsx) Export with Dynamic Pivot Tables
 */

const ReportsModule = {
  categoryChartInstance: null,
  obligationsChartInstance: null,

  init() {
    this.renderCharts();
  },

  renderCharts() {
    this.renderCategoryChart();
    this.renderObligationsChart();
    this.renderSummaryTable();
    this.renderDynamicPivotTable();
  },

  renderCategoryChart() {
    const canvas = document.getElementById('chart-category-expenses');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const cur = App.currentCurrency || 'PEN';
    const expenses = Storage.getExpenses().filter(e => e.currency === cur);

    // Group by category for active currency only
    const categoryTotals = {};
    expenses.forEach(item => {
      const cat = item.category || 'Otros';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(item.amount);
    });

    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);
    const backgroundColors = labels.map(l => Utils.getCategoryInfo(l).color);

    if (this.categoryChartInstance) {
      this.categoryChartInstance.destroy();
    }

    if (labels.length === 0) {
      return;
    }

    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const textColor = isLight ? '#0f172a' : '#e2e8f0';
    const doughnutBorder = isLight ? '#ffffff' : '#101622';

    this.categoryChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: backgroundColors,
          borderColor: doughnutBorder,
          borderWidth: 2,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: textColor,
              font: { family: 'Plus Jakarta Sans', size: 12, weight: '700' },
              padding: 12,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return ` ${context.label}: ${Utils.formatCurrency(context.raw, cur)}`;
              }
            }
          }
        },
        cutout: '68%'
      }
    });
  },

  renderObligationsChart() {
    const canvas = document.getElementById('chart-obligations-comparison');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const cur = App.currentCurrency || 'PEN';
    const isPEN = cur === 'PEN';

    const expTotals = ExpensesModule.calculateTotals();
    const loanTotals = LoansModule.calculateTotals();

    const activeExp = expTotals[cur] || 0;
    const activeLoanRem = loanTotals[cur].remaining || 0;
    const activeLoanPaid = loanTotals[cur].paid || 0;
    const activeInterestOnly = loanTotals[cur].interestOnlyPaid || 0;

    if (this.obligationsChartInstance) {
      this.obligationsChartInstance.destroy();
    }

    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const textColor = isLight ? '#042f2e' : '#f0fdfa';
    const gridColor = isLight ? 'rgba(13, 148, 136, 0.08)' : 'rgba(94, 234, 212, 0.06)';

    this.obligationsChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: [
          'Gastos Totales',
          ['Capital en Calle', '(Por Cobrar)'],
          'Solo Intereses'
        ],
        datasets: [
          {
            label: isPEN ? 'Monto en Soles (S/)' : 'Monto en Euros (€)',
            data: [
              activeExp,
              activeLoanRem,
              activeInterestOnly
            ],
            backgroundColor: [
              'rgba(244, 63, 94, 0.82)',
              'rgba(45, 212, 191, 0.85)',
              'rgba(245, 158, 11, 0.85)'
            ],
            borderColor: [
              '#f43f5e',
              '#2dd4bf',
              '#f59e0b'
            ],
            borderWidth: 1.5,
            borderRadius: 8
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              font: { family: 'Plus Jakarta Sans', size: 11, weight: '700' },
              maxRotation: 0,
              minRotation: 0,
              autoSkip: false
            }
          },
          y: {
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              font: { family: 'Plus Jakarta Sans', size: 11, weight: '700' }
            }
          }
        },
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });
  },

  renderSummaryTable() {
    const tableBody = document.getElementById('report-summary-body');
    if (!tableBody) return;

    const cur = App.currentCurrency || 'PEN';
    const expTotals = ExpensesModule.calculateTotals();
    const loanTotals = LoansModule.calculateTotals();

    const activeExp = expTotals[cur] || 0;
    const activeLoanTot = loanTotals[cur].total || 0;
    const activeLoanPaid = loanTotals[cur].paid || 0;
    const activeInterestOnly = loanTotals[cur].interestOnlyPaid || 0;
    const activeInterestOnlyCount = loanTotals[cur].interestOnlyCount || 0;
    const activeLoanRem = loanTotals[cur].remaining || 0;
    const activeProfit = loanTotals[cur].interestEarned || 0;

    tableBody.innerHTML = `
      <tr>
        <td><strong>Gastos Registrados (Total Egresos)</strong></td>
        <td style="color: var(--accent-rose); font-weight: 700; font-size: 1.05rem;">${Utils.formatCurrency(activeExp, cur)}</td>
      </tr>
      <tr>
        <td><strong>Préstamos Otorgados (Capital + Intereses Pactados)</strong></td>
        <td style="font-weight: 700;">${Utils.formatCurrency(activeLoanTot, cur)}</td>
      </tr>
      <tr>
        <td>↳ <em>Cuotas cobradas a clientes (Amortiza deuda)</em></td>
        <td style="color: var(--accent-emerald); font-weight: 700;">+ ${Utils.formatCurrency(activeLoanPaid, cur)}</td>
      </tr>
      <tr>
        <td>↳ <em>Pagos de Solo Intereses (${activeInterestOnlyCount} pagos - No amortiza deuda)</em></td>
        <td style="color: var(--accent-amber); font-weight: 800;">+ ${Utils.formatCurrency(activeInterestOnly, cur)}</td>
      </tr>
      <tr>
        <td>↳ <em>Ganancia Neta Real Acumulada (Interés de cuotas + Solo Interés)</em></td>
        <td style="color: var(--aqua-300); font-weight: 800;">+ ${Utils.formatCurrency(activeProfit, cur)}</td>
      </tr>
      <tr>
        <td>↳ <em>Capital en la calle pendiente de cobro</em></td>
        <td style="color: var(--aqua-400); font-weight: 800; font-size: 1.05rem;">${Utils.formatCurrency(activeLoanRem, cur)}</td>
      </tr>
    `;
  },

  /**
   * Render on-screen interactive Pivot Table for Category analysis
   */
  renderDynamicPivotTable() {
    const tableBody = document.getElementById('pivot-category-body');
    if (!tableBody) return;

    const cur = App.currentCurrency || 'PEN';
    const expenses = Storage.getExpenses().filter(e => e.currency === cur);

    const categoryStats = {};
    let grandTotal = 0;

    expenses.forEach(e => {
      const cat = e.category || 'Otros';
      const amt = Number(e.amount) || 0;
      grandTotal += amt;

      if (!categoryStats[cat]) {
        categoryStats[cat] = { count: 0, total: 0, items: [] };
      }
      categoryStats[cat].count += 1;
      categoryStats[cat].total += amt;
    });

    const entries = Object.entries(categoryStats).sort((a, b) => b[1].total - a[1].total);

    if (entries.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--text-muted); padding: 18px;">No hay datos de gastos en ${cur === 'PEN' ? 'Soles' : 'Euros'} para tabular.</td></tr>`;
      return;
    }

    let rowsHtml = entries.map(([cat, stats]) => {
      const catInfo = Utils.getCategoryInfo(cat);
      const avg = stats.count > 0 ? (stats.total / stats.count) : 0;
      const pct = grandTotal > 0 ? ((stats.total / grandTotal) * 100).toFixed(1) : '0.0';

      return `
        <tr>
          <td>
            <span class="category-badge">
              <span class="cat-badge-icon">${catInfo.icon}</span>
              <span>${Utils.escapeHTML(cat)}</span>
            </span>
          </td>
          <td style="text-align: center; font-weight: 600;">${stats.count}</td>
          <td style="font-family: var(--font-heading); font-weight: 700; color: var(--accent-rose);">${Utils.formatCurrency(stats.total, cur)}</td>
          <td style="color: var(--text-secondary);">${Utils.formatCurrency(avg, cur)}</td>
          <td>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 0.8rem; font-weight: 700; min-width: 42px;">${pct}%</span>
              <div style="flex: 1; height: 6px; background: var(--bg-tertiary); border-radius: var(--radius-full); overflow: hidden;">
                <div style="width: ${pct}%; height: 100%; background: ${catInfo.color}; border-radius: var(--radius-full);"></div>
              </div>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Grand total row
    rowsHtml += `
      <tr style="border-top: 2px solid var(--border-color); font-weight: 700; background: var(--bg-tertiary);">
        <td><strong>TOTAL GENERAL</strong></td>
        <td style="text-align: center;"><strong>${expenses.length}</strong></td>
        <td style="font-family: var(--font-heading); font-size: 1.05rem; color: var(--accent-rose);"><strong>${Utils.formatCurrency(grandTotal, cur)}</strong></td>
        <td style="color: var(--text-secondary);"><strong>${Utils.formatCurrency(expenses.length > 0 ? grandTotal / expenses.length : 0, cur)}</strong></td>
        <td><strong>100.0%</strong></td>
      </tr>
    `;

    tableBody.innerHTML = rowsHtml;
  },

  /**
   * Export to Genuine Microsoft Excel (.xlsx) with Multi-Sheets and Dynamic Pivot Table
   */
  exportToExcelWithPivot() {
    const cur = App.currentCurrency || 'PEN';
    const curName = cur === 'PEN' ? 'Soles_PEN' : 'Euros_EUR';
    const curSymbol = cur === 'PEN' ? 'S/' : '€';

    const expenses = Storage.getExpenses().filter(e => e.currency === cur);
    const loans = LoansModule.getLoansWithMetrics().filter(l => l.currency === cur);

    // If XLSX library is loaded via SheetJS
    if (typeof XLSX !== 'undefined') {
      const wb = XLSX.utils.book_new();

      // ==========================================
      // SHEET 1: TABLA DINÁMICA Y RESUMEN
      // ==========================================
      const pivotRows = [
        ['ARI-CONTROL - REPORTE FINANCIERO Y TABLA DINÁMICA'],
        ['Moneda de Análisis:', cur === 'PEN' ? 'Soles Peruanos (PEN S/)' : 'Euros (€)'],
        ['Fecha de Generación:', Utils.getTodayString()],
        [''],
        ['=== 1. TABLA DINÁMICA: GASTOS POR CATEGORÍA ==='],
        ['Categoría', 'N° Gastos', `Monto Total (${curSymbol})`, `Promedio (${curSymbol})`, '% Participación']
      ];

      // Calculate category pivot
      const catTotals = {};
      let totalGastos = 0;
      expenses.forEach(e => {
        const cat = e.category || 'Otros';
        const amt = Number(e.amount) || 0;
        totalGastos += amt;
        if (!catTotals[cat]) catTotals[cat] = { count: 0, total: 0 };
        catTotals[cat].count += 1;
        catTotals[cat].total += amt;
      });

      Object.entries(catTotals).sort((a, b) => b[1].total - a[1].total).forEach(([cat, s]) => {
        const avg = s.count > 0 ? (s.total / s.count) : 0;
        const pct = totalGastos > 0 ? ((s.total / totalGastos) * 100).toFixed(2) + '%' : '0%';
        pivotRows.push([cat, s.count, Number(s.total.toFixed(2)), Number(avg.toFixed(2)), pct]);
      });

      pivotRows.push(['TOTAL GASTOS', expenses.length, Number(totalGastos.toFixed(2)), Number((expenses.length > 0 ? totalGastos / expenses.length : 0).toFixed(2)), '100%']);
      pivotRows.push(['']);

      // Calculate Payment Method pivot
      pivotRows.push(['=== 2. TABLA DINÁMICA: GASTOS POR MÉTODO DE PAGO ===']);
      pivotRows.push(['Método de Pago', 'N° Transacciones', `Monto Total (${curSymbol})`, '% Distribución']);
      const methodTotals = {};
      expenses.forEach(e => {
        const m = e.paymentMethod || 'No especificado';
        const amt = Number(e.amount) || 0;
        if (!methodTotals[m]) methodTotals[m] = { count: 0, total: 0 };
        methodTotals[m].count += 1;
        methodTotals[m].total += amt;
      });
      Object.entries(methodTotals).sort((a, b) => b[1].total - a[1].total).forEach(([m, s]) => {
        const pct = totalGastos > 0 ? ((s.total / totalGastos) * 100).toFixed(2) + '%' : '0%';
        pivotRows.push([m, s.count, Number(s.total.toFixed(2)), pct]);
      });
      // Calculate Loans Pivot
      pivotRows.push(['=== 3. TABLA DINÁMICA: CONTROL DE PRÉSTAMOS OTORGADOS Y COBRANZAS ===']);
      pivotRows.push(['Cliente / Prestatario', `Total a Cobrar (${curSymbol})`, 'Total Cuotas', 'Cuotas Cobradas', 'Cuotas Pendientes', `Valor Cuota (${curSymbol})`, `Cobrado en Cuotas (${curSymbol})`, 'N° Solo Interés', `Cobrado Solo Interés (${curSymbol})`, `Saldo por Cobrar (${curSymbol})`, '% Recuperado']);
      
      let totLoanAmount = 0;
      let totLoanPaid = 0;
      let totInterestOnly = 0;
      let totInterestOnlyCount = 0;
      let totLoanRem = 0;

      const safeCell = (v) => (typeof Utils !== 'undefined' && Utils.sanitizeSpreadsheetCell ? Utils.sanitizeSpreadsheetCell(v) : v);

      loans.forEach(l => {
        totLoanAmount += Number(l.totalAmount) || 0;
        totLoanPaid += Number(l.totalPaid) || 0;
        totInterestOnly += Number(l.interestOnlyPaid) || 0;
        totInterestOnlyCount += Number(l.interestOnlyCount) || 0;
        totLoanRem += Number(l.remainingAmount) || 0;
        pivotRows.push([
          safeCell(l.clientName || l.entity),
          Number(Number(l.totalAmount).toFixed(2)),
          l.totalInstallments,
          l.paidInstallments,
          l.remainingInstallments,
          Number(Number(l.installmentAmount).toFixed(2)),
          Number(Number(l.totalPaid).toFixed(2)),
          l.interestOnlyCount || 0,
          Number(Number(l.interestOnlyPaid || 0).toFixed(2)),
          Number(Number(l.remainingAmount).toFixed(2)),
          `${l.progress}%`
        ]);
      });

      pivotRows.push(['TOTALES PRÉSTAMOS OTORGADOS', Number(totLoanAmount.toFixed(2)), '', '', '', '', Number(totLoanPaid.toFixed(2)), totInterestOnlyCount, Number(totInterestOnly.toFixed(2)), Number(totLoanRem.toFixed(2)), `${Utils.calculateProgress(totLoanPaid, totLoanAmount)}%`]);

      const wsPivot = XLSX.utils.aoa_to_sheet(pivotRows);
      wsPivot['!cols'] = [
        { wch: 32 },
        { wch: 22 },
        { wch: 16 },
        { wch: 16 },
        { wch: 18 },
        { wch: 18 },
        { wch: 20 },
        { wch: 16 },
        { wch: 22 },
        { wch: 18 },
        { wch: 16 }
      ];
      XLSX.utils.book_append_sheet(wb, wsPivot, 'Tabla Dinamica & Resumen');

      // ==========================================
      // SHEET 2: DETALLE GASTOS
      // ==========================================
      const expenseHeaders = ['ID', 'Fecha', 'Concepto / Título', 'Categoría', 'Moneda', 'Monto', 'Método de Pago', 'Notas'];
      const expenseData = expenses.map(e => [
        safeCell(e.id),
        safeCell(e.date),
        safeCell(e.title),
        safeCell(e.category),
        safeCell(e.currency),
        Number(Number(e.amount).toFixed(2)),
        safeCell(e.paymentMethod || ''),
        safeCell(e.notes || '')
      ]);
      const wsExpenses = XLSX.utils.aoa_to_sheet([expenseHeaders, ...expenseData]);
      wsExpenses['!cols'] = [{ wch: 12 }, { wch: 14 }, { wch: 32 }, { wch: 18 }, { wch: 10 }, { wch: 14 }, { wch: 20 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(wb, wsExpenses, 'Detalle Gastos');

      // ==========================================
      // SHEET 3: DETALLE PRÉSTAMOS OTORGADOS
      // ==========================================
      const loanHeaders = ['ID', 'Cliente / Prestatario', 'Moneda', 'Total a Cobrar', 'Total Cuotas', 'Cuotas Cobradas', 'Cuotas Pendientes', 'Monto por Cuota', 'Cobrado en Cuotas', 'N° Solo Interés', 'Cobrado Solo Interés', 'Saldo por Cobrar', 'Día Cobro Mensual', 'Estado', 'Notas'];
      const loanData = loans.map(l => [
        safeCell(l.id),
        safeCell(l.clientName || l.entity),
        safeCell(l.currency),
        Number(Number(l.totalAmount).toFixed(2)),
        l.totalInstallments,
        l.paidInstallments,
        l.remainingInstallments,
        Number(Number(l.installmentAmount).toFixed(2)),
        Number(Number(l.totalPaid).toFixed(2)),
        l.interestOnlyCount || 0,
        Number(Number(l.interestOnlyPaid || 0).toFixed(2)),
        Number(Number(l.remainingAmount).toFixed(2)),
        l.dueDayOfMonth || '',
        safeCell(l.statusLabel),
        safeCell(l.notes || '')
      ]);
      const wsLoans = XLSX.utils.aoa_to_sheet([loanHeaders, ...loanData]);
      wsLoans['!cols'] = [{ wch: 12 }, { wch: 32 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(wb, wsLoans, 'Prestamos Otorgados');

      // Export workbook to .xlsx
      XLSX.writeFile(wb, `Ari-Control_Reporte_Dinamico_${curName}_${Utils.getTodayString()}.xlsx`);
      Utils.showToast(`Archivo Excel (.xlsx) generado en ${cur === 'PEN' ? 'Soles' : 'Euros'}`, 'success');
    } else {
      Utils.showToast('La librería Excel se está cargando, intenta en un segundo.', 'info');
    }
  }
};
