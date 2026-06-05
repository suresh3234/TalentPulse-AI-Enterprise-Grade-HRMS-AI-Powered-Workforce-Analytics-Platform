const Payroll = require("../models/payroll.model");
const Employee = require("../models/employee.model");
const { calculatePayroll } = require("../services/payroll.service");

const employeePopulate = {
  path: "employeeId",
  select: "position department baseSalary allowances user",
  populate: {
    path: "user",
    select: "fullName email",
  },
};

// Generate payroll for all employees for a specific month/year (with error recovery)
const generatePayroll = async (req, res, next) => {
  try {
    const { month, year, bonus = 0, taxRate = 10, pfRate = 12 } = req.body;
    const parsedMonth = Number(month);
    const parsedYear = Number(year);

    if (!parsedMonth || !parsedYear || parsedMonth < 1 || parsedMonth > 12) {
      return res.status(400).json({
        success: false,
        message: "Month and year are required and month must be between 1 and 12",
      });
    }

    // Check if payroll already exists for this month/year
    const existingCount = await Payroll.countDocuments({ month: parsedMonth, year: parsedYear });
    if (existingCount > 0) {
      return res.status(409).json({
        success: false,
        message: `Payroll already exists for ${parsedMonth}/${parsedYear}. Delete existing records first.`,
      });
    }

    const employees = await Employee.find().lean();
    if (employees.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No employees found to generate payroll",
      });
    }

    const payrolls = [];
    const errors = [];

    // Process payroll generation with error handling for each employee
    for (const emp of employees) {
      try {
        const data = await calculatePayroll(emp._id, parsedMonth, parsedYear, {
          bonus,
          taxRate,
          pfRate,
        });

        const payroll = await Payroll.create({
          employeeId: emp._id,
          month: parsedMonth,
          year: parsedYear,
          ...data,
          status: "Pending",
        });

        payrolls.push(payroll);
      } catch (error) {
        errors.push({ employeeId: emp._id, error: error.message });
      }
    }

    return res.status(201).json({
      success: true,
      message: `Payroll generated for ${payrolls.length} employees`,
      data: { payrolls, errors: errors.length > 0 ? errors : undefined },
    });
  } catch (error) {
    next(error);
  }
};

const getPayslip = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { employeeId, month, year } = req.query;
    let payslip;

    if (id) {
      payslip = await Payroll.findById(id).populate(employeePopulate);
    } else if (employeeId && month && year) {
      const parsedMonth = Number(month);
      const parsedYear = Number(year);

      if (!parsedMonth || !parsedYear || parsedMonth < 1 || parsedMonth > 12) {
        return res.status(400).json({
          success: false,
          message: "Month and year are required and month must be between 1 and 12",
        });
      }

      payslip = await Payroll.findOne({
        employeeId,
        month: parsedMonth,
        year: parsedYear,
      }).populate(employeePopulate);
    } else {
      return res.status(400).json({
        success: false,
        message: "Provide payroll id in params or employeeId, month, year in query",
      });
    }

    if (!payslip) {
      return res.status(404).json({ success: false, message: "Payslip not found" });
    }

    return res.json({
      success: true,
      message: "Payslip retrieved successfully",
      data: payslip,
    });
  } catch (error) {
    next(error);
  }
};

