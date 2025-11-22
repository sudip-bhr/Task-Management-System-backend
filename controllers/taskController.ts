import { Request, Response } from "express";
import Task from "../models/Task";

//@desc     Get all tasks (Admin: all, Users: only assigned tasks)
//@route    Get /api/tasks/
//@access   Private
export const getTasks = async (req: Request, res: Response): Promise<void>=>{
    try{
        const status  = req.query.status as | "Pending"
        | "In Progress"
        | "Completed"
        | undefined;
        
        const filter: Partial<{
            status : "Pending" | "In Progress" |"Completed";
        }> = {};
        if (status){
            filter.status = status;
        }

        let tasks;

        if (req.body.user.role === "admin"){
            tasks = await Task.find(filter).populate(
                "assignedTo",
                "name email profileImageUrl"
            );
        }else{
            tasks = await Task.find({ ...filter, assignedTo: req.body.user._id}).populate(
                "assignedTo",
                "name, email profileImageUrl"
            );
        }

        //Add complete todoChecklist count to each task
        tasks = await Promise.all(
            tasks.map(async (task)=>{
                const completeCount = task.todoChecklist.filter(
                    (item)=> item.completed
                ).length;
                return{ ...task.toObject(), completeTodoCount: completeCount};
            })
        );

        //Status summary counts
        const allTasks = await Task.countDocuments(
            req.body.user.role === "admin" ? {} : { assignedTo:req.body.user._id}
        );

        const pendingTasks = await Task.countDocuments({
            ...filter,
            status: "Pending",
            ...(req.body.user.role !== "admin" && {assignedTo: req.body.user._id})
        });

        const inProgressTasks = await Task.countDocuments({
            ...filter,
            status: "In Progress",
            ...(req.body.user.role !== "admin" && {assignedTo: req.body.user._id})
        });

        const completedTasks = await Task.countDocuments({
            ...filter,
            status: "Completed",
            ...(req.body.user.role !== "admin" && {assignedTo: req.body.user._id})
        });

        res.json({
            tasks,
            statusSummary: {
                all: allTasks,
                     pendingTasks,
                     inProgressTasks,
                     completedTasks
            },
        });

  } catch (error: unknown) {
    if (error instanceof Error) {
      res.status(500).json({ message: "Server Error", error: error.message });
    } else {
      res.status(500).json({ message: "Server Error", error: String(error) });
    }
  }
};

//@desc     Get task by ID
//@route    Get /api/tasks/:id
//@access   Private
export const getTaskById = async (req: Request, res: Response): Promise<void>=>{
    try{
        const task = await Task.findById(req.params.id).populate(
            "assignedTo",
            "name email profileImageUrl"
        );

        if (!task) {
            res.status(404).json({ message: "Task not found"});
        };
        res.json(task);
  } catch (error: unknown) {
    if (error instanceof Error) {
      res.status(500).json({ message: "Server Error", error: error.message });
    } else {
      res.status(500).json({ message: "Server Error", error: String(error) });
    }
  }
};

//@desc     Create a new task (Admin Only)
//@route    POST /api/tasks/
//@access   Private
export const createTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      title,
      description,
      priority,
      dueDate,
      assignedTo,
      attachments,
      todoChecklist,
    } = req.body;

    if (!Array.isArray(assignedTo)) {
      res
        .status(400)
        .json({ message: "assignedTo must be an array of user IDs" });
      return;
    }

    const task = await Task.create({
      title,
      description,
      priority,
      dueDate,
      assignedTo,
      createdBy: req.body.user._id,
      attachments,
      todoChecklist,
    });

    res.status(201).json({ message: "Task created successfully", task });
  } catch (error: unknown) {
    if (error instanceof Error) {
      res.status(500).json({ message: "Server Error", error: error.message });
    } else {
      res.status(500).json({ message: "Server Error", error: String(error) });
    }
  }
};

//@desc     Update Task details
//@route    PUT /api/tasks/
//@access   Private
export const updateTask = async (req: Request, res: Response): Promise<void>=>{
    try{
        const task = await Task.findById(req.params.id);

        if (!task){
            res.status(404).json({ message: "Task not found"});
            return;
        }

        task.title = req.body.title || task.title;
        task.description = req.body.description || task.description;
        task.priority = req.body.priority || task.priority;
        task.dueDate = req.body.dueDate || task.dueDate;
        task.todoChecklist = req.body.todoChecklist || task.todoChecklist;
        task.attachments = req.body.attachments || task.attachments;

        if(req.body.assignedTo){
            if (!Array.isArray(req.body.assignedTo)){
                res.status(400).json({ message: "assignedTo must be an array of user IDs"});
            }
            task.assignedTo = req.body.assignedTo;

        }
        const updatedTask = await task.save();
        res.json({ message: "Task updated succesfully", updatedTask});

  } catch (error: unknown) {
    if (error instanceof Error) {
      res.status(500).json({ message: "Server Error", error: error.message });
    } else {
      res.status(500).json({ message: "Server Error", error: String(error) });
    }
  }
};


