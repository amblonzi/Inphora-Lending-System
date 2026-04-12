-- init_sql/01-create-users-table.sql
-- Core Users table for all tenant databases

CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(255) UNIQUE NOT NULL,
  `hashed_password` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(255),
  `role` VARCHAR(50) DEFAULT 'user',
  `permissions` TEXT,
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `last_login` TIMESTAMP NULL,
  INDEX `ix_email` (`email`),
  INDEX `ix_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Clients table
CREATE TABLE IF NOT EXISTS `clients` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `full_name` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(20),
  `email` VARCHAR(255),
  `id_number` VARCHAR(50) UNIQUE,
  `date_of_birth` DATE,
  `address` TEXT,
  `employment_status` VARCHAR(50),
  `employment_type` VARCHAR(50),
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `ix_email` (`email`),
  INDEX `ix_id_number` (`id_number`),
  INDEX `ix_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Loan Products table
CREATE TABLE IF NOT EXISTS `loan_products` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `min_amount` DECIMAL(15, 2),
  `max_amount` DECIMAL(15, 2),
  `interest_rate` DECIMAL(5, 3),
  `processing_fee` DECIMAL(5, 3),
  `repayment_period` INT,
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `ix_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Loans table
CREATE TABLE IF NOT EXISTS `loans` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `client_id` INT NOT NULL,
  `product_id` INT,
  `amount` DECIMAL(15, 2) NOT NULL,
  `interest_rate` DECIMAL(5, 3),
  `processing_fee` DECIMAL(15, 2),
  `start_date` DATE NOT NULL,
  `end_date` DATE,
  `status` VARCHAR(50) DEFAULT 'pending',
  `created_by_id` INT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`),
  FOREIGN KEY (`product_id`) REFERENCES `loan_products`(`id`),
  FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`),
  INDEX `ix_client_id` (`client_id`),
  INDEX `ix_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Repayments table
CREATE TABLE IF NOT EXISTS `repayments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `loan_id` INT NOT NULL,
  `payment_amount` DECIMAL(15, 2) NOT NULL,
  `payment_date` DATE NOT NULL,
  `status` VARCHAR(50) DEFAULT 'pending',
  `payment_method` VARCHAR(50) DEFAULT 'manual',
  `mpesa_transaction_id` VARCHAR(100),
  `notes` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`loan_id`) REFERENCES `loans`(`id`),
  INDEX `ix_loan_id` (`loan_id`),
  INDEX `ix_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Expenses table
CREATE TABLE IF NOT EXISTS `expenses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `amount` DECIMAL(15, 2) NOT NULL,
  `category` VARCHAR(100),
  `description` TEXT,
  `expense_date` DATE NOT NULL,
  `created_by_id` INT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`),
  INDEX `ix_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- System Settings table
CREATE TABLE IF NOT EXISTS `system_settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `key` VARCHAR(255) UNIQUE NOT NULL,
  `value` TEXT,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Activity Log table
CREATE TABLE IF NOT EXISTS `activity_log` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT,
  `action` VARCHAR(255),
  `resource` VARCHAR(255),
  `resource_id` VARCHAR(100),
  `details` TEXT,
  `ip_address` VARCHAR(45),
  `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
  INDEX `ix_user_id` (`user_id`),
  INDEX `ix_timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Organization Config table
CREATE TABLE IF NOT EXISTS `organization_config` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `organization_name` VARCHAR(255) DEFAULT 'Inphora Lending System',
  `slug` VARCHAR(100) UNIQUE,
  `logo_url` VARCHAR(500),
  `primary_color` VARCHAR(7) DEFAULT '#f97316',
  `secondary_color` VARCHAR(7) DEFAULT '#0ea5e9',
  `contact_email` VARCHAR(255),
  `contact_phone` VARCHAR(50),
  `address` TEXT,
  `registration_number` VARCHAR(100),
  `tax_id` VARCHAR(100),
  `currency` VARCHAR(3) DEFAULT 'KES',
  `locale` VARCHAR(10) DEFAULT 'en-KE',
  `timezone` VARCHAR(100) DEFAULT 'Africa/Nairobi',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notifications table
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT,
  `message` TEXT,
  `is_read` BOOLEAN DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
  INDEX `ix_user_id` (`user_id`),
  INDEX `ix_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Registration Applications table
CREATE TABLE IF NOT EXISTS `registration_applications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `full_name` VARCHAR(255),
  `email` VARCHAR(255),
  `phone` VARCHAR(20),
  `status` VARCHAR(50) DEFAULT 'pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
