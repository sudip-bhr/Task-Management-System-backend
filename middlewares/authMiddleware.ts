import jwt from "jsonwebtoken";
import User from "../models/User";
import { CONFIG } from '../config/constants';


const JWT_SECRET = CONFIG.JWT_SECRET || "fallback-secret-change-in-production";

const protect = async (req: any, res: any, next: any) => {
    try {
        let token = req.headers.authorization;

        if (token && token.startsWith("Bearer ")) {
            token = token.split(" ")[1];
            const decoded: any = jwt.verify(token, JWT_SECRET);
            req.user = await User.findById(decoded.id).select("-password");
            next();
        } else {
            res.status(401).json({ message: "Not authorized, no token" });
        }
    } catch (error: any) {
        res.status(401).json({ message: "Token failed", error: error.message });
    }
};

// Middleware for Admin-only access
const adminOnly = (req: any, res: any, next: any) => {
    if (req.user && req.user.role === "admin") {
        next();
    } else {
        res.status(403).json({ message: "Access denied, admin only" });
    }
};

export { protect, adminOnly };