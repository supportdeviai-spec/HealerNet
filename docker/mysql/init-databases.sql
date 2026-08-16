-- Runs once when the MySQL data volume is first created.
CREATE DATABASE IF NOT EXISTS healernet CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS healernet_testing CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

GRANT ALL PRIVILEGES ON healernet.* TO 'healernet_user'@'%';
GRANT ALL PRIVILEGES ON healernet_testing.* TO 'healernet_user'@'%';
FLUSH PRIVILEGES;