//@desc     Delete a Task (Admin only)
//@route    DELETE /api/tasks/:id
//@access   Private
export const deleteTask = async (req: Request, res: Response): Promise<void>=>{
    try{
        const task = await Task.findById(req.params.id);
        if(!task){
            res.status(404).json({ message: "Task not found"});
            return;
        }
        await task.deleteOne();
        res.json({ message: "Task deleted successfully"});
  } catch (error: unknown) {
    if (error instanceof Error) {
      res.status(500).json({ message: "Server Error", error: error.message });
    } else {
      res.status(500).json({ message: "Server Error", error: String(error) });
    }
  }
};

//@desc     Update Task status
//@route    PUT /api/tasks/:id/status
//@access   Private
export const updateTaskStatus = async (req: Request, res: Response): Promise<void>=>{
    try{
        const task = await Task.findById(req.params.id);
        if(!task){
            res.status(403).json({ message: "Task not found"})
            return;
        }
        const isAssigned = task.assignedTo.some(
            (userId) => userId.toString() === req.body.user._id.toString()
        );

        if (!isAssigned && req.body.user.role !== "admin"){
             res.status(403).json({ message: "Not Authorized"})
             return;
        }
        task.status = req.body.status || task.status;

        if (task.status === "Completed"){
            task.todoChecklist.forEach(item => (item.completed = true));
            task.progress = 100;
        }

        await task.save();
        res.json({ message: "Task status successfully updated", task});
  } catch (error: unknown) {
    if (error instanceof Error) {
      res.status(500).json({ message: "Server Error", error: error.message });
    } else {
      res.status(500).json({ message: "Server Error", error: String(error) });
    }
  }
};

//@desc     Update Task checklist
//@route    PUT /api/tasks/:id/todo
//@access   Private
export const updateTaskChecklist = async (req: Request, res: Response): Promise<void>=>{
    try{
        const { todoChecklist } = req.body;
        const task = await Task.findById(req.params.id);

        if(!task){
            res.status(404).json({ message: "Task not found"});
            return;
        }

        if(!task.assignedTo.includes(req.body.user._id) && req.body.user.role !== "admin"){
            res.status(403).json({ message: "Not authorized to update checklist"});
        }
        task.todoChecklist = todoChecklist; //Replace with updated checklist

        //Auto-update progress based on checklist completion
        const completedCount = task.todoChecklist.filter(
            (item) => item.completed
        ).length;
        const totalItems = task.todoChecklist.length;
        task.progress = totalItems > 0 ? Math.round((completedCount / totalItems) * 100):0;

        //Auto-mark task as completed if all items are checked
        if(task.progress === 100){
            task.status = "Completed";
        }else if (task.progress > 0){
            task.status = "In Progress";
        }else{
            task.status = "Pending";
        }

        await task.save();
        const updatedTask = await Task.findById(req.params.id).populate(
            "assignedTo",
            "name email profileImageUrl"
        );

        res.json({ message: "Task checklist updated", task:updatedTask});

    }catch(error:any){
        res.status(500).json({message: "Server Error", error: error.message });
    }
};

