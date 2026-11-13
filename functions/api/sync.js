// Cloudflare Pages Function: /api/sync
// Connected to Cloudflare D1 Database (ari-gastos-db)
// Provides 24/7 real-time global synchronization and multi-device persistence

export async function onRequestGet(context) {
  const db = context.env.DB || context.env.ari_gastos_db;
  if (!db) {
    return new Response(JSON.stringify({ error: "D1 Database binding not found" }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }

  try {
    const expensesStmt = db.prepare("SELECT * FROM expenses ORDER BY date DESC");
    const loansStmt = db.prepare("SELECT * FROM loans ORDER BY startDate DESC");

    const [expensesRes, loansRes] = await db.batch([expensesStmt, loansStmt]);

    // Parse expenses with fallback for title/concept
    const expenses = (expensesRes.results || []).map(e => ({
      ...e,
      title: e.title || e.concept,
      concept: e.concept || e.title
    }));

    // Parse loans history JSON with fallback for entity/clientName
    const loans = (loansRes.results || []).map(l => {
      let history = [];
      try {
        history = typeof l.history === 'string' ? JSON.parse(l.history) : (l.history || []);
      } catch (e) {
        history = [];
      }
      return {
        ...l,
        clientName: l.clientName || l.entity,
        entity: l.entity || l.clientName,
        history
      };
    });

    return new Response(JSON.stringify({
      success: true,
      timestamp: Date.now(),
      expenses: expenses,
      loans: loans
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache, no-store, must-revalidate"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
}

export async function onRequestPost(context) {
  const db = context.env.DB || context.env.ari_gastos_db;
  if (!db) {
    return new Response(JSON.stringify({ error: "D1 Database binding not found" }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }

  try {
    const body = await context.request.json();
    const { expenses = [], loans = [] } = body;
    const statements = [];

    // Batch upsert expenses
    for (const exp of expenses) {
      const concept = exp.title || exp.concept;
      if (!exp.id || !concept) continue;
      statements.push(
        db.prepare(`
          INSERT INTO expenses (id, concept, amount, currency, category, paymentMethod, date, notes, timestamp, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            concept = excluded.concept,
            amount = excluded.amount,
            currency = excluded.currency,
            category = excluded.category,
            paymentMethod = excluded.paymentMethod,
            date = excluded.date,
            notes = excluded.notes,
            updatedAt = excluded.updatedAt
        `).bind(
          exp.id,
          concept,
          Number(exp.amount) || 0,
          exp.currency || 'PEN',
          exp.category || 'Otros',
          exp.paymentMethod || '',
          exp.date || '',
          exp.notes || '',
          exp.timestamp || Date.now(),
          Date.now()
        )
      );
    }

    // Batch upsert loans
    for (const l of loans) {
      const entity = l.clientName || l.entity;
      if (!l.id || !entity) continue;
      const historyStr = JSON.stringify(l.history || []);
      statements.push(
        db.prepare(`
          INSERT INTO loans (
            id, entity, principalAmount, interestRate, interestAmount, totalAmount,
            totalInstallments, installmentAmount, frequency, startDate, currency,
            clientDni, clientPhone, clientAddress, guarantee, notes, status,
            paidInstallments, totalPaid, remainingAmount, interestOnlyPaid, interestOnlyCount,
            history, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            entity = excluded.entity,
            principalAmount = excluded.principalAmount,
            interestRate = excluded.interestRate,
            interestAmount = excluded.interestAmount,
            totalAmount = excluded.totalAmount,
            totalInstallments = excluded.totalInstallments,
            installmentAmount = excluded.installmentAmount,
            frequency = excluded.frequency,
            startDate = excluded.startDate,
            currency = excluded.currency,
            clientDni = excluded.clientDni,
            clientPhone = excluded.clientPhone,
            clientAddress = excluded.clientAddress,
            guarantee = excluded.guarantee,
            notes = excluded.notes,
            status = excluded.status,
            paidInstallments = excluded.paidInstallments,
            totalPaid = excluded.totalPaid,
            remainingAmount = excluded.remainingAmount,
            interestOnlyPaid = excluded.interestOnlyPaid,
            interestOnlyCount = excluded.interestOnlyCount,
            history = excluded.history,
            updatedAt = excluded.updatedAt
        `).bind(
          l.id,
          l.entity,
          Number(l.principalAmount) || 0,
          Number(l.interestRate) || 0,
          Number(l.interestAmount) || 0,
          Number(l.totalAmount) || 0,
          Number(l.totalInstallments) || 1,
          Number(l.installmentAmount) || 0,
          l.frequency || 'daily',
          l.startDate || '',
          l.currency || 'PEN',
          l.clientDni || '',
          l.clientPhone || '',
          l.clientAddress || '',
          l.guarantee || '',
          l.notes || '',
          l.status || 'active',
          Number(l.paidInstallments) || 0,
          Number(l.totalPaid) || 0,
          Number(l.remainingAmount) || 0,
          Number(l.interestOnlyPaid) || 0,
          Number(l.interestOnlyCount) || 0,
          historyStr,
          Date.now()
        )
      );
    }

    if (statements.length > 0) {
      await db.batch(statements);
    }

    return new Response(JSON.stringify({
      success: true,
      syncedExpenses: expenses.length,
      syncedLoans: loans.length,
      timestamp: Date.now()
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}

