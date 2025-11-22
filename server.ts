import { CONFIG } from "./config/constants";
import express from "express";
import cors from "cors";
import path from "path";
import { connectDB }  from "./config/db";
import authRoutes from "./routes/authRoutes"; 
import userRoutes from "./routes/userRoutes";
import taskRoutes from "./routes/taskRoutes";
import reportRoutes from "./routes/reportRoutes";

const app = express();

// Connect Database first
connectDB();



// Middleware
app.use(express.json());

app.use(
  cors({
    origin: CONFIG.CLIENT_URI || "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);



// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/reports", reportRoutes);

// Start Server
const PORT = CONFIG.PORT;
app.listen(PORT, () => console.log(`Server running on port ${CONFIG.PORT}`));

