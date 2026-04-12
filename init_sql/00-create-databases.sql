-- init_sql/00-create-databases.sql
-- Create all tenant databases and users
-- Run by MariaDB during container startup

-- Create Tytahj database and user
CREATE DATABASE IF NOT EXISTS tytahjdb 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

GRANT ALL PRIVILEGES ON tytahjdb.* TO 'tytahj_user'@'%' IDENTIFIED BY 'tytahj_secure_pass_2024';

-- Create AmariFlow database and user
CREATE DATABASE IF NOT EXISTS amaridb 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

GRANT ALL PRIVILEGES ON amaridb.* TO 'amari_user'@'%' IDENTIFIED BY 'amari_secure_pass_2024';

-- Create Inphora Logic (IL) database and user
CREATE DATABASE IF NOT EXISTS ildb 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

GRANT ALL PRIVILEGES ON ildb.* TO 'il_user'@'%' IDENTIFIED BY 'il_secure_pass_2024';

-- Flush privileges to apply changes
FLUSH PRIVILEGES;

-- Set default database for subsequent scripts
USE ildb;
