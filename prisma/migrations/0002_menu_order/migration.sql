CREATE TABLE `menu_dishes` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `category` VARCHAR(191) NOT NULL,
  `coupleId` VARCHAR(191) NOT NULL,
  `createdById` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `menu_dishes_coupleId_name_key`(`coupleId`, `name`),
  INDEX `menu_dishes_coupleId_idx`(`coupleId`),
  INDEX `menu_dishes_createdById_idx`(`createdById`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `meal_order_items` (
  `id` VARCHAR(191) NOT NULL,
  `date` DATE NOT NULL,
  `dishName` VARCHAR(191) NOT NULL,
  `category` VARCHAR(191) NOT NULL,
  `coupleId` VARCHAR(191) NOT NULL,
  `createdById` VARCHAR(191) NOT NULL,
  `dishId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `meal_order_items_coupleId_date_dishName_key`(`coupleId`, `date`, `dishName`),
  INDEX `meal_order_items_coupleId_date_idx`(`coupleId`, `date`),
  INDEX `meal_order_items_createdById_idx`(`createdById`),
  INDEX `meal_order_items_dishId_idx`(`dishId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `menu_dishes` ADD CONSTRAINT `menu_dishes_coupleId_fkey` FOREIGN KEY (`coupleId`) REFERENCES `couples`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `menu_dishes` ADD CONSTRAINT `menu_dishes_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `meal_order_items` ADD CONSTRAINT `meal_order_items_coupleId_fkey` FOREIGN KEY (`coupleId`) REFERENCES `couples`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `meal_order_items` ADD CONSTRAINT `meal_order_items_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `meal_order_items` ADD CONSTRAINT `meal_order_items_dishId_fkey` FOREIGN KEY (`dishId`) REFERENCES `menu_dishes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
