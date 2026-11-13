/**
 * ARI-CONTROL - MAIN APPLICATION CONTROLLER
 * Spatial Liquid Glass UI + Strict Multi-Currency Isolation (PEN vs EUR)
 */

const App = {
  currentTab: 'dashboard',
  currentCurrency: 'PEN', // 'PEN' (Soles) | 'EUR' (Euros)

  init() {
    const savedCur = localStorage.getItem('finanflow_active_currency');
    if (savedCur === 'EUR' || savedCur === 'PEN') {
      this.currentCurrency = savedCur;
    }

    Storage.init();
    this.initCustomNumberSteppers();
    this.initCustomSelects();
    this.initCustomDatePickers();
    this.bindNavigation();
    this.bindCurrencySwitchers();
    this.bindModalListeners();
    this.bindBackupControls();
    this.bindThemeToggle();

    // Initialize sub-modules
    ExpensesModule.init();
    LoansModule.init();
    ConverterModule.init();
    ReportsModule.init();

    // Apply active currency across all UI
    this.applyActiveCurrencyUI();

    // Multi-page route detection
    const pageAttr = document.body.dataset.page;
    if (pageAttr) {
      this.switchTab(pageAttr);
    } else {
      const path = (window.location.pathname || '').toLowerCase();
      if (path.includes('prestamo')) this.switchTab('loans');
      else if (path.includes('gasto')) this.switchTab('expenses');
      else if (path.includes('convers')) this.switchTab('converter');
      else if (path.includes('report')) this.switchTab('reports');
      else this.refreshDashboard();
    }

    // Dismiss Splash Screen smoothly after brief delay
    this.dismissSplashScreen();
  },

  dismissSplashScreen() {
    const splash = document.getElementById('app-splash-screen');
    if (splash) {
      setTimeout(() => {
        splash.classList.add('fade-out');
        setTimeout(() => {
          if (splash.parentNode) splash.parentNode.removeChild(splash);
        }, 450);
      }, 550);
    }
  },

  initCustomNumberSteppers() {
    document.querySelectorAll('input[type="number"]').forEach(input => {
      if (input.parentElement && input.parentElement.classList.contains('num-stepper-wrap')) return;

      const wrap = document.createElement('div');
      wrap.className = 'num-stepper-wrap';
      input.parentNode.insertBefore(wrap, input);
      wrap.appendChild(input);

      const controls = document.createElement('div');
      controls.className = 'num-stepper-controls';

      const btnUp = document.createElement('button');
      btnUp.type = 'button';
      btnUp.className = 'num-step-btn step-up';
      btnUp.tabIndex = -1;
      btnUp.setAttribute('aria-label', 'Incrementar');
      btnUp.innerHTML = `<svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"></polyline></svg>`;

      const btnDown = document.createElement('button');
      btnDown.type = 'button';
      btnDown.className = 'num-step-btn step-down';
      btnDown.tabIndex = -1;
      btnDown.setAttribute('aria-label', 'Disminuir');
      btnDown.innerHTML = `<svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>`;

      const stepValue = (dir) => {
        let current = parseFloat(input.value);
        if (isNaN(current)) current = 0;
        const stepAttr = parseFloat(input.step) || 1;
        const minAttr = input.min !== '' ? parseFloat(input.min) : null;
        const maxAttr = input.max !== '' ? parseFloat(input.max) : null;
        let nextVal = current + (dir * stepAttr);
        if (minAttr !== null && nextVal < minAttr) nextVal = minAttr;
        if (maxAttr !== null && nextVal > maxAttr) nextVal = maxAttr;
        input.value = Number.isInteger(stepAttr) ? String(Math.round(nextVal)) : nextVal.toFixed(2);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      };

      btnUp.addEventListener('click', (e) => {
        e.preventDefault();
        stepValue(1);
      });

      btnDown.addEventListener('click', (e) => {
        e.preventDefault();
        stepValue(-1);
      });

      controls.appendChild(btnUp);
      controls.appendChild(btnDown);
      wrap.appendChild(controls);
    });
  },

  /**
   * Transforms all native <select> elements into App-Themed Crystal Glass Dropdown Menus
   * with smooth Fade & Slide animations and full two-way synchronization.
   */
  initCustomSelects() {
    // Intercept programmatic .value = ... assignments on HTMLSelectElement so custom UI stays in sync
    if (!HTMLSelectElement.prototype._ariCustomSelectPatched) {
      const desc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
      if (desc && desc.get && desc.set) {
        Object.defineProperty(HTMLSelectElement.prototype, 'value', {
          get() {
            return desc.get.call(this);
          },
          set(val) {
            desc.set.call(this, val);
            if (typeof this._syncCustomSelect === 'function') {
              this._syncCustomSelect();
            }
          },
          configurable: true
        });
        HTMLSelectElement.prototype._ariCustomSelectPatched = true;
      }
    }

    document.querySelectorAll('select').forEach(select => {
      if (select.dataset.customSelectReady === 'true') return;
      select.dataset.customSelectReady = 'true';

      const wrapper = document.createElement('div');
      wrapper.className = 'custom-select-wrapper';
      if (select.classList.contains('filter-select')) {
        wrapper.classList.add('is-filter-select');
      } else {
        wrapper.classList.add('custom-select-block');
      }
      if (select.style.maxWidth) {
        wrapper.style.maxWidth = select.style.maxWidth;
      }

      select.parentNode.insertBefore(wrapper, select);
      wrapper.appendChild(select);
      select.classList.add('native-select-hidden');
      select.tabIndex = -1;

      const trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.className = 'custom-select-trigger';
      trigger.setAttribute('aria-haspopup', 'listbox');
      trigger.setAttribute('aria-expanded', 'false');

      const labelSpan = document.createElement('span');
      labelSpan.className = 'custom-select-value';

      const arrowSpan = document.createElement('span');
      arrowSpan.className = 'custom-select-arrow';
      arrowSpan.innerHTML = `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>`;

      trigger.appendChild(labelSpan);
      trigger.appendChild(arrowSpan);

      const menu = document.createElement('div');
      menu.className = 'custom-select-menu';
      menu.setAttribute('role', 'listbox');

      wrapper.appendChild(trigger);
      document.body.appendChild(menu);

      // Redirect associated <label for="..."> clicks to the custom trigger and detach native 'for' to prevent native OS menu
      if (select.id) {
        const assocLabel = document.querySelector(`label[for="${select.id}"]`);
        if (assocLabel) {
          assocLabel.removeAttribute('for');
          assocLabel.style.cursor = 'pointer';
          assocLabel.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            trigger.click();
          });
        }
      }

      const positionMenu = () => {
        const rect = trigger.getBoundingClientRect();
        const maxMenuH = 250;
        const spaceBelow = window.innerHeight - rect.bottom;
        const openUp = spaceBelow < maxMenuH + 16 && rect.top > maxMenuH;

        const menuW = Math.max(rect.width, 185);
        let left = rect.left;
        if (left + menuW > window.innerWidth - 10) {
          left = Math.max(10, window.innerWidth - menuW - 10);
        }

        menu.style.width = `${menuW}px`;
        menu.style.left = `${left}px`;
        if (openUp) {
          menu.style.top = 'auto';
          menu.style.bottom = `${window.innerHeight - rect.top + 6}px`;
          menu.classList.add('drop-up');
        } else {
          menu.style.bottom = 'auto';
          menu.style.top = `${rect.bottom + 6}px`;
          menu.classList.remove('drop-up');
        }
      };

      const closeMenu = () => {
        wrapper.classList.remove('open');
        menu.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
      };

      const buildOptions = () => {
        menu.innerHTML = '';
        const options = Array.from(select.options);
        const selectedOpt = options[select.selectedIndex] || options[0];
        labelSpan.textContent = selectedOpt ? selectedOpt.textContent.trim() : 'Seleccionar';

        options.forEach((opt) => {
          const item = document.createElement('button');
          item.type = 'button';
          const isSelected = opt.value === select.value;
          item.className = 'custom-select-option' + (isSelected ? ' selected active' : '');
          item.dataset.value = opt.value;

          const textSpan = document.createElement('span');
          textSpan.textContent = opt.textContent.trim();

          const checkSpan = document.createElement('span');
          checkSpan.className = 'custom-select-check';
          checkSpan.innerHTML = `<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

          item.appendChild(textSpan);
          item.appendChild(checkSpan);

          item.addEventListener('click', (e) => {
            e.stopPropagation();
            if (select.value !== opt.value) {
              select.value = opt.value;
              select.dispatchEvent(new Event('change', { bubbles: true }));
              if (typeof select.onchange === 'function') {
                select.onchange(new Event('change'));
              }
            }
            syncUI();
            closeMenu();
          });

          menu.appendChild(item);
        });
      };

      const syncUI = () => {
        const options = Array.from(select.options);
        const selectedOpt = options.find(o => o.value === select.value) || options[select.selectedIndex] || options[0];
        if (selectedOpt) {
          labelSpan.textContent = selectedOpt.textContent.trim();
        }
        menu.querySelectorAll('.custom-select-option').forEach(btn => {
          const match = btn.dataset.value === select.value;
          btn.classList.toggle('selected', match);
          btn.classList.toggle('active', match);
        });
      };

      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = wrapper.classList.contains('open');

        // Close all other open menus & date pickers
        document.querySelectorAll('.custom-select-wrapper.open').forEach(w => w.classList.remove('open'));
        document.querySelectorAll('.custom-select-menu.open').forEach(m => m.classList.remove('open'));
        document.querySelectorAll('.custom-date-wrapper.open').forEach(w => w.classList.remove('open'));
        document.querySelectorAll('.custom-date-popover.open').forEach(p => p.classList.remove('open'));

        if (!isOpen) {
          positionMenu();
          wrapper.classList.add('open');
          menu.classList.add('open');
          trigger.setAttribute('aria-expanded', 'true');
        }
      });

      select._syncCustomSelect = syncUI;
      select._rebuildCustomSelect = buildOptions;
      select.addEventListener('change', syncUI);

      if (select.form) {
        select.form.addEventListener('reset', () => {
          setTimeout(syncUI, 0);
        });
      }

      const observer = new MutationObserver(() => {
        buildOptions();
      });
      observer.observe(select, { childList: true, subtree: true });

      buildOptions();
    });

    // Close open dropdown menus when clicking outside or resizing
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.custom-select-wrapper') && !e.target.closest('.custom-select-menu')) {
        document.querySelectorAll('.custom-select-wrapper.open').forEach(w => w.classList.remove('open'));
        document.querySelectorAll('.custom-select-menu.open').forEach(m => m.classList.remove('open'));
      }
    });

    window.addEventListener('resize', () => {
      document.querySelectorAll('.custom-select-wrapper.open').forEach(w => w.classList.remove('open'));
      document.querySelectorAll('.custom-select-menu.open').forEach(m => m.classList.remove('open'));
    });
  },

  syncAllCustomSelects() {
    document.querySelectorAll('select').forEach(select => {
      if (typeof select._syncCustomSelect === 'function') {
        select._syncCustomSelect();
      }
    });
  },

  /**
   * Transforms all native <input type="date"> elements into App-Themed Crystal Glass
   * Calendar Date Pickers with smooth Fade & Slide transitions and high contrast in Dark & Light modes.
   */
  initCustomDatePickers() {
    if (!HTMLInputElement.prototype._ariCustomDatePatched) {
      const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
      if (desc && desc.get && desc.set) {
        Object.defineProperty(HTMLInputElement.prototype, 'value', {
          get() {
            return desc.get.call(this);
          },
          set(val) {
            desc.set.call(this, val);
            if (this.type === 'date' && typeof this._syncCustomDate === 'function') {
              this._syncCustomDate();
            }
          },
          configurable: true
        });
        HTMLInputElement.prototype._ariCustomDatePatched = true;
      }
    }

    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const shortMonths = [
      'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
      'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
    ];
    const weekDays = ['DO', 'LU', 'MA', 'MI', 'JU', 'VI', 'SA'];

    const parseISO = (str) => {
      if (!str || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
      const [y, m, d] = str.split('-').map(Number);
      return { year: y, month: m - 1, day: d };
    };

    const toISO = (year, month, day) => {
      const m = String(month + 1).padStart(2, '0');
      const d = String(day).padStart(2, '0');
      return `${year}-${m}-${d}`;
    };

    const formatDisplay = (str) => {
      const parsed = parseISO(str);
      if (!parsed) return 'Seleccionar fecha';
      return `${String(parsed.day).padStart(2, '0')} ${shortMonths[parsed.month]} ${parsed.year}`;
    };

    document.querySelectorAll('input[type="date"]').forEach(input => {
      if (input.dataset.customDateReady === 'true') return;
      input.dataset.customDateReady = 'true';

      const wrapper = document.createElement('div');
      wrapper.className = 'custom-date-wrapper';
      input.parentNode.insertBefore(wrapper, input);
      wrapper.appendChild(input);
      input.classList.add('native-date-hidden');
      input.tabIndex = -1;

      const trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.className = 'custom-date-trigger';
      trigger.setAttribute('aria-haspopup', 'dialog');
      trigger.setAttribute('aria-expanded', 'false');

      // Redirect associated <label for="..."> clicks to the custom trigger and detach native 'for' to prevent native OS datepicker
      if (input.id) {
        const assocLabel = document.querySelector(`label[for="${input.id}"]`);
        if (assocLabel) {
          assocLabel.removeAttribute('for');
          assocLabel.style.cursor = 'pointer';
          assocLabel.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            trigger.click();
          });
        }
      }

      const leftGroup = document.createElement('span');
      leftGroup.className = 'custom-date-left';
      leftGroup.innerHTML = `<svg class="custom-date-icon" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`;

      const labelSpan = document.createElement('span');
      labelSpan.className = 'custom-date-label';
      leftGroup.appendChild(labelSpan);

      const arrowSpan = document.createElement('span');
      arrowSpan.className = 'custom-select-arrow';
      arrowSpan.innerHTML = `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>`;

      trigger.appendChild(leftGroup);
      trigger.appendChild(arrowSpan);

      const popover = document.createElement('div');
      popover.className = 'custom-date-popover';
      popover.setAttribute('role', 'dialog');
      popover.setAttribute('aria-label', 'Calendario');

      wrapper.appendChild(trigger);
      document.body.appendChild(popover);

      const now = new Date();
      let viewYear = now.getFullYear();
      let viewMonth = now.getMonth();

      const positionPopover = () => {
        const rect = trigger.getBoundingClientRect();
        const popWidth = 284;
        const popHeight = 328;
        const spaceBelow = window.innerHeight - rect.bottom;
        const openUp = spaceBelow < popHeight + 14 && rect.top > popHeight + 14;

        let left = rect.left;
        if (left + popWidth > window.innerWidth - 12) {
          left = Math.max(12, window.innerWidth - popWidth - 12);
        }

        popover.style.width = `${Math.max(popWidth, Math.min(rect.width, 320))}px`;
        popover.style.left = `${left}px`;
        if (openUp) {
          popover.style.top = 'auto';
          popover.style.bottom = `${Math.max(10, window.innerHeight - rect.top + 6)}px`;
        } else {
          popover.style.bottom = 'auto';
          const topPos = Math.max(10, Math.min(rect.bottom + 6, window.innerHeight - popHeight - 10));
          popover.style.top = `${topPos}px`;
        }
      };

      const closePopover = () => {
        wrapper.classList.remove('open');
        popover.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
      };

      const selectDateISO = (isoStr) => {
        input.value = isoStr;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        syncUI();
        closePopover();
      };

      const renderCalendar = () => {
        const selected = parseISO(input.value);
        const todayISO = Utils.getTodayString();
        const todayParsed = parseISO(todayISO);

        const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
        const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
        const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

        let html = `
          <div class="cal-header">
            <div class="cal-month-title">${monthNames[viewMonth]} de ${viewYear}</div>
            <div class="cal-nav-btns">
              <button type="button" class="cal-nav-btn" data-cal-nav="-1" title="Mes anterior" aria-label="Mes anterior">
                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"></polyline></svg>
              </button>
              <button type="button" class="cal-nav-btn" data-cal-nav="1" title="Mes siguiente" aria-label="Mes siguiente">
                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
            </div>
          </div>
          <div class="cal-weekdays">
            ${weekDays.map(w => `<span>${w}</span>`).join('')}
          </div>
          <div class="cal-days-grid">
        `;

        // Previous month trailing days
        for (let i = firstDayOfWeek - 1; i >= 0; i--) {
          const d = daysInPrevMonth - i;
          const prevDate = new Date(viewYear, viewMonth - 1, d);
          const iso = toISO(prevDate.getFullYear(), prevDate.getMonth(), prevDate.getDate());
          html += `<button type="button" class="cal-day-btn other-month" data-iso="${iso}">${d}</button>`;
        }

        // Current month days
        for (let d = 1; d <= daysInMonth; d++) {
          const iso = toISO(viewYear, viewMonth, d);
          const isSelected = selected && selected.year === viewYear && selected.month === viewMonth && selected.day === d;
          const isToday = todayParsed && todayParsed.year === viewYear && todayParsed.month === viewMonth && todayParsed.day === d;
          const cls = [
            'cal-day-btn',
            isSelected ? 'is-selected' : '',
            isToday ? 'is-today' : ''
          ].filter(Boolean).join(' ');
          html += `<button type="button" class="${cls}" data-iso="${iso}">${d}</button>`;
        }

        // Next month leading days to complete 6 rows (42 cells) or 5 rows (35 cells)
        const totalCellsSoFar = firstDayOfWeek + daysInMonth;
        const targetCells = totalCellsSoFar > 35 ? 42 : 35;
        const remaining = targetCells - totalCellsSoFar;
        for (let d = 1; d <= remaining; d++) {
          const nextDate = new Date(viewYear, viewMonth + 1, d);
          const iso = toISO(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate());
          html += `<button type="button" class="cal-day-btn other-month" data-iso="${iso}">${d}</button>`;
        }

        html += `
          </div>
          <div class="cal-footer">
            <button type="button" class="cal-footer-btn cal-btn-clear" data-cal-action="clear">Borrar</button>
            <button type="button" class="cal-footer-btn cal-btn-today" data-cal-action="today">Hoy</button>
          </div>
        `;

        popover.innerHTML = html;

        popover.querySelectorAll('[data-cal-nav]').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const dir = parseInt(btn.dataset.calNav, 10);
            const next = new Date(viewYear, viewMonth + dir, 1);
            viewYear = next.getFullYear();
            viewMonth = next.getMonth();
            renderCalendar();
          });
        });

        popover.querySelectorAll('.cal-day-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            selectDateISO(btn.dataset.iso);
          });
        });

        const clearBtn = popover.querySelector('[data-cal-action="clear"]');
        if (clearBtn) {
          clearBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            selectDateISO('');
          });
        }

        const todayBtn = popover.querySelector('[data-cal-action="today"]');
        if (todayBtn) {
          todayBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            selectDateISO(Utils.getTodayString());
          });
        }
      };

      const syncUI = () => {
        labelSpan.textContent = formatDisplay(input.value);
        trigger.classList.toggle('is-empty', !input.value);
        const parsed = parseISO(input.value);
        if (parsed) {
          viewYear = parsed.year;
          viewMonth = parsed.month;
        }
      };

      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = wrapper.classList.contains('open');

        // Close any other open custom selects or date pickers
        document.querySelectorAll('.custom-select-wrapper.open').forEach(w => w.classList.remove('open'));
        document.querySelectorAll('.custom-select-menu.open').forEach(m => m.classList.remove('open'));
        document.querySelectorAll('.custom-date-wrapper.open').forEach(w => w.classList.remove('open'));
        document.querySelectorAll('.custom-date-popover.open').forEach(p => p.classList.remove('open'));

        if (!isOpen) {
          const parsed = parseISO(input.value) || parseISO(Utils.getTodayString());
          if (parsed) {
            viewYear = parsed.year;
            viewMonth = parsed.month;
          }
          renderCalendar();
          positionPopover();
          wrapper.classList.add('open');
          popover.classList.add('open');
          trigger.setAttribute('aria-expanded', 'true');
        }
      });

      input._syncCustomDate = syncUI;
      input.addEventListener('change', syncUI);
      syncUI();
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.custom-date-wrapper') && !e.target.closest('.custom-date-popover')) {
        document.querySelectorAll('.custom-date-wrapper.open').forEach(w => w.classList.remove('open'));
        document.querySelectorAll('.custom-date-popover.open').forEach(p => p.classList.remove('open'));
      }
    });

    window.addEventListener('resize', () => {
      document.querySelectorAll('.custom-date-wrapper.open').forEach(w => w.classList.remove('open'));
      document.querySelectorAll('.custom-date-popover.open').forEach(p => p.classList.remove('open'));
    });
  },

  syncAllCustomDates() {
    document.querySelectorAll('input[type="date"]').forEach(input => {
      if (typeof input._syncCustomDate === 'function') {
        input._syncCustomDate();
      }
    });
  },

  bindNavigation() {
    const navButtons = document.querySelectorAll('.nav-item-btn[data-tab], .dock-tab-btn[data-tab]');
    navButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (e) e.preventDefault();
        const tab = btn.dataset.tab;
        if (!tab) return;
        this.switchTab(tab);

        // Update URL cleanly without reloading page or flashing theme
        const urlMap = {
          dashboard: 'index.html',
          loans: 'prestamos.html',
          expenses: 'gastos.html',
          converter: 'conversor.html'
        };
        const targetUrl = urlMap[tab] || 'index.html';
        if (window.history && window.history.pushState) {
          try {
            window.history.pushState({ tab }, '', targetUrl);
          } catch(err) {}
        }

        // Close mobile sidebar if open
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (sidebar && sidebar.classList.contains('open')) {
          sidebar.classList.remove('open');
          if (overlay) overlay.classList.remove('open');
        }
      });
    });

    // Handle browser back / forward without full reload
    window.addEventListener('popstate', (e) => {
      if (e.state && e.state.tab) {
        this.switchTab(e.state.tab);
      } else {
        const path = (window.location.pathname || '').toLowerCase();
        if (path.includes('prestamo')) this.switchTab('loans');
        else if (path.includes('gasto')) this.switchTab('expenses');
        else if (path.includes('convers')) this.switchTab('converter');
        else this.switchTab('dashboard');
      }
    });

    // Mobile sidebar toggle
    const menuBtn = document.getElementById('menu-toggle-btn');
    const closeBtn = document.getElementById('sidebar-close-btn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    if (menuBtn && sidebar && overlay) {
      menuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('open');
      });

      overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('open');
      });

      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          sidebar.classList.remove('open');
          overlay.classList.remove('open');
        });
      }
    }
  },

  handleMobileQuickAdd() {
    if (this.currentTab === 'expenses') {
      ExpensesModule.openAddModal();
    } else {
      LoansModule.openAddModal();
    }
  },

  switchTab(tabName) {
    this.currentTab = tabName;

    // Update desktop nav buttons & mobile dock buttons
    document.querySelectorAll('.nav-item-btn[data-tab], .dock-tab-btn[data-tab]').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tabName);
    });

    // Update views
    document.querySelectorAll('.view-section').forEach(view => {
      view.classList.toggle('active', view.id === `view-${tabName}`);
    });

    const isPEN = this.currentCurrency === 'PEN';
    const curName = isPEN ? 'Soles (S/)' : 'Euros (€)';

    const titles = {
      dashboard: { title: 'Centro de Control', desc: `Bóveda activa en <strong style="color:var(--accent-aqua);">${curName}</strong>` },
      expenses: { title: 'Mis Gastos', desc: `Control de salidas de dinero en <strong style="color:var(--accent-aqua);">${curName}</strong>` },
      loans: { title: 'Préstamos & Cobranzas', desc: `Cuotas, control de Solo Interés y deudores en <strong style="color:var(--accent-aqua);">${curName}</strong>` },
      converter: { title: 'Conversor de Divisas', desc: 'Cotizaciones en vivo entre Euros (€), Soles (S/) y Dólares ($)' }
    };

    const info = titles[tabName] || titles.dashboard;
    const titleEl = document.getElementById('page-title');
    const descEl = document.getElementById('page-description');
    if (titleEl) titleEl.textContent = info.title;
    if (descEl) descEl.innerHTML = info.desc;

    if (tabName === 'dashboard') {
      this.refreshDashboard();
    } else if (tabName === 'expenses') {
      ExpensesModule.render();
    } else if (tabName === 'loans') {
      LoansModule.render();
    } else if (tabName === 'converter') {
      ConverterModule.calculate();
    }

    // Close mobile sidebar if open
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('open');

    window.scrollTo(0, 0);
  },

  setCurrency(cur) {
    if (this.currentCurrency === cur) return;
    this.currentCurrency = cur;
    localStorage.setItem('finanflow_active_currency', cur);
    this.applyActiveCurrencyUI();
    this.refreshDashboard();
    Utils.showToast(`Cambiado al apartado de ${cur === 'PEN' ? 'Soles (S/)' : 'Euros (€)'}`, 'info');
  },

  bindCurrencySwitchers() {
    document.querySelectorAll('.cur-pill-btn[data-cur]').forEach(btn => {
      btn.addEventListener('click', () => {
        const cur = btn.dataset.cur;
        this.setCurrency(cur);
      });
    });
  },

  applyActiveCurrencyUI() {
    const isPEN = this.currentCurrency === 'PEN';
    const curName = isPEN ? 'Soles (S/)' : 'Euros (€)';
    const shortName = isPEN ? 'Soles' : 'Euros';

    document.querySelectorAll('.cur-pill-btn[data-cur]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.cur === this.currentCurrency);
    });

    document.querySelectorAll('.active-currency-name-text').forEach(el => {
      el.textContent = shortName;
    });

    const curDisplay = document.getElementById('current-currency-display');
    if (curDisplay) curDisplay.textContent = curName;

    const expBadge = document.getElementById('dash-kpi-exp-badge');
    if (expBadge) {
      expBadge.textContent = shortName;
      expBadge.className = `stat-currency-tag ${isPEN ? 'pen' : 'eur'}`;
    }

    const loanRemBadge = document.getElementById('dash-kpi-loan-rem-badge');
    if (loanRemBadge) {
      loanRemBadge.textContent = `Por Cobrar`;
      loanRemBadge.className = `stat-currency-tag ${isPEN ? 'pen' : 'eur'}`;
    }

    const loanPaidBadge = document.getElementById('dash-kpi-loan-paid-badge');
    if (loanPaidBadge) {
      loanPaidBadge.textContent = `Amortizado`;
      loanPaidBadge.className = `stat-currency-tag ${isPEN ? 'pen' : 'eur'}`;
    }

    ExpensesModule.setCurrency(this.currentCurrency);
    LoansModule.setCurrency(this.currentCurrency);
  },

  refreshDashboard() {
    const cur = this.currentCurrency;

    const expTotals = ExpensesModule.calculateTotals();
    const loanTotals = LoansModule.calculateTotals();

    const activeExpTotal = expTotals[cur] || 0;
    const activeLoanRem = loanTotals[cur].remaining || 0;
    const activeLoanPaid = loanTotals[cur].paid || 0;
    const activeIntOnlyPaid = loanTotals[cur].interestOnlyPaid || 0;
    const activeIntOnlyCount = loanTotals[cur].interestOnlyCount || 0;
    const activeIntOnlyDebtors = loanTotals[cur].interestOnlyDebtorsCount || 0;
    const activeDailyExpected = loanTotals[cur].dailyExpected || 0;
    const activeDailyCollected = loanTotals[cur].dailyCollected || 0;
    const activeOverdueCount = loanTotals[cur].overdueCount || 0;

    // 1. Update KPI Cards
    const kpiExp = document.getElementById('dash-kpi-expenses');
    if (kpiExp) kpiExp.textContent = Utils.formatCurrency(activeExpTotal, cur);

    const kpiLoanRem = document.getElementById('dash-kpi-loans-rem');
    if (kpiLoanRem) kpiLoanRem.textContent = Utils.formatCurrency(activeLoanRem, cur);

    const kpiLoanPaid = document.getElementById('dash-kpi-loans-paid');
    const kpiLoanPaidSub = document.getElementById('dash-kpi-loans-paid-sub');
    if (kpiLoanPaid) kpiLoanPaid.textContent = Utils.formatCurrency(activeLoanPaid + activeIntOnlyPaid, cur);
    if (kpiLoanPaidSub) {
      kpiLoanPaidSub.textContent = activeIntOnlyPaid > 0
        ? `Cuotas: ${Utils.formatCurrency(activeLoanPaid, cur)} + Solo Int: ${Utils.formatCurrency(activeIntOnlyPaid, cur)}`
        : `Cuotas amortizadas por deudores`;
    }

    const kpiIntOnly = document.getElementById('dash-kpi-interest-only');
    const kpiIntOnlySub = document.getElementById('dash-kpi-interest-only-sub');
    if (kpiIntOnly) kpiIntOnly.textContent = Utils.formatCurrency(activeIntOnlyPaid, cur);
    if (kpiIntOnlySub) {
      kpiIntOnlySub.textContent = activeIntOnlyCount > 0
        ? `${activeIntOnlyCount} pago(s) en ${activeIntOnlyDebtors} deudor(es)`
        : `0 pagos de solo interés`;
    }

    const kpiDailyColl = document.getElementById('dash-kpi-daily-coll');
    const kpiDailySub = document.getElementById('dash-kpi-daily-sub');
    if (kpiDailyColl) kpiDailyColl.textContent = Utils.formatCurrency(activeDailyExpected, cur);
    if (kpiDailySub) {
      kpiDailySub.textContent = activeOverdueCount > 0
        ? `${activeOverdueCount} en mora · Cobrado hoy: ${Utils.formatCurrency(activeDailyCollected, cur)}`
        : `Cobrado hoy: ${Utils.formatCurrency(activeDailyCollected, cur)}`;
    }

    // 2. Update badges count in sidebar & mobile dock
    const expBadge = document.getElementById('badge-count-expenses');
    const loanBadge = document.getElementById('badge-count-loans');
    const dockBadge = document.getElementById('dock-badge-loans');

    if (expBadge) expBadge.textContent = Storage.getExpenses().filter(e => e.currency === cur).length;

    const todayDueCount = LoansModule.getLoansWithMetrics().filter(l => l.currency === cur && (l.status === 'due-today' || l.status === 'overdue')).length;
    const activeLoansCount = LoansModule.getLoansWithMetrics().filter(l => l.currency === cur && l.status !== 'paid').length;

    if (loanBadge) {
      loanBadge.textContent = todayDueCount > 0 ? `${todayDueCount} Hoy` : activeLoansCount;
    }
    if (dockBadge) {
      dockBadge.textContent = todayDueCount > 0 ? todayDueCount : activeLoansCount;
    }

    // 3. Render Recent Activities & Charts
    this.renderDashboardRecentLists();
    ReportsModule.renderCharts();
  },

  renderDashboardRecentLists() {
    const cur = this.currentCurrency;

    // Recent expenses (sorted by date descending to always show latest real expenses)
    const recentExpContainer = document.getElementById('dash-recent-expenses');
    if (recentExpContainer) {
      const expenses = Storage.getExpenses()
        .filter(e => e.currency === cur)
        .sort((a, b) => {
          const tB = new Date(b.date || '').getTime() || 0;
          const tA = new Date(a.date || '').getTime() || 0;
          if (tB !== tA) return tB - tA;
          return String(b.id || '').localeCompare(String(a.id || ''));
        })
        .slice(0, 5);

      if (expenses.length === 0) {
        recentExpContainer.innerHTML = `<div style="padding: 16px; color: var(--text-muted); font-size: 0.85rem;">No hay gastos registrados en ${cur === 'PEN' ? 'Soles' : 'Euros'}.</div>`;
      } else {
        recentExpContainer.innerHTML = expenses.map(e => {
          const catInfo = Utils.getCategoryInfo(e.category);
          return `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--border-subtle); gap: 10px;">
              <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
                <div style="width: 34px; height: 34px; border-radius: 8px; background: var(--bg-primary); border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                  ${catInfo.icon}
                </div>
                <div style="min-width: 0;">
                  <div style="font-weight: 600; font-size: 0.85rem; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${ExpensesModule.escapeHTML(e.title)}</div>
                  <div style="font-size: 0.72rem; color: var(--text-muted);">${Utils.formatDate(e.date)} · ${e.category}</div>
                </div>
              </div>
              <div style="font-family: var(--font-heading); font-weight: 700; color: var(--accent-rose); font-size: 0.92rem; white-space: nowrap;">
                - ${Utils.formatCurrency(e.amount, e.currency)}
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // Active Loans & Installments with 1-tap Cuota and 1-tap Solo Interés
    const urgentContainer = document.getElementById('dash-urgent-obligations');
    if (urgentContainer) {
      const pendingLoans = LoansModule.getLoansWithMetrics()
        .filter(l => l.currency === cur && l.status !== 'paid')
        .slice(0, 4);

      if (pendingLoans.length === 0) {
        urgentContainer.innerHTML = `<div style="padding: 16px; color: var(--accent-emerald); font-size: 0.85rem;">No tienes deudores pendientes en ${cur === 'PEN' ? 'Soles' : 'Euros'}.</div>`;
      } else {
        urgentContainer.innerHTML = pendingLoans.map(l => `
          <div class="dash-debtor-row">
            <div class="dash-debtor-info">
              <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <span style="font-weight: 700; font-size: 0.88rem; color: var(--text-primary);">${LoansModule.escapeHTML(l.clientName)}</span>
                ${l.interestOnlyCount > 0 ? `<span class="status-badge interest-only-badge" style="font-size: 0.65rem; padding: 2px 7px;">${l.interestOnlyCount}x Solo Int. (+${Utils.formatCurrency(l.interestOnlyPaid, l.currency)})</span>` : ''}
              </div>
              <div style="font-size: 0.73rem; color: var(--text-muted); margin-top: 2px;">
                <strong>${l.paidInstallments}/${l.totalInstallments}</strong> cuotas · Debe: <strong style="color: var(--accent-rose);">${Utils.formatCurrency(l.remainingAmount, l.currency)}</strong>
              </div>
            </div>
            <div class="dash-debtor-actions">
              <button class="btn btn-aqua-glow btn-sm" onclick="LoansModule.openQuickPayModal('${l.id}', 'INSTALLMENT')" title="Cobrar 1 cuota normal">
                ${Utils.icon('check', 13)}
                <span>Cuota</span>
              </button>
              <button class="btn btn-interest-glass btn-sm" onclick="LoansModule.openQuickPayModal('${l.id}', 'INTEREST_ONLY')" title="El deudor solo paga intereses">
                ${Utils.icon('percent', 13)}
                <span>Solo Interés</span>
              </button>
              <button class="btn btn-secondary btn-sm" onclick="LoansModule.openReceiptModalForLoan('${l.id}')" title="Comprobante">
                ${Utils.icon('file', 13)}
              </button>
            </div>
          </div>
        `).join('');
      }
    }
  },

  bindModalListeners() {
    // STRICT RULE: Modals ONLY close when clicking an explicit [data-close-modal] button
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.getAttribute('data-close-modal');
        this.closeModal(modalId);
      });
    });

    this.setupCurrencyRadioSync('exp');
    this.setupCurrencyRadioSync('loan');
  },

  setupCurrencyRadioSync(prefix) {
    const penRadio = document.getElementById(`${prefix}-cur-pen`);
    const eurRadio = document.getElementById(`${prefix}-cur-eur`);
    const penLabel = document.getElementById(`${prefix}-cur-pen-label`);
    const eurLabel = document.getElementById(`${prefix}-cur-eur-label`);

    if (penRadio && eurRadio && penLabel && eurLabel) {
      penRadio.addEventListener('change', () => {
        if (penRadio.checked) {
          penLabel.classList.add('selected-pen');
          eurLabel.classList.remove('selected-eur');
        }
      });
      eurRadio.addEventListener('change', () => {
        if (eurRadio.checked) {
          eurLabel.classList.add('selected-eur');
          penLabel.classList.remove('selected-pen');
        }
      });
    }
  },

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      this.initCustomSelects();
      this.initCustomDatePickers();
      this.syncAllCustomSelects();
      this.syncAllCustomDates();
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      document.querySelectorAll('.custom-select-wrapper.open').forEach(w => w.classList.remove('open'));
      document.querySelectorAll('.custom-select-menu.open').forEach(m => m.classList.remove('open'));
      document.querySelectorAll('.custom-date-wrapper.open').forEach(w => w.classList.remove('open'));
      document.querySelectorAll('.custom-date-popover.open').forEach(p => p.classList.remove('open'));
      modal.classList.remove('open');
      document.body.style.overflow = '';
    }
  },

  bindBackupControls() {
    // Background multi-vault handles all auto-saving, auto-recovery and data integrity permanently
  },

  updateAndroidStatusBar(theme) {
    const isDark = theme === 'dark';
    const color = isDark ? '#0b0e14' : '#ffffff';
    const metaThemes = document.querySelectorAll('meta[name="theme-color"]');
    metaThemes.forEach(m => m.setAttribute('content', color));

    const metaApple = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (metaApple) {
      metaApple.setAttribute('content', isDark ? 'black-translucent' : 'default');
    }

    const bridge = window.AndroidApp || window.AndroidBridge;
    if (bridge && typeof bridge.setStatusBarColor === 'function') {
      try {
        bridge.setStatusBarColor(color, !isDark);
      } catch (err) {
        console.warn('Native status bar sync error:', err);
      }
    }
  },

  bindThemeToggle() {
    const toggleBtn = document.getElementById('theme-toggle-btn');
    const updateBtnState = (theme) => {
      if (!toggleBtn) return;
      const isLight = theme === 'light';
      toggleBtn.title = isLight ? 'Cambiar a Modo Oscuro' : 'Cambiar a Modo Claro';
      const sunIcon = toggleBtn.querySelector('.icon-sun');
      const moonIcon = toggleBtn.querySelector('.icon-moon');
      if (sunIcon) sunIcon.style.display = isLight ? 'none' : 'block';
      if (moonIcon) moonIcon.style.display = isLight ? 'block' : 'none';
      this.updateAndroidStatusBar(theme);
    };

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('finanflow_theme', newTheme);
        updateBtnState(newTheme);
        this.updateAndroidStatusBar(newTheme);
        if (typeof ReportsModule !== 'undefined' && ReportsModule.renderCharts) {
          ReportsModule.renderCharts();
        }
      });

      const savedTheme = document.documentElement.getAttribute('data-theme') || localStorage.getItem('finanflow_theme') || 'dark';
      document.documentElement.setAttribute('data-theme', savedTheme);
      try { localStorage.setItem('finanflow_theme', savedTheme); } catch(e){}
      updateBtnState(savedTheme);
      this.updateAndroidStatusBar(savedTheme);

      // Listen for Android OS theme changes when user has no manual override
      if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
          if (!localStorage.getItem('finanflow_theme')) {
            const osTheme = e.matches ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', osTheme);
            updateBtnState(osTheme);
            this.updateAndroidStatusBar(osTheme);
          }
        });
      }
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
