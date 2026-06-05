const Performance = require("../models/performance.model");
const Goal = require("../models/goal.model");
const Employee = require("../models/employee.model");
const { createNotification } = require("./notification.controller");

// ========= GOALS =========

exports.createGoal = async (req, res, next) => {
  try {
    const { employeeId, title, description, category, targetDate, priority } = req.body;

    if (!employeeId || !title || !targetDate) {
      return res.status(400).json({ success: false, message: "employeeId, title, and targetDate are required" });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    const goal = await Goal.create({
      employee: employeeId,
      title,
      description,
      category,
      targetDate,
      priority,
      assignedBy: req.user.id,
    });

    await createNotification({
      recipient: employee.user,
      type: "goal_assigned",
      title: "New Goal Assigned",
      message: `You have been assigned a new goal: "${title}"`,
      link: "/performance",
    });

    res.status(201).json({ success: true, message: "Goal created", data: goal });
  } catch (error) {
    next(error);
  }
};

exports.getGoals = async (req, res, next) => {
  try {
    const { employeeId, status } = req.query;
    const filter = {};
    if (employeeId) filter.employee = employeeId;
    if (status) filter.status = status;

    const goals = await Goal.find(filter)
      .populate({ path: "employee", select: "position department", populate: { path: "user", select: "fullName" } })
      .populate("assignedBy", "fullName")
      .sort({ targetDate: 1 })
      .lean();

    res.json({ success: true, data: goals });
  } catch (error) {
    next(error);
  }
};

exports.updateGoal = async (req, res, next) => {
  try {
    const goal = await Goal.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

    if (!goal) {
      return res.status(404).json({ success: false, message: "Goal not found" });
    }

    res.json({ success: true, message: "Goal updated", data: goal });
  } catch (error) {
    next(error);
  }
};

exports.deleteGoal = async (req, res, next) => {
  try {
    const goal = await Goal.findByIdAndDelete(req.params.id);
    if (!goal) return res.status(404).json({ success: false, message: "Goal not found" });
    res.json({ success: true, message: "Goal deleted" });
  } catch (error) {
    next(error);
  }
};

// ========= APPRAISALS =========

exports.startAppraisalCycle = async (req, res, next) => {
  try {
    const { employeeId, period, appraisalCycle, kpis } = req.body;

    if (!employeeId || !period) {
      return res.status(400).json({ success: false, message: "employeeId and period are required" });
    }

    const existing = await Performance.findOne({ employee: employeeId, period });
    if (existing) {
      return res.status(409).json({ success: false, message: "Appraisal already exists for this period" });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    const goals = await Goal.find({ employee: employeeId });

    const performance = await Performance.create({
      employee: employeeId,
      period,
      appraisalCycle: appraisalCycle || period,
      kpis: kpis || [],
      goals: goals.map((g) => g._id),
      status: "self_review",
    });

    await createNotification({
      recipient: employee.user,
      type: "appraisal_due",
      title: "Appraisal Cycle Started",
      message: `Your appraisal for ${period} has been initiated. Please submit your self-review.`,
      link: "/performance",
    });

    res.status(201).json({ success: true, message: "Appraisal cycle started", data: performance });
  } catch (error) {
    next(error);
  }
};

exports.submitSelfReview = async (req, res, next) => {
  try {
    const { score, comments } = req.body;

    const performance = await Performance.findById(req.params.id);
    if (!performance) {
      return res.status(404).json({ success: false, message: "Appraisal not found" });
    }

    performance.selfRating = { score, comments, submittedAt: new Date() };
    performance.status = "manager_review";
    await performance.save();

    res.json({ success: true, message: "Self review submitted", data: performance });
  } catch (error) {
    next(error);
  }
};

exports.submitManagerReview = async (req, res, next) => {
  try {
    const { score, comments } = req.body;

    const performance = await Performance.findById(req.params.id).populate({
      path: "employee",
      select: "user",
    });
    if (!performance) {
      return res.status(404).json({ success: false, message: "Appraisal not found" });
    }

    performance.managerRating = {
      score,
      comments,
      reviewedBy: req.user.id,
      submittedAt: new Date(),
    };

    // Calculate overall score (50% self + 50% manager)
    const selfScore = performance.selfRating?.score || 0;
    const mgrScore = score || 0;
    const overall = ((selfScore + mgrScore) / 2) * 20; // convert 1-5 scale to 0-100
    performance.overallScore = Math.round(overall);

    // Assign band
    if (overall >= 90) performance.band = "Outstanding";
    else if (overall >= 75) performance.band = "Exceeds Expectations";
    else if (overall >= 60) performance.band = "Meets Expectations";
    else if (overall >= 40) performance.band = "Needs Improvement";
    else performance.band = "Unsatisfactory";

    performance.status = "completed";
    await performance.save();

    if (performance.employee?.user) {
      await createNotification({
        recipient: performance.employee.user,
        type: "appraisal_completed",
        title: "Appraisal Completed",
        message: `Your appraisal for ${performance.period} has been completed. Overall score: ${performance.overallScore}%.`,
        link: "/performance",
      });
    }

    res.json({ success: true, message: "Manager review submitted", data: performance });
  } catch (error) {
    next(error);
  }
};

exports.getAppraisals = async (req, res, next) => {
  try {
    const { employeeId, status, period } = req.query;
    const filter = {};
    if (employeeId) filter.employee = employeeId;
    if (status) filter.status = status;
    if (period) filter.period = period;

    const appraisals = await Performance.find(filter)
      .populate({
        path: "employee",
        select: "position department",
        populate: { path: "user", select: "fullName email" },
      })
      .populate("goals")
      .populate("managerRating.reviewedBy", "fullName")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: appraisals });
  } catch (error) {
    next(error);
  }
};

exports.getAppraisalById = async (req, res, next) => {
  try {
    const appraisal = await Performance.findById(req.params.id)
      .populate({
        path: "employee",
        select: "position department",
        populate: { path: "user", select: "fullName email" },
      })
      .populate("goals")
      .populate("managerRating.reviewedBy", "fullName");

    if (!appraisal) {
      return res.status(404).json({ success: false, message: "Appraisal not found" });
    }

    res.json({ success: true, data: appraisal });
  } catch (error) {
    next(error);
  }
};
