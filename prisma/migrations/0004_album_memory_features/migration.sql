ALTER TABLE `album_images`
  ADD COLUMN `description` TEXT NULL,
  ADD COLUMN `mediaType` VARCHAR(191) NOT NULL DEFAULT 'image',
  ADD COLUMN `isFeatured` BOOLEAN NOT NULL DEFAULT false;

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

ALTER TABLE `album_comments`
  ADD CONSTRAINT `album_comments_albumImageId_fkey` FOREIGN KEY (`albumImageId`) REFERENCES `album_images`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `album_comments_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `album_likes`
  ADD CONSTRAINT `album_likes_albumImageId_fkey` FOREIGN KEY (`albumImageId`) REFERENCES `album_images`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `album_likes_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
