/**
 * ARI-GASTOS - PWA CONTROLLER
 * Service Worker Registration, Install Prompts, Offline Indicators & Shortcuts
 */

const PWAController = {
  deferredPrompt: null,
  isInstalled: false,

  init() {
    this.registerServiceWorker();
    this.bindInstallPrompt();
    this.bindNetworkStatus();
    this.handleLaunchShortcuts();
    this.checkStandaloneMode();
  },

  /**
   * Register Service Worker with cache lifecycle
   */
  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then((reg) => {
            console.log('[PWA] Service Worker registrado con éxito:', reg.scope);
            reg.update().catch(() => {});

            // Check for updates
            reg.addEventListener('updatefound', () => {
              const newWorker = reg.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    console.log('[PWA] Nueva versión disponible en segundo plano.');
                  }
                });
              }
            });
          })
          .catch((err) => {
            console.warn('[PWA] Error registrando Service Worker:', err);
          });
      });
    }
  },

  /**
   * Capture beforeinstallprompt event for custom install button
   */
  bindInstallPrompt() {
    const installBtn = document.getElementById('pwa-install-btn');
    const installBanner = document.getElementById('pwa-install-banner');

    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent browser default mini-infobar
      e.preventDefault();
      this.deferredPrompt = e;

      // Show install controls in UI
      if (installBtn) {
        installBtn.style.display = 'flex';
      }
      if (installBanner) {
        installBanner.style.display = 'flex';
      }
      console.log('[PWA] Evento beforeinstallprompt capturado. Listo para instalar.');
    });

    if (installBtn) {
      installBtn.addEventListener('click', (e) => {
        this.downloadApk();
      });
    }

    document.querySelectorAll('#btn-download-apk, .btn-install-apk').forEach(btn => {
      btn.addEventListener('click', () => this.downloadApk());
    });

    const bannerBtn = document.getElementById('pwa-banner-install-btn');
    if (bannerBtn) {
      bannerBtn.addEventListener('click', () => this.triggerInstall());
    }

    const bannerCloseBtn = document.getElementById('pwa-banner-close-btn');
    if (bannerCloseBtn && installBanner) {
      bannerCloseBtn.addEventListener('click', () => {
        installBanner.style.display = 'none';
        sessionStorage.setItem('pwa_banner_dismissed', 'true');
      });
    }

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.isInstalled = true;
      if (installBanner) installBanner.style.display = 'none';
      if (typeof Utils !== 'undefined' && Utils.showToast) {
        Utils.showToast('¡Ari-Gastos se instaló exitosamente como aplicación nativa!', 'success');
      }
    });
  },

  downloadApk() {
    const a = document.createElement('a');
    a.href = './ARI-Control.apk';
    a.download = 'ARI-Control.apk';
    document.body.appendChild(a);
    a.click();
    a.remove();
    if (typeof Utils !== 'undefined' && Utils.showToast) {
      Utils.showToast('Descargando archivo APK nativo de Ari-Control...', 'success');
    }
  },

  async triggerInstall() {
    if (!this.deferredPrompt) {
      if (typeof App !== 'undefined' && App.openModal && document.getElementById('modal-apk-install')) {
        App.openModal('modal-apk-install');
        return;
      }
      // If iOS or unsupported browser, show instructions
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      if (isIOS) {
        if (typeof Utils !== 'undefined' && Utils.showToast) {
          Utils.showToast('En Safari iOS: toca el botón Compartir y elige "Agregar al inicio"', 'info');
        } else {
          alert('Para instalar en iOS: toca el botón Compartir y elige "Agregar al inicio".');
        }
      } else {
        if (typeof Utils !== 'undefined' && Utils.showToast) {
          Utils.showToast('Toca los tres puntos (⋮) de Chrome y elige "Instalar aplicación"', 'info');
        }
      }
      return;
    }

    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    console.log(`[PWA] Respuesta del usuario a la instalación: ${outcome}`);
    this.deferredPrompt = null;

    const installBtn = document.getElementById('pwa-install-btn');
    if (installBtn) installBtn.style.display = 'none';
    const installBanner = document.getElementById('pwa-install-banner');
    if (installBanner) installBanner.style.display = 'none';
    if (typeof App !== 'undefined' && App.closeModal) {
      App.closeModal('modal-apk-install');
    }
  },

  /**
   * Check if running in standalone / installed window mode
   */
  checkStandaloneMode() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isStandalone) {
      this.isInstalled = true;
      document.body.classList.add('is-pwa-standalone');
      const installBtn = document.getElementById('pwa-install-btn');
      if (installBtn) installBtn.style.display = 'none';
      const installBanner = document.getElementById('pwa-install-banner');
      if (installBanner) installBanner.style.display = 'none';
    }
  },

  /**
   * Monitor online / offline network state
   */
  bindNetworkStatus() {
    const offlineIndicator = document.getElementById('pwa-offline-pill');

    const updateStatus = () => {
      const isOffline = !navigator.onLine;
      if (offlineIndicator) {
        offlineIndicator.style.display = isOffline ? 'inline-flex' : 'none';
      }
      if (isOffline) {
        if (typeof Utils !== 'undefined' && Utils.showToast) {
          Utils.showToast('Modo Offline: Tus gastos y datos se guardarán localmente.', 'info');
        }
      } else {
        if (typeof Utils !== 'undefined' && Utils.showToast) {
          Utils.showToast('Conexión restablecida.', 'success');
        }
      }
    };

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    // Initial check
    if (!navigator.onLine && offlineIndicator) {
      offlineIndicator.style.display = 'inline-flex';
    }
  },

  /**
   * Handle URL parameters from PWA Shortcuts
   */
  handleLaunchShortcuts() {
    window.addEventListener('DOMContentLoaded', () => {
      const params = new URLSearchParams(window.location.search);
      const action = params.get('action');
      const tab = params.get('tab');

      if (tab && typeof App !== 'undefined' && App.switchTab) {
        setTimeout(() => App.switchTab(tab), 200);
      }

      if (action === 'new-expense') {
        setTimeout(() => {
          if (typeof App !== 'undefined' && App.switchTab) {
            App.switchTab('expenses');
          }
          const openModalBtn = document.getElementById('btn-open-expense-modal');
          if (openModalBtn) openModalBtn.click();
        }, 300);
      }
    });
  }
};

// Auto-initialize PWA features
PWAController.init();
