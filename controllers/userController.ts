import { Request, Response } from "express";
import Task from "../models/Task";
import User from "../models/User";
import bcrypt from "bcryptjs";

//@desc     Get all users (Admin Only)
//@route    Get /api/users/
//@access   Private (admin)
export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await User.find({ role: "member" }).select("-password");

    const usersWithTaskCounts = await Promise.all(
      users.map(async (user) => {
        const userObj = user.toObject();

        const pendingTasks = await Task.countDocuments({
          assignedTo: user._id,
          status: "Pending",
        });

        const inProgressTasks = await Task.countDocuments({
          assignedTo: user._id,
          status: "In Progress",
        });

        const completedTasks = await Task.countDocuments({
          assignedTo: user._id,
          status: "Completed",
        });

        return {
          ...userObj,
          pendingTasks,
          inProgressTasks,
          completedTasks,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: usersWithTaskCounts.length,
      users: usersWithTaskCounts,
    });
  } catch (error: any) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


//@desc     Get user by ID
//@route    Get /api/users/:id
//@access   Private
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      res.status(404).json({ message: "User not found" });
      res.json(user);
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error: any) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};



export default { getUsers, getUserById};