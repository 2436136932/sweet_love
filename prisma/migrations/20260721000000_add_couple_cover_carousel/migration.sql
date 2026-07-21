-- Add coverCarousel JSON column to couples table for storing cover carousel image IDs.
-- The field stores an array of album image src paths, displayed as a fading carousel background.

ALTER TABLE `couples`
  ADD COLUMN `coverCarousel` JSON NULL COMMENT '轮播封面图片数组，存储相册图片的 src 路径';
