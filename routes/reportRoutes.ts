import express, { Request, Response } from "express";
import { protect, adminOnly } from "../middlewares/authMiddleware";
import { exportTasksReport, exportUsersReport } from "../controllers/reportController";



const router = express.Router();

router.get("/export/tasks", protect, adminOnly, exportTasksReport); //Export all tasks as Excel/PDF
router.get("/export/users", protect, adminOnly, exportUsersReport); //Export user-task report

export default router;