/**
 * ARI-CONTROL - PUSH NOTIFICATIONS CONTROLLER (MÓVIL & PC)
 * Web Push / Service Worker Notifications & Daily Alert Engine for Cobros & Gastos
 */

const NotificationsController = {
  permission: 'default',
  checkIntervalId: null,

  init() {
    this.checkSupport();
    this.bindEvents();
    this.updateUI();

    if (this.isGranted()) {
      setTimeout(() => this.checkDailyAlerts(false), 1500);
    }

    if (!this.checkIntervalId) {
      this.checkIntervalId = setInterval(() => {
        if (this.isGranted()) {
          this.checkDailyAlerts(false);
        }
      }, 20 * 60 * 1000);
    }
  },

  checkSupport() {
    if (!('Notification' in window)) {
      return false;
    }
    this.permission = Notification.permission;
    return true;
  },

  isGranted() {
    return 'Notification' in window && Notification.permission === 'granted';
  },

  async requestPermission() {
    if (!('Notification' in window)) {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      if (isIOS) {
        Utils.showToast('En iPhone/iPad: agrega la app al inicio para activar alertas Push.', 'info');
      } else {
        Utils.showToast('Tu navegador no admite notificaciones Push.', 'warning');
      }
      return false;
    }

    try {
      // Request permission (compatible with promise and callback implementations)
      let perm;
      if (Notification.requestPermission.length === 0) {
        perm = await Notification.requestPermission();
      } else {
        perm = await new Promise((resolve) => Notification.requestPermission(resolve));
      }

      this.permission = perm;
      this.updateUI();
      this.updateModalContent();

      if (perm === 'granted') {
        Utils.showToast('Alertas Push activadas en este dispositivo', 'success');
        await this.sendPushNotification({
          title: 'Ari-Control • Alertas Activas',
          body: 'Recibirás avisos de cobros y pagos del día en tu móvil o PC.',
          tag: 'welcome-notification',
          url: './index.html?tab=loans'
        });
        this.checkDailyAlerts(true);
        return true;
      } else if (perm === 'denied') {
        Utils.showToast('Permiso bloqueado. Habilítalo en los ajustes del navegador.', 'warning');
        return false;
      }
    } catch (err) {
      console.error('[Notificaciones] Error solicitando permisos:', err);
      return false;
    }
    return false;
  },

  bindEvents() {
    const btnBell = document.getElementById('btn-toggle-notifications');
    if (btnBell) {
      btnBell.addEventListener('click', () => {
        this.openNotificationModal();
      });
    }

    window.addEventListener('storage', () => this.updateUI());
  },

  openNotificationModal() {
    this.updateModalContent();
    App.openModal('modal-notifications');
  },

  updateUI() {
    const badge = document.getElementById('notif-badge');
    const summary = this.getTodaySummary();
    const totalAlerts = summary.cobrosCount + summary.overdueCount + summary.pagosCount;

    if (badge) {
      if (totalAlerts > 0) {
        badge.textContent = totalAlerts > 9 ? '9+' : totalAlerts;
        badge.style.display = 'inline-flex';
        badge.className = summary.overdueCount > 0 ? 'notif-badge overdue' : 'notif-badge';
      } else {
        badge.style.display = 'none';
      }
    }
  },

  getTodaySummary() {
    const todayStr = Utils.getTodayString();

    let cobrosToday = [];
    let overdues = [];
    if (typeof LoansModule !== 'undefined' && LoansModule.getTodayCollections) {
      const collections = LoansModule.getTodayCollections();
      cobrosToday = collections.filter(c => c.status === 'due-today');
      overdues = collections.filter(c => c.status === 'overdue');
    }

    let pagosToday = [];
    if (typeof Storage !== 'undefined') {
      const expenses = Storage.getExpenses() || [];
      pagosToday = expenses.filter(e => e.date === todayStr);
    }

    const totalCobrosMonto = cobrosToday.reduce((sum, c) => sum + (c.nextCuota ? c.nextCuota.amount : c.installmentAmount), 0);
    const totalPagosMonto = pagosToday.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    return {
      todayStr,
      cobrosToday,
      cobrosCount: cobrosToday.length,
      totalCobrosMonto,
      overdues,
      overdueCount: overdues.length,
      pagosToday,
      pagosCount: pagosToday.length,
      totalPagosMonto
    };
  },

  updateModalContent() {
    const statusContainer = document.getElementById('notif-status-box');
    const summaryContainer = document.getElementById('notif-summary-box');
    const summary = this.getTodaySummary();

    if (statusContainer) {
      if (this.isGranted()) {
        statusContainer.innerHTML = `
          <div class="notif-clean-card active">
            <div class="notif-clean-info">
              <div class="notif-clean-icon emerald">
                <svg width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div>
                <strong>Push Activo (Móvil y PC)</strong>
                <span>Avisos automáticos habilitados</span>
              </div>
            </div>
            <button class="btn btn-secondary btn-sm" id="btn-test-notification" onclick="NotificationsController.triggerTestNotification()" type="button">
              <span>Probar</span>
            </button>
          </div>
        `;
      } else {
        statusContainer.innerHTML = `
          <div class="notif-clean-card">
            <div class="notif-clean-info">
              <div class="notif-clean-icon aqua">
                <svg width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              </div>
              <div>
                <strong>Alertas en Móvil y PC</strong>
                <span>Recibe avisos de cobros y pagos del día</span>
              </div>
            </div>
            <button class="btn btn-aqua-glow btn-sm" onclick="NotificationsController.requestPermission()" type="button">
              <span>Activar</span>
            </button>
          </div>
        `;
      }
    }

    if (summaryContainer) {
      const hasAny = summary.overdueCount > 0 || summary.cobrosCount > 0 || summary.pagosCount > 0;
      let html = `
        <div class="notif-section-title">Hoy (${Utils.formatDate(summary.todayStr)})</div>
      `;

      if (!hasAny) {
        html += `
          <div class="notif-item-row">
            <div class="notif-item-left">
              <span class="notif-dot emerald"></span>
              <span>Todo al día · Sin cobros ni moras hoy</span>
            </div>
          </div>
        `;
      } else {
        if (summary.overdueCount > 0) {
          html += `
            <div class="notif-item-row overdue">
              <div class="notif-item-left">
                <span class="notif-dot rose"></span>
                <div>
                  <strong>${summary.overdueCount} en Mora</strong>
                  <small>${summary.overdues.map(o => o.clientName).slice(0, 3).join(', ')}</small>
                </div>
              </div>
              <button class="btn btn-danger-ghost btn-sm" onclick="App.closeModal('modal-notifications'); App.switchTab('loans'); LoansModule.switchSubTab('agenda');" type="button">Ver</button>
            </div>
          `;
        }

        if (summary.cobrosCount > 0) {
          html += `
            <div class="notif-item-row">
              <div class="notif-item-left">
                <span class="notif-dot aqua"></span>
                <div>
                  <strong>${summary.cobrosCount} Cobro(s) Hoy</strong>
                  <small>S/ ${summary.totalCobrosMonto.toFixed(2)}</small>
                </div>
              </div>
              <button class="btn btn-secondary btn-sm" onclick="App.closeModal('modal-notifications'); App.switchTab('loans'); LoansModule.switchSubTab('agenda');" type="button">Ver</button>
            </div>
          `;
        }

        if (summary.pagosCount > 0) {
          html += `
            <div class="notif-item-row">
              <div class="notif-item-left">
                <span class="notif-dot amber"></span>
                <div>
                  <strong>${summary.pagosCount} Gasto(s) Hoy</strong>
                  <small>S/ ${summary.totalPagosMonto.toFixed(2)}</small>
                </div>
              </div>
              <button class="btn btn-secondary btn-sm" onclick="App.closeModal('modal-notifications'); App.switchTab('expenses');" type="button">Ver</button>
            </div>
          `;
        }
      }

      summaryContainer.innerHTML = html;
    }
  },

  checkDailyAlerts(force = false) {
    if (!this.isGranted()) return;

    const summary = this.getTodaySummary();
    const todayStr = summary.todayStr;
    const lastNotif = localStorage.getItem('ari_last_notif_date');

    if (!force && lastNotif === todayStr) {
      this.updateUI();
      return;
    }

    let hasAlerts = false;

    if (summary.cobrosCount > 0) {
      const clientNames = summary.cobrosToday.map(c => c.clientName).slice(0, 3).join(', ');
      this.sendPushNotification({
        title: `Cobros de Hoy (${summary.cobrosCount})`,
        body: `Por cobrar: S/ ${summary.totalCobrosMonto.toFixed(2)} (${clientNames})`,
        tag: `cobros-${todayStr}`,
        url: './index.html?tab=loans'
      });
      hasAlerts = true;
    }

    if (summary.overdueCount > 0) {
      setTimeout(() => {
        this.sendPushNotification({
          title: `Alerta de Mora (${summary.overdueCount})`,
          body: `Clientes con cuotas vencidas pendientes de cobro.`,
          tag: `mora-${todayStr}`,
          url: './index.html?tab=loans'
        });
      }, 1200);
      hasAlerts = true;
    }

    if (summary.pagosCount > 0) {
      setTimeout(() => {
        this.sendPushNotification({
          title: `Gastos de Hoy (${summary.pagosCount})`,
          body: `Total registrado hoy: S/ ${summary.totalPagosMonto.toFixed(2)}`,
          tag: `pagos-${todayStr}`,
          url: './index.html?tab=expenses'
        });
      }, 2400);
      hasAlerts = true;
    }

    if (hasAlerts) {
      localStorage.setItem('ari_last_notif_date', todayStr);
    }

    this.updateUI();
  },

  /**
   * Unified Push Notification sender for Mobile (ServiceWorker registration) & Desktop PC
   */
  async sendPushNotification(options) {
    const title = options.title || 'Ari-Control';
    const body = options.body || '';
    const tag = options.tag || ('notif-' + Date.now());
    const icon = './icons/icon-192.png';
    const badge = './icons/icon-192.png';
    const url = options.url || './index.html?tab=loans';

    const notifOptions = {
      body,
      icon,
      badge,
      tag,
      renotify: true,
      vibrate: [200, 100, 200],
      data: { url }
    };

    // 1. Mobile & PWA Standard: Use ServiceWorkerRegistration.showNotification()
    if ('serviceWorker' in navigator) {
      try {
        let reg = await navigator.serviceWorker.getRegistration();
        if (!reg) {
          reg = await navigator.serviceWorker.register('./sw.js');
        }
        if (reg && typeof reg.showNotification === 'function') {
          await reg.showNotification(title, notifOptions);
          return true;
        }
      } catch (swErr) {
        console.warn('[Push] Fallback a notificación directa:', swErr);
      }
    }

    // 2. Desktop Browser Fallback
    return this.fallbackStandardNotification(title, body, tag, icon, url);
  },

  // Alias for backwards compatibility
  sendWindowsNotification(options) {
    return this.sendPushNotification(options);
  },

  fallbackStandardNotification(title, body, tag, icon, url) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return false;
    try {
      const n = new Notification(title, {
        body,
        icon,
        tag
      });
      n.onclick = function(e) {
        e.preventDefault();
        window.focus();
        if (typeof App !== 'undefined' && App.switchTab) {
          if (url.includes('expenses')) App.switchTab('expenses');
          else App.switchTab('loans');
        }
        n.close();
      };
      return true;
    } catch (err) {
      console.warn('[Notificaciones] Error en notificación estándar:', err);
      return false;
    }
  },

  async triggerTestNotification() {
    if (!this.isGranted()) {
      await this.requestPermission();
      return;
    }

    await this.sendPushNotification({
      title: 'Ari-Control • Alerta de Prueba',
      body: 'Las notificaciones Push funcionan correctamente en tu dispositivo.',
      tag: 'test-' + Date.now(),
      url: './index.html?tab=loans'
    });
    Utils.showToast('Alerta Push enviada a tu dispositivo', 'success');
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => NotificationsController.init());
} else {
  NotificationsController.init();
}
