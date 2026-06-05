const Onboarding = require("../models/onboarding.model");
const Employee = require("../models/employee.model");
const { createNotification } = require("./notification.controller");

const DEFAULT_TASKS = [
  { title: "Complete personal information form", description: "Fill in all personal details in the HR portal" },
  { title: "Submit identity documents", description: "Upload government-issued ID and address proof" },
  { title: "Set up IT accounts", description: "Configure email, Slack, and development tools" },
  { title: "Complete compliance training", description: "Watch mandatory compliance and safety videos" },
  { title: "Meet team and manager", description: "Introductory meetings with team members" },
  { title: "Review company policies", description: "Read and acknowledge the employee handbook" },
  { title: "Set up payroll and banking", description: "Provide bank details for salary deposit" },
];

exports.createOnboarding = async (req, res, next) => {
  try {
    const { employeeId, tasks, targetCompletionDate } = req.body;

    if (!employeeId) {
      return res.status(400).json({ success: false, message: "employeeId is required" });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    const existing = await Onboarding.findOne({ employee: employeeId });
    if (existing) {
      return res.status(409).json({ success: false, message: "Onboarding already exists for this employee" });
    }

    const onboardingTasks = tasks && tasks.length > 0
      ? tasks.map((t) => ({ title: t.title, description: t.description, dueDate: t.dueDate }))
      : DEFAULT_TASKS.map((t) => ({ ...t }));

    const onboarding = await Onboarding.create({
      employee: employeeId,
      tasks: onboardingTasks,
      targetCompletionDate: targetCompletionDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks default
      status: "in_progress",
      assignedBy: req.user.id,
    });

    // Set employee status to Onboarding
    employee.status = "Onboarding";
    await employee.save();

    await createNotification({
      recipient: employee.user,
      type: "onboarding_task",
      title: "Welcome! Onboarding Started",
      message: `Your onboarding has been initiated with ${onboardingTasks.length} tasks. Complete them to get started!`,
      link: "/onboarding",
    });

    res.status(201).json({ success: true, message: "Onboarding created", data: onboarding });
  } catch (error) {
    next(error);
  }
};

exports.getOnboardingStatus = async (req, res, next) => {
  try {
    const { employeeId } = req.params;

    const onboarding = await Onboarding.findOne({ employee: employeeId })
      .populate({
        path: "employee",
        select: "position department status joiningDate",
        populate: { path: "user", select: "fullName email" },
      })
      .populate("assignedBy", "fullName");

    if (!onboarding) {
      return res.status(404).json({ success: false, message: "Onboarding not found" });
    }

    res.json({ success: true, data: onboarding });
  } catch (error) {
    next(error);
  }
};

exports.updateTaskStatus = async (req, res, next) => {
  try {
    const { employeeId, taskId } = req.params;
    const { status } = req.body;

    const onboarding = await Onboarding.findOne({ employee: employeeId });
    if (!onboarding) {
      return res.status(404).json({ success: false, message: "Onboarding not found" });
    }

    const task = onboarding.tasks.id(taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    task.status = status;
    if (status === "completed") task.completedAt = new Date();

    // Recalculate completion percent
    const totalTasks = onboarding.tasks.length;
    const completedTasks = onboarding.tasks.filter((t) => t.status === "completed").length;
    onboarding.completionPercent = Math.round((completedTasks / totalTasks) * 100);

    if (onboarding.completionPercent === 100) {
      onboarding.status = "completed";
      // Update employee status back to Active
      await Employee.findByIdAndUpdate(employeeId, { status: "Active" });
    }

    await onboarding.save();

    res.json({ success: true, message: "Task updated", data: onboarding });
  } catch (error) {
    next(error);
  }
};

exports.getAllOnboarding = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const onboardings = await Onboarding.find(filter)
      .populate({
        path: "employee",
        select: "position department status",
        populate: { path: "user", select: "fullName email" },
      })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: onboardings });
  } catch (error) {
    next(error);
  }
};
