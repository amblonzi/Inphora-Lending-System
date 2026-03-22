-- ============================================================
--  Tytahj Express — 2026 Loan Data Import
--  Run once: docker exec -i mariadb mysql -u root -p'admin@123' tytahjdb < upload_tytahj_2026.sql
-- ============================================================

USE tytahjdb;
SET FOREIGN_KEY_CHECKS = 0;

-- ── STEP 1: Insert unique clients ────────────────────────────
INSERT INTO clients (first_name, last_name, status, created_at) VALUES
  ('Jennings',  'Obongo',   'Active', NOW()),
  ('Lilian',    'Nabutola', 'Active', NOW()),
  ('Dishon',    'Maliga',   'Active', NOW()),
  ('Joan',      'Wambui',   'Active', NOW()),
  ('Christine', 'Ndombi',   'Active', NOW()),
  ('Madina',    'Hassan',   'Active', NOW()),
  ('Fredrick',  'Okall',    'Active', NOW()),
  ('Patrick',   'Mutira',   'Active', NOW()),
  ('Esther',    'Wesonga',  'Active', NOW()),
  ('Sheila',    'Karugu',   'Active', NOW()),
  ('Belindah',  'Ofula',    'Active', NOW()),
  ('Martin',    'Makio',    'Active', NOW()),
  ('Betty',     'Kipse',    'Active', NOW()),
  ('Daniel',    'Kimagut',  'Active', NOW()),
  ('Wilfred',   'Chebor',   'Active', NOW()),
  ('Charity',   'Kinya',    'Active', NOW());

-- ── STEP 2: Insert loans (using client name lookup + product_id=1) ──

-- Loan sequence mapping:
--   Monthly → Monthly  |  Weekly → Weekly  |  Daily → Daily

INSERT INTO loans (client_id, product_id, amount, processing_fee, repayment_frequency, start_date, status)
VALUES

-- #77978 Jennings Obongo — Ksh20,000 Monthly Disbursed 2026-03-18
((SELECT id FROM clients WHERE first_name='Jennings' AND last_name='Obongo'), 1, 20000, 400, 'Monthly', '2026-03-18', 'Disbursed'),

-- #31345 Lilian Nabutola — Ksh108,000 Weekly Disbursed 2026-03-16
((SELECT id FROM clients WHERE first_name='Lilian' AND last_name='Nabutola'), 1, 108000, 2160, 'Weekly', '2026-03-16', 'Disbursed'),

-- #22287 Dishon Maliga — Ksh15,000 Monthly Disbursed 2026-03-14
((SELECT id FROM clients WHERE first_name='Dishon' AND last_name='Maliga'), 1, 15000, 300, 'Monthly', '2026-03-14', 'Disbursed'),

-- #5539 Joan Wambui — Ksh12,000 Monthly Disbursed 2026-03-13
((SELECT id FROM clients WHERE first_name='Joan' AND last_name='Wambui'), 1, 12000, 240, 'Monthly', '2026-03-13', 'Disbursed'),

-- #87714 Christine Ndombi — Ksh65,000 Monthly Disbursed 2026-03-09
((SELECT id FROM clients WHERE first_name='Christine' AND last_name='Ndombi'), 1, 65000, 1300, 'Monthly', '2026-03-09', 'Disbursed'),

-- #39341 Madina Hassan — Ksh50,000 Monthly Disbursed 2026-03-04
((SELECT id FROM clients WHERE first_name='Madina' AND last_name='Hassan'), 1, 50000, 1000, 'Monthly', '2026-03-04', 'Disbursed'),

-- #24655 Fredrick Okall — Ksh25,000 Monthly Disbursed 2026-03-04
((SELECT id FROM clients WHERE first_name='Fredrick' AND last_name='Okall'), 1, 25000, 500, 'Monthly', '2026-03-04', 'Disbursed'),

-- #58783 Patrick Mutira — Ksh40,000 Monthly Disbursed 2026-02-20
((SELECT id FROM clients WHERE first_name='Patrick' AND last_name='Mutira'), 1, 40000, 800, 'Monthly', '2026-02-20', 'Disbursed'),

