CREATE TABLE `kitchen_recipes` (
  `id` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `category` VARCHAR(191) NOT NULL,
  `summary` TEXT NULL,
  `imageUrl` TEXT NULL,
  `difficulty` VARCHAR(191) NULL,
  `cookTime` INTEGER NULL,
  `servings` INTEGER NULL,
  `ingredients` JSON NULL,
  `steps` JSON NULL,
  `coupleId` VARCHAR(191) NOT NULL,
  `createdById` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `kitchen_recipes_coupleId_title_key`(`coupleId`, `title`),
  INDEX `kitchen_recipes_coupleId_idx`(`coupleId`),
  INDEX `kitchen_recipes_createdById_idx`(`createdById`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `kitchen_recipe_favorites` (
  `id` VARCHAR(191) NOT NULL,
  `recipeId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `kitchen_recipe_favorites_recipeId_userId_key`(`recipeId`, `userId`),
  INDEX `kitchen_recipe_favorites_userId_idx`(`userId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `kitchen_shopping_lists` (
  `id` VARCHAR(191) NOT NULL,
  `date` DATE NOT NULL,
  `coupleId` VARCHAR(191) NOT NULL,
  `createdById` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `kitchen_shopping_lists_coupleId_date_key`(`coupleId`, `date`),
  INDEX `kitchen_shopping_lists_createdById_idx`(`createdById`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `kitchen_shopping_list_items` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `quantity` DOUBLE NULL,
  `unit` VARCHAR(191) NULL,
  `note` TEXT NULL,
  `checked` BOOLEAN NOT NULL DEFAULT false,
  `listId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `kitchen_shopping_list_items_listId_idx`(`listId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `kitchen_cook_checkins` (
  `id` VARCHAR(191) NOT NULL,
  `date` DATE NOT NULL,
  `recipeId` VARCHAR(191) NULL,
  `title` VARCHAR(191) NOT NULL,
  `imageUrl` TEXT NULL,
  `note` TEXT NULL,
  `rating` INTEGER NULL,
  `coupleId` VARCHAR(191) NOT NULL,
  `createdById` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `kitchen_cook_checkins_coupleId_date_idx`(`coupleId`, `date`),
  INDEX `kitchen_cook_checkins_createdById_idx`(`createdById`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `kitchen_recipes` ADD CONSTRAINT `kitchen_recipes_coupleId_fkey` FOREIGN KEY (`coupleId`) REFERENCES `couples`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `kitchen_recipes` ADD CONSTRAINT `kitchen_recipes_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `kitchen_recipe_favorites` ADD CONSTRAINT `kitchen_recipe_favorites_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `kitchen_shopping_lists` ADD CONSTRAINT `kitchen_shopping_lists_coupleId_fkey` FOREIGN KEY (`coupleId`) REFERENCES `couples`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `kitchen_shopping_lists` ADD CONSTRAINT `kitchen_shopping_lists_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `kitchen_shopping_list_items` ADD CONSTRAINT `kitchen_shopping_list_items_listId_fkey` FOREIGN KEY (`listId`) REFERENCES `kitchen_shopping_lists`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `kitchen_cook_checkins` ADD CONSTRAINT `kitchen_cook_checkins_coupleId_fkey` FOREIGN KEY (`coupleId`) REFERENCES `couples`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `kitchen_cook_checkins` ADD CONSTRAINT `kitchen_cook_checkins_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO `kitchen_recipes` (`id`, `title`, `category`, `summary`, `imageUrl`, `ingredients`, `steps`, `coupleId`, `createdById`, `createdAt`, `updatedAt`)
SELECT CONCAT('kitchen-', `id`), `name`, `category`, `description`, `imageUrl`, JSON_ARRAY(), JSON_ARRAY(), `coupleId`, `createdById`, `createdAt`, `updatedAt`
FROM `menu_dishes`;
