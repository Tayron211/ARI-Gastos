/**
 * ARI-CONTROL - MULTI-VAULT PERSISTENT STORAGE & CYBERSECURITY ENGINE
 * - 4-Layer Persistence: localStorage + Permanent Vault + IndexedDB + CacheStorage + window.name
 * - 100% Preservation of User Edits, Cuota Payments, Solo Interés, Additions & Deletions
 * - Prototype Pollution & XSS Schema Sanitization
 */

const STORAGE_KEYS = {
  INITIALIZED: 'ari_gastos_initialized_v2',
  EXPENSES: 'finanflow_expenses_v1',
  LOANS: 'finanflow_loans_v1',
  BACKUP: 'ari_gastos_auto_backup_v1',
  SETTINGS: 'finanflow_settings_v1',
  VAULT_EXPENSES: 'ari_vault_expenses_permanent',
  VAULT_LOANS: 'ari_vault_loans_permanent',
  DELETED_EXPENSES: 'finanflow_deleted_expenses_v1',
  DELETED_LOANS: 'finanflow_deleted_loans_v1',
  LAST_MODIFIED: 'ari_data_last_modified_ts'
};

const DATA_CACHE_NAME = 'ari-user-data-vault-v1';
const DATA_CACHE_URL = '/__ari_user_data_vault__.json';
const WINDOW_VAULT_PREFIX = '__ARI_VAULT__:';

const HISTORICAL_USER_EXPENSES = [
  {
    id: "exp_1791782038631_rmteufn3f",
    title: "UCV KEYLA",
    amount: 550.38,
    category: "Educación",
    date: "2026-10-07",
    paymentMethod: "Billetera Digital (Yape/Plin)",
    notes: "",
    currency: "PEN"
  },
  {
    id: "exp_1791781251766_stuyrh4ly",
    title: "ALQUILER DEPARTAMENTO",
    amount: 400.00,
    category: "Vivienda",
    date: "2026-10-10",
    paymentMethod: "Billetera Digital (Yape/Plin)",
    notes: "",
    currency: "PEN"
  },
  {
    id: "exp_1791781197863_4lzsi92l8",
    title: "KEYLA",
    amount: 100.00,
    category: "Otros",
    date: "2026-10-01",
    paymentMethod: "Billetera Digital (Yape/Plin)",
    notes: "PROPINA",
    currency: "PEN"
  },
  {
    id: "exp_1791781115102_pmckp2m87",
    title: "ERICK",
    amount: 250.00,
    category: "Otros",
    date: "2026-10-09",
    paymentMethod: "Billetera Digital (Yape/Plin)",
    notes: "",
    currency: "PEN"
  },
  {
    id: "exp_1791781076741_kfiura8xb",
    title: "ERICK",
    amount: 250.00,
    category: "Otros",
    date: "2026-09-18",
    paymentMethod: "Billetera Digital (Yape/Plin)",
    notes: "",
    currency: "PEN"
  },
  {
    id: "exp_1791781017335_jep9ydza8",
    title: "ABUELA PENSION",
    amount: 400.00,
    category: "Alimentación",
    date: "2026-10-01",
    paymentMethod: "Billetera Digital (Yape/Plin)",
    notes: "",
    currency: "PEN"
  },
  {
    id: "exp_1791780855166_tthcrn6hb",
    title: "KEYLA",
    amount: 50.00,
    category: "Otros",
    date: "2026-10-11",
    paymentMethod: "Billetera Digital (Yape/Plin)",
    notes: "PROPINA",
    currency: "PEN"
  },
  {
    id: "exp_1789278010780_4z9oqp7c9",
    title: "ALQUILER DEPARTAMENTO",
    amount: 400.00,
    category: "Vivienda",
    date: "2026-09-12",
    paymentMethod: "Billetera Digital (Yape/Plin)",
    notes: "",
    currency: "PEN"
  }
];