-- #7671 Esther Wesonga — Ksh10,000 Monthly Disbursed 2026-02-20
((SELECT id FROM clients WHERE first_name='Esther' AND last_name='Wesonga'), 1, 10000, 200, 'Monthly', '2026-02-20', 'Disbursed'),

-- #22054 Sheila Karugu — Ksh60,000 Monthly Disbursed 2026-02-18
((SELECT id FROM clients WHERE first_name='Sheila' AND last_name='Karugu'), 1, 60000, 1200, 'Monthly', '2026-02-18', 'Disbursed'),

-- #26602 Belindah Ofula — Ksh10,000 Monthly Disbursed 2026-02-15
((SELECT id FROM clients WHERE first_name='Belindah' AND last_name='Ofula'), 1, 10000, 200, 'Monthly', '2026-02-15', 'Disbursed'),

-- #82359 Lilian Nabutola — Ksh60,000 Daily Disbursed 2026-02-13
((SELECT id FROM clients WHERE first_name='Lilian' AND last_name='Nabutola'), 1, 60000, 1200, 'Daily', '2026-02-13', 'Disbursed'),

-- #28270 Martin Makio — Ksh8,000 Monthly Disbursed 2026-02-07
((SELECT id FROM clients WHERE first_name='Martin' AND last_name='Makio'), 1, 8000, 160, 'Monthly', '2026-02-07', 'Disbursed'),

-- #83095 Betty Kipse — Ksh20,000 Monthly Disbursed 2026-02-05
((SELECT id FROM clients WHERE first_name='Betty' AND last_name='Kipse'), 1, 20000, 400, 'Monthly', '2026-02-05', 'Disbursed'),

-- #86592 Daniel Kimagut — Ksh30,000 Monthly Disbursed 2026-02-05
((SELECT id FROM clients WHERE first_name='Daniel' AND last_name='Kimagut'), 1, 30000, 600, 'Monthly', '2026-02-05', 'Disbursed'),

-- #9577 Belindah Ofula — Ksh30,000 Monthly Disbursed 2026-02-03
((SELECT id FROM clients WHERE first_name='Belindah' AND last_name='Ofula'), 1, 30000, 600, 'Monthly', '2026-02-03', 'Disbursed'),

-- #91371 Lilian Nabutola — Ksh20,000 Monthly Disbursed 2026-01-31
((SELECT id FROM clients WHERE first_name='Lilian' AND last_name='Nabutola'), 1, 20000, 400, 'Monthly', '2026-01-31', 'Disbursed'),

-- #62903 Lilian Nabutola — Ksh50,000 Monthly Disbursed 2026-01-30
((SELECT id FROM clients WHERE first_name='Lilian' AND last_name='Nabutola'), 1, 50000, 1000, 'Monthly', '2026-01-30', 'Disbursed'),

-- #68873 Wilfred Chebor — Ksh20,000 Monthly Disbursed 2026-01-25
((SELECT id FROM clients WHERE first_name='Wilfred' AND last_name='Chebor'), 1, 20000, 400, 'Monthly', '2026-01-25', 'Disbursed'),

-- #78167 Patrick Mutira — Ksh40,000 Monthly Disbursed 2026-01-24
((SELECT id FROM clients WHERE first_name='Patrick' AND last_name='Mutira'), 1, 40000, 800, 'Monthly', '2026-01-24', 'Disbursed'),

-- #75449 Daniel Kimagut — Ksh10,000 Daily Disbursed 2026-01-13
((SELECT id FROM clients WHERE first_name='Daniel' AND last_name='Kimagut'), 1, 10000, 200, 'Daily', '2026-01-13', 'Disbursed'),

-- #33394 Joan Wambui — Ksh12,000 Monthly Disbursed 2026-01-07
((SELECT id FROM clients WHERE first_name='Joan' AND last_name='Wambui'), 1, 12000, 240, 'Monthly', '2026-01-07', 'Disbursed'),

-- #61097 Charity Kinya — Ksh20,000 Monthly Approved 2026-01-06
((SELECT id FROM clients WHERE first_name='Charity' AND last_name='Kinya'), 1, 20000, 400, 'Monthly', '2026-01-06', 'Approved'),

