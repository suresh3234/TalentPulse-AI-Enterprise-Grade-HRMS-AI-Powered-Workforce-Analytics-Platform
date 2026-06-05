const Training = require("../models/training.model");
const Employee = require("../models/employee.model");
const { createNotification } = require("./notification.controller");

exports.getAllTrainings = async (req, res, next) => {
  try {
    const { category, status, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    const filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;

    const trainings = await Training.find(filter)
      .populate("createdBy", "fullName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Training.countDocuments(filter);

    res.json({ success: true, data: trainings, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (error) {
    next(error);
  }
};

exports.createTraining = async (req, res, next) => {
  try {
    const { title, description, category, duration, dueDate, maxEnrollment, tags } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: "Title is required" });
    }

    const training = await Training.create({
      title,
      description,
      category,
      duration,
      dueDate,
      maxEnrollment,
      tags,
      createdBy: req.user.id,
    });

    res.status(201).json({ success: true, message: "Training created", data: training });
  } catch (error) {
    next(error);
  }
};

exports.enrollEmployee = async (req, res, next) => {
  try {
    const training = await Training.findById(req.params.id);
    if (!training) {
      return res.status(404).json({ success: false, message: "Training not found" });
    }

    const { employeeId } = req.body;
    if (!employeeId) {
      return res.status(400).json({ success: false, message: "employeeId is required" });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    if (training.enrolledEmployees.includes(employeeId)) {
      return res.status(409).json({ success: false, message: "Employee already enrolled" });
    }

    if (training.enrolledEmployees.length >= training.maxEnrollment) {
      return res.status(400).json({ success: false, message: "Training is at max enrollment capacity" });
    }

    training.enrolledEmployees.push(employeeId);
    await training.save();

    await createNotification({
      recipient: employee.user,
      type: "training_assigned",
      title: "Training Assigned",
      message: `You have been enrolled in: "${training.title}"`,
      link: "/training",
    });

    res.json({ success: true, message: "Employee enrolled", data: training });
  } catch (error) {
    next(error);
  }
};

exports.markCompleted = async (req, res, next) => {
  try {
    const training = await Training.findById(req.params.id);
    if (!training) {
      return res.status(404).json({ success: false, message: "Training not found" });
    }

    const { employeeId, score } = req.body;
    if (!employeeId) {
      return res.status(400).json({ success: false, message: "employeeId is required" });
    }

    const alreadyCompleted = training.completedBy.find(
      (c) => c.employee.toString() === employeeId
    );

    if (alreadyCompleted) {
      return res.status(409).json({ success: false, message: "Already marked as completed" });
    }

    training.completedBy.push({ employee: employeeId, score });
    await training.save();

    const employee = await Employee.findById(employeeId);
    if (employee) {
      await createNotification({
        recipient: employee.user,
        type: "training_completed",
        title: "Training Completed",
        message: `Congratulations! You completed "${training.title}"${score ? ` with a score of ${score}%` : ""}.`,
        link: "/training",
      });
    }

    res.json({ success: true, message: "Training marked as completed", data: training });
  } catch (error) {
    next(error);
  }
};

exports.getMyTrainings = async (req, res, next) => {
  try {
    const { employeeId } = req.query;
    if (!employeeId) {
      return res.status(400).json({ success: false, message: "employeeId query param is required" });
    }

    const trainings = await Training.find({
      $or: [
        { enrolledEmployees: employeeId },
        { "completedBy.employee": employeeId },
      ],
    }).lean();

    const result = trainings.map((t) => {
      const completed = t.completedBy.find((c) => c.employee.toString() === employeeId);
      return {
        ...t,
        myStatus: completed ? "completed" : "enrolled",
        myScore: completed?.score || null,
        myCompletedAt: completed?.completedAt || null,
      };
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

exports.updateTraining = async (req, res, next) => {
  try {
    const training = await Training.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!training) return res.status(404).json({ success: false, message: "Training not found" });
    res.json({ success: true, message: "Training updated", data: training });
  } catch (error) {
    next(error);
  }
};

exports.deleteTraining = async (req, res, next) => {
  try {
    const training = await Training.findByIdAndDelete(req.params.id);
    if (!training) return res.status(404).json({ success: false, message: "Training not found" });
    res.json({ success: true, message: "Training deleted" });
  } catch (error) {
    next(error);
  }
};
