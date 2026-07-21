-- AlterTable
ALTER TABLE `album_images` MODIFY `date` DATETIME(3) NOT NULL,
    MODIFY `locationCoordinateSystem` VARCHAR(191) NULL DEFAULT 'GCJ02';

-- AlterTable
ALTER TABLE `diaries` MODIFY `date` DATETIME(3) NOT NULL;
