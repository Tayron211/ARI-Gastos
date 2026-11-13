-- ARI-Gastos Cloudflare D1 Database Schema
-- Provides 24/7 cloud persistence worldwide with zero data loss

CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    concept TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'PEN',
    category TEXT DEFAULT 'Varios',
    paymentMethod TEXT,
    date TEXT NOT NULL,
    notes TEXT,
    timestamp INTEGER,
    updatedAt INTEGER
);

CREATE TABLE IF NOT EXISTS loans (
    id TEXT PRIMARY KEY,
    entity TEXT NOT NULL,
    principalAmount REAL NOT NULL,
    interestRate REAL NOT NULL,
    interestAmount REAL DEFAULT 0,
    totalAmount REAL NOT NULL,
    totalInstallments INTEGER NOT NULL,
    installmentAmount REAL NOT NULL,
    frequency TEXT DEFAULT 'daily',
    startDate TEXT NOT NULL,
    currency TEXT DEFAULT 'PEN',
    clientDni TEXT,
    clientPhone TEXT,
    clientAddress TEXT,
    guarantee TEXT,
    notes TEXT,
    status TEXT DEFAULT 'active',
    paidInstallments INTEGER DEFAULT 0,
    totalPaid REAL DEFAULT 0,
    remainingAmount REAL NOT NULL,
    interestOnlyPaid REAL DEFAULT 0,
    interestOnlyCount INTEGER DEFAULT 0,
    history TEXT,
    updatedAt INTEGER
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
