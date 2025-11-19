import express from "express";
import * as AuthController from "../controllers/authController";
const router = express.Router();

router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.post("/request-reset", AuthController.requestReset);
router.post("/reset", AuthController.resetPassword);

export default router;
