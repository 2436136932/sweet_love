
-- ============================================================================
-- sweet_love 数据库初始化脚本（MySQL）
-- 合并自 prisma\migrations 下所有迁移，适用于全新部署。
-- 在空数据库中执行即可。
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `sweet_love`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `sweet_love`;

-- -----------------------------------------------------------------------
-- 基础表（来自 migration 0001）
-- -----------------------------------------------------------------------

CREATE TABLE `users` (
  `id` VARCHAR(191) NOT NULL,
  `username` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `password` VARCHAR(191) NOT NULL,
  `avatar` TEXT NULL,
  `bio` TEXT NULL,
  `inviteCode` VARCHAR(191) NOT NULL,
  `partnerId` VARCHAR(191) NULL,
  `momentStatus` VARCHAR(191) NULL,
  `momentStatusText` VARCHAR(191) NULL,
  `momentStatusUpdatedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `users_email_key`(`email`),
  UNIQUE INDEX `users_inviteCode_key`(`inviteCode`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `couples` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NULL,
  `bio` TEXT NULL,
  `coverImage` TEXT NULL,
  `coverCarousel` JSON NULL COMMENT '轮播封面图片数组，存储相册图片的 src 路径',
  `startDate` DATE NULL,
  `userAId` VARCHAR(191) NOT NULL,
  `userBId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `couples_userAId_idx`(`userAId`),
  INDEX `couples_userBId_idx`(`userBId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `anniversaries` (
  `id` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `date` DATE NOT NULL,
  `isImportant` BOOLEAN NOT NULL DEFAULT false,
  `userId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `anniversaries_userId_idx`(`userId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `album_images` (
  `id` VARCHAR(191) NOT NULL,
  `src` TEXT NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `height` VARCHAR(191) NULL,
  `date` DATETIME(3) NOT NULL,
  `category` VARCHAR(191) NULL,
  `description` TEXT NULL,
  `mediaType` VARCHAR(191) NOT NULL DEFAULT 'image',
  `isFeatured` BOOLEAN NOT NULL DEFAULT false,
  `locationAddress` TEXT NULL,
  `lat` DOUBLE NULL,
  `lng` DOUBLE NULL,
  `locationSource` VARCHAR(191) NULL,
  `locationAccuracyMeters` DOUBLE NULL,
  `locationPoiId` VARCHAR(191) NULL,
  `locationPoiName` VARCHAR(191) NULL,
  `locationAdcode` VARCHAR(191) NULL,
  `locationCoordinateSystem` VARCHAR(191) NULL DEFAULT 'GCJ02',
  `userId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `album_images_userId_idx`(`userId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `album_comments` (
  `id` VARCHAR(191) NOT NULL,
  `content` TEXT NOT NULL,
  `albumImageId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `album_comments_albumImageId_idx`(`albumImageId`),
  INDEX `album_comments_userId_idx`(`userId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `album_likes` (
  `id` VARCHAR(191) NOT NULL,
  `albumImageId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `album_likes_albumImageId_userId_key`(`albumImageId`, `userId`),
  INDEX `album_likes_albumImageId_idx`(`albumImageId`),
  INDEX `album_likes_userId_idx`(`userId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `diaries` (
  `id` VARCHAR(191) NOT NULL,
  `date` DATETIME(3) NOT NULL,
  `mood` VARCHAR(191) NOT NULL,
  `content` TEXT NOT NULL,
  `location` TEXT NULL,
  `images` JSON NULL,
  `userId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `diaries_userId_idx`(`userId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `todos` (
  `id` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `completed` BOOLEAN NOT NULL DEFAULT false,
  `category` VARCHAR(191) NOT NULL,
  `targetDate` DATE NULL,
  `completedAt` DATETIME(3) NULL,
  `completedById` VARCHAR(191) NULL,
  `memoryNote` TEXT NULL,
  `memoryImages` JSON NULL,
  `isFeatured` BOOLEAN NOT NULL DEFAULT false,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `autoSource` VARCHAR(191) NULL,
  `autoSourceKey` VARCHAR(191) NULL,
  `autoDate` DATE NULL,
  `userId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `todos_userId_idx`(`userId`),
  INDEX `todos_completed_isFeatured_sortOrder_idx`(`completed`, `isFeatured`, `sortOrder`),
  INDEX `todos_autoSource_autoSourceKey_autoDate_idx`(`autoSource`, `autoSourceKey`, `autoDate`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `messages` (
  `id` VARCHAR(191) NOT NULL,
  `senderId` VARCHAR(191) NOT NULL,
  `content` TEXT NOT NULL,
  `imageUrl` TEXT NULL,
  `timestamp` VARCHAR(191) NOT NULL,
  `replyToId` VARCHAR(191) NULL,
  `userId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `messages_userId_idx`(`userId`),
  INDEX `messages_replyToId_idx`(`replyToId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `daily_ratings` (
  `id` VARCHAR(191) NOT NULL,
  `score` INTEGER NOT NULL,
  `note` TEXT NULL,
  `date` DATE NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `daily_ratings_userId_date_key`(`userId`, `date`),
  INDEX `daily_ratings_userId_idx`(`userId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------
-- 点餐模块（来自 migration 0002 / 0003）
-- -----------------------------------------------------------------------

CREATE TABLE `menu_dishes` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `category` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `imageUrl` TEXT NULL,
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
  `quantity` INTEGER NOT NULL DEFAULT 1,
  `note` TEXT NULL,
  `description` TEXT NULL,
  `imageUrl` TEXT NULL,
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

-- -----------------------------------------------------------------------
-- 厨房模块（来自 migration 0005）
-- -----------------------------------------------------------------------

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

-- -----------------------------------------------------------------------
-- 经期助手模块（来自 migration 0008 / 0011）
-- -----------------------------------------------------------------------

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

-- -----------------------------------------------------------------------
-- AI 配置表（来自 migration 0012）
-- -----------------------------------------------------------------------

CREATE TABLE `ai_config` (
  `id` VARCHAR(191) NOT NULL,
  `enabled` TINYINT(1) NOT NULL DEFAULT 0,
  `provider` VARCHAR(32) NOT NULL DEFAULT 'openai-compatible',
  `openaiApiKey` TEXT NULL,
  `openaiBaseUrl` TEXT NULL,
  `openaiModel` VARCHAR(191) NULL,
  `openaiTemperature` DOUBLE NULL,
  `openaiMaxTokens` INT NULL,
  `openaiTimeoutMs` INT NULL,
  `geminiApiKey` TEXT NULL,
  `geminiModel` VARCHAR(191) NULL,
  `geminiTemperature` DOUBLE NULL,
  `geminiMaxTokens` INT NULL,
  `geminiTimeoutMs` INT NULL,
  `claudeApiKey` TEXT NULL,
  `claudeModel` VARCHAR(191) NULL,
  `claudeMaxTokens` INT NULL,
  `claudeTimeoutMs` INT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============================================================================
-- 外键约束（所有表定义完毕后再添加，避免创建顺序问题）
-- ============================================================================

-- couples
ALTER TABLE `couples`
  ADD CONSTRAINT `couples_userAId_fkey` FOREIGN KEY (`userAId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `couples`
  ADD CONSTRAINT `couples_userBId_fkey` FOREIGN KEY (`userBId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- anniversaries
ALTER TABLE `anniversaries`
  ADD CONSTRAINT `anniversaries_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- album_images / album_comments / album_likes
ALTER TABLE `album_images`
  ADD CONSTRAINT `album_images_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `album_comments`
  ADD CONSTRAINT `album_comments_albumImageId_fkey` FOREIGN KEY (`albumImageId`) REFERENCES `album_images`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `album_comments`
  ADD CONSTRAINT `album_comments_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `album_likes`
  ADD CONSTRAINT `album_likes_albumImageId_fkey` FOREIGN KEY (`albumImageId`) REFERENCES `album_images`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `album_likes`
  ADD CONSTRAINT `album_likes_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- diaries / todos / messages / daily_ratings
ALTER TABLE `diaries`
  ADD CONSTRAINT `diaries_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `todos`
  ADD CONSTRAINT `todos_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `messages`
  ADD CONSTRAINT `messages_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `messages`
  ADD CONSTRAINT `messages_replyToId_fkey` FOREIGN KEY (`replyToId`) REFERENCES `messages`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `daily_ratings`
  ADD CONSTRAINT `daily_ratings_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- menu_dishes / meal_order_items
ALTER TABLE `menu_dishes`
  ADD CONSTRAINT `menu_dishes_coupleId_fkey` FOREIGN KEY (`coupleId`) REFERENCES `couples`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `menu_dishes`
  ADD CONSTRAINT `menu_dishes_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `meal_order_items`
  ADD CONSTRAINT `meal_order_items_coupleId_fkey` FOREIGN KEY (`coupleId`) REFERENCES `couples`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `meal_order_items`
  ADD CONSTRAINT `meal_order_items_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `meal_order_items`
  ADD CONSTRAINT `meal_order_items_dishId_fkey` FOREIGN KEY (`dishId`) REFERENCES `menu_dishes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- kitchen
ALTER TABLE `kitchen_recipes`
  ADD CONSTRAINT `kitchen_recipes_coupleId_fkey` FOREIGN KEY (`coupleId`) REFERENCES `couples`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `kitchen_recipes`
  ADD CONSTRAINT `kitchen_recipes_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `kitchen_recipe_favorites`
  ADD CONSTRAINT `kitchen_recipe_favorites_recipeId_fkey` FOREIGN KEY (`recipeId`) REFERENCES `kitchen_recipes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `kitchen_recipe_favorites`
  ADD CONSTRAINT `kitchen_recipe_favorites_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `kitchen_shopping_lists`
  ADD CONSTRAINT `kitchen_shopping_lists_coupleId_fkey` FOREIGN KEY (`coupleId`) REFERENCES `couples`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `kitchen_shopping_lists`
  ADD CONSTRAINT `kitchen_shopping_lists_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `kitchen_shopping_list_items`
  ADD CONSTRAINT `kitchen_shopping_list_items_listId_fkey` FOREIGN KEY (`listId`) REFERENCES `kitchen_shopping_lists`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `kitchen_cook_checkins`
  ADD CONSTRAINT `kitchen_cook_checkins_coupleId_fkey` FOREIGN KEY (`coupleId`) REFERENCES `couples`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `kitchen_cook_checkins`
  ADD CONSTRAINT `kitchen_cook_checkins_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- period
ALTER TABLE `period_records`
  ADD CONSTRAINT `period_records_coupleId_fkey` FOREIGN KEY (`coupleId`) REFERENCES `couples`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `period_records`
  ADD CONSTRAINT `period_records_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `period_daily_logs`
  ADD CONSTRAINT `period_daily_logs_coupleId_fkey` FOREIGN KEY (`coupleId`) REFERENCES `couples`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `period_daily_logs`
  ADD CONSTRAINT `period_daily_logs_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `period_settings`
  ADD CONSTRAINT `period_settings_coupleId_fkey` FOREIGN KEY (`coupleId`) REFERENCES `couples`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