const getPayroll = async (req, res, next) => {
  try {
    const { month, year, status, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    const filter = {};

    if (month) {
      const parsedMonth = Number(month);
      if (!parsedMonth || parsedMonth < 1 || parsedMonth > 12) {
        return res.status(400).json({ success: false, message: "Invalid month" });
      }
      filter.month = parsedMonth;
    }

    if (year) {
      const parsedYear = Number(year);
      if (!parsedYear) {
        return res.status(400).json({ success: false, message: "Invalid year" });
      }
      filter.year = parsedYear;
    }

    if (status && status !== "all") {
      filter.status = status;
    }

    const payroll = await Payroll.find(filter)
      .populate(employeePopulate)
      .lean()
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Payroll.countDocuments(filter);

    return res.json({
      success: true,
      message: "Payroll records retrieved successfully",
      data: payroll,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (error) {
    next(error);
  }
};

const markAsPaid = async (req, res, next) => {
  try {
    const { id } = req.params;

    const payroll = await Payroll.findByIdAndUpdate(
      id,
      { status: "Paid" },
      { new: true, runValidators: true },
    );

    if (!payroll) {
      return res.status(404).json({ success: false, message: "Payroll record not found" });
    }

    return res.json({
      success: true,
      message: "Payroll marked as paid successfully",
      data: payroll,
    });
  } catch (error) {
    next(error);
  }
};

const approveAllPayroll = async (req, res, next) => {
  try {
    const { month, year } = req.body;
    const parsedMonth = Number(month);
    const parsedYear = Number(year);

    if (!parsedMonth || !parsedYear || parsedMonth < 1 || parsedMonth > 12) {
      return res.status(400).json({
        success: false,
        message: "Month and year are required and month must be between 1 and 12",
      });
    }

    const result = await Payroll.updateMany(
      { month: parsedMonth, year: parsedYear, status: { $ne: "Paid" } },
      { status: "Paid" },
    );

    return res.json({
      success: true,
      message: "Payroll approved successfully",
      data: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Download payslip as PDF
const downloadPayslipPDF = async (req, res, next) => {
  try {
    const { id } = req.params;
    const payslip = await Payroll.findById(id).populate(employeePopulate);
    if (!payslip) {
      return res.status(404).json({ success: false, message: "Payslip not found" });
    }

    const PDFDocument = require("pdfkit");
    const doc = new PDFDocument({ margin: 50 });

    // Set response headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=payslip_${payslip.month}_${payslip.year}_${payslip.employeeId?.user?.fullName.replace(/\s+/g, "_")}.pdf`
    );

    doc.pipe(res);

    // Header
    doc
      .fontSize(20)
      .text("HRMS ENTERPRISE PLATFORM", { align: "center" })
      .moveDown(0.5);
    doc
      .fontSize(14)
      .text("OFFICIAL PAYSLIP", { align: "center" })
      .moveDown(1.5);

    // Meta details
    const employeeName = payslip.employeeId?.user?.fullName || "Employee";
    const employeeEmail = payslip.employeeId?.user?.email || "N/A";
    const dept = payslip.employeeId?.department || "N/A";
    const pos = payslip.employeeId?.position || "N/A";

    doc.fontSize(10);
    doc.text(`Employee Name: ${employeeName}`);
    doc.text(`Email: ${employeeEmail}`);
    doc.text(`Department: ${dept}`);
    doc.text(`Position: ${pos}`);
    doc.text(`Pay Period: ${payslip.month}/${payslip.year}`);
    doc.text(`Status: ${payslip.status}`);
    doc.moveDown(1.5);

    // Draw horizontal line
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(1);

    // Calculations table
    doc.fontSize(12).text("Earnings & Allowances", { underline: true }).moveDown(0.5);
    doc.fontSize(10);
    doc.text(`Base Salary: $${payslip.baseSalary || 0}`);
    doc.text(`Meal Allowance: $${payslip.allowances?.meal || 0}`);
    doc.text(`Transport Allowance: $${payslip.allowances?.transport || 0}`);
    doc.text(`Bonus: $${payslip.bonus || 0}`);
    doc.moveDown(1);

    doc.fontSize(12).text("Deductions & Taxes", { underline: true }).moveDown(0.5);
    doc.fontSize(10);
    doc.text(`Tax Deducted: $${payslip.tax || 0} (${payslip.taxRate || 10}%)`);
    doc.text(`PF Contribution: $${payslip.pf || 0} (${payslip.pfRate || 12}%)`);
    doc.moveDown(1.5);

    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(1);

    // Summary
    doc.fontSize(14).text(`Net Payable Salary: $${payslip.netSalary || 0}`, { bold: true });
    doc.moveDown(2);

    // Footer signature
    doc.fontSize(9).text("This is a system generated document. No signature is required.", { align: "center", color: "grey" });

    doc.end();
  } catch (error) {
    next(error);
  }
};

// Get employee's own payroll history
const getMyPayroll = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({ user: req.user._id || req.user.id });
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee profile not found for this user" });
    }

    const { page = 1, limit = 12 } = req.query;
    const skip = (page - 1) * limit;

    const payrolls = await Payroll.find({ employeeId: employee._id })
      .populate(employeePopulate)
      .lean()
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ year: -1, month: -1 });

    const total = await Payroll.countDocuments({ employeeId: employee._id });

    return res.json({
      success: true,
      message: "My payroll history retrieved successfully",
      data: payrolls,
      pagination: { page: parseInt(page), limit: parseInt(limit), total }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generatePayroll,
  getPayroll,
  getPayslip,
  markAsPaid,
  approveAllPayroll,
  downloadPayslipPDF,
  getMyPayroll,
};
