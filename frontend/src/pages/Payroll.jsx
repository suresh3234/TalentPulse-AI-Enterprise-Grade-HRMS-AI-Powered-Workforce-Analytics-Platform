import React, { useState, useEffect } from "react";
import API, { getApiErrorMessage } from "../api/axiosInstance";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Download, CheckCircle, Clock, DollarSign, Eye, Play, ShieldAlert, Sparkles, X } from "lucide-react";
import toast from "react-hot-toast";

export default function Payroll() {
  const [user] = useState(() => JSON.parse(localStorage.getItem("user") || "{}"));
  const [isAdmin] = useState(user.role === "admin" || user.role === "hr");
  const [payrolls, setPayrolls] = useState([]);
  const [myPayrolls, setMyPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  // Generate form state
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [bonus, setBonus] = useState(0);
  const [taxRate, setTaxRate] = useState(10);
  const [pfRate, setPfRate] = useState(12);

  useEffect(() => {
    fetchData();
  }, [isAdmin]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (isAdmin) {
        const res = await API.get("/payroll");
        setPayrolls(res.data?.data || []);
      } else {
        const res = await API.get("/payroll/my");
        setMyPayrolls(res.data?.data || []);
      }
    } catch (err) {
      toast.error(err.message || "Failed to load payroll details");
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePayroll = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post("/payroll/generate", {
        month: parseInt(month),
        year: parseInt(year),
        bonus: parseFloat(bonus),
        taxRate: parseFloat(taxRate),
        pfRate: parseFloat(pfRate),
      });
      toast.success(res.data?.message || "Payroll generated successfully!");
      setShowGenerateModal(false);
      fetchData();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to generate payroll"));
    }
  };

  const handleApproveAll = async () => {
    if (!window.confirm(`Are you sure you want to approve and mark all payroll as Paid for ${month}/${year}?`)) return;
    try {
      const res = await API.put("/payroll/approve", { month, year });
      toast.success(res.data?.message || "All payroll approved and paid!");
      fetchData();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to approve payroll"));
    }
  };

  const handleMarkAsPaid = async (id) => {
    try {
      await API.put(`/payroll/pay/${id}`);
      toast.success("Payroll marked as Paid!");
      fetchData();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to update payroll status"));
    }
  };

  const handleDownloadPDF = async (payslipId) => {
    try {
      const response = await API.get(`/payroll/payslip/${payslipId}/pdf`, {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `payslip_${payslipId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast.error("Failed to download PDF payslip");
    }
  };

  // Prepare chart data for payroll trend
  const chartData = payrolls.reduce((acc, pay) => {
    const key = `${pay.month}/${pay.year}`;
    const existing = acc.find((item) => item.period === key);
    if (existing) {
      existing.Total += pay.netSalary;
    } else {
      acc.push({ period: key, Total: pay.netSalary });
    }
    return acc;
  }, []).slice(-6); // Last 6 periods

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Payroll & Compensation
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isAdmin
              ? "Generate, track, and approve company-wide payroll budgets."
              : "Review your personal monthly payslips and tax deductions."}
          </p>
        </div>

        {isAdmin && (
          <div className="flex gap-2">
            <button
              onClick={handleApproveAll}
              className="inline-flex items-center gap-1.5 rounded-lg border border-transparent bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700"
            >
              <CheckCircle className="h-4 w-4" />
              Approve All
            </button>
            <button
              onClick={() => setShowGenerateModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              <Play className="h-4 w-4" />
              Run Payroll
            </button>
          </div>
        )}
      </div>

      {/* Analytics Section for Admins */}
      {isAdmin && chartData.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
            Monthly Payroll Cost Trend ($)
          </h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Total" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
        </div>
      ) : isAdmin ? (
        /* Admin View */
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Base Salary
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Allowances
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Deductions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Net Salary
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-800 dark:bg-gray-900">
                {payrolls.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-10 text-center text-sm text-gray-500">
                      No payroll records found. Run a new payroll cycle!
                    </td>
                  </tr>
                ) : (
                  payrolls.map((payroll) => (
                    <tr key={payroll._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {payroll.employeeId?.user?.fullName || "Employee"}
                            </div>
                            <div className="text-xs text-gray-500">
                              {payroll.employeeId?.position} • {payroll.employeeId?.department}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {payroll.month}/{payroll.year}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-white">
                        ${payroll.baseSalary.toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-white">
                        ${((payroll.allowances?.meal || 0) + (payroll.allowances?.transport || 0)).toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-red-600">
                        -${((payroll.tax || 0) + (payroll.pf || 0)).toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">
                        ${payroll.netSalary.toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            payroll.status === "Paid"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/35 dark:text-green-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-900/35 dark:text-amber-300"
                          }`}
                        >
                          {payroll.status === "Paid" ? (
                            <CheckCircle className="h-3 w-3" />
                          ) : (
                            <Clock className="h-3 w-3" />
                          )}
                          {payroll.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setSelectedPayslip(payroll)}
                            className="text-gray-600 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-white"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDownloadPDF(payroll._id)}
                            className="text-gray-600 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-white"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          {payroll.status !== "Paid" && (
                            <button
                              onClick={() => handleMarkAsPaid(payroll._id)}
                              className="text-emerald-600 hover:text-emerald-700"
                            >
                              Pay
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Employee Self-Service View */
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {myPayrolls.length === 0 ? (
            <div className="col-span-full rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
              No payslip records available yet.
            </div>
          ) : (
            myPayrolls.map((payroll) => (
              <div
                key={payroll._id}
                className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Payslip for {payroll.month}/{payroll.year}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Paid: {new Date(payroll.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      payroll.status === "Paid"
                        ? "bg-green-100 text-green-800 dark:bg-green-900/35 dark:text-green-300"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-900/35 dark:text-amber-300"
                    }`}
                  >
                    {payroll.status}
                  </span>
                </div>

                <div className="my-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Base Salary</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      ${payroll.baseSalary.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Allowances</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      ${((payroll.allowances?.meal || 0) + (payroll.allowances?.transport || 0)).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Deductions</span>
                    <span className="font-medium text-red-600">
                      -${((payroll.tax || 0) + (payroll.pf || 0)).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-semibold dark:border-gray-800">
                    <span className="text-gray-900 dark:text-white">Net Payable</span>
                    <span className="text-indigo-600 dark:text-indigo-400">
                      ${payroll.netSalary.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedPayslip(payroll)}
                    className="flex-1 rounded-lg bg-gray-50 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => handleDownloadPDF(payroll._id)}
                    className="inline-flex items-center justify-center rounded-lg bg-indigo-50 p-2 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-400"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Generate Payroll Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Run Payroll Cycle</h3>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleGeneratePayroll} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase">Month</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase">Year</label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase">Standard Bonus ($)</label>
                <input
                  type="number"
                  value={bonus}
                  onChange={(e) => setBonus(e.target.value)}
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase">Tax Rate (%)</label>
                  <input
                    type="number"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase">PF Rate (%)</label>
                  <input
                    type="number"
                    value={pfRate}
                    onChange={(e) => setPfRate(e.target.value)}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-indigo-600 py-2 text-center text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Generate Company Payroll
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Payslip Details Modal */}
      {selectedPayslip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-600" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Payslip Details
                </h3>
              </div>
              <button
                onClick={() => setSelectedPayslip(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 rounded-xl bg-gray-50 p-4 dark:bg-gray-800/40">
                <div>
                  <p className="text-xs text-gray-500">EMPLOYEE NAME</p>
                  <p className="font-semibold text-gray-950 dark:text-white">
                    {selectedPayslip.employeeId?.user?.fullName || "Employee"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">PAY PERIOD</p>
                  <p className="font-semibold text-gray-950 dark:text-white">
                    {selectedPayslip.month}/{selectedPayslip.year}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">DEPARTMENT</p>
                  <p className="font-semibold text-gray-950 dark:text-white">
                    {selectedPayslip.employeeId?.department || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">STATUS</p>
                  <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {selectedPayslip.status}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 dark:text-white border-b border-gray-100 pb-1">
                  Earnings & Allowances
                </h4>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Base Salary</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    ${selectedPayslip.baseSalary.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Meal Allowance</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    ${(selectedPayslip.allowances?.meal || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Transport Allowance</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    ${(selectedPayslip.allowances?.transport || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Bonus</span>
                  <span className="font-medium text-emerald-600">
                    +${(selectedPayslip.bonus || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 dark:text-white border-b border-gray-100 pb-1">
                  Taxes & Contributions
                </h4>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Taxes ({selectedPayslip.taxRate || 10}%)</span>
                  <span className="font-medium text-red-600">
                    -${(selectedPayslip.tax || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Provident Fund ({selectedPayslip.pfRate || 12}%)</span>
                  <span className="font-medium text-red-600">
                    -${(selectedPayslip.pf || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-gray-150 pt-4 dark:border-gray-800">
                <div>
                  <p className="text-xs text-gray-500">TOTAL NET PAYABLE</p>
                  <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                    ${selectedPayslip.netSalary.toLocaleString()}
                  </p>
                </div>

                <button
                  onClick={() => handleDownloadPDF(selectedPayslip._id)}
                  className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
