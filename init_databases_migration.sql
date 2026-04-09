-- init_databases_migration.sql
-- Manual migration script to apply schema changes to existing tenant databases
-- Target Databases: tytahjdb, amaridb, ildb

-- 1. Add created_by_id to loans table
ALTER TABLE loans ADD COLUMN created_by_id INT NULL;
ALTER TABLE loans ADD CONSTRAINT fk_loans_created_by FOREIGN KEY (created_by_id) REFERENCES users(id);

-- 2. Add missing fields to repayments table
ALTER TABLE repayments ADD COLUMN payment_method VARCHAR(50) DEFAULT 'manual';
ALTER TABLE repayments ADD COLUMN mpesa_transaction_id VARCHAR(100) NULL;

-- 3. Add index on user_id in notifications table
CREATE INDEX ix_notifications_user_id ON notifications (user_id);
