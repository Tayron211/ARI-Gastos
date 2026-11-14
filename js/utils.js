/**
 * FINANFLOW - UTILITIES & HELPERS
 */

const Utils = {
  /**
   * Formats numbers to currency strings
   * @param {number} amount
   * @param {'PEN'|'EUR'} currency
   * @returns {string} e.g. "S/ 1,250.50" or "€ 1.250,50"
   */
  formatCurrency(amount, currency = 'PEN') {
    const num = Number(amount) || 0;
    if (currency === 'EUR') {
      return '€ ' + num.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return 'S/ ' + num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },

  /**
   * Get Currency Symbol
   */
  getCurrencySymbol(currency = 'PEN') {
    return currency === 'EUR' ? '€' : 'S/';
  },

  /**
   * Format human readable date
   * @param {string} dateString YYYY-MM-DD
   */
  formatDate(dateString) {
    if (!dateString) return '-';
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parts[2];
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      return `${day} ${months[monthIndex] || ''} ${year}`;
    }
    return dateString;
  },

  /**
   * Today's date string YYYY-MM-DD
   */
  getTodayString() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  getTodayISO() {
    return this.getTodayString();
  },

  /**
   * Generate UUID-like ID
   */
  generateId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Percentage calculation safe from division by zero
   */
  calculateProgress(paid, total) {
    const p = Number(paid) || 0;
    const t = Number(total) || 0;
    if (t <= 0) return 0;
    const pct = (p / t) * 100;
    return Math.min(100, Math.max(0, Math.round(pct * 10) / 10));
  },

  /**
   * Show dynamic toast notifications
   */
  showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = this.icon('check', 16);
    if (type === 'danger') icon = this.icon('x', 16);
    if (type === 'warning') icon = this.icon('alert', 16);
    if (type === 'info') icon = this.icon('info', 16);

    toast.innerHTML = `
      <span style="display: inline-flex; align-items: center; flex-shrink: 0;">${icon}</span>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      toast.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
      setTimeout(() => toast.remove(), 200);
    }, 3200);
  },

  /**
   * Diálogo modal de confirmación integrado con el diseño estético de ARI-Control
   * @param {Object} opts
   * @param {string} opts.title - Título del diálogo
   * @param {string} opts.message - Mensaje principal o pregunta
   * @param {string} [opts.detail] - Detalle contextual o badge descriptivo
   * @param {string} [opts.confirmText] - Texto del botón de confirmación (default 'Confirmar')
   * @param {string} [opts.cancelText] - Texto del botón de cancelación (default 'Cancelar')
   * @param {'primary'|'danger'|'warning'|'info'} [opts.type] - Tipo visual del diálogo (default 'warning')
   * @param {string} [opts.icon] - Icono SVG o nombre de icono
   * @returns {Promise<boolean>}
   */
  confirmModal({
    title = 'Confirmación',
    message = '¿Deseas continuar con esta acción?',
    detail = '',
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    type = 'warning',
    icon = 'alert'
  } = {}) {
    return new Promise(resolve => {
      const existing = document.getElementById('ari-custom-confirm-modal');
      if (existing) existing.remove();

      let headerBadgeColor = 'rgba(245, 158, 11, 0.15)';
      let headerTextColor = 'var(--text-amber, #f59e0b)';
      let btnClass = 'btn-primary';

      if (type === 'danger') {
        headerBadgeColor = 'rgba(244, 63, 94, 0.15)';
        headerTextColor = 'var(--text-rose, #f43f5e)';
        btnClass = 'btn-danger';
      } else if (type === 'info') {
        headerBadgeColor = 'rgba(99, 102, 241, 0.15)';
        headerTextColor = 'var(--text-indigo, #6366f1)';
        btnClass = 'btn-primary';
      }

      const backdrop = document.createElement('div');
      backdrop.id = 'ari-custom-confirm-modal';
      backdrop.className = 'modal-backdrop open';
      backdrop.style.zIndex = '99999';

      const iconSvg = typeof icon === 'string' && this.icon(icon) ? this.icon(icon, 18) : this.icon('alert', 18);

      backdrop.innerHTML = `
        <div class="modal-dialog" style="max-width: 440px; box-shadow: var(--shadow-xl); border: 1px solid var(--border-color); border-radius: var(--radius-lg); overflow: hidden; animation: subviewFadeIn 0.22s ease-out;">
          <div class="modal-sheet-grabber"></div>
          <div class="modal-header" style="padding: 14px 18px; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 10px; background: ${headerBadgeColor}; color: ${headerTextColor}; flex-shrink: 0;">
                ${iconSvg}
              </span>
              <h3 style="margin: 0; font-size: 1.05rem; font-weight: 700; color: var(--text-primary); font-family: var(--font-heading);">${title}</h3>
            </div>
            <button type="button" class="modal-close-btn" id="confirm-modal-close" title="Cerrar">
              ${this.icon('x', 15)}
            </button>
          </div>
          <div class="modal-body" style="padding: 18px;">
            <div style="margin: 0 0 12px; font-size: 0.95rem; color: var(--text-primary); line-height: 1.5; font-weight: 500;">
              ${message}
            </div>
            ${detail ? `
              <div style="background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 12px 14px; font-size: 0.88rem; color: var(--text-secondary); line-height: 1.45;">
                ${detail}
              </div>
            ` : ''}
          </div>
          <div class="modal-footer" style="padding: 12px 18px; border-top: 1px solid var(--border-color); display: flex; align-items: center; justify-content: flex-end; gap: 10px; background: var(--bg-tertiary);">
            <button type="button" class="btn btn-secondary btn-sm" id="confirm-modal-cancel" style="padding: 8px 16px;">
              ${cancelText}
            </button>
            <button type="button" class="btn ${btnClass} btn-sm" id="confirm-modal-ok" style="padding: 8px 18px; font-weight: 600;">
              ${confirmText}
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(backdrop);

      const cleanup = (val) => {
        backdrop.classList.remove('open');
        backdrop.style.opacity = '0';
        backdrop.style.transition = 'opacity 0.15s ease';
        setTimeout(() => {
          backdrop.remove();
        }, 160);
        resolve(val);
      };

      document.getElementById('confirm-modal-cancel').onclick = () => cleanup(false);
      document.getElementById('confirm-modal-close').onclick = () => cleanup(false);
      document.getElementById('confirm-modal-ok').onclick = () => cleanup(true);

      backdrop.onclick = (e) => {
        if (e.target === backdrop) cleanup(false);
      };
    });
  },

  /**
   * Bespoke SVG Icon System (Clean stroke + duotone accent)
   */
  icon(name, size = 16) {
    const s = size;
    const icons = {
      'check': `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
      'x': `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
      'alert': `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
      'info': `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
      'percent': `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>`,
      'repeat': `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>`,
      'calendar': `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
      'clock': `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
      'wallet': `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>`,
      'phone': `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
      'receipt': `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/></svg>`,
      'edit': `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
      'trash': `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
      'trend-up': `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
      'user': `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
      'shield': `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`
    };
    return icons[name] || icons['info'];
  },

  /**
   * Category details (Color + Crisp SVG Icon representation)
   */
  getCategoryInfo(categoryName) {
    const categories = {
      'Alimentación': {
        color: '#f59e0b',
        icon: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>`
      },
      'Vivienda': {
        color: '#6366f1',
        icon: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`
      },
      'Servicios': {
        color: '#06b6d4',
        icon: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`
      },
      'Transporte': {
        color: '#3b82f6',
        icon: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`
      },
      'Salud': {
        color: '#ef4444',
        icon: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`
      },
      'Educación': {
        color: '#8b5cf6',
        icon: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`
      },
      'Entretenimiento': {
        color: '#ec4899',
        icon: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ec4899" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>`
      },
      'Compras': {
        color: '#14b8a6',
        icon: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`
      },
      'Ahorro/Inversión': {
        color: '#10b981',
        icon: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`
      },
      'Otros': {
        color: '#64748b',
        icon: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`
      }
    };
    return categories[categoryName] || categories['Otros'];
  },

  /**
   * Add days to YYYY-MM-DD with option to skip Sundays (common in Peru moneylending)
   */
  addDays(dateString, daysToAdd, excludeSundays = false) {
    if (!dateString) dateString = this.getTodayString();
    const parts = dateString.split('-').map(Number);
    const date = new Date(parts[0], parts[1] - 1, parts[2]);

    let added = 0;
    while (added < daysToAdd) {
      date.setDate(date.getDate() + 1);
      if (excludeSundays && date.getDay() === 0) {
        // Skip Sunday
        continue;
      }
      added++;
    }

    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  /**
   * Add months to YYYY-MM-DD reliably without JS setMonth overflow bugs
   */
  addMonths(dateString, monthsToAdd, targetDay = null) {
    if (!dateString) dateString = this.getTodayString();
    const parts = dateString.split('-').map(Number);
    const origDay = targetDay ? Number(targetDay) : parts[2];
    
    let year = parts[0];
    let month = (parts[1] - 1) + Number(monthsToAdd); // 0-based
    year += Math.floor(month / 12);
    month = ((month % 12) + 12) % 12;

    // Obtener días máximos del mes objetivo (para meses con 28, 29, 30 o 31 días)
    const maxDay = new Date(year, month + 1, 0).getDate();
    const day = Math.min(origDay, maxDay);

    const y = year;
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  /**
   * Difference in days between two YYYY-MM-DD dates (d1 - d2)
   */
  diffDays(d1String, d2String) {
    if (!d1String || !d2String) return 0;
    const p1 = d1String.split('-').map(Number);
    const p2 = d2String.split('-').map(Number);
    const dt1 = new Date(p1[0], p1[1] - 1, p1[2]);
    const dt2 = new Date(p2[0], p2[1] - 1, p2[2]);
    const diffTime = dt1.getTime() - dt2.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  },

  /**
   * Clean and format Peru phone number for WhatsApp link
   * Standard Peru mobile phone has 9 digits starting with 9 (e.g. 987654321)
   */
  formatPeruWhatsAppUrl(phone, message) {
    if (!phone) return null;
    let clean = String(phone).replace(/\D/g, '');
    if (clean.length === 9) {
      clean = '51' + clean;
    } else if (clean.length === 11 && clean.startsWith('51')) {
      // already with 51
    }
    const encoded = encodeURIComponent(message || '');
    return `https://wa.me/${clean}?text=${encoded}`;
  },

  /**
   * Format date & time: DD/MM/YYYY HH:MM
   */
  formatDateTime(date = new Date()) {
    const d = date instanceof Date ? date : new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  },

  /**
   * Generate consecutive-style receipt code
   */
  generateReceiptCode() {
    const d = new Date();
    const yr = String(d.getFullYear()).slice(-2);
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const dy = String(d.getDate()).padStart(2, '0');
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `REC-${yr}${mo}${dy}-${rand}`;
  },

  /**
   * Strict HTML Entity Escaping (XSS Prevention)
   */
  escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  /**
   * Input Sanitizer (Strips dangerous control chars, scripts & enforces max length)
   */
  sanitizeText(str, maxLength = 250) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      .replace(/<\s*\/?\s*script\b[^>]*>/gi, '')
      .replace(/javascript\s*:/gi, '')
      .trim()
      .slice(0, maxLength);
  },

  /**
   * Safe JSON Parse with Prototype Pollution Protection
   */
  safeJSONParse(raw, fallback = null) {
    if (!raw || typeof raw !== 'string') return fallback;
    try {
      return JSON.parse(raw, (key, value) => {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          return undefined;
        }
        return value;
      });
    } catch (e) {
      return fallback;
    }
  },

  /**
   * Spreadsheet Formula Injection Guard (Blocks =, +, -, @ execution in Excel/CSV)
   */
  sanitizeSpreadsheetCell(val) {
    if (typeof val !== 'string') return val;
    if (/^[=+\-@\t\r]/.test(val)) {
      return "'" + val;
    }
    return val;
  }
};
