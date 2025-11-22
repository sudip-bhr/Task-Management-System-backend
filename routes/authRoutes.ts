import express, { Request, Response } from "express";
import { 
    registerUser, 
    loginUser, 
    getUserProfile, 
    updateUserProfile 
} from "../controllers/authController.js";
import { protect } from "../middlewares/authMiddleware.js";
import upload from "../middlewares/uploadMiddleware.js";

const router = express.Router();

// Test route
router.get("/test", (req, res) => {
    res.json({ message: "Auth routes are working!" });
});

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/profile", protect, getUserProfile);
router.put("/profile", protect, updateUserProfile);

router.post(
  "/upload-image",
  upload.single("image"),
  (req: Request, res: Response) => {
    try {
      if (req.file) {
        const imageURL = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
        return res.status(200).json({ imageURL });
      }

      return res.status(400).json({ message: "No file uploaded" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Server error while uploading image" });
    }
  }
);

export default router;



