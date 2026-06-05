const Offboarding = require("../models/offboarding.model");
const Employee = require("../models/employee.model");
const User = require("../models/user.model");
const { createNotification } = require("./notification.controller");

const DEFAULT_OFFBOARDING_TASKS = [
  { title: "Return company laptop and equipment" },
  { title: "Revoke system access and credentials" },
  { title: "Complete knowledge transfer documentation" },
  { title: "Settle outstanding expenses and reimbursements" },
  { title: "Return ID badge and access cards" },
  { title: "Conduct exit interview" },
  { title: "Process final paycheck and benefits settlement" },
];

exports.initiateOffboarding = async (req, res, next) => {
  try {
    const { employeeId, reason, lastWorkingDate, tasks } = req.body;

    if (!employeeId || !reason || !lastWorkingDate) {
      return res.status(400).json({
        success: false,
        message: "employeeId, reason, and lastWorkingDate are required",
      });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    const existing = await Offboarding.findOne({ employee: employeeId });
    if (existing) {
      return res.status(409).json({ success: false, message: "Offboarding already initiated for this employee" });
    }

    const offboardingTasks = tasks && tasks.length > 0
      ? tasks.map((t) => ({ title: t.title, description: t.description }))
      : DEFAULT_OFFBOARDING_TASKS.map((t) => ({ ...t }));

    const offboarding = await Offboarding.create({
      employee: employeeId,
      reason,
      lastWorkingDate,
      tasks: offboardingTasks,
      initiatedBy: req.user.id,
    });

    employee.status = "Inactive";
    await employee.save();

    await createNotification({
      recipient: employee.user,
      type: "offboarding_initiated",
      title: "Offboarding Process Started",
      message: `Your offboarding has been initiated. Last working date: ${new Date(lastWorkingDate).toLocaleDateString()}.`,
      link: "/settings",
    });

    res.status(201).json({ success: true, message: "Offboarding initiated", data: offboarding });
  } catch (error) {
    next(error);
  }
};

exports.updateOffboardingStep = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const offboarding = await Offboarding.findById(id);
    if (!offboarding) {
      return res.status(404).json({ success: false, message: "Offboarding record not found" });
    }

    // Update task status if taskId provided
    if (updates.taskId && updates.taskStatus) {
      const task = offboarding.tasks.id(updates.taskId);
      if (task) {
        task.status = updates.taskStatus;
        if (updates.taskStatus === "completed") task.completedAt = new Date();
      }
    }

    // Update flags
    if (updates.exitInterviewDone !== undefined) offboarding.exitInterviewDone = updates.exitInterviewDone;
    if (updates.exitInterviewNotes) offboarding.exitInterviewNotes = updates.exitInterviewNotes;
    if (updates.assetReturned !== undefined) offboarding.assetReturned = updates.assetReturned;
    if (updates.accountDeactivated !== undefined) offboarding.accountDeactivated = updates.accountDeactivated;
    if (updates.knowledgeTransferDone !== undefined) offboarding.knowledgeTransferDone = updates.knowledgeTransferDone;

    // Check if all steps done
    const allTasksDone = offboarding.tasks.every((t) => t.status === "completed");
    if (allTasksDone && offboarding.exitInterviewDone && offboarding.assetReturned) {
      offboarding.status = "completed";

      // Deactivate user account
      if (updates.accountDeactivated) {
        const employee = await Employee.findById(offboarding.employee);
        if (employee) {
          await User.findByIdAndUpdate(employee.user, { isActive: false });
          offboarding.accountDeactivated = true;
        }
      }
    } else {
      offboarding.status = "in_progress";
    }

    await offboarding.save();

    res.json({ success: true, message: "Offboarding updated", data: offboarding });
  } catch (error) {
    next(error);
  }
};

exports.getOffboarding = async (req, res, next) => {
  try {
    const { employeeId } = req.params;

    const offboarding = await Offboarding.findOne({ employee: employeeId })
      .populate({
        path: "employee",
        select: "position department",
        populate: { path: "user", select: "fullName email" },
      })
      .populate("initiatedBy", "fullName");

    if (!offboarding) {
      return res.status(404).json({ success: false, message: "Offboarding record not found" });
    }

    res.json({ success: true, data: offboarding });
  } catch (error) {
    next(error);
  }
};

exports.getAllOffboarding = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const offboardings = await Offboarding.find(filter)
      .populate({
        path: "employee",
        select: "position department",
        populate: { path: "user", select: "fullName email" },
      })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: offboardings });
  } catch (error) {
    next(error);
  }
};
