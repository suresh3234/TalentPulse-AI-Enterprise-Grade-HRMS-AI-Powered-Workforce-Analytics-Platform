const Benefit = require("../models/benefit.model");

exports.getEmployeeBenefits = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    let benefit = await Benefit.findOne({ employee: employeeId })
      .populate({
        path: "employee",
        select: "position department",
        populate: { path: "user", select: "fullName email" },
      })
      .populate("updatedBy", "fullName");

    if (!benefit) {
      // Return default empty benefits structure
      return res.json({
        success: true,
        data: {
          employee: employeeId,
          healthInsurance: false,
          lifeInsurance: false,
          providentFund: true,
          gratuity: false,
          stockOptions: false,
          transportAllowance: 0,
          mealAllowance: 0,
          housingAllowance: 0,
          customPerks: [],
          plan: "basic",
        },
      });
    }

    res.json({ success: true, data: benefit });
  } catch (error) {
    next(error);
  }
};

exports.updateBenefits = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const updateData = { ...req.body, updatedBy: req.user.id };

    const benefit = await Benefit.findOneAndUpdate(
      { employee: employeeId },
      { ...updateData, employee: employeeId },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({ success: true, message: "Benefits updated", data: benefit });
  } catch (error) {
    next(error);
  }
};

exports.getCompanyBenefitsSummary = async (req, res, next) => {
  try {
    const total = await Benefit.countDocuments();
    const byPlan = await Benefit.aggregate([
      { $group: { _id: "$plan", count: { $sum: 1 } } },
    ]);
    const withHealth = await Benefit.countDocuments({ healthInsurance: true });
    const withLife = await Benefit.countDocuments({ lifeInsurance: true });
    const withStock = await Benefit.countDocuments({ stockOptions: true });

    res.json({
      success: true,
      data: {
        totalEnrolled: total,
        byPlan,
        healthInsuranceCount: withHealth,
        lifeInsuranceCount: withLife,
        stockOptionsCount: withStock,
      },
    });
  } catch (error) {
    next(error);
  }
};