//@desc     Dashboard Data ( Admin Only)
//@route    GET /api/tasks/dashboard-data
//@access   Private
export const getDashboardData = async (req: Request, res: Response): Promise<void>=>{
    try{
        //Fetch statistics
        const totalTasks = await Task.countDocuments();
        const pendingTasks = await Task.countDocuments({ status: "Pending"});
        const completedTasks = await Task.countDocuments({ status: "Completed"});
        const overdueTasks = await Task.countDocuments({ 
            status: {$ne: "Completed"},
            dueDate: {$lt: new Date()},
        });

        //Ensure all possible status are included
        const taskStatuses = ["Pending", "In Progress", "Completed"];
        const taskDistributionRaw = await Task.aggregate([
            {
                $group:{
                    _id: "$status",
                    count: {$sum: 1},
                },
            },
        ]);
        const taskDistribution: Record<string, number> = taskStatuses.reduce((acc, status) =>{
            const formatedKey = status.replace(/\s+/g, ""); // Remove spaces for response keys
            acc[formatedKey] = taskDistributionRaw.find((item) => item._id === status)?.count || 0;
                return acc;
        }, {} as Record<string,number>);

        taskDistribution["All"] = totalTasks; //Add total count to taskDistribution

        //Ensure all priority levels are included
        const taskPriorities = ["Low", "Medium", "High"];
        const taskPriorityLevelsRaw = await Task.aggregate([
            {
                $group:{
                    _id: "$priority",
                    count: { $sum: 1},
                },
            },
        ]);
        const taskPriorityLevels: Record<string, number> = taskPriorities.reduce((acc, priority)=>{
            acc[priority]=
                taskPriorityLevelsRaw.find((item)=> item._id === priority)?.count || 0;
                return acc;
        },{} as Record<string, number>);

        //Fetch recent 15 tasks
        const recentTasks = await Task.find().sort({ createdAt: -1}).limit(15).select("title status priority dueDate createdAt");

        res.status(200).json({
            statistics:{
                totalTasks,
                pendingTasks,
                completedTasks,
                overdueTasks,
            },
            charts:{
                taskDistribution,
                taskPriorityLevels,
            },
            recentTasks,
        });

  } catch (error: unknown) {
    if (error instanceof Error) {
      res.status(500).json({ message: "Server Error", error: error.message });
    } else {
      res.status(500).json({ message: "Server Error", error: String(error) });
    }
  }
};

//@desc     Dashboard Data ( User specific)
//@route    GET /api/tasks/user-dashboard-data
//@access   Private
export const getUserDashboardData = async (req: Request, res: Response): Promise<void>=>{
    try{
        const userId = req.body.user._id; //Only fetch data for the logged-in user

        //Fetch statistics for user-specific tasks
        const totalTasks = await Task.countDocuments({assignedTo: userId});
        const pendingTasks = await Task.countDocuments({assignedTo: userId, status: "Pending"});
        const completedTasks = await Task.countDocuments({assignedTo: userId, status: "Completed"});
        const overdueTasks = await Task.countDocuments({
            assignedTo: userId, 
            status: {$ne: "Completed"},
            dueDate: {$lt: new Date()},
        });

        //Task distribution by status
        const taskStatuses = ["Pending", "In Progress", "Completed"];
        const taskDistributionRaw = await Task.aggregate([
            
                { $match: { assignedTo: userId}},
                {$group:{
                    _id: "$status",
                    count: {$sum: 1},
                }},
        ]);
        const taskDistribution: Record<string, number> = taskStatuses.reduce((acc, status) =>{
            const formatedKey = status.replace(/\s+/g, ""); // Remove spaces for response keys
            acc[formatedKey] = taskDistributionRaw.find((item) => item._id === status)?.count || 0;
            return acc;
        }, {} as Record<string,number>);
        taskDistribution["All"] = totalTasks;

        //Task distribution by priority
        const taskPriorities = ["Low", "Medium", "High"];
        const taskPriorityLevelsRaw = await Task.aggregate([
            {$match:{ assignedTo: userId}},
            {
                $group:{
                    _id: "$priority",
                    count: { $sum: 1},
                },
            },
        ]);
        const taskPriorityLevels: Record<string, number> = taskPriorities.reduce((acc, priority)=>{
            acc[priority]=
                taskPriorityLevelsRaw.find((item)=> item._id === priority)?.count || 0;
                return acc;
        },{} as Record<string, number>);

        //Fetch recent 15 tasks for the logged-in user
        const recentTasks = await Task.find({ assignedTo: userId}).sort({ createdAt: -1}).limit(15).select("title status priority dueDate createdAt");

        res.status(200).json({
            statistics:{
                totalTasks,
                pendingTasks,
                completedTasks,
                overdueTasks,
            },
            charts:{
                taskDistribution,
                taskPriorityLevels,
            },
            recentTasks,
        });


  } catch (error: unknown) {
    if (error instanceof Error) {
      res.status(500).json({ message: "Server Error", error: error.message });
    } else {
      res.status(500).json({ message: "Server Error", error: String(error) });
    }
  }
};


export default {
    getTasks,
    getTaskById,
    createTask,
    updateTask,
    deleteTask,
    updateTaskStatus,
    updateTaskChecklist,
    getDashboardData,
    getUserDashboardData
};