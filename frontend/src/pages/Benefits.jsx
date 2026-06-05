import React, { useState, useEffect } from "react";
import API, { getApiErrorMessage } from "../api/axiosInstance";
import { ShieldCheck, Heart, Plane, ShieldAlert, Award, Coffee, UserPlus, Save } from "lucide-react";
import toast from "react-hot-toast";

export default function Benefits() {
  const [user] = useState(() => JSON.parse(localStorage.getItem("user") || "{}"));
  const [isAdmin] = useState(user.role === "admin" || user.role === "hr");
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [benefits, setBenefits] = useState(null);
  const [loading, setLoading] = useState(true);

  // Benefits Edit State
  const [healthInsurance, setHealthInsurance] = useState(false);
  const [lifeInsurance, setLifeInsurance] = useState(false);
  const [pf, setPf] = useState(false);
  const [gratuity, setGratuity] = useState(false);
  const [stockOptions, setStockOptions] = useState(false);
  const [transportAllowance, setTransportAllowance] = useState(0);
  const [mealAllowance, setMealAllowance] = useState(0);

  useEffect(() => {
    if (isAdmin) {
      fetchEmployees();
    } else {
      // Find my employee ID then fetch benefits
      fetchMyBenefits();
    }
  }, [isAdmin]);

  const fetchEmployees = async () => {
    try {
      const res = await API.get("/employees/getallemployees");
      setEmployees(res.data?.data || []);
      if (res.data?.data?.length > 0) {
        const firstEmp = res.data.data[0]._id;
        setSelectedEmployeeId(firstEmp);
        fetchEmployeeBenefits(firstEmp);
      }
    } catch (err) {
      toast.error("Failed to load employee list");
    }
  };

  const fetchMyBenefits = async () => {
    setLoading(true);
    try {
      // We can query benefits directly or get my employee profile first
      const empRes = await API.get("/employees/getallemployees");
      const myEmp = empRes.data?.data?.find(emp => emp.user?._id === user.id || emp.user?.id === user.id);
      if (myEmp) {
        fetchEmployeeBenefits(myEmp._id);
      }
    } catch (err) {
      console.warn("Failed fetching benefits:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeBenefits = async (employeeId) => {
    setLoading(true);
    try {
      const res = await API.get(`/benefits/${employeeId}`);
      const data = res.data?.data || {};
      setBenefits(data);
      setHealthInsurance(data.healthInsurance || false);
      setLifeInsurance(data.lifeInsurance || false);
      setPf(data.pf || false);
      setGratuity(data.gratuity || false);
      setStockOptions(data.stockOptions || false);
      setTransportAllowance(data.transportAllowance || 0);
      setMealAllowance(data.mealAllowance || 0);
    } catch (err) {
      // If benefits profile doesn't exist, we can display empty fields to allow initialization
      setBenefits(null);
      setHealthInsurance(false);
      setLifeInsurance(false);
      setPf(false);
      setGratuity(false);
      setStockOptions(false);
      setTransportAllowance(0);
      setMealAllowance(0);
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeChange = (e) => {
    const id = e.target.value;
    setSelectedEmployeeId(id);
    fetchEmployeeBenefits(id);
  };

  const handleSaveBenefits = async (e) => {
    e.preventDefault();
    const empId = isAdmin ? selectedEmployeeId : benefits?.employee?._id;
    if (!empId) return;

    try {
      await API.post(`/benefits/${empId}`, {
        healthInsurance,
        lifeInsurance,
        pf,
        gratuity,
        stockOptions,
        transportAllowance: parseFloat(transportAllowance),
        mealAllowance: parseFloat(mealAllowance)
      });
      toast.success("Benefits plan updated successfully!");
      fetchEmployeeBenefits(empId);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to save benefits package"));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Benefits & Compensation Packages
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Review your health coverage, stock options, allowances, and statutory benefits.
          </p>
        </div>

        {isAdmin && employees.length > 0 && (
          <select
            value={selectedEmployeeId}
            onChange={handleEmployeeChange}
            className="rounded-lg border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-800 dark:text-white shadow-sm"
          >
            {employees.map((emp) => (
              <option key={emp._id} value={emp._id}>
                {emp.user?.fullName} ({emp.position})
              </option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Main Benefits Cards */}
          <div className="md:col-span-2 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-gray-150 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 flex items-center gap-4">
                <div className="rounded-full bg-red-50 p-3 text-red-600 dark:bg-red-950/40 dark:text-red-400">
                  <Heart className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Comprehensive Health Cover</h3>
                  <p className="text-xs text-gray-500">
                    {healthInsurance ? "✅ Plan Active (Family Tier)" : "❌ Not Opted In"}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-150 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 flex items-center gap-4">
                <div className="rounded-full bg-blue-50 p-3 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Group Life Insurance</h3>
                  <p className="text-xs text-gray-500">
                    {lifeInsurance ? "✅ Plan Active ($100k Coverage)" : "❌ Not Opted In"}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-150 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 flex items-center gap-4">
                <div className="rounded-full bg-emerald-50 p-3 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                  <Award className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Provident Fund (PF)</h3>
                  <p className="text-xs text-gray-500">
                    {pf ? "✅ Registered (Employer Match)" : "❌ Not Registered"}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-150 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 flex items-center gap-4">
                <div className="rounded-full bg-indigo-50 p-3 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                  <Coffee className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Stock Options (ESOPs)</h3>
                  <p className="text-xs text-gray-500">
                    {stockOptions ? "✅ Granted (Standard Vesting)" : "❌ No active grant"}
                  </p>
                </div>
              </div>
            </div>

            {/* Allowance details */}
            <div className="rounded-2xl border border-gray-150 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
                Monthly Allowance Details
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/40">
                  <p className="text-xs text-gray-500">MEAL ALLOWANCE</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    ${mealAllowance.toLocaleString()} / month
                  </p>
                </div>
                <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/40">
                  <p className="text-xs text-gray-500">TRANSPORT ALLOWANCE</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    ${transportAllowance.toLocaleString()} / month
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Admin editing form */}
          <div className="rounded-2xl border border-gray-250 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">
              {isAdmin ? "Edit Benefits Package" : "Benefits Package Overview"}
            </h3>

            <form onSubmit={handleSaveBenefits} className="space-y-4">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={healthInsurance}
                    onChange={(e) => setHealthInsurance(e.target.checked)}
                    disabled={!isAdmin}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  Health Insurance
                </label>

                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={lifeInsurance}
                    onChange={(e) => setLifeInsurance(e.target.checked)}
                    disabled={!isAdmin}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  Life Insurance
                </label>

                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={pf}
                    onChange={(e) => setPf(e.target.checked)}
                    disabled={!isAdmin}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  Provident Fund (PF)
                </label>

                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={gratuity}
                    onChange={(e) => setGratuity(e.target.checked)}
                    disabled={!isAdmin}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  Gratuity
                </label>

                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={stockOptions}
                    onChange={(e) => setStockOptions(e.target.checked)}
                    disabled={!isAdmin}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  Stock Options
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase">Meal Allowance ($)</label>
                <input
                  type="number"
                  value={mealAllowance}
                  onChange={(e) => setMealAllowance(e.target.value)}
                  disabled={!isAdmin}
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase">Transport Allowance ($)</label>
                <input
                  type="number"
                  value={transportAllowance}
                  onChange={(e) => setTransportAllowance(e.target.value)}
                  disabled={!isAdmin}
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
                />
              </div>

              {isAdmin && (
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
                >
                  <Save className="h-4 w-4" />
                  Save Plan Options
                </button>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
