-- Seed initial historical data into Cloudflare D1
INSERT OR IGNORE INTO expenses (id, concept, amount, currency, category, paymentMethod, date, notes, timestamp)
VALUES 
('exp_1791782038631_rmteufn3f', 'UCV KEYLA', 550.38, 'PEN', 'Educación', 'Billetera Digital (Yape/Plin)', '2026-10-07', '', 1791782038631),
('exp_1791781251766_stuyrh4ly', 'ALQUILER DEPARTAMENTO', 400.00, 'PEN', 'Vivienda', 'Billetera Digital (Yape/Plin)', '2026-10-10', '', 1791781251766),
('exp_1791781197863_4lzsi92l8', 'KEYLA', 100.00, 'PEN', 'Otros', 'Billetera Digital (Yape/Plin)', '2026-10-01', 'PROPINA', 1791781197863),
('exp_1791781115102_pmckp2m87', 'ERICK', 250.00, 'PEN', 'Otros', 'Billetera Digital (Yape/Plin)', '2026-10-09', '', 1791781115102),
('exp_1791781076741_kfiura8xb', 'ERICK', 250.00, 'PEN', 'Otros', 'Billetera Digital (Yape/Plin)', '2026-09-18', '', 1791781076741),
('exp_1791781017335_jep9ydza8', 'ABUELA PENSION', 400.00, 'PEN', 'Alimentación', 'Billetera Digital (Yape/Plin)', '2026-10-01', '', 1791781017335),
('exp_1791780855166_tthcrn6hb', 'KEYLA', 50.00, 'PEN', 'Otros', 'Billetera Digital (Yape/Plin)', '2026-10-11', 'PROPINA', 1791780855166),
('exp_1789278010780_4z9oqp7c9', 'ALQUILER DEPARTAMENTO', 400.00, 'PEN', 'Vivienda', 'Billetera Digital (Yape/Plin)', '2026-09-12', '', 1789278010780);

INSERT OR IGNORE INTO loans (id, entity, principalAmount, interestRate, interestAmount, totalAmount, totalInstallments, installmentAmount, frequency, startDate, currency, notes, status, paidInstallments, totalPaid, remainingAmount, interestOnlyPaid, interestOnlyCount, history)
VALUES (
  'loan_1791599106104_68y65swrl',
  'banco scotia SBP Cuenta digital',
  400.00,
  20,
  80.00,
  480.00,
  5,
  80.00,
  'monthly',
  '2026-10-09',
  'PEN',
  'Lizy',
  'active',
  1,
  80.00,
  400.00,
  80.00,
  1,
  '[{"installmentNumber":"Cuota #1","date":"2026-10-09","amount":80,"type":"INSTALLMENT","method":"Efectivo","receiptCode":"REC-261009-1001"},{"installmentNumber":"Solo Interés #1","date":"2026-11-12","amount":80,"type":"INTEREST_ONLY","extendSchedule":true,"method":"Efectivo","receiptCode":"REC-261112-1002","notes":"Pago de solo intereses #1"}]'
);
