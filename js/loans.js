/**
 * ARI-CONTROL - PRESTAMISTA SUITE (PERÚ)
 * Control de Préstamos, Cobranzas del Día, Detector de "Solo Intereses" (Ruleteo) y Emisión de Recibos
 * 100% Compatible con datos previos y aislamiento estricto de divisas (PEN vs EUR)
 */

const LoansModule = {
  currentCurrency: 'PEN',
  currentFilter: {
    status: 'ALL',
    search: ''
  },
  activeSubTab: 'agenda', // 'agenda' | 'portfolio' | 'interest-only' | 'simulator'
  activeAmortizeLoan: null,
  activeQuickPayLoan: null,
  activeReceiptData: null,

  init() {
    this.currentCurrency = (typeof App !== 'undefined' && App.currentCurrency) ? App.currentCurrency : 'PEN';
    this.bindEvents();
    this.initSimulatorDefaults();
    this.render();
  },

  bindEvents() {
    // Search input
    const searchInput = document.getElementById('loan-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.currentFilter.search = e.target.value.toLowerCase().trim();
        this.renderPortfolio();
      });
    }

    // Status filter
    const statusSelect = document.getElementById('loan-status-filter');
    if (statusSelect) {
      statusSelect.addEventListener('change', (e) => {
        this.currentFilter.status = e.target.value;
        this.renderPortfolio();
      });
    }

    // Main Loan Form (Create / Edit)
    const form = document.getElementById('loan-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSaveLoan();
      });
    }

    // Quick Pay Form
    const quickPayForm = document.getElementById('quick-pay-form');
    if (quickPayForm) {
      quickPayForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSaveQuickPay();
      });
    }

    // Amortization Form
    const amortizeForm = document.getElementById('amortize-form');
    if (amortizeForm) {
      amortizeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSaveAmortization();
      });
    }

    // Preset buttons in Amortize Modal
    const presetHalf = document.getElementById('amortize-preset-half');
    const presetFull = document.getElementById('amortize-preset-full');
    const presetInterest = document.getElementById('amortize-preset-interest');
    const presetTotal = document.getElementById('amortize-preset-total');
    const amtInput = document.getElementById('amortize-amount');
    const typeSelect = document.getElementById('amortize-payment-type');

    if (presetHalf && amtInput) {
      presetHalf.addEventListener('click', () => {
        if (this.activeAmortizeLoan) {
          if (typeSelect) typeSelect.value = 'PARTIAL_AMORTIZATION';
          const val = (this.activeAmortizeLoan.installmentAmount / 2);
          amtInput.value = Math.min(val, this.activeAmortizeLoan.remainingAmount).toFixed(2);
        }
      });
    }

    if (presetFull && amtInput) {
      presetFull.addEventListener('click', () => {
        if (this.activeAmortizeLoan) {
          if (typeSelect) typeSelect.value = 'PARTIAL_AMORTIZATION';
          const val = this.activeAmortizeLoan.installmentAmount;
          amtInput.value = Math.min(val, this.activeAmortizeLoan.remainingAmount).toFixed(2);
        }
      });
    }

    if (presetInterest && amtInput) {
      presetInterest.addEventListener('click', () => {
        if (this.activeAmortizeLoan) {
          if (typeSelect) typeSelect.value = 'INTEREST_ONLY';
          const suggestedInt = this.getSuggestedInterestAmount(this.activeAmortizeLoan);
          amtInput.value = suggestedInt.toFixed(2);
        }
      });
    }

    if (presetTotal && amtInput) {
      presetTotal.addEventListener('click', () => {
        if (this.activeAmortizeLoan) {
          if (typeSelect) typeSelect.value = 'PARTIAL_AMORTIZATION';
          amtInput.value = this.activeAmortizeLoan.remainingAmount.toFixed(2);
        }
      });
    }

    if (typeSelect && amtInput) {
      typeSelect.addEventListener('change', () => {
        if (!this.activeAmortizeLoan) return;
        if (typeSelect.value === 'INTEREST_ONLY') {
          amtInput.value = this.getSuggestedInterestAmount(this.activeAmortizeLoan).toFixed(2);
        } else {
          amtInput.value = Math.min(this.activeAmortizeLoan.installmentAmount, this.activeAmortizeLoan.remainingAmount).toFixed(2);
        }
      });
    }

    // Dynamic Live Calculations in Loan Modal
    const principalInput = document.getElementById('loan-principal-amount');
    const rateInput = document.getElementById('loan-interest-rate');
    const interestAmtInput = document.getElementById('loan-interest-amount');
    const totalAmountInput = document.getElementById('loan-total-amount');
    const totalInstInput = document.getElementById('loan-total-installments');
    const instAmountInput = document.getElementById('loan-installment-amount');
    const customIntPayInput = document.getElementById('loan-custom-interest-payment');

    const syncSuggestedInterestInput = (interestTotal, cuotas, freq) => {
      if (!customIntPayInput || customIntPayInput.dataset.manual === 'true') return;
      if (interestTotal > 0) {
        const suggested = (freq === 'monthly' && cuotas <= 12) ? (interestTotal / cuotas) : interestTotal;
        customIntPayInput.value = suggested.toFixed(2);
      }
    };

    if (customIntPayInput) {
      customIntPayInput.addEventListener('input', () => {
        customIntPayInput.dataset.manual = customIntPayInput.value ? 'true' : 'false';
      });
    }

    const updateFromPrincipalOrRate = () => {
      const p = parseFloat(principalInput.value) || 0;
      const r = parseFloat(rateInput.value) || 0;
      const interest = p * (r / 100);
      interestAmtInput.value = interest.toFixed(2);
      const total = p + interest;
      totalAmountInput.value = total.toFixed(2);

      const cuotas = parseInt(totalInstInput.value, 10) || 1;
      const freq = document.getElementById('loan-frequency')?.value || 'daily';
      if (cuotas > 0) {
        instAmountInput.value = (total / cuotas).toFixed(2);
      }
      syncSuggestedInterestInput(interest, cuotas, freq);
    };

    const updateFromInterestAmount = () => {
      const p = parseFloat(principalInput.value) || 0;
      const interest = parseFloat(interestAmtInput.value) || 0;
      const total = p + interest;
      totalAmountInput.value = total.toFixed(2);
      if (p > 0) {
        rateInput.value = ((interest / p) * 100).toFixed(1);
      }
      const cuotas = parseInt(totalInstInput.value, 10) || 1;
      const freq = document.getElementById('loan-frequency')?.value || 'daily';
      if (cuotas > 0) {
        instAmountInput.value = (total / cuotas).toFixed(2);
      }
      syncSuggestedInterestInput(interest, cuotas, freq);
    };

    const updateFromTotalOrInstallments = () => {
      const p = parseFloat(principalInput.value) || 0;
      const r = parseFloat(rateInput.value) || 0;
      const cuotas = parseInt(totalInstInput.value, 10) || 1;
      const freq = document.getElementById('loan-frequency')?.value || 'daily';

      let interest = p * (r / 100);
      let total = p > 0 ? (p + interest) : (parseFloat(totalAmountInput.value) || 0);
      totalAmountInput.value = total.toFixed(2);
      interestAmtInput.value = interest.toFixed(2);
      if (cuotas > 0) {
        instAmountInput.value = (total / cuotas).toFixed(2);
      }
      syncSuggestedInterestInput(interest, cuotas, freq);
    };

    const updateFromInstallmentAmount = () => {
      const cuotas = parseInt(totalInstInput.value, 10) || 1;
      const instVal = parseFloat(instAmountInput.value) || 0;
      const total = instVal * cuotas;
      totalAmountInput.value = total.toFixed(2);
      const p = parseFloat(principalInput.value) || 0;
      let interest = 0;
      if (p > 0 && total >= p) {
        interest = total - p;
        interestAmtInput.value = interest.toFixed(2);
        rateInput.value = ((interest / p) * 100).toFixed(1);
      }
      const freq = document.getElementById('loan-frequency')?.value || 'daily';
      syncSuggestedInterestInput(interest, cuotas, freq);
    };

    if (principalInput && rateInput) {
      principalInput.addEventListener('input', updateFromPrincipalOrRate);
      rateInput.addEventListener('input', updateFromPrincipalOrRate);
    }
    if (interestAmtInput) {
      interestAmtInput.addEventListener('input', updateFromInterestAmount);
    }
    if (totalAmountInput && totalInstInput) {
      totalAmountInput.addEventListener('input', updateFromTotalOrInstallments);
      totalInstInput.addEventListener('input', updateFromTotalOrInstallments);
    }
    if (instAmountInput) {
      instAmountInput.addEventListener('input', updateFromInstallmentAmount);
    }

    // Dynamic Date & First Payment Synchronization in Loan Modal
    const startDateInput = document.getElementById('loan-start-date');
    const freqInput = document.getElementById('loan-frequency');
    const dueDayInput = document.getElementById('loan-due-day');
    const firstPayInput = document.getElementById('loan-first-payment-date');
    const dueDayContainer = document.getElementById('loan-due-day-container');

    const updateSchedulePreview = () => {
      const sDate = startDateInput?.value || Utils.getTodayString();
      const freq = freqInput?.value || 'daily';
      const dueDay = dueDayInput?.value ? parseInt(dueDayInput.value, 10) : null;

      if (dueDayContainer) {
        dueDayContainer.style.display = (freq === 'monthly') ? 'block' : 'none';
      }

      const computedFirst = this.calculateDefaultFirstPaymentDate(sDate, freq, dueDay);
      if (firstPayInput && (!firstPayInput.dataset.manual || firstPayInput.dataset.manual === 'false')) {
        firstPayInput.value = computedFirst;
      }

      const hintEl = document.getElementById('loan-schedule-preview-hint');
      if (hintEl) {
        const dShow = firstPayInput?.value || computedFirst;
        hintEl.innerHTML = `<strong>Primer cobro programado (Cuota #1):</strong> ${Utils.formatDate(dShow)}.`;
      }
    };

    if (startDateInput) startDateInput.addEventListener('change', updateSchedulePreview);
    if (freqInput) freqInput.addEventListener('change', updateSchedulePreview);
    if (dueDayInput) dueDayInput.addEventListener('input', updateSchedulePreview);
    if (firstPayInput) {
      firstPayInput.addEventListener('input', () => {
        firstPayInput.dataset.manual = 'true';
        updateSchedulePreview();
      });
    }

    // Dynamic Calculations in Simulator
    const simPrincipal = document.getElementById('sim-principal');
    const simRate = document.getElementById('sim-rate');
    const simInst = document.getElementById('sim-installments');
    const simDate = document.getElementById('sim-start-date');

    [simPrincipal, simRate, simInst, simDate].forEach(el => {
      if (el) el.addEventListener('input', () => this.calculateSimulator());
    });

    // Receipt WhatsApp Button Listener
    const btnReceiptWa = document.getElementById('btn-receipt-whatsapp');
    if (btnReceiptWa) {
      btnReceiptWa.addEventListener('click', () => {
        if (this.activeReceiptData) {
          this.sendWhatsAppReceipt(this.activeReceiptData);
        }
      });
    }
  },

  initSimulatorDefaults() {
    const simDate = document.getElementById('sim-start-date');
    if (simDate && !simDate.value) {
      simDate.value = Utils.getTodayString();
    }
  },

  setCurrency(cur) {
    this.currentCurrency = cur;
    this.render();
  },

  switchSubTab(tab) {
    this.activeSubTab = tab;

    const btnAgenda = document.getElementById('subtab-btn-agenda');
    const btnPortfolio = document.getElementById('subtab-btn-portfolio');
    const btnInterestOnly = document.getElementById('subtab-btn-interest-only');
    const btnSimulator = document.getElementById('subtab-btn-simulator');

    if (btnAgenda) btnAgenda.classList.toggle('active', tab === 'agenda');
    if (btnPortfolio) btnPortfolio.classList.toggle('active', tab === 'portfolio');
    if (btnInterestOnly) btnInterestOnly.classList.toggle('active', tab === 'interest-only');
    if (btnSimulator) btnSimulator.classList.toggle('active', tab === 'simulator');

    const viewAgenda = document.getElementById('subview-agenda');
    const viewPortfolio = document.getElementById('subview-portfolio');
    const viewInterestOnly = document.getElementById('subview-interest-only');
    const viewSimulator = document.getElementById('subview-simulator');

    if (viewAgenda) viewAgenda.style.display = (tab === 'agenda') ? 'block' : 'none';
    if (viewPortfolio) viewPortfolio.style.display = (tab === 'portfolio') ? 'block' : 'none';
    if (viewInterestOnly) viewInterestOnly.style.display = (tab === 'interest-only') ? 'block' : 'none';
    if (viewSimulator) viewSimulator.style.display = (tab === 'simulator') ? 'block' : 'none';

    if (tab === 'agenda') this.renderAgenda();
    if (tab === 'portfolio') this.renderPortfolio();
    if (tab === 'interest-only') this.renderInterestOnlyView();
    if (tab === 'simulator') this.calculateSimulator();
  },

  /**
   * Calcula cuánto es el interés sugerido para un préstamo cuando el deudor paga "Solo Intereses"
   */
  getSuggestedInterestAmount(loan) {
    if (!loan) return 0;
    if (Number(loan.customInterestPayment) > 0) {
      return Number(Number(loan.customInterestPayment).toFixed(2));
    }
    const totalInt = Number(loan.interestAmount) || 0;
    const principal = Number(loan.principalAmount) || Number(loan.totalAmount) || 0;
    const cuotas = Number(loan.totalInstallments) || 1;
    if (totalInt > 0) {
      if (loan.frequency === 'monthly' && cuotas <= 12) {
        return Number((totalInt / cuotas).toFixed(2));
      }
      return Number(totalInt.toFixed(2));
    }
    return Number((principal * 0.10).toFixed(2));
  },

  /**
   * Avanza una fecha 1 periodo según la frecuencia del préstamo
   */
  advanceDateByFrequency(dateStr, freq, dueDayOfMonth) {
    if (freq === 'daily') return Utils.addDays(dateStr, 1, true);
    if (freq === 'daily_all') return Utils.addDays(dateStr, 1, false);
    if (freq === 'weekly') return Utils.addDays(dateStr, 7, false);
    if (freq === 'biweekly') return Utils.addDays(dateStr, 15, false);
    if (freq === 'monthly') {
      const targetDay = Number(dueDayOfMonth) || Number(dateStr.split('-')[2]);
      return Utils.addMonths(dateStr, 1, targetDay);
    }
    return Utils.addDays(dateStr, 1, true);
  },

  /**
   * Genera el cronograma proyectado de pagos considerando cuotas pagadas
   * y desplazamientos de fecha por pagos de "Solo Interés" (renovaciones/ruleteo)
   */
  generateSchedule(loan) {
    const schedule = [];
    const total = Number(loan.totalInstallments) || 1;
    const cuotaAmt = Number(loan.installmentAmount) || (Number(loan.totalAmount) / total);
    const paidCount = Number(loan.paidInstallments) || 0;
    const todayStr = Utils.getTodayString();
    const freq = loan.frequency || (loan.dueDayOfMonth ? 'monthly' : 'daily');
    const startDate = loan.startDate || todayStr;

    // Cuántas veces se aplazó el cronograma por pago de "Solo Interés"
    const history = Array.isArray(loan.history) ? loan.history : [];
    const installmentHistory = history.filter(h => h.type !== 'INTEREST_ONLY');
    const extendedPeriods = history.filter(h => h.type === 'INTEREST_ONLY' && h.extendSchedule !== false).length;

    let firstDueDate = loan.firstPaymentDate
      ? loan.firstPaymentDate
      : this.calculateDefaultFirstPaymentDate(startDate, freq, loan.dueDayOfMonth);

    for (let i = 1; i <= total; i++) {
      let dueDate;
      if (i === 1) {
        dueDate = firstDueDate;
      } else {
        const prevDue = schedule[i - 2].baseDueDate || schedule[i - 2].dueDate;
        dueDate = this.advanceDateByFrequency(prevDue, freq, loan.dueDayOfMonth);
      }

      const baseDueDate = dueDate;
      const isPaid = i <= paidCount;

      // Si la cuota está pendiente y hubo renovaciones de "Solo Interés", correr el vencimiento
      if (!isPaid && extendedPeriods > 0) {
        for (let k = 0; k < extendedPeriods; k++) {
          dueDate = this.advanceDateByFrequency(dueDate, freq, loan.dueDayOfMonth);
        }
      }

      const historyItem = installmentHistory[i - 1] || null;

      let status = 'upcoming';
      let daysDiff = 0;

      if (isPaid) {
        status = 'paid';
      } else if (i === paidCount + 1) {
        daysDiff = Utils.diffDays(todayStr, dueDate);
        if (dueDate === todayStr) {
          status = 'due-today';
        } else if (daysDiff > 0) {
          status = 'overdue';
        } else {
          status = 'upcoming';
        }
      } else {
        status = 'upcoming';
      }

      schedule.push({
        installmentNumber: i,
        baseDueDate,
        dueDate,
        amount: cuotaAmt,
        status,
        daysDiff,
        isPaid,
        paidDate: historyItem ? historyItem.date : null,
        method: historyItem ? (historyItem.method || 'Efectivo') : null,
        receiptCode: historyItem ? historyItem.receiptCode : null
      });
    }

    return schedule;
  },

  calculateDefaultFirstPaymentDate(startDate, freq, dueDayOfMonth) {
    if (!startDate) startDate = Utils.getTodayString();
    const parts = startDate.split('-').map(Number);
    const startDay = parts[2];

    if (freq === 'monthly') {
      const targetDay = dueDayOfMonth ? Number(dueDayOfMonth) : startDay;
      if (dueDayOfMonth && targetDay > startDay) {
        const mStr = String(parts[1]).padStart(2, '0');
        const dStr = String(targetDay).padStart(2, '0');
        return `${parts[0]}-${mStr}-${dStr}`;
      } else {
        return Utils.addMonths(startDate, 1, targetDay);
      }
    } else if (freq === 'biweekly') {
      return Utils.addDays(startDate, 15, false);
    } else if (freq === 'weekly') {
      return Utils.addDays(startDate, 7, false);
    } else if (freq === 'daily') {
      return Utils.addDays(startDate, 1, true);
    } else if (freq === 'daily_all') {
      return Utils.addDays(startDate, 1, false);
    }
    return Utils.addDays(startDate, 1, true);
  },

  /**
   * Obtiene todos los préstamos enriquecidos con métricas de cuotas Y métricas de "Solo Interés"
   */
  getLoansWithMetrics() {
    const list = Storage.getLoans();
    const todayStr = Utils.getTodayString();

    return list.map(item => {
      const clientName = item.clientName || item.entity || 'Cliente';
      const clientDni = item.clientDni || '';
      const clientPhone = item.clientPhone || '';
      const clientAddress = item.clientAddress || '';
      const frequency = item.frequency || (item.dueDayOfMonth ? 'monthly' : 'daily');
      const currency = item.currency || 'PEN';

      const totalInstallments = Number(item.totalInstallments) || 1;
      const totalAmount = Number(item.totalAmount) || 0;
      const interestRate = Number(item.interestRate) || 0;
      const principalAmount = Number(item.principalAmount) ||
        (interestRate > 0 ? (totalAmount / (1 + (interestRate / 100))) : totalAmount);
      const interestAmount = Number(item.interestAmount) || Math.max(0, totalAmount - principalAmount);
      const installmentAmount = Number(item.installmentAmount) || (totalAmount / totalInstallments);

      const history = Array.isArray(item.history) ? item.history : [];

      // Separar pagos que amortizan deuda vs pagos de SOLO INTERÉS (Ruleteo)
      const interestOnlyPayments = history.filter(h => h && h.type === 'INTEREST_ONLY');
      const amortizationPayments = history.filter(h => h && h.type !== 'INTEREST_ONLY');

      const interestOnlyCount = interestOnlyPayments.length;
      const interestOnlyPaid = interestOnlyPayments.reduce((sum, h) => sum + (Number(h.amount) || 0), 0);
      const lastInterestOnlyPayment = interestOnlyCount > 0 ? interestOnlyPayments[interestOnlyCount - 1] : null;

      // Total Pagado hacia la deuda (sin contar los pagos de solo interés, porque esos no bajan el capital/cuotas)
      let totalPaid = 0;
      if (amortizationPayments.length > 0) {
        totalPaid = amortizationPayments.reduce((sum, h) => sum + (Number(h.amount) || 0), 0);
      } else if (history.length === 0) {
        totalPaid = (Number(item.paidInstallments) || 0) * installmentAmount;
      }
      totalPaid = Math.min(totalAmount, Math.max(0, totalPaid));

      const remainingAmount = Math.max(0, totalAmount - totalPaid);
      const progress = totalAmount > 0 ? Math.min(100, Math.round((totalPaid / totalAmount) * 100)) : 0;
      const paidCuotas = Math.min(totalInstallments, Math.floor((totalPaid / (installmentAmount || 1)) + 0.001));
      const remainingCuotas = Math.max(0, totalInstallments - paidCuotas);

      // Cronograma
      const tempLoan = {
        ...item,
        totalInstallments,
        installmentAmount,
        paidInstallments: paidCuotas,
        totalAmount,
        frequency,
        startDate: item.startDate || todayStr,
        history
      };
      const schedule = this.generateSchedule(tempLoan);
      const nextCuota = schedule.find(s => !s.isPaid);

      let status = 'pending';
      let statusLabel = 'Pendiente';
      let isDueToday = false;
      let isOverdue = false;
      let daysOverdue = 0;

      if (remainingAmount <= 0.01 || progress >= 100) {
        status = 'paid';
        statusLabel = 'Liquidado';
      } else if (nextCuota && nextCuota.status === 'due-today') {
        status = 'due-today';
        statusLabel = 'Toca Cobrar Hoy';
        isDueToday = true;
      } else if (nextCuota && nextCuota.status === 'overdue') {
        status = 'overdue';
        daysOverdue = nextCuota.daysDiff;
        statusLabel = `En Mora (${daysOverdue}d)`;
        isOverdue = true;
      } else if (totalPaid > 0 || interestOnlyCount > 0) {
        status = 'in-progress';
        statusLabel = interestOnlyCount > 0 && totalPaid === 0 ? 'Solo Interés Pagado' : 'Al Día';
      }

      // Ganancia de intereses cobrada = interés proporcional en cuotas + 100% de pagos de Solo Interés
      const interestFromCuotas = totalAmount > 0 ? (totalPaid * (interestAmount / totalAmount)) : 0;
      const interestEarned = interestFromCuotas + interestOnlyPaid;
      const totalCollectedAll = totalPaid + interestOnlyPaid;

      return {
        ...item,
        entity: clientName,
        clientName,
        clientDni,
        clientPhone,
        clientAddress,
        frequency,
        currency,
        totalInstallments,
        paidInstallments: paidCuotas,
        remainingInstallments: remainingCuotas,
        installmentAmount,
        principalAmount,
        interestRate,
        interestAmount,
        interestEarned,
        interestOnlyCount,
        interestOnlyPaid,
        interestOnlyPayments,
        lastInterestOnlyPayment,
        totalCollectedAll,
        totalAmount,
        totalPaid,
        remainingAmount,
        progress,
        status,
        statusLabel,
        isDueToday,
        isOverdue,
        daysOverdue,
        nextCuota,
        schedule
      };
    });
  },

  /**
   * Helper for NotificationsController
   */
  getTodayCollections() {
    return this.getLoansWithMetrics().filter(l => l.status === 'due-today' || l.status === 'overdue');
  },

  getFilteredLoans() {
    const list = this.getLoansWithMetrics();
    return list.filter(item => {
      const matchCur = (item.currency === this.currentCurrency);
      let matchStatus = true;
      if (this.currentFilter.status === 'interest-only') {
        matchStatus = item.interestOnlyCount > 0;
      } else if (this.currentFilter.status !== 'ALL') {
        matchStatus = item.status === this.currentFilter.status;
      }

      const q = this.currentFilter.search;
      const matchSearch = !q ||
        item.clientName.toLowerCase().includes(q) ||
        (item.clientDni && item.clientDni.includes(q)) ||
        (item.notes && item.notes.toLowerCase().includes(q)) ||
        (item.clientAddress && item.clientAddress.toLowerCase().includes(q));

      return matchCur && matchStatus && matchSearch;
    }).sort((a, b) => {
      const order = { 'overdue': 1, 'due-today': 2, 'in-progress': 3, 'pending': 4, 'paid': 5 };
      return (order[a.status] || 9) - (order[b.status] || 9);
    });
  },

  render() {
    this.updateBadgesAndTotals();
    if (this.activeSubTab === 'agenda') {
      this.renderAgenda();
    } else if (this.activeSubTab === 'portfolio') {
      this.renderPortfolio();
    } else if (this.activeSubTab === 'interest-only') {
      this.renderInterestOnlyView();
    } else if (this.activeSubTab === 'simulator') {
      this.calculateSimulator();
    }
  },

  updateBadgesAndTotals() {
    const all = this.getLoansWithMetrics().filter(x => x.currency === this.currentCurrency);
    const todayLoans = all.filter(x => x.status === 'due-today' || x.status === 'overdue');
    const intOnlyLoans = all.filter(x => x.interestOnlyCount > 0);

    const bAgenda = document.getElementById('badge-agenda-count');
    const bPortfolio = document.getElementById('badge-portfolio-count');
    const bIntOnly = document.getElementById('badge-interest-only-count');
    const bNav = document.getElementById('badge-count-loans');
    const bDock = document.getElementById('dock-badge-loans');

    if (bAgenda) bAgenda.textContent = todayLoans.length;
    if (bPortfolio) bPortfolio.textContent = all.length;
    if (bIntOnly) bIntOnly.textContent = intOnlyLoans.length;
    if (bNav) bNav.textContent = todayLoans.length > 0 ? `${todayLoans.length} Hoy` : all.length;
    if (bDock) bDock.textContent = todayLoans.length > 0 ? todayLoans.length : all.length;

    const totals = this.calculateTotals();
    const cur = totals[this.currentCurrency] || { total: 0, paid: 0, remaining: 0, interestEarned: 0, interestOnlyPaid: 0 };

    const totalActEl = document.getElementById('loan-kpi-total-active');
    const paidActEl = document.getElementById('loan-kpi-paid-active');
    const remActEl = document.getElementById('loan-kpi-rem-active');
    const intActEl = document.getElementById('loan-kpi-interest-active');
    const intOnlyActEl = document.getElementById('loan-kpi-interest-only-active');

    if (totalActEl) totalActEl.textContent = Utils.formatCurrency(cur.total, this.currentCurrency);
    if (paidActEl) paidActEl.textContent = Utils.formatCurrency(cur.paid, this.currentCurrency);
    if (remActEl) remActEl.textContent = Utils.formatCurrency(cur.remaining, this.currentCurrency);
    if (intActEl) intActEl.textContent = Utils.formatCurrency(cur.interestEarned, this.currentCurrency);
    if (intOnlyActEl) intOnlyActEl.textContent = Utils.formatCurrency(cur.interestOnlyPaid, this.currentCurrency);
  },

  /**
   * Renderiza la Agenda de Cobranzas del Día (con botón de Cuota y botón de Solo Interés)
   */
  renderAgenda() {
    const container = document.getElementById('agenda-items-container');
    const emptyState = document.getElementById('agenda-empty-state');
    if (!container) return;

    const all = this.getLoansWithMetrics().filter(x => x.currency === this.currentCurrency);
    const todayStr = Utils.getTodayString();

    const agendaList = all.filter(x => x.status === 'due-today' || x.status === 'overdue');

    let collectedToday = 0;
    all.forEach(loan => {
      if (loan.history && Array.isArray(loan.history)) {
        loan.history.forEach(h => {
          if (h.date === todayStr) {
            collectedToday += Number(h.amount) || 0;
          }
        });
      }
    });

    let expectedToday = 0;
    let overdueCount = 0;

    agendaList.forEach(l => {
      expectedToday += (l.nextCuota ? Number(l.nextCuota.amount) : 0);
      if (l.isOverdue) overdueCount++;
    });

    const pendingToday = Math.max(0, expectedToday - collectedToday);

    const expEl = document.getElementById('agenda-kpi-expected');
    const collEl = document.getElementById('agenda-kpi-collected');
    const pendEl = document.getElementById('agenda-kpi-pending');
    const overEl = document.getElementById('agenda-kpi-overdue');

    if (expEl) expEl.textContent = Utils.formatCurrency(expectedToday, this.currentCurrency);
    if (collEl) collEl.textContent = Utils.formatCurrency(collectedToday, this.currentCurrency);
    if (pendEl) pendEl.textContent = Utils.formatCurrency(pendingToday, this.currentCurrency);
    if (overEl) overEl.textContent = `${overdueCount} en mora`;

    if (agendaList.length === 0) {
      container.innerHTML = '';
      if (emptyState) emptyState.style.display = 'flex';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    const freqLabels = {
      'daily': 'Diario (L-S)',
      'daily_all': 'Diario (Todos los días)',
      'weekly': 'Semanal',
      'biweekly': 'Quincenal',
      'monthly': 'Mensual'
    };

    container.innerHTML = agendaList.map(item => {
      const isOver = item.status === 'overdue';
      const cuotaNum = item.paidInstallments + 1;
      const cuotaVal = item.nextCuota ? item.nextCuota.amount : item.installmentAmount;
      const suggestedInt = this.getSuggestedInterestAmount(item);

      return `
        <div class="agenda-card ${isOver ? 'overdue' : 'due-today'}" id="agenda-card-${item.id}">
          <div class="obligation-header">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 34px; height: 34px; border-radius: 8px; background: ${isOver ? 'rgba(244,63,94,0.14)' : 'rgba(245,158,11,0.14)'}; color: ${isOver ? 'var(--text-rose)' : 'var(--text-amber)'}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                ${Utils.icon(isOver ? 'alert' : 'calendar', 17)}
              </div>
              <div class="obligation-title">
                <h4>${this.escapeHTML(item.clientName)}</h4>
                <div style="font-size: 0.74rem; color: var(--text-muted);">
                  ${item.clientDni ? `DNI: ${this.escapeHTML(item.clientDni)} · ` : ''}${freqLabels[item.frequency] || 'Diario'}
                </div>
              </div>
            </div>
            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
              <span class="status-badge ${item.status}">${item.statusLabel}</span>
              ${item.interestOnlyCount > 0 ? `<span class="status-badge interest-only-badge">${item.interestOnlyCount}x Solo Interés</span>` : ''}
            </div>
          </div>

          <div class="obligation-amounts">
            <div class="amount-box">
              <span class="amount-box-label">Total Préstamo</span>
              <span class="amount-box-val" style="color: var(--text-indigo);">${Utils.formatCurrency(item.totalAmount, item.currency)}</span>
            </div>
            <div class="amount-box">
              <span class="amount-box-label">Cuota #${cuotaNum}/${item.totalInstallments}</span>
              <span class="amount-box-val" style="color: var(--text-emerald);">${Utils.formatCurrency(cuotaVal, item.currency)}</span>
            </div>
            <div class="amount-box">
              <span class="amount-box-label">Debe Ahora</span>
              <span class="amount-box-val" style="color: var(--text-rose);">${Utils.formatCurrency(item.remainingAmount, item.currency)}</span>
            </div>
          </div>

          <div class="obligation-footer">
            <div class="obligation-primary-actions">
              <button class="btn btn-aqua-glow btn-sm" onclick="LoansModule.openQuickPayModal('${item.id}', 'INSTALLMENT')" title="Cobrar cuota normal (Descuenta su deuda)">
                ${Utils.icon('check', 13)}
                <span>Cobrar Cuota</span>
              </button>

              <button class="btn btn-interest-glass btn-sm" onclick="LoansModule.openQuickPayModal('${item.id}', 'INTEREST_ONLY')" title="Solo paga interés (No descuenta su deuda)">
                ${Utils.icon('percent', 13)}
                <span>Solo Interés</span>
              </button>
            </div>

            <div class="obligation-secondary-actions">
              <button class="btn btn-secondary btn-sm" onclick="LoansModule.openScheduleModal('${item.id}')">
                ${Utils.icon('calendar', 13)}
                <span>Cronograma</span>
              </button>
              <button class="btn btn-whatsapp btn-sm" onclick="LoansModule.sendWhatsAppReminder('${item.id}', '${isOver ? 'overdue' : 'friendly'}')" title="Enviar recordatorio por WhatsApp">
                ${Utils.icon('phone', 13)}
                <span>WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  /**
   * Renderiza la Cartera de Préstamos Completa con desglose básico, elegante y botones sin cortes
   */
  renderPortfolio() {
    const container = document.getElementById('loans-cards-container');
    const emptyState = document.getElementById('loans-empty-state');
    if (!container) return;

    const filtered = this.getFilteredLoans();

    if (filtered.length === 0) {
      container.innerHTML = '';
      if (emptyState) emptyState.style.display = 'flex';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    const freqLabels = {
      'daily': 'Diario (L-S)',
      'daily_all': 'Diario (Todos los días)',
      'weekly': 'Semanal',
      'biweekly': 'Quincenal',
      'monthly': 'Mensual'
    };

    container.innerHTML = filtered.map(item => {
      const isComplete = item.status === 'paid';
      const historyCount = item.history ? item.history.length : 0;

      return `
        <div class="obligation-card ${item.status}" id="loan-card-${item.id}">
          <div class="obligation-header">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 34px; height: 34px; border-radius: 8px; background: rgba(99, 102, 241, 0.14); border: 1px solid rgba(129, 140, 248, 0.28); color: var(--text-indigo); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                ${Utils.icon('user', 16)}
              </div>
              <div class="obligation-title">
                <h4>${this.escapeHTML(item.clientName)}</h4>
                <div style="font-size: 0.74rem; color: var(--text-muted);">
                  ${item.clientDni ? `DNI: ${this.escapeHTML(item.clientDni)} · ` : ''}
                  <strong>${item.paidInstallments}/${item.totalInstallments}</strong> cuotas · ${freqLabels[item.frequency] || 'Diario'}
                </div>
              </div>
            </div>
            <span class="status-badge ${item.status}">${item.statusLabel}</span>
          </div>

          ${item.interestOnlyCount > 0 ? `
            <div class="interest-only-card-strip">
              <div style="display: flex; align-items: center; gap: 6px;">
                ${Utils.icon('percent', 13)}
                <span><strong>Solo Interés (${item.interestOnlyCount}x)</strong></span>
              </div>
              <strong>+ ${Utils.formatCurrency(item.interestOnlyPaid, item.currency)}</strong>
            </div>
          ` : ''}

          <!-- Desglose Básico: Total Préstamo, Valor Cuota y Debe Ahora -->
          <div class="obligation-amounts">
            <div class="amount-box">
              <span class="amount-box-label">Total Préstamo</span>
              <span class="amount-box-val" style="color: var(--text-indigo);">${Utils.formatCurrency(item.totalAmount, item.currency)}</span>
            </div>
            <div class="amount-box">
              <span class="amount-box-label">Monto Cuota</span>
              <span class="amount-box-val" style="color: var(--text-emerald);">${Utils.formatCurrency(item.installmentAmount, item.currency)}</span>
            </div>
            <div class="amount-box">
              <span class="amount-box-label">Debe Ahora</span>
              <span class="amount-box-val" style="color: var(--text-rose);">${Utils.formatCurrency(item.remainingAmount, item.currency)}</span>
            </div>
          </div>

          <!-- Progress Bar -->
          <div class="progress-wrapper">
            <div class="progress-info">
              <span>Avance de Cuotas (${item.paidInstallments} de ${item.totalInstallments})</span>
              <strong style="color: ${isComplete ? 'var(--text-emerald)' : 'var(--text-indigo)'};">${item.progress}%</strong>
            </div>
            <div class="progress-bar-bg">
              <div class="progress-bar-fill ${isComplete ? 'completed' : ''}" style="width: ${item.progress}%;"></div>
            </div>
          </div>

          <!-- 2-Row Footer so ZERO buttons are ever cut off -->
          <div class="obligation-footer">
            ${!isComplete ? `
              <div class="obligation-primary-actions">
                <button class="btn btn-aqua-glow btn-sm" onclick="LoansModule.openQuickPayModal('${item.id}', 'INSTALLMENT')" title="Cobrar Cuota #${item.paidInstallments + 1} (Descuenta su deuda)">
                  ${Utils.icon('check', 13)}
                  <span>Cobrar Cuota #${item.paidInstallments + 1}</span>
                </button>

                <button class="btn btn-interest-glass btn-sm" onclick="LoansModule.openQuickPayModal('${item.id}', 'INTEREST_ONLY')" title="Solo paga interés (No descuenta su deuda)">
                  ${Utils.icon('percent', 13)}
                  <span>Solo Interés</span>
                </button>
              </div>
            ` : `
              <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                <span class="status-badge paid">100% Liquidado</span>
                <button class="btn btn-secondary btn-sm" onclick="LoansModule.reopenLoan('${item.id}')">Reajustar Cuotas</button>
              </div>
            `}

            <div class="obligation-secondary-actions">
              <div style="display: flex; gap: 5px; align-items: center; flex-wrap: wrap;">
                ${!isComplete ? `
                  <button class="btn btn-secondary btn-sm" onclick="LoansModule.openAmortizeModal('${item.id}')" title="Abonar otro monto">
                    <span>Abonar</span>
                  </button>
                ` : ''}
                <button class="btn btn-ghost btn-sm" onclick="LoansModule.openScheduleModal('${item.id}')">
                  ${Utils.icon('calendar', 13)}
                  <span>Cronograma</span>
                </button>
                <button class="btn btn-ghost btn-sm" onclick="LoansModule.openHistoryModal('${item.id}')">
                  ${Utils.icon('receipt', 13)}
                  <span>Historial (${historyCount})</span>
                </button>
              </div>

              <div style="display: flex; gap: 4px; align-items: center; margin-left: auto;">
                ${(item.paidInstallments > 0 || item.interestOnlyCount > 0) && !isComplete ? `
                  <button class="btn btn-secondary btn-icon btn-sm" onclick="LoansModule.undoPayInstallment('${item.id}')" title="Deshacer último cobro">
                    ${Utils.icon('repeat', 13)}
                  </button>
                ` : ''}
                ${!isComplete ? `
                  <button class="btn btn-ghost btn-icon btn-sm" title="Editar Préstamo" onclick="LoansModule.openEditModal('${item.id}')">
                    ${Utils.icon('edit', 14)}
                  </button>
                ` : ''}
                <button class="btn btn-danger-ghost btn-icon btn-sm" title="Eliminar Préstamo" onclick="LoansModule.deleteLoan('${item.id}')">
                  ${Utils.icon('trash', 14)}
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  /**
   * Renderiza la Sub-Vista Básica: Control de Deudores que pagan "Solo Interés"
   */
  renderInterestOnlyView() {
    const bannerEl = document.getElementById('interest-only-overview-banner');
    const listContainer = document.getElementById('interest-only-list-container');
    if (!bannerEl || !listContainer) return;

    const allLoans = this.getLoansWithMetrics().filter(x => x.currency === this.currentCurrency);
    const loansWithIntOnly = allLoans.filter(x => x.interestOnlyCount > 0);
    const activeLoans = allLoans.filter(x => x.status !== 'paid');

    const totalIntOnlyMoney = allLoans.reduce((s, l) => s + l.interestOnlyPaid, 0);
    const totalIntOnlyEvents = allLoans.reduce((s, l) => s + l.interestOnlyCount, 0);
    const capitalStuckInIntOnly = loansWithIntOnly.reduce((s, l) => s + l.remainingAmount, 0);

    bannerEl.className = 'daily-collection-banner';
    bannerEl.innerHTML = `
      <div class="daily-kpi-item kpi-gold">
        <span class="daily-kpi-label">Cobrado en Solo Interés</span>
        <span class="daily-kpi-val" style="color: var(--text-amber);">${Utils.formatCurrency(totalIntOnlyMoney, this.currentCurrency)}</span>
      </div>
      <div class="daily-kpi-item kpi-indigo">
        <span class="daily-kpi-label">Deudores en Solo Interés</span>
        <span class="daily-kpi-val" style="color: var(--text-indigo);">${loansWithIntOnly.length} (${totalIntOnlyEvents} pagos)</span>
      </div>
      <div class="daily-kpi-item kpi-rose">
        <span class="daily-kpi-label">Deuda Pendiente</span>
        <span class="daily-kpi-val" style="color: var(--text-rose);">${Utils.formatCurrency(capitalStuckInIntOnly, this.currentCurrency)}</span>
      </div>
    `;

    let html = '';

    if (loansWithIntOnly.length === 0) {
      html += `
        <div class="empty-state" style="padding: 28px 16px; background: var(--bg-primary); border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-bottom: 12px;">
          <div class="empty-state-icon">${Utils.icon('percent', 22)}</div>
          <h4>Sin pagos de "Solo Interés" registrados</h4>
        </div>
      `;
    } else {
      html += `
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Deudor</th>
                <th>Pagos</th>
                <th>Cobrado en Solo Interés</th>
                <th>Cuotas</th>
                <th>Debe Ahora</th>
                <th style="text-align: right;">Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${loansWithIntOnly.map(l => `
                <tr>
                  <td>
                    <strong style="color: var(--text-primary);">${this.escapeHTML(l.clientName)}</strong>
                    <div style="font-size: 0.72rem; color: var(--text-muted);">
                      Último: ${l.lastInterestOnlyPayment ? `${Utils.formatDate(l.lastInterestOnlyPayment.date)} (${Utils.formatCurrency(l.lastInterestOnlyPayment.amount, l.currency)})` : '-'}
                    </div>
                  </td>
                  <td><span class="status-badge interest-only-badge">${l.interestOnlyCount}x</span></td>
                  <td style="font-family: var(--font-heading); font-weight: 700; color: var(--text-amber);">
                    + ${Utils.formatCurrency(l.interestOnlyPaid, l.currency)}
                  </td>
                  <td><span class="status-badge in-progress">${l.paidInstallments}/${l.totalInstallments}</span></td>
                  <td style="font-family: var(--font-heading); font-weight: 700; color: var(--text-rose);">
                    ${Utils.formatCurrency(l.remainingAmount, l.currency)}
                  </td>
                  <td style="text-align: right;">
                    <div style="display: inline-flex; gap: 6px; justify-content: flex-end; flex-wrap: wrap;">
                      <button class="btn btn-aqua-glow btn-sm" onclick="LoansModule.openQuickPayModal('${l.id}', 'INSTALLMENT')">Cobrar Cuota</button>
                      <button class="btn btn-interest-glass btn-sm" onclick="LoansModule.openQuickPayModal('${l.id}', 'INTEREST_ONLY')">+ Solo Interés</button>
                      <button class="btn btn-secondary btn-sm" onclick="LoansModule.openHistoryModal('${l.id}')">Historial</button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    listContainer.innerHTML = html;
  },

  /**
   * Cálculo en Vivo para el Simulador
   */
  calculateSimulator() {
    const principal = parseFloat(document.getElementById('sim-principal')?.value) || 0;
    const rate = parseFloat(document.getElementById('sim-rate')?.value) || 0;
    const cuotas = parseInt(document.getElementById('sim-installments')?.value, 10) || 1;
    const freq = document.getElementById('sim-frequency')?.value || 'daily';
    const startDate = document.getElementById('sim-start-date')?.value || Utils.getTodayString();

    const interest = principal * (rate / 100);
    const total = principal + interest;
    const cuotaVal = cuotas > 0 ? (total / cuotas) : 0;

    const firstPay = this.calculateDefaultFirstPaymentDate(startDate, freq, null);
    let endDate = firstPay;
    if (cuotas > 1) {
      for (let i = 2; i <= cuotas; i++) {
        endDate = this.advanceDateByFrequency(endDate, freq, null);
      }
    }

    const freqNames = {
      'daily': `${cuotas} cuotas diarias (L-S)`,
      'daily_all': `${cuotas} cuotas diarias`,
      'weekly': `${cuotas} cuotas semanales`,
      'biweekly': `${cuotas} cuotas quincenales`,
      'monthly': `${cuotas} cuotas mensuales`
    };

    const resCuota = document.getElementById('sim-res-cuota');
    const resDetail = document.getElementById('sim-res-cuota-detail');
    const resPrinc = document.getElementById('sim-res-principal');
    const resInt = document.getElementById('sim-res-interest');
    const resTot = document.getElementById('sim-res-total');
    const resEnd = document.getElementById('sim-res-end-date');

    if (resCuota) resCuota.textContent = Utils.formatCurrency(cuotaVal, this.currentCurrency);
    if (resDetail) resDetail.textContent = freqNames[freq] || `${cuotas} cuotas`;
    if (resPrinc) resPrinc.textContent = Utils.formatCurrency(principal, this.currentCurrency);
    if (resInt) resInt.textContent = `+ ${Utils.formatCurrency(interest, this.currentCurrency)} (${rate}%)`;
    if (resTot) resTot.textContent = Utils.formatCurrency(total, this.currentCurrency);
    if (resEnd) resEnd.textContent = Utils.formatDate(endDate);
  },

  createLoanFromSimulator() {
    const principal = parseFloat(document.getElementById('sim-principal')?.value) || 1000;
    const rate = parseFloat(document.getElementById('sim-rate')?.value) || 20;
    const cuotas = parseInt(document.getElementById('sim-installments')?.value, 10) || 24;
    const freq = document.getElementById('sim-frequency')?.value || 'daily';
    const startDate = document.getElementById('sim-start-date')?.value || Utils.getTodayString();

    this.openAddModal();

    document.getElementById('loan-principal-amount').value = principal;
    document.getElementById('loan-interest-rate').value = rate;
    document.getElementById('loan-frequency').value = freq;
    document.getElementById('loan-total-installments').value = cuotas;
    document.getElementById('loan-start-date').value = startDate;

    const firstPay = this.calculateDefaultFirstPaymentDate(startDate, freq, null);
    const firstPayInput = document.getElementById('loan-first-payment-date');
    if (firstPayInput) {
      firstPayInput.value = firstPay;
      firstPayInput.dataset.manual = 'false';
    }

    const interest = principal * (rate / 100);
    const total = principal + interest;
    document.getElementById('loan-interest-amount').value = interest.toFixed(2);
    document.getElementById('loan-total-amount').value = total.toFixed(2);
    document.getElementById('loan-installment-amount').value = (total / cuotas).toFixed(2);
  },

  setRatePreset(rate) {
    const rateInput = document.getElementById('loan-interest-rate');
    if (rateInput) {
      rateInput.value = rate;
      rateInput.dispatchEvent(new Event('input'));
    }
  },

  openAddModal() {
    const form = document.getElementById('loan-form');
    if (form) form.reset();
    document.getElementById('loan-id').value = '';
    const today = Utils.getTodayString();
    document.getElementById('loan-start-date').value = today;
    document.getElementById('loan-frequency').value = 'daily';
    document.getElementById('loan-paid-installments').value = '0';
    document.getElementById('loan-interest-rate').value = '20';
    document.getElementById('loan-total-installments').value = '24';
    document.getElementById('loan-due-day').value = '';

    const customIntPayInput = document.getElementById('loan-custom-interest-payment');
    if (customIntPayInput) {
      customIntPayInput.value = '';
      customIntPayInput.dataset.manual = 'false';
    }

    const firstPayInput = document.getElementById('loan-first-payment-date');
    if (firstPayInput) {
      firstPayInput.dataset.manual = 'false';
      firstPayInput.value = this.calculateDefaultFirstPaymentDate(today, 'daily', null);
    }

    const dueDayContainer = document.getElementById('loan-due-day-container');
    if (dueDayContainer) dueDayContainer.style.display = 'none';

    const hintEl = document.getElementById('loan-schedule-preview-hint');
    if (hintEl) {
      const dShow = firstPayInput ? firstPayInput.value : today;
      hintEl.innerHTML = `<strong>Primer cobro programado (Cuota #1):</strong> ${Utils.formatDate(dShow)}.`;
    }

    document.getElementById('loan-modal-title').textContent = `Nuevo Préstamo (${this.currentCurrency === 'PEN' ? 'Soles S/' : 'Euros €'})`;

    this.selectCurrencyInForm(this.currentCurrency);
    App.openModal('modal-loan');
  },

  openEditModal(id) {
    const list = this.getLoansWithMetrics();
    const item = list.find(x => x.id === id);
    if (!item) return;

    if (item.paidInstallments >= item.totalInstallments) {
      Utils.showToast('Este préstamo está 100% liquidado y no se puede editar.', 'info');
      return;
    }

    document.getElementById('loan-id').value = item.id;
    document.getElementById('loan-entity').value = item.clientName;
    document.getElementById('loan-client-dni').value = item.clientDni || '';
    document.getElementById('loan-client-phone').value = item.clientPhone || '';
    document.getElementById('loan-client-address').value = item.clientAddress || '';
    document.getElementById('loan-principal-amount').value = item.principalAmount || item.totalAmount;
    document.getElementById('loan-interest-rate').value = item.interestRate || 0;
    document.getElementById('loan-interest-amount').value = item.interestAmount || 0;
    document.getElementById('loan-total-amount').value = item.totalAmount;
    document.getElementById('loan-frequency').value = item.frequency || 'daily';
    document.getElementById('loan-total-installments').value = item.totalInstallments;
    document.getElementById('loan-paid-installments').value = item.paidInstallments || 0;
    document.getElementById('loan-installment-amount').value = item.installmentAmount;
    document.getElementById('loan-start-date').value = item.startDate || '';
    document.getElementById('loan-due-day').value = item.dueDayOfMonth || '';

    const customIntPayInput = document.getElementById('loan-custom-interest-payment');
    if (customIntPayInput) {
      customIntPayInput.value = item.customInterestPayment || this.getSuggestedInterestAmount(item);
      customIntPayInput.dataset.manual = item.customInterestPayment ? 'true' : 'false';
    }

    const firstPayInput = document.getElementById('loan-first-payment-date');
    if (firstPayInput) {
      firstPayInput.dataset.manual = item.firstPaymentDate ? 'true' : 'false';
      firstPayInput.value = item.firstPaymentDate || this.calculateDefaultFirstPaymentDate(item.startDate, item.frequency, item.dueDayOfMonth);
    }

    const dueDayContainer = document.getElementById('loan-due-day-container');
    if (dueDayContainer) {
      dueDayContainer.style.display = (item.frequency === 'monthly') ? 'block' : 'none';
    }

    const hintEl = document.getElementById('loan-schedule-preview-hint');
    if (hintEl && firstPayInput) {
      hintEl.innerHTML = `<strong>Primer cobro programado (Cuota #1):</strong> ${Utils.formatDate(firstPayInput.value)}.`;
    }

    document.getElementById('loan-guarantee').value = item.guarantee || '';
    document.getElementById('loan-notes').value = item.notes || '';
    document.getElementById('loan-modal-title').textContent = 'Editar Préstamo';

    this.selectCurrencyInForm(item.currency || this.currentCurrency);
    App.openModal('modal-loan');
  },

  selectCurrencyInForm(currency) {
    const penBtn = document.getElementById('loan-cur-pen-label');
    const eurBtn = document.getElementById('loan-cur-eur-label');
    const penRadio = document.getElementById('loan-cur-pen');
    const eurRadio = document.getElementById('loan-cur-eur');

    if (currency === 'EUR') {
      if (eurRadio) eurRadio.checked = true;
      if (eurBtn) eurBtn.classList.add('selected-eur');
      if (penBtn) penBtn.classList.remove('selected-pen');
    } else {
      if (penRadio) penRadio.checked = true;
      if (penBtn) penBtn.classList.add('selected-pen');
      if (eurBtn) eurBtn.classList.remove('selected-eur');
    }
  },

  handleSaveLoan() {
    const id = document.getElementById('loan-id').value;
    const clientName = document.getElementById('loan-entity').value.trim();
    const clientDni = document.getElementById('loan-client-dni').value.trim();
    const clientPhone = document.getElementById('loan-client-phone').value.trim();
    const clientAddress = document.getElementById('loan-client-address').value.trim();
    const principalAmount = parseFloat(document.getElementById('loan-principal-amount').value) || 0;
    const interestRate = parseFloat(document.getElementById('loan-interest-rate').value) || 0;
    let interestAmount = parseFloat(document.getElementById('loan-interest-amount').value) || 0;
    let totalAmount = parseFloat(document.getElementById('loan-total-amount').value);
    const frequency = document.getElementById('loan-frequency').value;
    const totalInstallments = parseInt(document.getElementById('loan-total-installments').value, 10);
    const paidInstallments = parseInt(document.getElementById('loan-paid-installments').value, 10) || 0;
    let installmentAmount = parseFloat(document.getElementById('loan-installment-amount').value);
    const customInterestPayment = parseFloat(document.getElementById('loan-custom-interest-payment')?.value) || 0;
    const startDate = document.getElementById('loan-start-date').value || Utils.getTodayString();
    const firstPaymentDate = document.getElementById('loan-first-payment-date')?.value || null;
    const dueDayOfMonth = parseInt(document.getElementById('loan-due-day').value, 10) || null;
    const guarantee = document.getElementById('loan-guarantee').value.trim();
    const notes = document.getElementById('loan-notes').value.trim();
    const currency = document.querySelector('input[name="loan-currency"]:checked')?.value || this.currentCurrency;

    if (isNaN(totalAmount) || totalAmount <= 0) {
      if (principalAmount > 0) {
        interestAmount = principalAmount * (interestRate / 100);
        totalAmount = principalAmount + interestAmount;
      } else if (!isNaN(installmentAmount) && installmentAmount > 0 && !isNaN(totalInstallments) && totalInstallments > 0) {
        totalAmount = installmentAmount * totalInstallments;
      }
    }

    if (!clientName || isNaN(totalAmount) || totalAmount <= 0 || isNaN(totalInstallments) || totalInstallments <= 0) {
      Utils.showToast('Por favor completa el nombre del cliente, capital prestado y número de cuotas válidos', 'warning');
      return;
    }

    if (isNaN(installmentAmount) || installmentAmount <= 0) {
      installmentAmount = totalAmount / totalInstallments;
    }

    const loans = Storage.getLoans();

    if (id) {
      const index = loans.findIndex(x => x.id === id);
      if (index !== -1) {
        const targetPaid = Math.min(totalInstallments, Math.max(0, paidInstallments));
        const oldPaid = loans[index].paidInstallments || 0;
        let updatedHistory = Array.isArray(loans[index].history) ? [...loans[index].history] : [];
        if (targetPaid !== oldPaid || targetPaid === 0) {
          const intOnly = updatedHistory.filter(h => h && h.type === 'INTEREST_ONLY');
          updatedHistory = [...intOnly];
          for (let i = 1; i <= targetPaid; i++) {
            updatedHistory.push({
              installmentNumber: `Cuota #${i}`,
              date: startDate,
              amount: installmentAmount,
              type: 'INSTALLMENT',
              method: 'Efectivo',
              receiptCode: Utils.generateReceiptCode()
            });
          }
        }

        loans[index] = {
          ...loans[index],
          entity: clientName,
          clientName,
          clientDni,
          clientPhone,
          clientAddress,
          principalAmount,
          interestRate,
          interestAmount,
          totalAmount,
          frequency,
          totalInstallments,
          paidInstallments: targetPaid,
          installmentAmount,
          customInterestPayment,
          startDate,
          firstPaymentDate,
          dueDayOfMonth,
          guarantee,
          notes,
          currency,
          history: updatedHistory,
          updatedAt: Date.now()
        };
        Utils.showToast(`Préstamo de "${clientName}" actualizado exitosamente`, 'success');
      }
    } else {
      const initialPaid = Math.min(totalInstallments, paidInstallments);
      const initialHistory = [];
      if (initialPaid > 0) {
        for (let i = 1; i <= initialPaid; i++) {
          initialHistory.push({
            installmentNumber: `Cuota #${i}`,
            date: startDate,
            amount: installmentAmount,
            type: 'INSTALLMENT',
            method: 'Efectivo',
            receiptCode: Utils.generateReceiptCode()
          });
        }
      }

      const newLoan = {
        id: Utils.generateId('loan'),
        entity: clientName,
        clientName,
        clientDni,
        clientPhone,
        clientAddress,
        principalAmount: principalAmount > 0 ? principalAmount : (totalAmount - interestAmount),
        interestRate,
        interestAmount,
        totalAmount,
        frequency,
        totalInstallments,
        paidInstallments: initialPaid,
        installmentAmount,
        customInterestPayment,
        startDate,
        firstPaymentDate,
        dueDayOfMonth,
        guarantee,
        notes,
        currency,
        history: initialHistory,
        updatedAt: Date.now()
      };
      loans.unshift(newLoan);
      Utils.showToast(`Préstamo de "${clientName}" registrado con éxito`, 'success');
    }

    Storage.saveLoans(loans, true);
    App.closeModal('modal-loan');
    this.render();
    App.refreshDashboard();
    if (typeof NotificationsController !== 'undefined') {
      NotificationsController.updateUI();
    }
  },

  /**
   * Cobro rápido directo de 1 cuota desde el Dashboard
   */
  quickPayInstallment(loanId) {
    this.openQuickPayModal(loanId, 'INSTALLMENT');
  },

  /**
   * Modal Inteligente de Cobro: Soporta CUOTA NORMAL ('INSTALLMENT') y SOLO INTERÉS ('INTEREST_ONLY')
   */
  openQuickPayModal(loanId, initialMode = 'INSTALLMENT') {
    const list = this.getLoansWithMetrics();
    const item = list.find(x => x.id === loanId);
    if (!item) return;

    if (item.remainingAmount <= 0.01) {
      Utils.showToast('Este préstamo ya está 100% liquidado', 'info');
      return;
    }

    this.activeQuickPayLoan = item;

    document.getElementById('quick-pay-loan-id').value = item.id;
    document.getElementById('quick-pay-client-name').textContent = item.clientName;
    document.getElementById('quick-pay-date').value = Utils.getTodayString();
    document.getElementById('quick-pay-notes').value = '';

    this.setQuickPayMode(initialMode);
    App.openModal('modal-quick-pay');
  },

  /**
   * Alterna en vivo entre Cobrar Cuota Normal vs Cobrar Solo Intereses
   */
  setQuickPayMode(mode) {
    const item = this.activeQuickPayLoan;
    if (!item) return;

    const modeInput = document.getElementById('quick-pay-loan-id') ? document.getElementById('quick-pay-mode') : null;
    if (modeInput) modeInput.value = mode;

    const btnInst = document.getElementById('btn-mode-installment');
    const btnIntOnly = document.getElementById('btn-mode-interest-only');
    const modeBadge = document.getElementById('quick-pay-mode-badge');
    const cuotaLabel = document.getElementById('quick-pay-cuota-label');
    const amountDisplay = document.getElementById('quick-pay-amount-display');
    const amountInput = document.getElementById('quick-pay-amount');
    const amountLabel = document.getElementById('quick-pay-amount-label');
    const helperBox = document.getElementById('interest-only-options-box');
    const presetsContainer = document.getElementById('interest-presets-container');
    const notesInput = document.getElementById('quick-pay-notes');
    const impactPreview = document.getElementById('quick-pay-impact-preview');

    if (btnInst) btnInst.classList.toggle('active', mode === 'INSTALLMENT');
    if (btnIntOnly) btnIntOnly.classList.toggle('active', mode === 'INTEREST_ONLY');

    if (mode === 'INTEREST_ONLY') {
      const suggestedInt = this.getSuggestedInterestAmount(item);
      const nextIntCount = (item.interestOnlyCount || 0) + 1;

      if (modeBadge) {
        modeBadge.className = 'status-badge interest-only-badge';
        modeBadge.textContent = 'Solo Interés';
      }
      if (cuotaLabel) {
        cuotaLabel.textContent = `Pago de Solo Interés #${nextIntCount}`;
      }
      if (amountDisplay) {
        amountDisplay.textContent = Utils.formatCurrency(suggestedInt, item.currency);
      }
      if (amountInput) {
        amountInput.value = suggestedInt.toFixed(2);
      }
      if (amountLabel) {
        amountLabel.textContent = `Monto de Solo Interés a Cobrar (${Utils.getCurrencySymbol(item.currency)}) *`;
      }
      if (impactPreview) {
        impactPreview.innerHTML = `<strong style="color:var(--text-amber);">Efecto:</strong> La deuda se mantiene en <strong>${Utils.formatCurrency(item.remainingAmount, item.currency)}</strong> (${item.paidInstallments}/${item.totalInstallments} cuotas). Este monto suma 100% como ganancia de intereses.`;
      }
      if (notesInput && !notesInput.value) {
        notesInput.placeholder = 'Ej. Solo pagó intereses de este periodo, capital pendiente...';
      }
      if (helperBox) {
        helperBox.style.display = 'block';
      }

      if (presetsContainer) {
        const principal = Number(item.principalAmount) || Number(item.totalAmount) || 0;
        const intTotal = Number(item.interestAmount) || 0;
        const intPerCuota = item.totalInstallments > 0 && intTotal > 0 ? (intTotal / item.totalInstallments) : 0;
        const tenPct = principal * 0.10;
        const twentyPct = principal * 0.20;

        let btns = '';
        if (intPerCuota > 0) {
          btns += `<button type="button" class="btn btn-secondary btn-sm" style="font-size: 0.72rem;" onclick="document.getElementById('quick-pay-amount').value='${intPerCuota.toFixed(2)}'">Int. 1 Cuota (${Utils.formatCurrency(intPerCuota, item.currency)})</button>`;
        }
        if (intTotal > 0 && Math.abs(intTotal - intPerCuota) > 0.05) {
          btns += `<button type="button" class="btn btn-secondary btn-sm" style="font-size: 0.72rem;" onclick="document.getElementById('quick-pay-amount').value='${intTotal.toFixed(2)}'">Int. Total (${Utils.formatCurrency(intTotal, item.currency)})</button>`;
        }
        btns += `<button type="button" class="btn btn-secondary btn-sm" style="font-size: 0.72rem;" onclick="document.getElementById('quick-pay-amount').value='${tenPct.toFixed(2)}'">10% Capital (${Utils.formatCurrency(tenPct, item.currency)})</button>`;
        btns += `<button type="button" class="btn btn-secondary btn-sm" style="font-size: 0.72rem;" onclick="document.getElementById('quick-pay-amount').value='${twentyPct.toFixed(2)}'">20% Capital (${Utils.formatCurrency(twentyPct, item.currency)})</button>`;
        presetsContainer.innerHTML = btns;
      }
    } else {
      const nextCuotaNum = item.paidInstallments + 1;
      const nextAmount = item.nextCuota ? item.nextCuota.amount : item.installmentAmount;
      const newRem = Math.max(0, item.remainingAmount - nextAmount);

      if (modeBadge) {
        modeBadge.className = 'status-badge paid';
        modeBadge.textContent = 'Cuota Normal';
      }
      if (cuotaLabel) {
        cuotaLabel.textContent = `Cuota #${nextCuotaNum} de ${item.totalInstallments}`;
      }
      if (amountDisplay) {
        amountDisplay.textContent = Utils.formatCurrency(nextAmount, item.currency);
      }
      if (amountInput) {
        amountInput.value = nextAmount.toFixed(2);
      }
      if (amountLabel) {
        amountLabel.textContent = `Monto de Cuota a Cobrar (${Utils.getCurrencySymbol(item.currency)}) *`;
      }
      if (impactPreview) {
        impactPreview.innerHTML = `<strong style="color:var(--accent-emerald);">Efecto:</strong> La deuda baja de <strong>${Utils.formatCurrency(item.remainingAmount, item.currency)}</strong> a <strong>${Utils.formatCurrency(newRem, item.currency)}</strong> (${nextCuotaNum}/${item.totalInstallments} cuotas pagadas).`;
      }
      if (notesInput) {
        notesInput.placeholder = 'Ej. Pagó cuota completa...';
      }
      if (helperBox) {
        helperBox.style.display = 'none';
      }
    }
  },

  handleSaveQuickPay() {
    const loanId = document.getElementById('quick-pay-loan-id').value;
    const mode = document.getElementById('quick-pay-mode')?.value || 'INSTALLMENT';
    const amount = parseFloat(document.getElementById('quick-pay-amount').value);
    const method = document.getElementById('quick-pay-method').value;
    const date = document.getElementById('quick-pay-date').value || Utils.getTodayString();
    const notes = document.getElementById('quick-pay-notes').value.trim();
    const extendDue = document.getElementById('quick-pay-extend-due') ? document.getElementById('quick-pay-extend-due').checked : true;

    if (isNaN(amount) || amount <= 0) {
      Utils.showToast('Por favor ingresa un monto válido', 'warning');
      return;
    }

    const loans = Storage.getLoans();
    const index = loans.findIndex(x => x.id === loanId);
    if (index === -1) return;

    const loan = loans[index];
    const receiptCode = Utils.generateReceiptCode();
    loan.history = loan.history || [];

    if (mode === 'INTEREST_ONLY') {
      const intCount = loan.history.filter(h => h && h.type === 'INTEREST_ONLY').length + 1;
      loan.history.push({
        installmentNumber: `💎 Solo Interés #${intCount}`,
        date,
        amount,
        type: 'INTEREST_ONLY',
        extendSchedule: extendDue,
        method,
        receiptCode,
        notes: notes || `Pago de solo intereses #${intCount} (No reduce capital/cuotas)`
      });

      Storage.saveLoans(loans);
      App.closeModal('modal-quick-pay');
      Utils.showToast(`💎 Pago de Solo Interés (${Utils.formatCurrency(amount, loan.currency)}) registrado. El capital pendiente se mantiene igual.`, 'success');
    } else {
      const cuotaNum = (loan.paidInstallments || 0) + 1;
      loan.history.push({
        installmentNumber: `Cuota #${cuotaNum}`,
        date,
        amount,
        type: 'INSTALLMENT',
        method,
        receiptCode,
        notes: notes || `Pago de cuota #${cuotaNum} (${method})`
      });

      loan.paidInstallments = cuotaNum;
      Storage.saveLoans(loans);
      App.closeModal('modal-quick-pay');
      Utils.showToast(`¡Cobro de Cuota #${cuotaNum} registrado! (${Utils.formatCurrency(amount, loan.currency)})`, 'success');
    }

    this.render();
    App.refreshDashboard();

    // Mostrar el recibo digital inmediatamente
    this.openReceiptModal(loan.id, loan.history.length - 1);
  },

  /**
   * Modal de Amortización / Abono Parcial o Solo Interés
   */
  openAmortizeModal(loanId) {
    const list = this.getLoansWithMetrics();
    const item = list.find(x => x.id === loanId);
    if (!item) return;

    if (item.remainingAmount <= 0.01) {
      Utils.showToast('Este préstamo ya se encuentra totalmente liquidado.', 'info');
      return;
    }

    this.activeAmortizeLoan = item;

    document.getElementById('amortize-loan-id').value = item.id;
    document.getElementById('amortize-entity-name').textContent = item.clientName;
    document.getElementById('amortize-current-balance').textContent = Utils.formatCurrency(item.remainingAmount, item.currency);
    document.getElementById('amortize-cuota-val').textContent = Utils.formatCurrency(item.installmentAmount, item.currency);
    document.getElementById('amortize-date').value = Utils.getTodayString();
    document.getElementById('amortize-notes').value = '';

    const typeSelect = document.getElementById('amortize-payment-type');
    if (typeSelect) typeSelect.value = 'PARTIAL_AMORTIZATION';

    const defaultSuggestion = Math.min(item.installmentAmount, item.remainingAmount);
    document.getElementById('amortize-amount').value = defaultSuggestion.toFixed(2);

    App.openModal('modal-amortize');
  },

  handleSaveAmortization() {
    const loanId = document.getElementById('amortize-loan-id').value;
    const paymentType = document.getElementById('amortize-payment-type')?.value || 'PARTIAL_AMORTIZATION';
    const amount = parseFloat(document.getElementById('amortize-amount').value);
    const method = document.getElementById('amortize-method')?.value || 'Efectivo';
    const date = document.getElementById('amortize-date').value || Utils.getTodayString();
    const notes = document.getElementById('amortize-notes').value.trim();

    if (isNaN(amount) || amount <= 0) {
      Utils.showToast('Por favor ingresa un monto válido mayor a 0', 'warning');
      return;
    }

    const loans = Storage.getLoans();
    const index = loans.findIndex(x => x.id === loanId);
    if (index === -1) return;

    const loan = loans[index];
    const metrics = this.getLoansWithMetrics().find(x => x.id === loanId);
    const remaining = metrics ? metrics.remainingAmount : loan.totalAmount;

    if (paymentType !== 'INTEREST_ONLY' && amount > remaining + 0.01) {
      Utils.showToast(`El abono a deuda supera el saldo pendiente (${Utils.formatCurrency(remaining, loan.currency)}). Si es interés extra, elige "Pago de Solo Intereses".`, 'warning');
      return;
    }

    const receiptCode = Utils.generateReceiptCode();
    loan.history = loan.history || [];

    if (paymentType === 'INTEREST_ONLY') {
      const intCount = loan.history.filter(h => h && h.type === 'INTEREST_ONLY').length + 1;
      loan.history.push({
        installmentNumber: `💎 Solo Interés #${intCount}`,
        date,
        amount,
        type: 'INTEREST_ONLY',
        extendSchedule: true,
        method,
        receiptCode,
        notes: notes || `Pago de solo intereses #${intCount}`
      });

      Storage.saveLoans(loans);
      App.closeModal('modal-amortize');
      Utils.showToast(`💎 Pago de Solo Interés (${Utils.formatCurrency(amount, loan.currency)}) registrado sin descontar capital.`, 'success');
    } else {
      loan.history.push({
        installmentNumber: `Abono (${Utils.formatCurrency(amount, loan.currency)})`,
        date,
        amount,
        type: 'PARTIAL_AMORTIZATION',
        method,
        receiptCode,
        notes: notes || 'Abono parcial al préstamo'
      });

      const amortPaid = loan.history
        .filter(h => h && h.type !== 'INTEREST_ONLY')
        .reduce((sum, h) => sum + (Number(h.amount) || 0), 0);
      const cuotaVal = Number(loan.installmentAmount) || (loan.totalAmount / loan.totalInstallments);
      loan.paidInstallments = Math.min(loan.totalInstallments, Math.floor((amortPaid / cuotaVal) + 0.001));

      Storage.saveLoans(loans);
      App.closeModal('modal-amortize');

      const newRemaining = Math.max(0, loan.totalAmount - amortPaid);
      if (newRemaining <= 0.01) {
        Utils.showToast(`🎉 ¡Abono registrado! El préstamo de "${loan.clientName || loan.entity}" ha quedado 100% LIQUIDADO.`, 'success');
      } else {
        Utils.showToast(`Abono de ${Utils.formatCurrency(amount, loan.currency)} registrado. Saldo: ${Utils.formatCurrency(newRemaining, loan.currency)}`, 'success');
      }
    }

    this.render();
    App.refreshDashboard();
    this.openReceiptModal(loan.id, loan.history.length - 1);
  },

  /**
   * Modal de Cronograma Completo de Pagos
   */
  openScheduleModal(loanId) {
    const item = this.getLoansWithMetrics().find(x => x.id === loanId);
    if (!item) return;

    document.getElementById('schedule-modal-title').textContent = `Cronograma - ${item.clientName}`;
    const summaryBox = document.getElementById('schedule-summary-box');
    const tableBody = document.getElementById('schedule-table-body');

    summaryBox.innerHTML = `
      <div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 14px 18px; display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px;">
        <div>
          <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Capital Prestado</div>
          <strong style="color: var(--text-primary); font-family: var(--font-heading);">${Utils.formatCurrency(item.principalAmount, item.currency)}</strong>
        </div>
        <div>
          <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Total Préstamo</div>
          <strong style="color: var(--text-indigo); font-family: var(--font-heading);">${Utils.formatCurrency(item.totalAmount, item.currency)}</strong>
        </div>
        <div>
          <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Solo Interés</div>
          <strong style="color: var(--text-amber); font-family: var(--font-heading);">+ ${Utils.formatCurrency(item.interestOnlyPaid, item.currency)} (${item.interestOnlyCount}x)</strong>
        </div>
        <div>
          <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Debe Ahora</div>
          <strong style="color: var(--text-rose); font-family: var(--font-heading);">${Utils.formatCurrency(item.remainingAmount, item.currency)}</strong>
        </div>
      </div>
    `;

    tableBody.innerHTML = item.schedule.map(s => {
      let pillClass = 'status-badge in-progress';
      let pillText = 'Pendiente';

      if (s.isPaid) {
        pillClass = 'status-badge paid';
        pillText = `Pagada (${Utils.formatDate(s.paidDate)})`;
      } else if (s.status === 'due-today') {
        pillClass = 'status-badge due-today';
        pillText = 'Toca Cobrar Hoy';
      } else if (s.status === 'overdue') {
        pillClass = 'status-badge overdue';
        pillText = `En Mora (+${s.daysDiff}d)`;
      }

      return `
        <tr>
          <td style="font-weight: 700;">Cuota #${s.installmentNumber}</td>
          <td>${Utils.formatDate(s.dueDate)}</td>
          <td style="font-family: var(--font-heading); font-weight: 700; color: var(--text-emerald);">${Utils.formatCurrency(s.amount, item.currency)}</td>
          <td><span class="${pillClass}">${pillText}</span></td>
          <td style="text-align: right;">
            ${!s.isPaid ? `
              <div style="display: inline-flex; gap: 4px;">
                <button class="btn btn-aqua-glow btn-sm" style="padding: 4px 9px; font-size: 0.72rem;" onclick="App.closeModal('modal-schedule'); LoansModule.openQuickPayModal('${item.id}', 'INSTALLMENT')">
                  ${Utils.icon('check', 12)}
                  <span>Cuota</span>
                </button>
                <button class="btn btn-interest-glass btn-sm" style="padding: 4px 9px; font-size: 0.72rem;" onclick="App.closeModal('modal-schedule'); LoansModule.openQuickPayModal('${item.id}', 'INTEREST_ONLY')">
                  ${Utils.icon('percent', 12)}
                  <span>Interés</span>
                </button>
              </div>
            ` : `
              <div style="display: inline-flex; align-items: center; gap: 6px;">
                <span style="color: var(--text-emerald); display: inline-flex; align-items: center;" title="Cuota pagada">${Utils.icon('check', 15)}</span>
                <button class="btn btn-danger-ghost btn-sm" style="padding: 3px 8px; font-size: 0.7rem;" onclick="LoansModule.undoScheduleCuota('${item.id}', ${s.installmentNumber})" title="Revertir Cuota #${s.installmentNumber}">
                  <span>Revertir</span>
                </button>
              </div>
            `}
          </td>
        </tr>
      `;
    }).join('');

    App.openModal('modal-schedule');
  },

  /**
   * Modal de Recibo / Voucher Digital (Distingue Cuota vs Solo Interés)
   */
  openReceiptModalForLoan(loanId) {
    this.openReceiptModal(loanId);
  },

  openReceiptModal(loanId, historyIndex = null) {
    const item = this.getLoansWithMetrics().find(x => x.id === loanId);
    if (!item) return;

    const history = item.history || [];
    const h = (historyIndex !== null && history[historyIndex]) ? history[historyIndex] : (history[history.length - 1] || null);

    const isInterestOnly = h && h.type === 'INTEREST_ONLY';
    const receiptCode = (h && h.receiptCode) ? h.receiptCode : Utils.generateReceiptCode();
    const paidAmount = h ? h.amount : item.installmentAmount;
    const paymentMethod = h ? (h.method || 'Efectivo') : 'Efectivo';
    const paymentDate = h ? h.date : Utils.getTodayString();
    const concept = h ? h.installmentNumber : `Cuota #${item.paidInstallments}`;

    this.activeReceiptData = {
      receiptCode,
      clientName: item.clientName,
      clientDni: item.clientDni,
      clientPhone: item.clientPhone,
      date: paymentDate,
      time: Utils.formatDateTime(),
      concept,
      isInterestOnly,
      amount: paidAmount,
      method: paymentMethod,
      remainingAmount: item.remainingAmount,
      currency: item.currency,
      nextCuota: item.nextCuota
    };

    const paper = document.getElementById('receipt-paper-content');
    if (!paper) return;

    paper.innerHTML = `
      <div class="receipt-header">
        <div class="receipt-title">COMPROBANTE DE PAGO</div>
        <div class="receipt-subtitle">ARI-CONTROL • PRÉSTAMOS & COBRANZAS</div>
        <div style="font-size: 0.74rem; margin-top: 4px; color: #64748b;">N°: <strong>${receiptCode}</strong></div>
      </div>

      <div class="receipt-row">
        <span>FECHA Y HORA:</span>
        <strong>${Utils.formatDateTime()}</strong>
      </div>
      <div class="receipt-row">
        <span>CLIENTE:</span>
        <strong>${this.escapeHTML(item.clientName)}</strong>
      </div>
      ${item.clientDni ? `
        <div class="receipt-row">
          <span>DNI / RUC:</span>
          <strong>${this.escapeHTML(item.clientDni)}</strong>
        </div>
      ` : ''}

      <div class="receipt-divider"></div>

      <div class="receipt-row">
        <span>MODALIDAD:</span>
        <strong>${isInterestOnly ? 'SOLO INTERESES (RENOVACIÓN)' : 'AMORTIZACIÓN DE CUOTA'}</strong>
      </div>
      <div class="receipt-row">
        <span>CONCEPTO:</span>
        <strong>${this.escapeHTML(concept)}</strong>
      </div>
      <div class="receipt-row">
        <span>MÉTODO DE PAGO:</span>
        <strong>${this.escapeHTML(paymentMethod)}</strong>
      </div>

      <div class="receipt-divider"></div>

      <div class="receipt-total-row">
        <span>MONTO PAGADO:</span>
        <span style="color: #0d9488;">${Utils.formatCurrency(paidAmount, item.currency)}</span>
      </div>

      <div class="receipt-row" style="margin-top: 6px;">
        <span>DEUDA RESTANTE:</span>
        <strong style="color: #e11d48;">${Utils.formatCurrency(item.remainingAmount, item.currency)}</strong>
      </div>

      ${isInterestOnly ? `
        <div style="margin-top: 8px; padding: 6px 8px; background: #fef3c7; border: 1px dashed #d97706; border-radius: 6px; font-size: 0.7rem; color: #92400e; text-align: center;">
          Nota: Este pago corresponde únicamente a intereses. El saldo de capital/cuotas (${Utils.formatCurrency(item.remainingAmount, item.currency)}) se mantiene vigente.
        </div>
      ` : ''}

      ${item.nextCuota ? `
        <div class="receipt-row" style="margin-top: 6px; font-size: 0.75rem; color: #475569;">
          <span>PRÓXIMO VENCIMIENTO:</span>
          <span>${Utils.formatDate(item.nextCuota.dueDate)}</span>
        </div>
      ` : `
        <div class="receipt-row" style="margin-top: 6px; font-weight: 800; color: #059669; justify-content: center;">
          🎉 ¡PRÉSTAMO 100% LIQUIDADO!
        </div>
      `}

      <div class="receipt-footer">
        <div>¡GRACIAS POR SU PAGO!</div>
        <div style="font-size: 0.68rem; margin-top: 3px;">Comprobante digital Ari-Control</div>
      </div>
    `;

    App.openModal('modal-receipt');
  },

  sendWhatsAppReminder(loanId, type = 'friendly') {
    const item = this.getLoansWithMetrics().find(x => x.id === loanId);
    if (!item) return;

    if (!item.clientPhone) {
      const phoneInput = prompt(`Ingresa el número de WhatsApp para ${item.clientName} (ej. 987654321):`);
      if (!phoneInput) return;
      item.clientPhone = phoneInput.trim();
      const loans = Storage.getLoans();
      const idx = loans.findIndex(x => x.id === loanId);
      if (idx !== -1) {
        loans[idx].clientPhone = item.clientPhone;
        Storage.saveLoans(loans);
      }
    }

    const cuotaNum = item.paidInstallments + 1;
    const cuotaAmt = item.nextCuota ? item.nextCuota.amount : item.installmentAmount;
    const cuotaDate = item.nextCuota ? item.nextCuota.dueDate : Utils.getTodayString();

    let msg = '';
    if (type === 'overdue') {
      msg = `*AVISO DE COBRANZA - CUOTA VENCIDA*\n\n` +
        `Hola *${item.clientName}*,\n` +
        `Te recordamos que tu *Cuota #${cuotaNum}* por *${Utils.formatCurrency(cuotaAmt, item.currency)}* venció el *${Utils.formatDate(cuotaDate)}* (${item.daysOverdue} día(s) de atraso).\n\n` +
        `Deuda total pendiente: *${Utils.formatCurrency(item.remainingAmount, item.currency)}*.\n` +
        `Por favor indícanos si realizarás el pago de tu cuota o el pago de intereses hoy por Yape, Plin o Efectivo. ¡Gracias!`;
    } else {
      msg = `*RECORDATORIO DE PAGO - ARI-CONTROL*\n\n` +
        `Hola *${item.clientName}*, te saludamos cordialmente.\n` +
        `Hoy corresponde el pago de tu *Cuota #${cuotaNum} de ${item.totalInstallments}* por *${Utils.formatCurrency(cuotaAmt, item.currency)}*.\n\n` +
        `Saldo pendiente: *${Utils.formatCurrency(item.remainingAmount, item.currency)}*.\n` +
        `Aceptamos Yape, Plin o Efectivo. ¡Muchas gracias!`;
    }

    const url = Utils.formatPeruWhatsAppUrl(item.clientPhone, msg);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  },

  sendWhatsAppReceipt(data) {
    if (!data) return;
    let phone = data.clientPhone;
    if (!phone) {
      phone = prompt(`Ingresa el número de WhatsApp para enviar el recibo a ${data.clientName}:`);
      if (!phone) return;
    }

    const msg = `*COMPROBANTE DE COBRO DIGITAL*\n` +
      `------------------------------------\n` +
      `*N° Recibo:* ${data.receiptCode}\n` +
      `*Fecha:* ${data.time}\n` +
      `*Cliente:* ${data.clientName}\n` +
      `------------------------------------\n` +
      `*Modalidad:* ${data.isInterestOnly ? 'SOLO INTERESES (No descuenta capital)' : 'Pago de Cuota'}\n` +
      `*Concepto:* ${data.concept}\n` +
      `*Método:* ${data.method}\n` +
      `*MONTO PAGADO:* *${Utils.formatCurrency(data.amount, data.currency)}*\n` +
      `*Deuda Restante:* ${Utils.formatCurrency(data.remainingAmount, data.currency)}\n` +
      (data.nextCuota ? `*Próximo Pago:* ${Utils.formatDate(data.nextCuota.dueDate)}\n` : `*Estado:* 100% LIQUIDADO\n`) +
      `------------------------------------\n` +
      `¡Muchas gracias por su pago!`;

    const url = Utils.formatPeruWhatsAppUrl(phone, msg);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  },

  /**
   * Historial Completo con separación visual entre Cuotas y Pagos de Solo Interés
   */
  openHistoryModal(loanId) {
    const item = this.getLoansWithMetrics().find(x => x.id === loanId);
    if (!item) return;

    document.getElementById('history-modal-title').textContent = `Historial de Pagos - ${item.clientName}`;
    const contentEl = document.getElementById('history-modal-content');
    const history = item.history || [];

    if (history.length === 0) {
      contentEl.innerHTML = `
        <div class="empty-state" style="padding: 24px;">
          <div class="empty-state-icon">${Utils.icon('receipt', 22)}</div>
          <p style="color: var(--text-muted); font-size: 0.84rem;">No hay registros de pagos de cuotas ni de intereses para este deudor todavía.</p>
        </div>
      `;
    } else {
      const rowsHtml = history.map((h, idx) => {
        const isIntOnly = h.type === 'INTEREST_ONLY';
        const isFull = h.type === 'FULL_SETTLEMENT';
        const isPartial = h.type === 'PARTIAL_AMORTIZATION';

        let badgeClass = 'status-badge paid';
        let badgeText = 'Cuota Pagada';
        if (isIntOnly) {
          badgeClass = 'status-badge interest-only-badge';
          badgeText = 'Solo Interés (No baja deuda)';
        } else if (isFull) {
          badgeClass = 'status-badge paid';
          badgeText = 'Liquidación Total';
        } else if (isPartial) {
          badgeClass = 'status-badge in-progress';
          badgeText = 'Abono Parcial';
        }

        return `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-radius: var(--radius-md); background: var(--bg-primary); margin-bottom: 8px; border: 1px solid ${isIntOnly ? 'rgba(245, 158, 11, 0.35)' : 'var(--border-color)'}; gap: 10px; flex-wrap: wrap;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <strong style="color: var(--text-primary); font-size: 0.88rem;">#${idx + 1} · ${this.escapeHTML((h.installmentNumber || 'Pago').replace('💎 ', ''))}</strong>
                <span class="${badgeClass}" style="font-size: 0.65rem;">${badgeText}</span>
              </div>
              <div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 4px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <span>${Utils.formatDate(h.date)}</span>
                <span>·</span>
                <span>Método: <strong>${this.escapeHTML(h.method || 'Efectivo')}</strong></span>
                ${h.notes ? `<span>· <em>${this.escapeHTML(h.notes)}</em></span>` : ''}
              </div>
            </div>
            <div style="text-align: right; display: flex; align-items: center; gap: 8px;">
              <strong style="font-family: var(--font-heading); color: ${isIntOnly ? 'var(--text-amber)' : 'var(--text-emerald)'}; font-size: 1rem;">
                + ${Utils.formatCurrency(h.amount, item.currency)}
              </strong>
              <button class="btn btn-secondary btn-icon btn-sm" onclick="App.closeModal('modal-loan-history'); LoansModule.openReceiptModal('${item.id}', ${idx})" title="Ver Comprobante">
                ${Utils.icon('receipt', 14)}
              </button>
              <button class="btn btn-danger-ghost btn-icon btn-sm" onclick="LoansModule.deletePayment('${item.id}', ${idx})" title="Eliminar este cobro">
                ${Utils.icon('trash', 14)}
              </button>
            </div>
          </div>
        `;
      }).join('');

      contentEl.innerHTML = `
        <div style="margin-bottom: 14px; background: var(--bg-primary); padding: 14px 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color); display: grid; grid-template-columns: repeat(auto-fit, minmax(125px, 1fr)); gap: 10px;">
          <div>
            <div style="font-size: 0.68rem; color: var(--text-muted); text-transform: uppercase;">Pagado en Cuotas</div>
            <strong style="font-size: 1.02rem; color: var(--text-emerald); font-family: var(--font-heading);">${Utils.formatCurrency(item.totalPaid, item.currency)}</strong>
          </div>
          <div>
            <div style="font-size: 0.68rem; color: var(--text-muted); text-transform: uppercase;">Solo Interés (${item.interestOnlyCount}x)</div>
            <strong style="font-size: 1.02rem; color: var(--text-amber); font-family: var(--font-heading);">+ ${Utils.formatCurrency(item.interestOnlyPaid, item.currency)}</strong>
          </div>
          <div>
            <div style="font-size: 0.68rem; color: var(--text-muted); text-transform: uppercase;">Deuda Restante</div>
            <strong style="font-size: 1.02rem; color: var(--text-rose); font-family: var(--font-heading);">${Utils.formatCurrency(item.remainingAmount, item.currency)}</strong>
          </div>
        </div>
        <div style="max-height: 360px; overflow-y: auto;">
          ${rowsHtml}
        </div>
      `;
    }

    App.openModal('modal-loan-history');
  },

  markFullPayment(loanId) {
    const loans = Storage.getLoans();
    const index = loans.findIndex(x => x.id === loanId);
    if (index === -1) return;

    const loan = loans[index];
    const metrics = this.getLoansWithMetrics().find(x => x.id === loanId);
    const remainingMoney = metrics ? metrics.remainingAmount : 0;

    if (remainingMoney <= 0.01) {
      Utils.showToast('Este préstamo ya está liquidado al 100%', 'info');
      return;
    }

    if (!confirm(`¿Confirmas la LIQUIDACIÓN TOTAL del préstamo de "${loan.clientName || loan.entity}"?\n\nSe liquidará el saldo pendiente de ${Utils.formatCurrency(remainingMoney, loan.currency)} y quedará con deuda 0.`)) {
      return;
    }

    loan.paidInstallments = Number(loan.totalInstallments);
    loan.history = loan.history || [];
    loan.history.push({
      installmentNumber: `Liquidación Total`,
      date: Utils.getTodayString(),
      amount: remainingMoney,
      type: 'FULL_SETTLEMENT',
      method: 'Efectivo',
      receiptCode: Utils.generateReceiptCode(),
      notes: 'Cancelación total del saldo'
    });

    Storage.saveLoans(loans);
    Utils.showToast(`🎉 ¡Préstamo de "${loan.clientName || loan.entity}" marcado como 100% LIQUIDADO!`, 'success');
    this.render();
    App.refreshDashboard();
  },

  reopenLoan(loanId) {
    const loans = Storage.getLoans();
    const index = loans.findIndex(x => x.id === loanId);
    if (index === -1) return;

    const loan = loans[index];
    const input = prompt(`Ingresa el número de cuotas pagadas (de 0 a ${loan.totalInstallments}):`, String(Math.max(0, loan.totalInstallments - 1)));
    if (input === null) return;

    const num = parseInt(input, 10);
    if (isNaN(num) || num < 0 || num > loan.totalInstallments) {
      Utils.showToast(`Por favor ingresa un número válido entre 0 y ${loan.totalInstallments}`, 'warning');
      return;
    }

    // Preserve any INTEREST_ONLY payments when readjusting installments
    const existingIntOnly = (loan.history || []).filter(h => h && h.type === 'INTEREST_ONLY');
    loan.paidInstallments = num;
    const cuotaVal = Number(loan.installmentAmount) || (loan.totalAmount / loan.totalInstallments);
    loan.history = [...existingIntOnly];
    for (let i = 1; i <= num; i++) {
      loan.history.push({
        installmentNumber: `Cuota #${i}`,
        date: loan.startDate || Utils.getTodayString(),
        amount: cuotaVal,
        type: 'INSTALLMENT',
        method: 'Efectivo',
        receiptCode: Utils.generateReceiptCode()
      });
    }

    Storage.saveLoans(loans);
    Utils.showToast(`Cuotas actualizadas a ${num}/${loan.totalInstallments}`, 'info');
    this.render();
    App.refreshDashboard();
  },

  setFullPaidInModal() {
    const totalEl = document.getElementById('loan-total-installments');
    const paidEl = document.getElementById('loan-paid-installments');
    if (totalEl && paidEl) {
      const tot = parseInt(totalEl.value, 10) || 12;
      paidEl.value = String(tot);
      paidEl.dispatchEvent(new Event('input', { bubbles: true }));
      paidEl.dispatchEvent(new Event('change', { bubbles: true }));
      Utils.showToast(`Marcado como Pago Total (${tot} de ${tot} cuotas)`, 'info');
    }
  },

  setZeroPaidInModal() {
    const paidEl = document.getElementById('loan-paid-installments');
    if (paidEl) {
      paidEl.value = '0';
      paidEl.dispatchEvent(new Event('input', { bubbles: true }));
      paidEl.dispatchEvent(new Event('change', { bubbles: true }));
      Utils.showToast('Marcado como 0 cuotas pagadas', 'info');
    }
  },

  deletePayment(loanId, historyIndex) {
    const loans = Storage.getLoans();
    const index = loans.findIndex(x => x.id === loanId);
    if (index === -1) return;

    const loan = loans[index];
    if (!Array.isArray(loan.history) || !loan.history[historyIndex]) {
      Utils.showToast('No se encontró el registro de cobro', 'warning');
      return;
    }

    const h = loan.history[historyIndex];
    const desc = `${h.installmentNumber || 'Pago'} (${Utils.formatCurrency(h.amount, loan.currency)})`;

    if (!confirm(`¿Deseas eliminar este registro de cobro: "${desc}"? Se recalculará la deuda restante.`)) return;

    loan.history.splice(historyIndex, 1);

    const cuotaVal = Number(loan.installmentAmount) || (loan.totalAmount / loan.totalInstallments);
    const amortPaid = loan.history
      .filter(p => p && p.type !== 'INTEREST_ONLY')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    loan.paidInstallments = Math.min(loan.totalInstallments, Math.floor((amortPaid / (cuotaVal || 1)) + 0.001));
    loan.updatedAt = Date.now();

    Storage.saveLoans(loans, true);
    Utils.showToast(`Cobro "${desc}" eliminado con éxito`, 'success');
    this.render();
    App.refreshDashboard();

    const histModal = document.getElementById('modal-loan-history');
    if (histModal && histModal.classList.contains('active')) {
      this.openHistoryModal(loan.id);
    }
  },

  undoScheduleCuota(loanId, installmentNumber) {
    const loans = Storage.getLoans();
    const index = loans.findIndex(x => x.id === loanId);
    if (index === -1) return;

    const loan = loans[index];
    if (!Array.isArray(loan.history)) loan.history = [];

    const targetTag = `Cuota #${installmentNumber}`;
    const hIdx = loan.history.findIndex(h => h && (h.installmentNumber === targetTag || (h.type !== 'INTEREST_ONLY' && h.installmentNumber && h.installmentNumber.includes(`#${installmentNumber}`))));

    if (!confirm(`¿Deseas anular y revertir el pago de la Cuota #${installmentNumber}?`)) return;

    if (hIdx !== -1) {
      loan.history.splice(hIdx, 1);
    } else {
      loan.paidInstallments = Math.max(0, (loan.paidInstallments || 1) - 1);
    }

    const cuotaVal = Number(loan.installmentAmount) || (loan.totalAmount / loan.totalInstallments);
    const amortPaid = loan.history
      .filter(p => p && p.type !== 'INTEREST_ONLY')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    loan.paidInstallments = Math.min(loan.totalInstallments, Math.floor((amortPaid / (cuotaVal || 1)) + 0.001));
    loan.updatedAt = Date.now();

    Storage.saveLoans(loans, true);
    Utils.showToast(`Cuota #${installmentNumber} revertida con éxito`, 'info');
    this.render();
    App.refreshDashboard();

    const schedModal = document.getElementById('modal-schedule');
    if (schedModal && schedModal.classList.contains('active')) {
      this.openScheduleModal(loan.id);
    }
  },

  undoPayInstallment(loanId) {
    const loans = Storage.getLoans();
    const index = loans.findIndex(x => x.id === loanId);
    if (index === -1) return;

    const loan = loans[index];
    if ((!loan.history || loan.history.length === 0) && (!loan.paidInstallments || loan.paidInstallments <= 0)) {
      Utils.showToast('No hay pagos registrados para revertir', 'info');
      return;
    }

    const lastPayment = loan.history && loan.history.length > 0 ? loan.history[loan.history.length - 1] : null;
    const desc = lastPayment ? `${lastPayment.installmentNumber} (${Utils.formatCurrency(lastPayment.amount, loan.currency)})` : `Cuota #${loan.paidInstallments}`;

    if (!confirm(`¿Deseas revertir el último cobro registrado: ${desc}?`)) return;

    if (loan.history && loan.history.length > 0) {
      loan.history.pop();
    } else {
      loan.paidInstallments = Math.max(0, (loan.paidInstallments || 1) - 1);
    }

    const cuotaVal = Number(loan.installmentAmount) || (loan.totalAmount / loan.totalInstallments);
    const amortPaid = loan.history
      ? loan.history.filter(h => h && h.type !== 'INTEREST_ONLY').reduce((sum, h) => sum + (Number(h.amount) || 0), 0)
      : ((loan.paidInstallments || 0) * cuotaVal);
    loan.paidInstallments = Math.min(loan.totalInstallments, Math.floor((amortPaid / (cuotaVal || 1)) + 0.001));
    loan.updatedAt = Date.now();

    Storage.saveLoans(loans, true);
    Utils.showToast('Último cobro revertido con éxito', 'info');
    this.render();
    App.refreshDashboard();
  },

  deleteLoan(id) {
    if (!confirm('¿Estás seguro de que deseas eliminar este préstamo?')) return;
    Storage.deleteLoan(id);
    Utils.showToast('Préstamo eliminado exitosamente', 'info');
    this.render();
    App.refreshDashboard();
  },

  calculateTotals() {
    const list = this.getLoansWithMetrics();
    const todayStr = Utils.getTodayString();

    const totals = {
      PEN: {
        total: 0,
        paid: 0,
        remaining: 0,
        interestEarned: 0,
        interestOnlyPaid: 0,
        interestOnlyCount: 0,
        interestOnlyDebtorsCount: 0,
        dailyExpected: 0,
        dailyCollected: 0,
        overdueCount: 0
      },
      EUR: {
        total: 0,
        paid: 0,
        remaining: 0,
        interestEarned: 0,
        interestOnlyPaid: 0,
        interestOnlyCount: 0,
        interestOnlyDebtorsCount: 0,
        dailyExpected: 0,
        dailyCollected: 0,
        overdueCount: 0
      }
    };

    list.forEach(item => {
      const cur = item.currency === 'EUR' ? 'EUR' : 'PEN';
      totals[cur].total += Number(item.totalAmount) || 0;
      totals[cur].paid += Number(item.totalPaid) || 0;
      totals[cur].remaining += Number(item.remainingAmount) || 0;
      totals[cur].interestEarned += Number(item.interestEarned) || 0;
      totals[cur].interestOnlyPaid += Number(item.interestOnlyPaid) || 0;
      totals[cur].interestOnlyCount += Number(item.interestOnlyCount) || 0;
      if (item.interestOnlyCount > 0) {
        totals[cur].interestOnlyDebtorsCount++;
      }

      if (item.status === 'due-today' || item.status === 'overdue') {
        totals[cur].dailyExpected += (item.nextCuota ? Number(item.nextCuota.amount) : 0);
      }
      if (item.status === 'overdue') {
        totals[cur].overdueCount++;
      }
      if (item.history && Array.isArray(item.history)) {
        item.history.forEach(h => {
          if (h.date === todayStr) {
            totals[cur].dailyCollected += Number(h.amount) || 0;
          }
        });
      }
    });

    return totals;
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