-- #16076 Sheila Karugu — Ksh30,000 Daily Disbursed 2026-01-05
((SELECT id FROM clients WHERE first_name='Sheila' AND last_name='Karugu'), 1, 30000, 600, 'Daily', '2026-01-05', 'Disbursed');


-- ── STEP 3: Insert repayments (only loans where repaid > 0) ──
-- Links via loan_id matched on client + amount + start_date

-- Fredrick Okall — fully repaid Ksh27,500 on loan 2026-03-04
INSERT INTO repayments (loan_id, amount, payment_date, payment_method, notes)
SELECT id, 27500, '2026-03-04', 'Cash', 'Imported repayment'
FROM loans
WHERE client_id = (SELECT id FROM clients WHERE first_name='Fredrick' AND last_name='Okall')
  AND amount = 25000 AND start_date = '2026-03-04';

-- Sheila Karugu — partial Ksh36,000 repaid on loan 2026-02-18
INSERT INTO repayments (loan_id, amount, payment_date, payment_method, notes)
SELECT id, 36000, '2026-02-18', 'Cash', 'Imported repayment'
FROM loans
WHERE client_id = (SELECT id FROM clients WHERE first_name='Sheila' AND last_name='Karugu')
  AND amount = 60000 AND start_date = '2026-02-18';

-- Martin Makio — partial Ksh9,500 repaid on loan 2026-02-07
INSERT INTO repayments (loan_id, amount, payment_date, payment_method, notes)
SELECT id, 9500, '2026-02-07', 'Cash', 'Imported repayment'
FROM loans
WHERE client_id = (SELECT id FROM clients WHERE first_name='Martin' AND last_name='Makio')
  AND amount = 8000 AND start_date = '2026-02-07';

-- Betty Kipse — fully repaid Ksh24,000 on loan 2026-02-05
INSERT INTO repayments (loan_id, amount, payment_date, payment_method, notes)
SELECT id, 24000, '2026-02-05', 'Cash', 'Imported repayment'
FROM loans
WHERE client_id = (SELECT id FROM clients WHERE first_name='Betty' AND last_name='Kipse')
  AND amount = 20000 AND start_date = '2026-02-05';

-- Lilian Nabutola — fully repaid Ksh60,000 on loan 2026-01-30
INSERT INTO repayments (loan_id, amount, payment_date, payment_method, notes)
SELECT id, 60000, '2026-01-30', 'Cash', 'Imported repayment'
FROM loans
WHERE client_id = (SELECT id FROM clients WHERE first_name='Lilian' AND last_name='Nabutola')
  AND amount = 50000 AND start_date = '2026-01-30';

-- Wilfred Chebor — partial Ksh4,000 repaid on loan 2026-01-25
INSERT INTO repayments (loan_id, amount, payment_date, payment_method, notes)
SELECT id, 4000, '2026-01-25', 'Cash', 'Imported repayment'
FROM loans
WHERE client_id = (SELECT id FROM clients WHERE first_name='Wilfred' AND last_name='Chebor')
  AND amount = 20000 AND start_date = '2026-01-25';

-- Patrick Mutira — fully repaid Ksh48,000 on loan 2026-01-24
INSERT INTO repayments (loan_id, amount, payment_date, payment_method, notes)
SELECT id, 48000, '2026-01-24', 'Cash', 'Imported repayment'
FROM loans
WHERE client_id = (SELECT id FROM clients WHERE first_name='Patrick' AND last_name='Mutira')
  AND amount = 40000 AND start_date = '2026-01-24';

-- Joan Wambui — fully repaid Ksh14,400 on loan 2026-01-07
INSERT INTO repayments (loan_id, amount, payment_date, payment_method, notes)
SELECT id, 14400, '2026-01-07', 'Cash', 'Imported repayment'
FROM loans
WHERE client_id = (SELECT id FROM clients WHERE first_name='Joan' AND last_name='Wambui')
  AND amount = 12000 AND start_date = '2026-01-07';

SET FOREIGN_KEY_CHECKS = 1;

-- ── Verify ───────────────────────────────────────────────────
SELECT COUNT(*) AS total_clients  FROM clients;
SELECT COUNT(*) AS total_loans    FROM loans;
SELECT COUNT(*) AS total_repayments FROM repayments;
