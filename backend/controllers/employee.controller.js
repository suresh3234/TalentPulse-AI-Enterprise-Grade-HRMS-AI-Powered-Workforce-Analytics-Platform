const Employee = require("../models/employee.model");
const Document = require("../models/document.model");
const { validationResult } = require("express-validator");

// ✅ CREATE
exports.createEmployee = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: "Validation Error", data: errors.array() });
    }

    const { user, position, baseSalary, allowances, department, joiningDate, role } = req.body;

    const employee = new Employee({
      user,
      position,
      baseSalary: baseSalary || 0,
      allowances: allowances || 0,
      department,
      joiningDate: joiningDate || new Date(),
      role,
    });

    await employee.save();
    const populated = await employee.populate("user", "fullName email");

    res.status(201).json({
      success: true,
      message: "Employee created successfully",
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

// ✅ UPDATE
exports.updateEmployee = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: "Validation Error", data: errors.array() });
    }

    const updated = await Employee.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate("user", "fullName email");

    if (!updated) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    res.json({
      success: true,
      message: "Employee updated successfully",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// ✅ DELETE
exports.deleteEmployee = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: "Validation Error", data: errors.array() });
    }

    const deleted = await Employee.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    res.json({
      success: true,
      message: "Employee deleted successfully",
      data: deleted,
    });
  } catch (error) {
    next(error);
  }
};

// ✅ GET ALL (Optimized with pagination and lean)
exports.getAllEmployees = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, department, status, role } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (department) filter.department = department;
    if (status) filter.status = status;
    if (role) filter.role = role;

    const employees = await Employee.find(filter)
      .populate("user", "fullName email")
      .lean()
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Employee.countDocuments(filter);

    res.json({
      success: true,
      message: "Employees retrieved successfully",
      data: employees,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (error) {
    next(error);
  }
};

// ✅ GET BY ID
exports.getEmployeeById = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id).populate("user", "fullName email");

    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    res.json({
      success: true,
      message: "Employee retrieved successfully",
      data: employee,
    });
  } catch (error) {
    next(error);
  }
};

// ✅ STATS
exports.getEmployeeStats = async (req, res, next) => {
  try {
    const total = await Employee.countDocuments();
    const byDepartment = await Employee.aggregate([{ $group: { _id: "$department", count: { $sum: 1 } } }]);
    const byStatus = await Employee.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);

    res.json({
      success: true,
      message: "Employee statistics retrieved successfully",
      data: {
        totalEmployees: total,
        byDepartment,
        byStatus,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ✅ GET ORG CHART
exports.getOrgChart = async (req, res, next) => {
  try {
    const employees = await Employee.find()
      .populate("user", "fullName email")
      .populate({
        path: "reportsTo",
        populate: { path: "user", select: "fullName" }
      })
      .lean();

    const flatData = employees.map(emp => ({
      id: emp._id.toString(),
      name: emp.user?.fullName || "Unknown",
      email: emp.user?.email || "",
      position: emp.position || "",
      department: emp.department || "",
      reportsTo: emp.reportsTo ? emp.reportsTo._id.toString() : null,
      reportsToName: emp.reportsTo?.user?.fullName || null
    }));

    const tree = [];
    const idToNode = {};

    flatData.forEach(item => {
      idToNode[item.id] = { ...item, children: [] };
    });

    flatData.forEach(item => {
      const node = idToNode[item.id];
      if (item.reportsTo && idToNode[item.reportsTo]) {
        idToNode[item.reportsTo].children.push(node);
      } else {
        tree.push(node);
      }
    });

    res.json({
      success: true,
      message: "Org chart retrieved successfully",
      data: {
        flat: flatData,
        tree: tree
      }
    });
  } catch (error) {
    next(error);
  }
};

// ✅ UPLOAD DOCUMENT
exports.uploadEmployeeDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { category = "Other" } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    const newDoc = await Document.create({
      employee: employee._id,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      filePath: req.file.path,
      uploadedBy: req.user.id || req.user._id,
      category,
    });

    res.status(201).json({
      success: true,
      message: "Document uploaded successfully",
      data: newDoc
    });
  } catch (error) {
    next(error);
  }
};

// ✅ GET DOCUMENTS
exports.getEmployeeDocuments = async (req, res, next) => {
  try {
    const { id } = req.params;
    const documents = await Document.find({ employee: id });

    res.json({
      success: true,
      message: "Documents retrieved successfully",
      data: documents
    });
  } catch (error) {
    next(error);
  }
};