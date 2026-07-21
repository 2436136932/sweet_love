ALTER TABLE `todos`
  ADD COLUMN `autoSource` VARCHAR(191) NULL,
  ADD COLUMN `autoSourceKey` VARCHAR(191) NULL,
  ADD COLUMN `autoDate` DATE NULL;

CREATE INDEX `todos_autoSource_autoSourceKey_autoDate_idx` ON `todos`(`autoSource`, `autoSourceKey`, `autoDate`);

CREATE TABLE `period_records` (
  `id` VARCHAR(191) NOT NULL,
  `startDate` DATE NOT NULL,
  `endDate` DATE NULL,
  `flow` VARCHAR(191) NULL,
  `painLevel` INTEGER NULL,
  `symptoms` JSON NULL,
  `note` TEXT NULL,
  `coupleId` VARCHAR(191) NOT NULL,
  `createdById` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `period_records_coupleId_startDate_idx` ON `period_records`(`coupleId`, `startDate`);
CREATE INDEX `period_records_createdById_idx` ON `period_records`(`createdById`);

ALTER TABLE `period_records`
  ADD CONSTRAINT `period_records_coupleId_fkey`
  FOREIGN KEY (`coupleId`) REFERENCES `couples`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `period_records`
  ADD CONSTRAINT `period_records_createdById_fkey`
  FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
