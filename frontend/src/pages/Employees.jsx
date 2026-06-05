import { useState, useEffect, useCallback, useRef } from "react";
import { UserPlus, LayoutGrid, List, Pencil, Trash2, Users, PlaneTakeoff, Rocket, FileText, Upload, Download, FileArchive, X, Mail } from "lucide-react";
import Card from "../components/Card";
import toast from "react-hot-toast";
import {
  createEmployee,
  deleteEmployee,
  getEmployees,
  getUsers,
  updateEmployee,
  getEmployeeDocuments,
  uploadEmployeeDocument
} from "../api/employeeService";
import { registerUser } from "../api/authService";

const statusConfig = {
  Active: "bg-emerald-100 text-emerald-700 font-semibold",
  "On Leave": "bg-blue-100 text-blue-700 font-semibold",
  Onboarding: "bg-amber-100 text-amber-700 font-semibold",
};

const statusDot = {
  Active: "bg-emerald-500 text-emerald-700",
  "On Leave": "bg-blue-500 text-blue-700",
  Onboarding: "bg-amber-500 text-amber-700",
};

export default function Employee() {
  const [viewMode, setViewMode] = useState("list");
  const [deptFilter, setDeptFilter] = useState("All Departments");
  const [statusFilter, setStatusFilter] = useState("Any Status");
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    userId: "",
    role: "",
    dept: "",
    salary: "",
    status: "Active",
  });
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [createUserMode, setCreateUserMode] = useState(false);
  const [newUserInfo, setNewUserInfo] = useState({
    fullName: "",
    email: "",
    password: "Welcome@123",
  });

  const closeForm = () => {
    setShowForm(false);
    setEditId(null);
    setFormData({
      userId: "",
      role: "",
      dept: "",
      salary: "",
      status: "Active",
    });
    setNewUserInfo({
      fullName: "",
      email: "",
      password: "Welcome@123",
    });
    setCreateUserMode(false);
  };

  // Profile / Document Vault State
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [profileTab, setProfileTab] = useState("details"); // 'details' | 'documents'
  const [documents, setDocuments] = useState([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const fileInputRef = useRef(null);

  const fetchEmployees = useCallback(async () => {
    try {
      const response = await getEmployees();
      setEmployees(formatEmployees(response));
      setError("");
    } catch (loadError) {
      setError(loadError.message);
    }
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [usersResponse, employeesResponse] = await Promise.all([
          getUsers(),
          getEmployees(),
        ]);

        setUsers(usersResponse);
        setEmployees(formatEmployees(employeesResponse));
        setError("");
      } catch (loadError) {
        setError(loadError.message);
      }
    };

    loadInitialData();

    const interval = setInterval(() => {
      fetchEmployees();
    }, 60000); // Poll every 60s — reduces API load (5s caused 429 rate-limit errors)

    return () => clearInterval(interval);
  }, [fetchEmployees]);

  const formatEmployees = (data) =>
    (Array.isArray(data) ? data : []).map((emp) => ({
      id: emp._id,
      userId: emp.user?._id || "",
      name: emp.user?.fullName || "N/A",
      email: emp.user?.email || "N/A",
      role: emp.role || "",
      dept: emp.department || "",
      status: emp.status || "",
      salary: emp.baseSalary || 0,
      avatar: (emp.user?.fullName || "NA")
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase(),
      avatarColor: "from-indigo-400 to-blue-500",
    }));

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validateForm = () => {
    if (!formData.role) {
      toast.error("Role / Position is required");
      return false;
    }
    if (!formData.dept || formData.dept === "All Departments") {
      toast.error("Please select a valid Department");
      return false;
    }
    if (!editId) {
      if (createUserMode) {
        if (!newUserInfo.fullName.trim()) {
          toast.error("User Full Name is required");
          return false;
        }
        if (!newUserInfo.email.trim()) {
          toast.error("User Email is required");
          return false;
        }
        if (!newUserInfo.password.trim() || newUserInfo.password.length < 6) {
          toast.error("Password must be at least 6 characters");
          return false;
        }
      } else {
        if (!formData.userId) {
          toast.error("Please select a user for the employee");
          return false;
        }
      }
    }
    if (formData.salary && isNaN(Number(formData.salary))) {
      toast.error("Salary must be a valid number");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      if (editId) {
        await updateEmployee(editId, {
          position: formData.role,
          department: formData.dept,
          baseSalary: Number(formData.salary),
          role: formData.role,
          status: formData.status,
        });
        toast.success("Employee updated successfully");
      } else {
        let finalUserId = formData.userId;

        if (createUserMode) {
          toast.loading("Creating user account...", { id: "save-emp" });
          const userRes = await registerUser(newUserInfo);
          toast.dismiss("save-emp");
          
          if (!userRes?.user?._id) {
            throw new Error("Failed to create user account");
          }
          finalUserId = userRes.user._id;
        }

        await createEmployee({
          user: finalUserId,
          position: formData.role,
          baseSalary: Number(formData.salary),
          department: formData.dept,
          role: formData.role,
          status: formData.status,
        });
        toast.success("Employee added successfully");
      }

      await fetchEmployees();
      const updatedUsers = await getUsers();
      setUsers(updatedUsers);

      setError("");
      closeForm();
    } catch (saveError) {
      toast.dismiss("save-emp");
      toast.error(saveError.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteEmployee(id);
      await fetchEmployees();
      toast.success("Employee deleted");
    } catch (deleteError) {
      toast.error(deleteError.message);
    }
  };

  const handleEdit = (emp, e) => {
    e.stopPropagation();
    setFormData({
      userId: emp.userId,
      role: emp.role,
      dept: emp.dept,
      salary: emp.salary,
      status: emp.status,
    });
    setEditId(emp.id);
    setShowForm(true);
  };

  const openProfile = async (emp) => {
    setSelectedEmployee(emp);
    setProfileTab("details");
    setProfileModalOpen(true);
    setDocuments([]);
    try {
      const docs = await getEmployeeDocuments(emp.id);
      setDocuments(docs);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedEmployee) return;

    const fd = new FormData();
    fd.append("document", file);

    try {
      setUploadingDoc(true);
      const newDoc = await uploadEmployeeDocument(selectedEmployee.id, fd);
      setDocuments(prev => [...prev, newDoc]);
      toast.success("Document uploaded successfully");
    } catch (err) {
      toast.error("Failed to upload document");
    } finally {
      setUploadingDoc(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const filtered = employees.filter(
    (employee) =>
      (deptFilter === "All Departments" || employee.dept === deptFilter) &&
      (statusFilter === "Any Status" || employee.status === statusFilter),
  );

  const availableUsers = users.filter(
    (u) => !employees.some((emp) => emp.userId === u._id)
  );

  const summaryCards = [
    {
      label: "Total Employees",
      value: employees.length,
      helper: "Active directory coverage",
      icon: <UserPlus size={18} />,
      iconTone:
        "border-blue-100 bg-[linear-gradient(135deg,#eff6ff_0%,#dbeafe_55%,#ecfeff_100%)] text-blue-700",
    },
    {
      label: "On Leave",
      value: employees.filter((employee) => employee.status === "On Leave").length,
      helper: "Currently unavailable staff",
      icon: <PlaneTakeoff size={18} />,
      iconTone:
        "border-cyan-100 bg-[linear-gradient(135deg,#ecfeff_0%,#cffafe_55%,#eff6ff_100%)] text-cyan-700",
    },
    {
      label: "Current Onboarding",
      value: employees.filter((employee) => employee.status === "Onboarding").length,
      helper: "New hires in progress",
      icon: <Rocket size={18} />,
      iconTone:
        "border-amber-100 bg-[linear-gradient(135deg,#fffbeb_0%,#fef3c7_55%,#fff7ed_100%)] text-amber-700",
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
            Employee Directory
          </h1>
          <p className="mt-0.5 max-w-2xl text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
            Manage your organization's talent, roles, and compliance documents.
          </p>
        </div>
        <div className="flex items-center gap-2 sm:self-auto">
          <button
            onClick={() => setShowForm(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 sm:w-auto sm:px-4 sm:py-2.5 sm:text-sm"
          >
            <UserPlus size={16} />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      {showForm ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-3 backdrop-blur-sm sm:p-4"
          onClick={closeForm}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900 dark:border dark:border-gray-800"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between bg-gradient-to-r from-indigo-600 to-blue-500 px-4 py-4 sm:px-5">
              <div>
                <h2 className="text-base font-bold text-white">
                  {editId ? "Edit Employee" : "Add New Employee"}
                </h2>
              </div>
              <button onClick={closeForm} className="text-white/70 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-4 p-4 sm:p-5">
              {!editId && (
                <div className="flex rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
                  <button
                    type="button"
                    onClick={() => setCreateUserMode(false)}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                      !createUserMode
                        ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                        : "text-gray-500 hover:text-gray-950 dark:text-gray-400 dark:hover:text-white"
                    }`}
                  >
                    Select Existing User
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateUserMode(true)}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                      createUserMode
                        ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                        : "text-gray-500 hover:text-gray-950 dark:text-gray-400 dark:hover:text-white"
                    }`}
                  >
                    Create New User
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {!editId && !createUserMode && (
                  <select
                    name="userId"
                    value={formData.userId}
                    onChange={handleChange}
                    className={`rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 sm:col-span-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white ${
                      !formData.userId
                        ? "border-gray-200 bg-gray-50 text-gray-400"
                        : "border-gray-200 bg-gray-50 text-gray-900 dark:text-white"
                    }`}
                  >
                    <option value="" disabled>— Select a User —</option>
                    {availableUsers.length === 0 && (
                      <option value="" disabled>No unregistered users available</option>
                    )}
                    {availableUsers.map((user) => (
                      <option key={user._id} value={user._id}>{user.fullName} ({user.email})</option>
                    ))}
                  </select>
                )}

                {!editId && createUserMode && (
                  <>
                    <input
                      type="text"
                      placeholder="User Full Name"
                      value={newUserInfo.fullName}
                      onChange={(e) => setNewUserInfo({ ...newUserInfo, fullName: e.target.value })}
                      className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-350 dark:bg-gray-800 dark:border-gray-700 dark:text-white sm:col-span-2"
                      required
                    />
                    <input
                      type="email"
                      placeholder="User Email Address"
                      value={newUserInfo.email}
                      onChange={(e) => setNewUserInfo({ ...newUserInfo, email: e.target.value })}
                      className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-350 dark:bg-gray-800 dark:border-gray-700 dark:text-white sm:col-span-2"
                      required
                    />
                    <input
                      type="password"
                      placeholder="User Password (min 6 chars)"
                      value={newUserInfo.password}
                      onChange={(e) => setNewUserInfo({ ...newUserInfo, password: e.target.value })}
                      className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-350 dark:bg-gray-800 dark:border-gray-700 dark:text-white sm:col-span-2"
                      required
                    />
                  </>
                )}

                <input
                  name="role"
                  placeholder="Role"
                  value={formData.role}
                  onChange={handleChange}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                />
                <select
                  name="dept"
                  value={formData.dept}
                  onChange={handleChange}
                  className={`rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:bg-gray-800 dark:border-gray-700 dark:text-white ${
                    !formData.dept
                      ? "border-gray-200 bg-gray-50 text-gray-400"
                      : "border-gray-200 bg-gray-50 text-gray-900 dark:text-white"
                  }`}
                >
                  <option value="" disabled>— Select Department —</option>
                  {["Engineering", "Product & Design", "HR & Admin", "Finance", "Sales", "Marketing"].map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <input
                  name="salary"
                  placeholder="Salary"
                  value={formData.salary}
                  onChange={handleChange}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                />
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                >
                  <option>Active</option>
                  <option>On Leave</option>
                  <option>Onboarding</option>
                </select>
              </div>
              <div className="flex flex-col gap-2.5 pt-2 sm:flex-row">
                <button
                  onClick={handleSubmit}
                  className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
                >
                  {editId ? "Update Employee" : "Add Employee"}
                </button>
                <button
                  onClick={closeForm}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Profile & Document Vault Modal */}
      {profileModalOpen && selectedEmployee && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setProfileModalOpen(false)}>
          <div 
            className="w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900 dark:border dark:border-gray-800"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${selectedEmployee.avatarColor} text-lg font-bold text-white shadow-sm`}>
                  {selectedEmployee.avatar}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{selectedEmployee.name}</h2>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{selectedEmployee.role} • {selectedEmployee.dept}</div>
                </div>
              </div>
              <button onClick={() => setProfileModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition"><X size={20}/></button>
            </div>

            <div className="flex border-b border-gray-100 dark:border-gray-800 px-6">
              <button 
                onClick={() => setProfileTab('details')}
                className={`py-3 text-sm font-medium border-b-2 mr-6 transition ${profileTab === 'details' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
              >
                Profile Details
              </button>
              <button 
                onClick={() => setProfileTab('documents')}
                className={`py-3 text-sm font-medium border-b-2 transition flex items-center gap-2 ${profileTab === 'documents' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
              >
                <FileText size={16} /> Document Vault
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 dark:bg-gray-900/50">
              {profileTab === 'details' ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                      <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Email Address</div>
                      <div className="text-sm font-medium flex items-center gap-2 dark:text-white"><Mail size={14} className="text-gray-400"/> {selectedEmployee.email}</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                      <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Status</div>
                      <div className={`text-sm font-medium flex w-fit items-center gap-1.5 rounded-md px-2 py-0.5 ${statusConfig[selectedEmployee.status]}`}>
                        {selectedEmployee.status}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                      <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Base Salary</div>
                      <div className="text-sm font-medium dark:text-white">Rs {Number(selectedEmployee.salary).toLocaleString()}</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                      <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Department</div>
                      <div className="text-sm font-medium dark:text-white">{selectedEmployee.dept}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Employee Documents</h3>
                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingDoc}
                      className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-indigo-100 transition disabled:opacity-50 dark:bg-indigo-900/30 dark:text-indigo-300"
                    >
                      <Upload size={14} /> {uploadingDoc ? "Uploading..." : "Upload File"}
                    </button>
                  </div>
                  
                  {documents.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-8 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-800">
                      <FileArchive size={32} className="mb-2 opacity-50" />
                      <div className="text-sm font-medium">No documents found</div>
                      <div className="text-xs mt-1 text-center">Upload resumes, ID proofs, or contracts.</div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {documents.map((doc, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:border-indigo-300 transition group">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="h-10 w-10 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0">
                              <FileText size={20} />
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{doc.fileName || `Document ${idx+1}`}</div>
                              <div className="text-[10px] text-gray-500 truncate">{new Date(doc.uploadedAt || Date.now()).toLocaleDateString()}</div>
                            </div>
                          </div>
                          <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition dark:hover:text-indigo-400 dark:hover:bg-indigo-900/40">
                            <Download size={16} />
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="group relative overflow-hidden rounded-[24px] border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm transition duration-300 sm:p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border shadow-sm ${card.iconTone}`}>
                {card.icon}
              </div>
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-400 mt-4">
              {card.label}
            </div>
            <div className="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-[1.75rem]">
              {card.value}
            </div>
            <div className="mt-2 text-xs text-gray-400">{card.helper}</div>
          </div>
        ))}
      </div>

      <Card className="p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-center">
          <div className="grid flex-1 grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full rounded-xl border bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white px-3 py-2 text-sm sm:w-auto"
            >
              {["All Departments", "Engineering", "Product & Design", "HR & Admin", "Finance", "Sales", "Marketing"].map(d => <option key={d}>{d}</option>)}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white px-3 py-2 text-sm sm:w-auto"
            >
              {["Any Status", "Active", "On Leave", "Onboarding"].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex items-center justify-between gap-2 text-xs text-gray-500 sm:justify-end">
            <span>Showing {filtered.length} employees</span>
            <div className="flex gap-1">
              <button onClick={() => setViewMode("grid")} className={`rounded-lg p-1.5 ${viewMode === "grid" ? "bg-indigo-600 text-white" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`}><LayoutGrid size={14} /></button>
              <button onClick={() => setViewMode("list")} className={`rounded-lg p-1.5 ${viewMode === "list" ? "bg-indigo-600 text-white" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`}><List size={14} /></button>
            </div>
          </div>
        </div>

        {viewMode === "list" ? (
          <div>
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Users size={36} className="mb-3 opacity-40" />
                <p className="text-sm font-medium">No employees found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-y-1.5 text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase text-gray-400">
                      {["Employee Name", "Role", "Department", "Status", "Salary", "Actions"].map((column) => (
                        <th key={column} className="px-3 py-2 pb-3 text-left text-xs font-semibold">{column}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((employee) => (
                      <tr key={employee.id} className="border-b bg-white dark:bg-gray-900/50 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition" onClick={() => openProfile(employee)}>
                        <td className="py-3.5 px-3 rounded-l-xl">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${employee.avatarColor} text-xs font-bold text-white shadow-sm`}>
                              {employee.avatar}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 dark:text-white">{employee.name}</div>
                              <div className="text-xs text-gray-500">{employee.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="text-gray-600 dark:text-gray-300">{employee.role}</td>
                        <td>
                          <span className="flex w-fit items-center gap-1 rounded-md bg-blue-50 dark:bg-blue-900/30 px-2 py-1 text-xs text-blue-600 dark:text-blue-400 font-medium">
                            {employee.dept}
                          </span>
                        </td>
                        <td>
                          <div className={`flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${statusConfig[employee.status]}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${statusDot[employee.status]}`} />
                            {employee.status}
                          </div>
                        </td>
                        <td className="font-medium text-gray-700 dark:text-gray-300">
                          Rs {Number(employee.salary).toLocaleString()}
                        </td>
                        <td className="rounded-r-xl px-3 py-3" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <button onClick={(e) => handleEdit(employee, e)} className="flex items-center justify-center h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50">
                              <Pencil size={14} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(employee.id); }} className="flex items-center justify-center h-8 w-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {filtered.map((employee) => (
              <div key={employee.id} onClick={() => openProfile(employee)} className="rounded-xl bg-gray-50 border border-gray-100 p-5 text-center cursor-pointer hover:border-indigo-200 transition dark:bg-gray-800/50 dark:border-gray-700 dark:hover:border-indigo-500">
                <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br ${employee.avatarColor} font-bold text-white text-lg shadow-sm mb-3`}>
                  {employee.avatar}
                </div>
                <div className="text-sm font-bold text-gray-900 dark:text-white truncate">{employee.name}</div>
                <div className="text-xs text-gray-500 mt-1">{employee.role}</div>
                <span className={`inline-block mt-3 px-2 py-0.5 rounded-md text-[10px] ${statusConfig[employee.status]}`}>{employee.status}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
