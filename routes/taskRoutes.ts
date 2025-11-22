import express, { Request, Response } from "express";
import { protect, adminOnly} from "../middlewares/authMiddleware";
import {
    getTasks,
    getTaskById,
    createTask,
    updateTask,
    deleteTask,
    updateTaskStatus,
    updateTaskChecklist,
    getDashboardData,
    getUserDashboardData
} from "../controllers/taskController"
const router = express.Router();

//Task Management Routes
router.get("/dashboard/data", protect, getDashboardData);
router.get("/user-dashboard/data", protect, getUserDashboardData);
router.get("/", protect, getTasks);
router.get("/:id", protect, getTaskById);
router.post("/", protect, createTask);
router.put("/:id", protect, updateTask);
router.delete("/:id", protect, deleteTask);
router.put("/:id/status", protect, updateTaskStatus);
router.put("/:id/todo", protect, updateTaskChecklist);

export default router;