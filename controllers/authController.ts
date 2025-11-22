import User from "../models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { CONFIG } from '../config/constants';

const JWT_SECRET = CONFIG.JWT_SECRET || "fallback-secret-change-in-production";

const generateToken = (userId: string) => {
    return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: "7d" });
};

// @desc     Register NEW user
// @route    POST /api/auth/register
// @access   Public
const registerUser = async (req: any, res: any) => {
    try {
        const { name, email, password, profileImageURL, adminInviteToken } = req.body;

        // Check if user exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: "User already exists" });
        }

        //Determine user role: Admin if correct token is provided, otherwise Member
        let role = "member";
        if (
            adminInviteToken && adminInviteToken == CONFIG.ADMIN_INVITE_TOKEN
        ){
            role = "admin";
        }

        // Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);


        // Create user
        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            profileImageURL,
            role,
        });

        // Return user data with JWT
        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            profileImageURL: user.profileImageURL,
            token: generateToken(user._id.toString()),
        });
    } catch (error: any) {
        res.status(400).json({ message: "Server error", error:error.message });
    }
};

// @desc     Login user
// @route    POST /api/auth/login
// @access   Public
const loginUser = async (req: any, res: any) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (user && (await bcrypt.compare(password, user.password))) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                token: generateToken(user._id.toString()),
            });
        } else {
            res.status(401).json({ message: "Invalid email or password" });
        }
    } catch (error: any) {
        res.status(400).json({ message: "Server error",error: error.message });
    }
};

// @desc     GET user profile
// @route    GET /api/auth/profile
// @access   Private (Requires JWT)
const getUserProfile = async (req: any, res: any) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ message: "User not found" });
        }
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

// @desc     Update user profile
// @route    PUT /api/auth/profile
// @access   Private (Requires JWT)
const updateUserProfile = async (req: any, res: any) => {
    try {
        const user = await User.findById(req.user.id);

        if (user) {
            user.name = req.body.name || user.name;
            user.email = req.body.email || user.email;

            if (req.body.password) {
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(req.body.password, salt);
            }

            const updatedUser = await user.save();

            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
                token: generateToken(updatedUser._id.toString()),
            });
        } else {
            res.status(404).json({ message: "User not found" });
        }
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export { registerUser, loginUser, getUserProfile, updateUserProfile };