-- Add themeConfig JSON column to couples table for storing theme configuration.
-- The field stores an object like: { "enabled": true, "color": "#D4A5A5" }

ALTER TABLE `couples`
  ADD COLUMN `themeConfig` JSON NULL COMMENT '主题配置，存储 JSON {enabled, color}';
