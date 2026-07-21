-- 单行表：存储用户在应用内配置的 AI 参数（可覆盖 .env 默认值）。
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
