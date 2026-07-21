ALTER TABLE `users`
  ADD COLUMN `momentStatus` VARCHAR(191) NULL,
  ADD COLUMN `momentStatusText` VARCHAR(191) NULL,
  ADD COLUMN `momentStatusUpdatedAt` DATETIME(3) NULL;
