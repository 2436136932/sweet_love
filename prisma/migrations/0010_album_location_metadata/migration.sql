ALTER TABLE `album_images`
  ADD COLUMN `locationSource` VARCHAR(191) NULL,
  ADD COLUMN `locationAccuracyMeters` DOUBLE NULL,
  ADD COLUMN `locationPoiId` VARCHAR(191) NULL,
  ADD COLUMN `locationPoiName` VARCHAR(191) NULL,
  ADD COLUMN `locationAdcode` VARCHAR(191) NULL,
  ADD COLUMN `locationCoordinateSystem` VARCHAR(16) NULL DEFAULT 'GCJ02';

UPDATE `album_images`
SET `locationCoordinateSystem` = 'GCJ02'
WHERE `locationCoordinateSystem` IS NULL AND `lat` IS NOT NULL AND `lng` IS NOT NULL;
