import express from "express";
import { adminOnly, protect } from "../middlewares/authMiddleware";
import { getUserById, getUsers } from "../controllers/userController";

const router = express.Router();

router.get("/", protect, adminOnly, getUsers);  //Get all users (admin only)
router.get("/:id", protect, getUserById); //Get a specific user

export default router;