import type { NextFunction, Request, Response } from "express";
import fs from "fs";
import path from "path";
import { env } from "../config.js";

// 动态引入 sharp，防止因为平台二进制加载失败导致整个应用崩溃
let sharpInstance: any = null;
let sharpLoadTried = false;

async function getSharp() {
  if (sharpLoadTried) return sharpInstance;
  sharpLoadTried = true;
  try {
    const mod = await import("sharp");
    sharpInstance = mod.default || mod;
  } catch (err) {
    console.error("Failed to load sharp module:", err);
  }
  return sharpInstance;
}

const ALLOWED_WIDTHS = [120, 240, 360, 480, 720, 1080];
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".tiff", ".gif"];

export async function thumbnailMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.method !== "GET") {
    return next();
  }

  const w = req.query.w || req.query.width;
  if (!w) {
    return next();
  }

  const width = parseInt(w as string, 10);
  if (isNaN(width) || width <= 0) {
    return next();
  }

  // 防止路径穿透漏洞
  const cleanPath = path.normalize(req.path).replace(/^(\.\.(\/|\\|$))+/, "");
  const originalPath = path.join(env.uploadDir, cleanPath);

  // 安全检查：确保文件仍然在 uploads 目录下
  if (!originalPath.startsWith(env.uploadDir)) {
    return res.status(403).json({ message: "Access denied" });
  }

  const ext = path.extname(originalPath).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return next();
  }

  try {
    if (!fs.existsSync(originalPath)) {
      return next();
    }

    const sharp = await getSharp();
    if (!sharp) {
      console.warn("Sharp module is not available. Serving original file.");
      return next();
    }

    // 匹配最接近的限制宽度，防止缓存被恶意刷爆
    const targetWidth = ALLOWED_WIDTHS.reduce((prev, curr) =>
      Math.abs(curr - width) < Math.abs(prev - width) ? curr : prev
    );

    // 缓存路径：uploads/.cache/w_720/users/...
    const cachePath = path.join(env.uploadDir, ".cache", `w_${targetWidth}`, cleanPath);
    const originalStat = await fs.promises.stat(originalPath);

    // 自动创建缓存子目录
    const cacheDir = path.dirname(cachePath);
    if (!fs.existsSync(cacheDir)) {
      await fs.promises.mkdir(cacheDir, { recursive: true });
    }

    // 检查缓存文件是否存在，并且比原图更新
    if (fs.existsSync(cachePath)) {
      const cacheStat = await fs.promises.stat(cachePath);
      if (cacheStat.mtimeMs >= originalStat.mtimeMs) {
        return res.sendFile(cachePath);
      }
    }

    // 使用 sharp 缩放并输出到缓存文件
    await sharp(originalPath)
      .resize({ width: targetWidth, withoutEnlargement: true })
      .toFile(cachePath);

    return res.sendFile(cachePath);
  } catch (error) {
    console.error("Failed to generate thumbnail for", originalPath, ":", error);
    return next(); // 降级返回原图
  }
}
