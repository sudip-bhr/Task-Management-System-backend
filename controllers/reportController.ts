import Task from "../models/Task";
import User from "../models/User";
import excelJS from "exceljs";
import { Writable } from "stream";
import { Request, Response } from "express";



//@desc     Export all tasks as an Excel file
//@route    GET /api/reports/export/tasks
//@access   Private (Admin)
export const exportTasksReport = async (req: Request, res: Response): Promise<void>=>{
    try{
        const tasks = await Task.find().populate("assignedTo", "name email");

        const workbook = new excelJS.Workbook();
        const worksheet = workbook.addWorksheet("Tasks Report");

        worksheet.columns = [
            { header: "Task ID", key: "_id", width:25},
            { header: "Title", key: "title", width:30},
            { header: "Description", key: "description", width:50},
            { header: "Priority", key: "priority", width:15},
            { header: "Status", key: "status", width:20},
            { header: "Due Date", key: "dueDate", width:20},
            { header: "Assigned To", key: "assignedTo", width:30},
        ];

        tasks.forEach((task:any)=>{
            const assignedTo = Array.isArray(task.assignedTo) && task.assignedTo.length>0? task.assignedTo.map((user:any) => `${user.name}(${user.email})`).join(", "): "Unassigned";
            
            worksheet.addRow({
                _id: task._id,
                title: task.title,
                description: task.description,
                priority: task.priority,
                status: task.status,
                dueDate: task.dueDate?task.dueDate.toISOString().split("T")[0]:"N/A",
                assignedTo,
            });
        });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="tasks_report.xlsx"'
    );
    await workbook.xlsx.write(res as unknown as Writable);
res.end();
  } catch (error: unknown) {
    if (error instanceof Error) {
      res.status(500).json({ message: "Server Error", error: error.message });
    } else {
      res.status(500).json({ message: "Server Error", error: String(error) });
    }
  }
};

//@desc     Export user-task report as an Excel file
//@route    GET /api/reports/export/users
//@access   Private (Admin)
export const exportUsersReport = async (req: Request, res: Response): Promise<void>=>{
    try{
        const users = await User.find().select("name email _id").lean();
        const userTasks = await Task.find().populate(
            "assignedTo",
            "name email _id"
        );

        const userTaskMap: Record<string, any> = {};
        users.forEach((user) =>{
            userTaskMap[user._id.toString()] ={
                name: user.name,
                email: user.email,
                taskCount: 0,
                pendingTasks:0,
                inProgressTasks:0,
                completedTasks: 0,
            };
        });

        userTasks.forEach((task)=>{
            if(task.assignedTo){
                task.assignedTo.forEach(( assignedUser:any) =>{
                    if(userTaskMap[assignedUser._id]){
                        userTaskMap[assignedUser._id].taskCount +=1;
                        if (task.status === "Pending"){
                            userTaskMap[assignedUser._id].pendingTasks +=1;
                        }else if (task.status === "In Progress"){
                            userTaskMap[assignedUser._id].inProgressTasks +=1;
                    }else if (task.status === "Completed"){
                            userTaskMap[assignedUser._id].completedTasks +=1;
                }
            }
        });
    }
    });

    const workbook = new excelJS.Workbook();
        const worksheet = workbook.addWorksheet("User Task Report");

        worksheet.columns = [
            { header: "User Name", key: "name", width:30},
            { header: "Email", key: "email", width:40},
            { header: "Total Assigned Tasks", key: "taskCount", width:20},
            { header: "Pending Tasks", key: "pendingTasks", width:20},
            { header: "In Progress Tasks", key: "inProgressTasks", width:20},
            { header: "Completed Tasks", key: "completedTasks", width:20},
            { header: "Assigned To", key: "assignedTo", width:30},
        ];
        Object.values(userTaskMap).forEach((user) =>{
            worksheet.addRow(user);
        });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="users_report.xlsx"'
    );

  } catch (error: unknown) {
    if (error instanceof Error) {
      res.status(500).json({ message: "Server Error", error: error.message });
    } else {
      res.status(500).json({ message: "Server Error", error: String(error) });
    }
  }
};

export default { exportTasksReport, exportUsersReport};
