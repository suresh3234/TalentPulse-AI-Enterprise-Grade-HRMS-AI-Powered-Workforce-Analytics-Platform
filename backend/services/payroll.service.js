const attendanceModel = require("../models/attendance.model");
const employeeModel = require("../models/employee.model");

module.exports.calculatePayroll = async (
  employeeId,
  month,
  year,
  options = {},
) => {
  const employee = await employeeModel.findById(employeeId);
  if (!employee) {
    throw new Error("Employee not found");
  }

  const parsedMonth = Number(month);
  const parsedYear = Number(year);

  if (!parsedMonth || !parsedYear || parsedMonth < 1 || parsedMonth > 12) {
    throw new Error("Invalid month or year");
  }

  const startDate = new Date(parsedYear, parsedMonth - 1, 1);
  const endDate = new Date(parsedYear, parsedMonth, 0, 23, 59, 59, 999);

  const attendance = await attendanceModel.find({
    employeeId,
    date: { $gte: startDate, $lte: endDate },
  });

  const totalDays = new Date(parsedYear, parsedMonth, 0).getDate();

  // Deduct salary only for explicit absences.
  const absentDays = attendance.filter((a) => a.status === "Absent").length;
  const paidDays = Math.max(totalDays - absentDays, 0);

  const baseSalary = Number(employee.baseSalary || 0);
  const allowances = Number(employee.allowances || 0);
  const bonus = Number(options.bonus || 0);
  const taxRate = Number(options.taxRate || 0);
  const pfRate = Number(options.pfRate || 0);
  const perDaySalary = totalDays > 0 ? baseSalary / totalDays : 0;

  const leaveDeduction = absentDays * perDaySalary;
  const taxableAmount = baseSalary + allowances + bonus;
  const tax = (taxableAmount * taxRate) / 100;
  const pf = (baseSalary * pfRate) / 100;
  const deductions = tax + pf + leaveDeduction;
  const netSalary = taxableAmount - deductions;

  return {
    baseSalary,
    allowances,
    bonus,
    tax,
    pf,
    leaveDeduction,
    deductions,
    netSalary,
    paidDays,
    absentDays,
  };
};