const HISTORICAL_USER_LOAN = {
  id: "loan_1791599106104_68y65swrl",
  entity: "banco scotia SBP Cuenta digital",
  clientName: "Lizy",
  principalAmount: 400.00,
  interestRate: 20,
  interestAmount: 80.00,
  totalAmount: 480.00,
  totalInstallments: 5,
  paidInstallments: 1,
  installmentAmount: 80.00,
  customInterestPayment: 80.00,
  startDate: "2026-10-09",
  dueDayOfMonth: 9,
  notes: "Lizy",
  currency: "PEN",
  frequency: "monthly",
  history: [
    {
      installmentNumber: "Cuota #1",
      date: "2026-10-09",
      amount: 80.00,
      type: "INSTALLMENT",
      method: "Efectivo",
      receiptCode: "REC-261009-1001"
    },
    {
      installmentNumber: "Solo Interés #1",
      date: "2026-11-12",
      amount: 80.00,
      type: "INTEREST_ONLY",
      extendSchedule: true,
      method: "Efectivo",
      receiptCode: "REC-261112-1002",
      notes: "Pago de solo intereses #1"
    }
  ]
};

const Storage = {
  /**
   * Safe JSON parse blocking Prototype Pollution
   */
  safeParse(raw, fallback = null) {
    if (!raw || typeof raw !== 'string') return fallback;
    if (typeof Utils !== 'undefined' && Utils.safeJSONParse) {
      return Utils.safeJSONParse(raw, fallback);
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  },

  /**
   * Schema sanitizer for Expense records
   */
  sanitizeExpense(item) {
    if (!item || typeof item !== 'object') return null;
    const cleanText = (val, max = 200) =>
      typeof Utils !== 'undefined' && Utils.sanitizeText
        ? Utils.sanitizeText(val, max)
        : String(val || '').trim().slice(0, max);

    const amount = Number(item.amount);
    if (!Number.isFinite(amount) || amount < 0) return null;

    const title = cleanText(item.title, 160);
    if (!title) return null;

    return {
      id: cleanText(item.id || `exp_${Date.now()}`, 80),
      title,
      amount: Number(amount.toFixed(2)),
      category: cleanText(item.category || 'Otros', 60),
      date: /^\d{4}-\d{2}-\d{2}$/.test(String(item.date || '')) ? String(item.date) : (typeof Utils !== 'undefined' ? Utils.getTodayString() : '2026-10-01'),
      paymentMethod: cleanText(item.paymentMethod || 'Efectivo', 80),
      notes: cleanText(item.notes || '', 300),
      currency: item.currency === 'EUR' ? 'EUR' : 'PEN'
    };
  },

  /**
   * Schema sanitizer for Loan records
   */
  sanitizeLoan(item) {
    if (!item || typeof item !== 'object') return null;
    const cleanText = (val, max = 200) =>
      typeof Utils !== 'undefined' && Utils.sanitizeText
        ? Utils.sanitizeText(val, max)
        : String(val || '').trim().slice(0, max);

    const clientName = cleanText(item.clientName || item.entity, 160);
    if (!clientName) return null;

    const totalAmount = Math.max(0, Number(item.totalAmount) || 0);
    const principalAmount = Math.max(0, Number(item.principalAmount) || totalAmount);
    const interestRate = Math.max(0, Number(item.interestRate) || 0);
    const interestAmount = Math.max(0, Number(item.interestAmount) || Math.max(0, totalAmount - principalAmount));
    const totalInstallments = Math.max(1, Math.min(1000, parseInt(item.totalInstallments, 10) || 1));
    const paidInstallments = Math.max(0, Math.min(totalInstallments, parseInt(item.paidInstallments, 10) || 0));
    const installmentAmount = Math.max(0, Number(item.installmentAmount) || (totalAmount / totalInstallments));

    const history = Array.isArray(item.history)
      ? item.history
          .filter(h => h && typeof h === 'object' && Number.isFinite(Number(h.amount)))
          .map(h => ({
            installmentNumber: cleanText(h.installmentNumber || 'Pago', 80),
            date: /^\d{4}-\d{2}-\d{2}$/.test(String(h.date || '')) ? String(h.date) : '2026-10-01',
            amount: Number(Number(h.amount).toFixed(2)),
            type: ['INSTALLMENT', 'INTEREST_ONLY', 'PARTIAL_AMORTIZATION', 'FULL_SETTLEMENT'].includes(h.type) ? h.type : 'INSTALLMENT',
            extendSchedule: h.extendSchedule !== false,
            method: cleanText(h.method || 'Efectivo', 60),
            receiptCode: cleanText(h.receiptCode || '', 40),
            notes: cleanText(h.notes || '', 240)
          }))
      : [];

    return {
      id: cleanText(item.id || `loan_${Date.now()}`, 80),
      entity: cleanText(item.entity || clientName, 160),
      clientName,
      clientDni: cleanText(item.clientDni || '', 20),
      clientPhone: cleanText(item.clientPhone || '', 24),
      clientAddress: cleanText(item.clientAddress || '', 200),
      principalAmount: Number(principalAmount.toFixed(2)),
      interestRate: Number(interestRate.toFixed(2)),
      interestAmount: Number(interestAmount.toFixed(2)),
      totalAmount: Number(totalAmount.toFixed(2)),
      frequency: ['daily', 'daily_all', 'weekly', 'biweekly', 'monthly'].includes(item.frequency) ? item.frequency : 'daily',
      totalInstallments,
      paidInstallments,
      installmentAmount: Number(installmentAmount.toFixed(2)),
      customInterestPayment: Number((Number(item.customInterestPayment) || 0).toFixed(2)),
      startDate: /^\d{4}-\d{2}-\d{2}$/.test(String(item.startDate || '')) ? String(item.startDate) : '2026-10-01',
      firstPaymentDate: /^\d{4}-\d{2}-\d{2}$/.test(String(item.firstPaymentDate || '')) ? String(item.firstPaymentDate) : null,
      dueDayOfMonth: item.dueDayOfMonth ? Math.max(1, Math.min(31, parseInt(item.dueDayOfMonth, 10) || 1)) : null,
      guarantee: cleanText(item.guarantee || '', 200),
      notes: cleanText(item.notes || '', 300),
      currency: item.currency === 'EUR' ? 'EUR' : 'PEN',
      history
    };
  },

  /**
   * Initialize storage: strictly preserves all user changes across reloads and code updates
   */
  init() {
    try {
      let rawExpenses = localStorage.getItem(STORAGE_KEYS.EXPENSES);
      let rawLoans = localStorage.getItem(STORAGE_KEYS.LOANS);

      // 1. If primary keys were cleared, recover synchronously from Permanent Vault, Auto-Backup, or window.name
      if (rawExpenses === null || rawLoans === null) {
        this.restoreSynchronousVaults();
        rawExpenses = localStorage.getItem(STORAGE_KEYS.EXPENSES);
        rawLoans = localStorage.getItem(STORAGE_KEYS.LOANS);
      }

      // 2. Only if no user data exists in any synchronous vault, seed initial floor data
      if (rawExpenses === null) {
        this.saveExpenses(HISTORICAL_USER_EXPENSES, false);
      }
      if (rawLoans === null) {
        this.saveLoans([HISTORICAL_USER_LOAN], false);
      }

      // 3. Remove legacy synthetic sample loans ('loan_1' Carlos Mendoza, 'loan_2' Rosa Flores) if they were auto-injected
      this.purgeSyntheticDemoLoans();

      // 4. Non-destructive floor check (never overwrites user edits or resurrects deleted items)
      this.autoRecoverUserExpenses();
      this.autoRecoverUserLoans();

      localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');

      // 5. Reconcile with async hardware vaults (IndexedDB & CacheStorage) in case localStorage was reset
      this.reconcileAsyncVaults();

      // 6. Real-time 24/7 Cloudflare D1 synchronization (Global persistence)
      this.syncWithCloud();
      if (!this._onlineListenerBound) {
        window.addEventListener('online', () => this.syncWithCloud());
        this._onlineListenerBound = true;
      }
    } catch (e) {
      console.error('[Storage] Error during initialization:', e);
    }
  },

  /**
   * Remove synthetic sample loans ('loan_1' and 'loan_2') that were not created by the user
   */
  purgeSyntheticDemoLoans() {
    try {
      const loans = this.getLoans();
      const filtered = loans.filter(l => {
        if (!l) return false;
        if (l.id === 'loan_1' && l.clientName && l.clientName.includes('Carlos Mendoza')) return false;
        if (l.id === 'loan_2' && l.clientName && l.clientName.includes('Rosa Flores')) return false;
        return true;
      });
      if (filtered.length !== loans.length) {
        this.saveLoans(filtered, false);
      }
    } catch (e) {}
  },

  /**
   * Synchronous recovery from Permanent Vault, Auto-Backup, or window.name
   */
  restoreSynchronousVaults() {
    try {
      // Check Auto-Backup first
      const rawBackup = localStorage.getItem(STORAGE_KEYS.BACKUP);
      const parsedBackup = this.safeParse(rawBackup, null);
      if (parsedBackup && (Array.isArray(parsedBackup.expenses) || Array.isArray(parsedBackup.loans))) {
        if (Array.isArray(parsedBackup.deletedExpenses)) {
          localStorage.setItem(STORAGE_KEYS.DELETED_EXPENSES, JSON.stringify(parsedBackup.deletedExpenses));
        }
        if (Array.isArray(parsedBackup.deletedLoans)) {
          localStorage.setItem(STORAGE_KEYS.DELETED_LOANS, JSON.stringify(parsedBackup.deletedLoans));
        }
        if (Array.isArray(parsedBackup.expenses)) {
          localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(parsedBackup.expenses));
        }
        if (Array.isArray(parsedBackup.loans)) {
          localStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(parsedBackup.loans));
        }
        return true;
      }

      // Check Permanent Vault keys
      const vaultExp = this.safeParse(localStorage.getItem(STORAGE_KEYS.VAULT_EXPENSES), null);
      const vaultLoans = this.safeParse(localStorage.getItem(STORAGE_KEYS.VAULT_LOANS), null);
      if (Array.isArray(vaultExp) || Array.isArray(vaultLoans)) {
        if (Array.isArray(vaultExp)) {
          localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(vaultExp));
        }
        if (Array.isArray(vaultLoans)) {
          localStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(vaultLoans));
        }
        return true;
      }

      // Check window.name session vault
      if (typeof window !== 'undefined' && typeof window.name === 'string' && window.name.startsWith(WINDOW_VAULT_PREFIX)) {
        const winData = this.safeParse(window.name.slice(WINDOW_VAULT_PREFIX.length), null);
        if (winData) {
          if (Array.isArray(winData.deletedExpenses)) {
            localStorage.setItem(STORAGE_KEYS.DELETED_EXPENSES, JSON.stringify(winData.deletedExpenses));
          }
          if (Array.isArray(winData.deletedLoans)) {
            localStorage.setItem(STORAGE_KEYS.DELETED_LOANS, JSON.stringify(winData.deletedLoans));
          }
          if (Array.isArray(winData.expenses)) {
            localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(winData.expenses));
          }
          if (Array.isArray(winData.loans)) {
            localStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(winData.loans));
          }
          if (winData.updatedAt) {
            localStorage.setItem(STORAGE_KEYS.LAST_MODIFIED, String(winData.updatedAt));
          }
          return true;
        }
      }
    } catch (e) {}
    return false;
  },

  /**
   * Non-destructive floor recovery for expenses:
   * - Preserves 100% of user edits to existing expenses
   * - Respects user deletions (DELETED_EXPENSES)
   */
  autoRecoverUserExpenses() {
    try {
      let current = this.getExpenses();
      const currentIds = new Set(current.map(e => e.id));
      const deletedIds = this.getDeletedExpenseIds();
      let modified = false;

      HISTORICAL_USER_EXPENSES.forEach(histExp => {
        if (!deletedIds.has(histExp.id) && !currentIds.has(histExp.id)) {
          current.push(histExp);
          currentIds.add(histExp.id);
          modified = true;
        }
      });

      if (modified) {
        current.sort((a, b) => new Date(b.date) - new Date(a.date));
        this.saveExpenses(current, false);
      }
    } catch (e) {
      console.warn('[Storage] Error en verificación de gastos:', e);
    }
  },

  /**
   * Non-destructive floor recovery for loans:
   * - Preserves 100% of user edits, cuota payments, and Solo Interés records
   * - Respects user deletions (DELETED_LOANS)
   */
  autoRecoverUserLoans() {
    try {
      let loans = this.getLoans();
      const deletedLoanIds = this.getDeletedLoanIds();
      const currentIds = new Set(loans.map(l => l.id));

      if (!deletedLoanIds.has(HISTORICAL_USER_LOAN.id) && !currentIds.has(HISTORICAL_USER_LOAN.id)) {
        const hasMatch = loans.some(l =>
          (l.clientName && l.clientName.toLowerCase() === 'lizy') ||
          (l.notes && l.notes.toLowerCase().includes('lizy'))
        );
        if (!hasMatch) {
          loans.unshift(HISTORICAL_USER_LOAN);
          this.saveLoans(loans, false);
        }
      }
    } catch (e) {
      console.warn('[Storage] Error en verificación de préstamos:', e);
    }
  },

  /* Deletion tracking: prevents resurrecting items intentionally removed by the user */
  markExpenseDeleted(id) {
    try {
      const deleted = this.getDeletedExpenseIds();
      deleted.add(id);
      localStorage.setItem(STORAGE_KEYS.DELETED_EXPENSES, JSON.stringify(Array.from(deleted)));
    } catch (e) {}
  },

  getDeletedExpenseIds() {
    try {
      const parsed = this.safeParse(localStorage.getItem(STORAGE_KEYS.DELETED_EXPENSES), []);
      return Array.isArray(parsed) ? new Set(parsed) : new Set();
    } catch (e) {
      return new Set();
    }
  },

  markLoanDeleted(id) {
    try {
      const deleted = this.getDeletedLoanIds();
      deleted.add(id);
      localStorage.setItem(STORAGE_KEYS.DELETED_LOANS, JSON.stringify(Array.from(deleted)));
    } catch (e) {}
  },

  getDeletedLoanIds() {
    try {
      const parsed = this.safeParse(localStorage.getItem(STORAGE_KEYS.DELETED_LOANS), []);
      return Array.isArray(parsed) ? new Set(parsed) : new Set();
    } catch (e) {
      return new Set();
    }
  },

  deleteExpense(id) {
    this.markExpenseDeleted(id);
    const expenses = this.getExpenses().filter(x => x.id !== id);
    this.saveExpenses(expenses, true);
    return expenses;
  },

  deleteLoan(id) {
    this.markLoanDeleted(id);
    const loans = this.getLoans().filter(x => x.id !== id);
    this.saveLoans(loans, true);
    return loans;
  },

  /* Expenses Storage */
  getExpenses() {
    const parsed = this.safeParse(localStorage.getItem(STORAGE_KEYS.EXPENSES), []);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(item => this.sanitizeExpense(item)).filter(Boolean);
  },

  saveExpenses(expenses, markUserModified = true) {
    try {
      const cleanList = Array.isArray(expenses)
        ? expenses.map(item => this.sanitizeExpense(item)).filter(Boolean)
        : [];
      const serialized = JSON.stringify(cleanList);
      localStorage.setItem(STORAGE_KEYS.EXPENSES, serialized);
      localStorage.setItem(STORAGE_KEYS.VAULT_EXPENSES, serialized);
      if (markUserModified) {
        localStorage.setItem(STORAGE_KEYS.LAST_MODIFIED, String(Date.now()));
      }
      this.persistSnapshotEverywhere();
      this.triggerCloudSync();
    } catch (e) {
      console.error('Error saving expenses:', e);
    }
  },

  /* Loans Storage */
  getLoans() {
    const parsed = this.safeParse(localStorage.getItem(STORAGE_KEYS.LOANS), []);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(item => this.sanitizeLoan(item)).filter(Boolean);
  },

  saveLoans(loans, markUserModified = true) {
    try {
      const cleanList = Array.isArray(loans)
        ? loans.map(item => this.sanitizeLoan(item)).filter(Boolean)
        : [];
      const serialized = JSON.stringify(cleanList);
      localStorage.setItem(STORAGE_KEYS.LOANS, serialized);
      localStorage.setItem(STORAGE_KEYS.VAULT_LOANS, serialized);
      if (markUserModified) {
        localStorage.setItem(STORAGE_KEYS.LAST_MODIFIED, String(Date.now()));
      }
      this.persistSnapshotEverywhere();
      this.triggerCloudSync();
    } catch (e) {
      console.error('Error saving loans:', e);
    }
  },

  /* ==========================================================================
     CLOUDFLARE D1 24/7 GLOBAL PERSISTENCE SYNCHRONIZER
     ========================================================================== */
  _cloudSyncTimer: null,
  triggerCloudSync() {
    if (typeof window === 'undefined') return;
    clearTimeout(this._cloudSyncTimer);
    this._cloudSyncTimer = setTimeout(() => {
      this.pushToCloud();
    }, 600);
  },

  async pushToCloud() {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    try {
      const expenses = this.getExpenses();
      const loans = this.getLoans();
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expenses, loans })
      });
      if (res.ok) {
        console.log('[Storage] Cloudflare D1 sincronizado exitosamente.');
      }
    } catch (e) {
      // Offline or network error - local vaults protect data
    }
  },

  async syncWithCloud() {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    try {
      const res = await fetch('/api/sync');
      if (!res.ok) return;
      const data = await res.json();
      if (!data || !data.success) return;

      const cloudExpenses = Array.isArray(data.expenses) ? data.expenses : [];
      const cloudLoans = Array.isArray(data.loans) ? data.loans : [];

      if (cloudExpenses.length === 0 && cloudLoans.length === 0) {
        // Cloud is empty, push local data to seed Cloudflare D1
        this.pushToCloud();
        return;
      }

      // Merge cloud expenses non-destructively
      const localExpenses = this.getExpenses();
      const localExpMap = new Map(localExpenses.map(e => [e.id, e]));
      let expensesChanged = false;
      cloudExpenses.forEach(ce => {
        const id = ce.id;
        if (!this.getDeletedExpenseIds().has(id) && !localExpMap.has(id)) {
          localExpMap.set(id, this.sanitizeExpense({
            ...ce,
            title: ce.concept || ce.title
          }));
          expensesChanged = true;
        }
      });
      if (expensesChanged) {
        this.saveExpenses(Array.from(localExpMap.values()), false);
      }

      // Merge cloud loans non-destructively
      const localLoans = this.getLoans();
      const localLoanMap = new Map(localLoans.map(l => [l.id, l]));
      let loansChanged = false;
      cloudLoans.forEach(cl => {
        const id = cl.id;
        if (!this.getDeletedLoanIds().has(id) && !localLoanMap.has(id)) {
          localLoanMap.set(id, this.sanitizeLoan(cl));
          loansChanged = true;
        }
      });
      if (loansChanged) {
        this.saveLoans(Array.from(localLoanMap.values()), false);
      }
    } catch (e) {
      // Local vaults keep running smoothly
    }
  },

  /**
   * Builds a complete authoritative snapshot and writes it to:
   * 1. localStorage (BACKUP)
   * 2. window.name (survives tab reloads & port/file changes)
   * 3. IndexedDB ('ari_control_permanent_db')
   * 4. CacheStorage ('ari-user-data-vault-v1')
   */
  persistSnapshotEverywhere() {
    try {
      const updatedAt = Number(localStorage.getItem(STORAGE_KEYS.LAST_MODIFIED)) || Date.now();
      const snapshot = {
        updatedAt,
        expenses: this.getExpenses(),
        loans: this.getLoans(),
        deletedExpenses: Array.from(this.getDeletedExpenseIds()),
        deletedLoans: Array.from(this.getDeletedLoanIds())
      };

      const json = JSON.stringify(snapshot);
      localStorage.setItem(STORAGE_KEYS.BACKUP, json);

      try {
        if (typeof window !== 'undefined') {
          window.name = WINDOW_VAULT_PREFIX + json;
        }
      } catch (e) {}

      this.syncSnapshotToIndexedDB(snapshot);
      this.syncSnapshotToCacheStorage(json);
    } catch (e) {}
  },

  createAutoBackup() {
    this.persistSnapshotEverywhere();
  },

  /* IndexedDB Hardware Vault */
  openDB() {
    return new Promise((resolve) => {
      if (typeof indexedDB === 'undefined') return resolve(null);
      try {
        const req = indexedDB.open('ari_control_permanent_db', 2);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('vault')) {
            db.createObjectStore('vault');
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch (err) {
        resolve(null);
      }
    });
  },

  async syncSnapshotToIndexedDB(snapshot) {
    try {
      const db = await this.openDB();
      if (!db) return;
      const tx = db.transaction('vault', 'readwrite');
      const store = tx.objectStore('vault');
      store.put(snapshot, 'master_snapshot');
      store.put(snapshot.expenses, 'expenses');
      store.put(snapshot.loans, 'loans');
    } catch (e) {}
  },

  async readSnapshotFromIndexedDB() {
    try {
      const db = await this.openDB();
      if (!db) return null;
      return await new Promise((resolve) => {
        const tx = db.transaction('vault', 'readonly');
        const store = tx.objectStore('vault');
        const req = store.get('master_snapshot');
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    } catch (e) {
      return null;
    }
  },

  /* CacheStorage Vault (Survives localStorage clears & Service Worker updates) */
  async syncSnapshotToCacheStorage(jsonString) {
    try {
      if (typeof caches === 'undefined') return;
      const cache = await caches.open(DATA_CACHE_NAME);
      const response = new Response(jsonString, {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
      });
      await cache.put(DATA_CACHE_URL, response);
    } catch (e) {}
  },

  async readSnapshotFromCacheStorage() {
    try {
      if (typeof caches === 'undefined') return null;
      const cache = await caches.open(DATA_CACHE_NAME);
      const res = await cache.match(DATA_CACHE_URL);
      if (!res) return null;
      const text = await res.text();
      return this.safeParse(text, null);
    } catch (e) {
      return null;
    }
  },

  /**
   * Reconciles localStorage with IndexedDB and CacheStorage on startup:
   * If IndexedDB or CacheStorage holds a newer user modification timestamp than localStorage,
   * automatically restores it and refreshes the UI.
   */
  async reconcileAsyncVaults() {
    try {
      const localTs = Number(localStorage.getItem(STORAGE_KEYS.LAST_MODIFIED)) || 0;
      const [idbSnap, cacheSnap] = await Promise.all([
        this.readSnapshotFromIndexedDB(),
        this.readSnapshotFromCacheStorage()
      ]);

      let newest = null;
      let newestTs = localTs;

      if (idbSnap && Number(idbSnap.updatedAt) > newestTs) {
        newest = idbSnap;
        newestTs = Number(idbSnap.updatedAt);
      }
      if (cacheSnap && Number(cacheSnap.updatedAt) > newestTs) {
        newest = cacheSnap;
        newestTs = Number(cacheSnap.updatedAt);
      }

      if (newest) {
        if (Array.isArray(newest.deletedExpenses)) {
          localStorage.setItem(STORAGE_KEYS.DELETED_EXPENSES, JSON.stringify(newest.deletedExpenses));
        }
        if (Array.isArray(newest.deletedLoans)) {
          localStorage.setItem(STORAGE_KEYS.DELETED_LOANS, JSON.stringify(newest.deletedLoans));
        }
        if (Array.isArray(newest.expenses)) {
          const cleanExp = newest.expenses.map(x => this.sanitizeExpense(x)).filter(Boolean);
          localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(cleanExp));
          localStorage.setItem(STORAGE_KEYS.VAULT_EXPENSES, JSON.stringify(cleanExp));
        }
        if (Array.isArray(newest.loans)) {
          const cleanLoans = newest.loans.map(x => this.sanitizeLoan(x)).filter(Boolean);
          localStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(cleanLoans));
          localStorage.setItem(STORAGE_KEYS.VAULT_LOANS, JSON.stringify(cleanLoans));
        }
        localStorage.setItem(STORAGE_KEYS.LAST_MODIFIED, String(newestTs));
        this.persistSnapshotEverywhere();

        if (typeof ExpensesModule !== 'undefined' && ExpensesModule.render) ExpensesModule.render();
        if (typeof LoansModule !== 'undefined' && LoansModule.render) LoansModule.render();
        if (typeof App !== 'undefined' && App.refreshDashboard) App.refreshDashboard();
      } else if (localTs > 0) {
        this.persistSnapshotEverywhere();
      }
    } catch (e) {}
  },

  /* Full Data Export */
  exportBackup() {
    const backup = {
      version: '2.1',
      exportDate: new Date().toISOString(),
      updatedAt: Date.now(),
      expenses: this.getExpenses(),
      loans: this.getLoans()
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', url);
    downloadAnchor.setAttribute('download', `Ari-Control_Backup_${Utils.getTodayString()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  },

  /* Hardened Data Import with Size & Schema Validation */
  importBackup(jsonString) {
    try {
      if (typeof jsonString !== 'string' || jsonString.length > 5 * 1024 * 1024) {
        return false;
      }
      const data = this.safeParse(jsonString, null);
      if (!data || typeof data !== 'object') return false;

      let importedAny = false;
      if (Array.isArray(data.expenses)) {
        this.saveExpenses(data.expenses, true);
        importedAny = true;
      }
      if (Array.isArray(data.loans)) {
        this.saveLoans(data.loans, true);
        importedAny = true;
      }
      return importedAny;
    } catch (e) {
      console.error('Failed to import backup:', e);
      return false;
    }
  }
};
