ALTER TABLE `menu_dishes`
  ADD COLUMN `description` TEXT NULL,
  ADD COLUMN `imageUrl` TEXT NULL;

ALTER TABLE `meal_order_items`
  ADD COLUMN `quantity` INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN `note` TEXT NULL,
  ADD COLUMN `description` TEXT NULL,
  ADD COLUMN `imageUrl` TEXT NULL;
