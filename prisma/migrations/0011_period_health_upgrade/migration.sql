CREATE TABLE `period_daily_logs` (
  `id` VARCHAR(191) NOT NULL,
  `date` DATE NOT NULL,
  `flow` VARCHAR(191) NULL,
  `painLevel` INTEGER NULL,
  `symptoms` JSON NULL,
  `moods` JSON NULL,
  `energyLevel` INTEGER NULL,
  `temperatureCelsius` DECIMAL(4, 2) NULL,
  `lhTestResult` VARCHAR(191) NULL,
  `intercourse` BOOLEAN NOT NULL DEFAULT false,
  `note` TEXT NULL,
  `coupleId` VARCHAR(191) NOT NULL,
  `createdById` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE UNIQUE INDEX `period_daily_logs_coupleId_date_key` ON `period_daily_logs`(`coupleId`, `date`);
CREATE INDEX `period_daily_logs_createdById_idx` ON `period_daily_logs`(`createdById`);

CREATE TABLE `period_settings` (
  `id` VARCHAR(191) NOT NULL,
  `mode` VARCHAR(191) NOT NULL DEFAULT 'cycle',
  `defaultCycleDays` INTEGER NOT NULL DEFAULT 28,
  `defaultPeriodDays` INTEGER NOT NULL DEFAULT 5,
  `reminderLeadDays` INTEGER NOT NULL DEFAULT 3,
  `autoSyncCareTodos` BOOLEAN NOT NULL DEFAULT true,
  `coupleId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE UNIQUE INDEX `period_settings_coupleId_key` ON `period_settings`(`coupleId`);

ALTER TABLE `period_daily_logs`
  ADD CONSTRAINT `period_daily_logs_coupleId_fkey`
  FOREIGN KEY (`coupleId`) REFERENCES `couples`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `period_daily_logs`
  ADD CONSTRAINT `period_daily_logs_createdById_fkey`
  FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `period_settings`
  ADD CONSTRAINT `period_settings_coupleId_fkey`
  FOREIGN KEY (`coupleId`) REFERENCES `couples`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
