import type { NextFunction, Request, Response } from "express";
import type { User } from "@prisma/client";
import jwt from "jsonwebtoken";
import { env } from "../config.js";
import { prisma } from "../db.js";

export type AuthenticatedRequest = Request & {
  user: User;
};

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret) as { id: string };
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    (req as AuthenticatedRequest).user = user;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
}
