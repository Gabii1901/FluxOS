import { Router } from "express";
import * as authController from "../controllers/authController";
import { asyncHandler } from "../middlewares/asyncHandler";
import { requireAuth } from "../middlewares/requireAuth";

export const authRoutes = Router();

authRoutes.post("/login", asyncHandler(authController.login));
authRoutes.get("/me", requireAuth, asyncHandler(authController.me));
