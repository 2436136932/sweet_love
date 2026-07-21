ALTER TABLE `todos`
  ADD COLUMN `description` TEXT NULL,
  ADD COLUMN `targetDate` DATE NULL,
  ADD COLUMN `completedAt` DATETIME(3) NULL,
  ADD COLUMN `completedById` VARCHAR(191) NULL,
  ADD COLUMN `memoryNote` TEXT NULL,
  ADD COLUMN `memoryImages` JSON NULL,
  ADD COLUMN `isFeatured` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `sortOrder` INTEGER NOT NULL DEFAULT 0;

CREATE INDEX `todos_completed_isFeatured_sortOrder_idx` ON `todos`(`completed`, `isFeatured`, `sortOrder`);
