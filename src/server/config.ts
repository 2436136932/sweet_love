import "dotenv/config";
import path from "path";

type StorageDriver = "local" | "s3";
type AiProvider = "openai-compatible" | "gemini" | "claude";

// 必填环境变量：缺失时直接阻止服务启动，避免运行时才暴露基础配置问题。
function required(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// 可选环境变量：空字符串按未配置处理，方便 .env.example 保留占位。
function optional(name: string) {
  const value = process.env[name]?.trim();
  return value || undefined;
}

function readPositiveNumber(name: string) {
  const value = Number(required(name));
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive number`);
  }
  return value;
}

function readStorageDriver(): StorageDriver {
  const value = (process.env.STORAGE_DRIVER || "local").trim().toLowerCase();
  if (value !== "local" && value !== "s3") {
    throw new Error('STORAGE_DRIVER must be either "local" or "s3"');
  }
  return value;
}

// AI_PROVIDER 只决定当前使用哪一个 AI 供应商，不做自动降级或多 provider 轮询。
function readAiProvider(): AiProvider {
  const value = (process.env.AI_PROVIDER || "openai-compatible").trim().toLowerCase();
  if (value !== "openai-compatible" && value !== "gemini" && value !== "claude") {
    throw new Error('AI_PROVIDER must be "openai-compatible", "gemini", or "claude"');
  }
  return value;
}

function readBoolean(name: string) {
  const value = optional(name);
  if (!value) return false;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function readOptionalPositiveInteger(name: string, fallback: number) {
  const value = optional(name);
  if (!value) return fallback;
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return number;
}

function readOptionalNumber(name: string, fallback: number) {
  const value = optional(name);
  if (!value) return fallback;
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`${name} must be a number`);
  }
  return number;
}

const maxUploadMb = readPositiveNumber("MAX_UPLOAD_MB");
const storageDriver = readStorageDriver();
const aiProvider = readAiProvider();

// 只有选择 S3 存储时才读取 S3 必填项，本地存储模式不会要求这些变量存在。
const s3 =
  storageDriver === "s3"
    ? {
        region: required("S3_REGION"),
        bucket: required("S3_BUCKET"),
        accessKeyId: required("S3_ACCESS_KEY_ID"),
        secretAccessKey: required("S3_SECRET_ACCESS_KEY"),
        endpoint: optional("S3_ENDPOINT"),
        publicUrl: required("S3_PUBLIC_URL").replace(/\/+$/, ""),
        forcePathStyle: readBoolean("S3_FORCE_PATH_STYLE"),
      }
    : undefined;

export const env = {
  appUrl: process.env.APP_URL || "",
  ai: {
    provider: aiProvider,
    // OpenAI-compatible 适配 /chat/completions 协议；baseUrl 需要包含版本路径，例如 https://api.openai.com/v1。
    openaiCompatible: {
      apiKey: optional("OPENAI_COMPATIBLE_API_KEY"),
      baseUrl: optional("OPENAI_COMPATIBLE_BASE_URL")?.replace(/\/+$/, ""),
      maxTokens: readOptionalPositiveInteger("OPENAI_COMPATIBLE_MAX_TOKENS", 2048),
      model: optional("OPENAI_COMPATIBLE_MODEL"),
      temperature: readOptionalNumber("OPENAI_COMPATIBLE_TEMPERATURE", 0.7),
      timeoutMs: readOptionalPositiveInteger("OPENAI_COMPATIBLE_TIMEOUT_MS", 60000),
    },
    // Gemini 使用 Google GenAI SDK；未配置模型时使用官方文档示例模型。
    gemini: {
      apiKey: optional("GEMINI_API_KEY"),
      maxTokens: readOptionalPositiveInteger("GEMINI_MAX_TOKENS", 2048),
      model: optional("GEMINI_MODEL") || "gemini-3.5-flash",
      temperature: readOptionalNumber("GEMINI_TEMPERATURE", 0.7),
      timeoutMs: readOptionalPositiveInteger("GEMINI_TIMEOUT_MS", 60000),
    },
    // Claude 使用 Anthropic 官方 SDK；不配置 temperature，避免新 Claude 模型采样参数兼容问题。
    claude: {
      apiKey: optional("CLAUDE_API_KEY"),
      maxTokens: readOptionalPositiveInteger("CLAUDE_MAX_TOKENS", 2048),
      model: optional("CLAUDE_MODEL") || "claude-opus-4-8",
      timeoutMs: readOptionalPositiveInteger("CLAUDE_TIMEOUT_MS", 60000),
    },
  },
  stockImages: {
    pexelsApiKey: optional("PEXELS_API_KEY"),
    pixabayApiKey: optional("PIXABAY_API_KEY"),
  },
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  maxUploadBytes: maxUploadMb * 1024 * 1024,
  maxUploadMb,
  port: Number(process.env.PORT || "3000"),
  s3,
  storageDriver,
  uploadDir: path.resolve(process.cwd(), process.env.UPLOAD_DIR || "uploads"),
};
