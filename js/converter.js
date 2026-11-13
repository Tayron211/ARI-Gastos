/**
 * FINANFLOW - REAL-TIME CURRENCY CONVERTER MODULE
 * High-Availability Continuous Real-Time Sync Engine
 * Supports: PEN (Soles), EUR (Euros), USD (Dólares)
 */

const ConverterModule = {
  // Baseline fallback exchange rates (Banco de Crédito BCP)
  rates: {
    USD: 1.0,
    EUR: 0.92,
    PEN: 3.5325
  },
  source: 'Banco de Crédito BCP',
  usdRates: {
    compra: 3.525,
    venta: 3.540,
    promedio: 3.5325
  },
  eurRates: {
    compra: 3.820,
    venta: 3.960,
    promedio: 3.890
  },
  crossRates: {
    eurToUsd: 1.0870,
    usdToEur: 0.9200
  },
  bcpRates: {
    compra: 3.525,
    venta: 3.540,
    promedio: 3.5325,
    eurCompra: 3.820,
    eurVenta: 3.960,
    eurPromedio: 3.890
  },
  lastUpdated: null,
  isLive: false,
  syncTimer: null,
  isFetching: false,

  fromCurrency: 'EUR',
  toCurrency: 'PEN',
  amount: 100,

  getBcpApiUrl() {
    if (typeof window !== 'undefined' && window.location && window.location.origin && window.location.origin.includes('pages.dev')) {
      return '/api/bcp-rates';
    }
    return 'https://ari-gastos.pages.dev/api/bcp-rates';
  },

  init() {
    this.bindEvents();
    this.loadCachedRates();
    this.fetchLiveRates();
    this.startRealtimeSync();
    this.calculate();
    this.renderRateCards();
    this.renderConversionTable();
    this.bindTickerClick();
  },

  bindEvents() {
    const amountInput = document.getElementById('conv-amount');
    if (amountInput) {
      amountInput.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.amount = isNaN(val) ? 0 : val;
        this.calculate();
      });
    }

    const fromSelect = document.getElementById('conv-from');
    if (fromSelect) {
      fromSelect.addEventListener('change', (e) => {
        this.fromCurrency = e.target.value;
        this.calculate();
        this.renderConversionTable();
      });
    }

    const toSelect = document.getElementById('conv-to');
    if (toSelect) {
      toSelect.addEventListener('change', (e) => {
        this.toCurrency = e.target.value;
        this.calculate();
        this.renderConversionTable();
      });
    }

    const swapBtn = document.getElementById('conv-swap-btn');
    if (swapBtn) {
      swapBtn.addEventListener('click', () => {
        this.swapCurrencies();
      });
    }

    const refreshBtn = document.getElementById('conv-refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.fetchLiveRates(true);
      });
    }
  },

  bindTickerClick() {
    const ticker = document.getElementById('live-ticker-pill');
    if (ticker) {
      ticker.addEventListener('click', () => {
        if (typeof App !== 'undefined' && App.switchTab) {
          App.switchTab('converter');
        }
      });
    }
  },

  /**
   * Continuous real-time auto-sync
   * Polls every 30s, and triggers immediately on focus, visibility change or network restore
   */
  startRealtimeSync() {
    if (this.syncTimer) clearInterval(this.syncTimer);
    
    // Auto sync every 30 seconds
    this.syncTimer = setInterval(() => {
      this.fetchLiveRates(false);
    }, 30000);

    // Refresh immediately when returning to tab/window
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        const last = this.lastUpdated ? this.lastUpdated.getTime() : 0;
        if (now - last > 15000) {
          this.fetchLiveRates(false);
        }
      }
    });

    window.addEventListener('focus', () => {
      const now = Date.now();
      const last = this.lastUpdated ? this.lastUpdated.getTime() : 0;
      if (now - last > 15000) {
        this.fetchLiveRates(false);
      }
    });

    window.addEventListener('online', () => {
      this.fetchLiveRates(false);
    });
  },

  loadCachedRates() {
    try {
      const cached = localStorage.getItem('finanflow_exchange_rates');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.rates && parsed.rates.PEN && parsed.rates.EUR) {
          this.rates = parsed.rates;
          if (parsed.bcpRates) {
            this.bcpRates = parsed.bcpRates;
          }
          if (parsed.usdRates) this.usdRates = parsed.usdRates;
          if (parsed.eurRates) this.eurRates = parsed.eurRates;
          if (parsed.crossRates) this.crossRates = parsed.crossRates;
          this.lastUpdated = parsed.lastUpdated ? new Date(parsed.lastUpdated) : new Date();
          this.isLive = true;
          this.updateStatusUI();
          this.updateLiveTickerUI();
        }
      }
    } catch (e) {
      console.warn('Could not load cached rates', e);
    }
  },

  /**
   * Resilient multi-tier live rate fetcher with BCP as Primary Authority
   */
  async fetchLiveRates(forceToast = false) {
    if (this.isFetching) return;
    this.isFetching = true;

    const statusEl = document.getElementById('conv-status-text');
    if (statusEl) statusEl.textContent = 'Consultando Banco de Crédito BCP en vivo...';

    // Provider endpoints in priority sequence (BCP at #1)
    const providers = [
      // 1. Banco de Crédito del Perú (BCP) Oficial
      async () => {
        const apiUrl = this.getBcpApiUrl();
        const res = await fetch(apiUrl, { cache: 'no-cache' });
        if (!res.ok) throw new Error('BCP API status ' + res.status);
        const data = await res.json();
        if (!data || !data.rates || !data.rates.PEN) throw new Error('BCP payload error');
        if (data.usd) this.usdRates = data.usd;
        if (data.eur) this.eurRates = data.eur;
        if (data.cross) this.crossRates = data.cross;
        if (data.bcp) {
          this.bcpRates = data.bcp;
        }
        this.source = 'Banco de Crédito BCP';
        return {
          USD: 1.0,
          EUR: Number(data.rates.EUR || 0.92),
          PEN: Number(data.rates.PEN)
        };
      },
      // 2. Global Fallback Provider A
      async () => {
        const res = await fetch('https://open.er-api.com/v6/latest/USD', { cache: 'no-cache' });
        if (!res.ok) throw new Error('API 1 status ' + res.status);
        const data = await res.json();
        if (!data.rates || !data.rates.PEN || !data.rates.EUR) throw new Error('API 1 format error');
        const eurVal = Number(data.rates.EUR);
        const penVal = Number(data.rates.PEN);
        this.crossRates = {
          eurToUsd: Math.round((1 / eurVal) * 10000) / 10000,
          usdToEur: eurVal
        };
        return {
          USD: 1.0,
          EUR: eurVal,
          PEN: penVal
        };
      },
      // 3. Global Fallback Provider B
      async () => {
        const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD', { cache: 'no-cache' });
        if (!res.ok) throw new Error('API 2 status ' + res.status);
        const data = await res.json();
        if (!data.rates || !data.rates.PEN || !data.rates.EUR) throw new Error('API 2 format error');
        const eurVal = Number(data.rates.EUR);
        const penVal = Number(data.rates.PEN);
        this.crossRates = {
          eurToUsd: Math.round((1 / eurVal) * 10000) / 10000,
          usdToEur: eurVal
        };
        return {
          USD: 1.0,
          EUR: eurVal,
          PEN: penVal
        };
      }
    ];

    let newRates = null;
    for (const provider of providers) {
      try {
        newRates = await provider();
        if (newRates) break;
      } catch (err) {
        console.warn('[Converter] Provider error, intentando respaldo...', err.message);
      }
    }

    this.isFetching = false;

    if (newRates) {
      this.rates = newRates;
      this.lastUpdated = new Date();
      this.isLive = true;

      // Cache rates
      localStorage.setItem('finanflow_exchange_rates', JSON.stringify({
        rates: this.rates,
        bcpRates: this.bcpRates,
        usdRates: this.usdRates,
        eurRates: this.eurRates,
        crossRates: this.crossRates,
        source: this.source,
        lastUpdated: this.lastUpdated.toISOString()
      }));

      this.updateStatusUI(false);
      this.updateLiveTickerUI();
      this.calculate();
      this.renderRateCards();
      this.renderConversionTable();

      if (forceToast) {
        Utils.showToast(`Cotizaciones BCP actualizadas (Dólar: S/ ${this.usdRates.compra.toFixed(3)} | Euro: S/ ${this.eurRates.compra.toFixed(3)})`, 'success');
      }
    } else {
      console.warn('[Converter] No se pudo conectar a los proveedores en vivo, usando cotizaciones locales BCP.');
      this.isLive = false;
      this.updateStatusUI(true);
      this.updateLiveTickerUI();
      if (forceToast) {
        Utils.showToast('Usando tasas de cambio referenciales BCP', 'info');
      }
    }
  },

  updateStatusUI(isFallback = false) {
    const statusDot = document.getElementById('conv-status-dot');
    const statusText = document.getElementById('conv-status-text');

    const usdBuy = (this.usdRates && this.usdRates.compra) ? this.usdRates.compra.toFixed(3) : ((this.bcpRates && this.bcpRates.compra) ? this.bcpRates.compra.toFixed(3) : '3.525');
    const usdSale = (this.usdRates && this.usdRates.venta) ? this.usdRates.venta.toFixed(3) : ((this.bcpRates && this.bcpRates.venta) ? this.bcpRates.venta.toFixed(3) : '3.540');

    const eurBuy = (this.eurRates && this.eurRates.compra) ? this.eurRates.compra.toFixed(3) : '3.820';
    const eurSale = (this.eurRates && this.eurRates.venta) ? this.eurRates.venta.toFixed(3) : '3.960';

    const eurToUsd = (this.crossRates && this.crossRates.eurToUsd) ? this.crossRates.eurToUsd.toFixed(4) : (this.getRate('EUR', 'USD')).toFixed(4);
    const usdToEur = (this.crossRates && this.crossRates.usdToEur) ? this.crossRates.usdToEur.toFixed(4) : (this.getRate('USD', 'EUR')).toFixed(4);

    // Update Dólar USD
    const usdBuyEl = document.getElementById('bcp-usd-buy') || document.getElementById('bcp-buy-rate');
    const usdSaleEl = document.getElementById('bcp-usd-sale') || document.getElementById('bcp-sale-rate');
    if (usdBuyEl) usdBuyEl.textContent = `S/ ${usdBuy}`;
    if (usdSaleEl) usdSaleEl.textContent = `S/ ${usdSale}`;

    // Update Euro EUR
    const eurBuyEl = document.getElementById('bcp-eur-buy');
    const eurSaleEl = document.getElementById('bcp-eur-sale');
    if (eurBuyEl) eurBuyEl.textContent = `S/ ${eurBuy}`;
    if (eurSaleEl) eurSaleEl.textContent = `S/ ${eurSale}`;

    // Update Cross EUR / USD
    const eurUsdEl = document.getElementById('bcp-eur-usd');
    const usdEurEl = document.getElementById('bcp-usd-eur');
    if (eurUsdEl) eurUsdEl.textContent = `$ ${eurToUsd}`;
    if (usdEurEl) usdEurEl.textContent = `€ ${usdToEur}`;

    if (statusDot && statusText) {
      if (isFallback) {
        statusDot.style.background = 'var(--accent-amber)';
        statusText.textContent = `BCP (Referencial) · Dólar: S/ ${usdBuy} | Euro: S/ ${eurBuy}`;
      } else {
        statusDot.style.background = 'var(--accent-emerald)';
        statusText.textContent = `Banco de Crédito BCP · Dólar: S/ ${usdBuy} / ${usdSale} · Euro: S/ ${eurBuy} / ${eurSale}`;
      }
    }
  },

  /**
   * Update topbar real-time ticker with authentic BCP logo and multi-currency values
   */
  updateLiveTickerUI() {
    const tickerText = document.getElementById('ticker-rates-text');
    if (!tickerText) return;

    const usdBuy = (this.usdRates && this.usdRates.compra) ? this.usdRates.compra.toFixed(3) : ((this.bcpRates && this.bcpRates.compra) ? this.bcpRates.compra.toFixed(3) : '3.525');
    const usdSale = (this.usdRates && this.usdRates.venta) ? this.usdRates.venta.toFixed(3) : ((this.bcpRates && this.bcpRates.venta) ? this.bcpRates.venta.toFixed(3) : '3.540');

    const eurBuy = (this.eurRates && this.eurRates.compra) ? this.eurRates.compra.toFixed(3) : '3.820';
    const eurSale = (this.eurRates && this.eurRates.venta) ? this.eurRates.venta.toFixed(3) : '3.960';

    const eurToUsd = (this.crossRates && this.crossRates.eurToUsd) ? this.crossRates.eurToUsd.toFixed(4) : (this.getRate('EUR', 'USD')).toFixed(4);

    tickerText.innerHTML = `
      <span style="display:inline-flex; align-items:center; background:#ffffff; padding:2px 6px; border-radius:4px; vertical-align:middle; margin-right:6px; box-shadow:0 1px 2px rgba(0,0,0,0.12);">
        <img src="./icons/bcp-logo.svg" alt="BCP" style="height:12px; width:auto; display:block;" />
      </span>
      <strong>$ Dólar:</strong> C S/ ${usdBuy} V S/ ${usdSale} &bull; 
      <strong>€ Euro:</strong> C S/ ${eurBuy} V S/ ${eurSale} &bull; 
      <strong>1 EUR =</strong> $${eurToUsd}
    `;
  },

  /**
   * Convert from one currency to another using USD base
   */
  getRate(from, to) {
    if (from === to) return 1.0;
    const rateFromUSD = this.rates[from] || 1.0;
    const rateToUSD = this.rates[to] || 1.0;
    // from -> USD -> to
    return (1 / rateFromUSD) * rateToUSD;
  },

  /**
   * Helper to convert an amount between currencies
   */
  convert(amount, from, to) {
    const rate = this.getRate(from, to);
    return amount * rate;
  },

  calculate() {
    const from = this.fromCurrency;
    const to = this.toCurrency;
    const rate = this.getRate(from, to);
    const result = this.amount * rate;

    // Update Result UI
    const resultValEl = document.getElementById('conv-result-val');
    const resultRateEl = document.getElementById('conv-rate-info');
    const invRateEl = document.getElementById('conv-inv-rate-info');

    const curSymbols = { PEN: 'S/', EUR: '€', USD: '$' };

    if (resultValEl) {
      resultValEl.textContent = `${curSymbols[to]} ${result.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    if (resultRateEl) {
      resultRateEl.textContent = `1 ${from} = ${rate.toLocaleString('es-PE', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} ${to}`;
    }

    if (invRateEl) {
      const invRate = this.getRate(to, from);
      invRateEl.textContent = `1 ${to} = ${invRate.toLocaleString('es-PE', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} ${from}`;
    }
  },

  swapCurrencies() {
    const temp = this.fromCurrency;
    this.fromCurrency = this.toCurrency;
    this.toCurrency = temp;

    const fromSelect = document.getElementById('conv-from');
    const toSelect = document.getElementById('conv-to');
    if (fromSelect) fromSelect.value = this.fromCurrency;
    if (toSelect) toSelect.value = this.toCurrency;

    // Spin animation on button
    const icon = document.getElementById('conv-swap-icon');
    if (icon) {
      icon.style.transform = 'rotate(180deg)';
      setTimeout(() => { icon.style.transform = 'rotate(0deg)'; }, 300);
    }

    this.calculate();
    this.renderConversionTable();
  },

  renderRateCards() {
    const pairs = [
      { from: 'EUR', to: 'PEN', fromLabel: 'Euro', toLabel: 'Soles', icon: 'EUR ➔ PEN' },
      { from: 'USD', to: 'PEN', fromLabel: 'Dólar', toLabel: 'Soles', icon: 'USD ➔ PEN' },
      { from: 'EUR', to: 'USD', fromLabel: 'Euro', toLabel: 'Dólar', icon: 'EUR ➔ USD' },
      { from: 'PEN', to: 'EUR', fromLabel: 'Sol', toLabel: 'Euros', icon: 'PEN ➔ EUR' },
      { from: 'PEN', to: 'USD', fromLabel: 'Sol', toLabel: 'Dólar', icon: 'PEN ➔ USD' },
      { from: 'USD', to: 'EUR', fromLabel: 'Dólar', toLabel: 'Euros', icon: 'USD ➔ EUR' }
    ];

    const container = document.getElementById('conv-rate-cards-grid');
    if (!container) return;

    container.innerHTML = pairs.map(p => {
      const rate = this.getRate(p.from, p.to);
      return `
        <div class="converter-rate-card" onclick="ConverterModule.quickSelectPair('${p.from}', '${p.to}')" title="Clic para calcular esta divisa">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 0.82rem; font-weight: 700; color: var(--text-secondary);">${p.icon}</span>
            <span style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">1 ${p.from}</span>
          </div>
          <div style="font-family: var(--font-heading); font-size: 1.3rem; font-weight: 700; color: var(--text-primary);">
            ${rate.toLocaleString('es-PE', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} <span style="font-size: 0.85rem; color: var(--accent-secondary);">${p.to}</span>
          </div>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 4px;">
            ${p.fromLabel} a ${p.toLabel}
          </div>
        </div>
      `;
    }).join('');
  },

  quickSelectPair(from, to) {
    this.fromCurrency = from;
    this.toCurrency = to;

    const fromSelect = document.getElementById('conv-from');
    const toSelect = document.getElementById('conv-to');
    if (fromSelect) fromSelect.value = from;
    if (toSelect) toSelect.value = to;

    this.calculate();
    this.renderConversionTable();
    Utils.showToast(`Convertidor configurado: ${from} a ${to}`, 'info');
  },

  renderConversionTable() {
    const tableBody = document.getElementById('conv-matrix-body');
    if (!tableBody) return;

    const from = this.fromCurrency;
    const to = this.toCurrency;
    const rate = this.getRate(from, to);

    const values = [1, 5, 10, 20, 50, 100, 250, 500, 1000, 5000];
    const curSymbols = { PEN: 'S/', EUR: '€', USD: '$' };

    tableBody.innerHTML = values.map(val => {
      const converted = val * rate;
      return `
        <tr>
          <td style="font-weight: 600; color: var(--text-primary);">${curSymbols[from]} ${val.toLocaleString('es-PE')} ${from}</td>
          <td style="font-family: var(--font-heading); font-weight: 700; color: var(--accent-emerald);">${curSymbols[to]} ${converted.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${to}</td>
        </tr>
      `;
    }).join('');
  }
};
