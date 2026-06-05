import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { UserMinus, CheckCircle, Clock, AlertTriangle, ShieldAlert, ChevronRight } from "lucide-react";
import Card from "../components/Card";
import axiosInstance from "../api/axiosInstance";
import toast from "react-hot-toast";

export default function Offboarding() {
  const [offboardings, setOffboardings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOffboarding, setSelectedOffboarding] = useState(null);

  useEffect(() => {
    fetchOffboardings();
  }, []);

  const fetchOffboardings = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/offboarding/all");
      setOffboardings(res.data.data);
    } catch (error) {
      toast.error("Failed to load offboarding records");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStep = async (id, payload) => {
    try {
      await axiosInstance.put(`/offboarding/${id}/step`, payload);
      toast.success("Offboarding step updated");
      fetchOffboardings();
      
      // Update selected offboarding state if open
      if (selectedOffboarding && selectedOffboarding._id === id) {
        const res = await axiosInstance.get(`/offboarding/${selectedOffboarding.employee._id}`);
        setSelectedOffboarding(res.data.data);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update step");
    }
  };

  const toggleTaskStatus = (taskId, currentStatus) => {
    if (!selectedOffboarding) return;
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    handleUpdateStep(selectedOffboarding._id, { taskId, taskStatus: newStatus });
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500 animate-pulse">Loading offboarding data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Offboarding</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage employee offboarding pipelines, checklists, and access revocation.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Active Offboardings</h2>
          {offboardings.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500 border border-dashed rounded-xl dark:border-gray-700">
              No active offboardings
            </div>
          ) : (
            offboardings.map(ob => (
              <Card 
                key={ob._id} 
                className={`p-4 cursor-pointer transition hover:border-indigo-300 dark:hover:border-indigo-600 ${selectedOffboarding?._id === ob._id ? 'border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50/30 dark:bg-indigo-900/20' : ''}`}
                onClick={() => setSelectedOffboarding(ob)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs dark:bg-red-900/30">
                      {ob.employee?.user?.fullName?.charAt(0) || "U"}
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-gray-900 dark:text-white">{ob.employee?.user?.fullName}</div>
                      <div className="text-xs text-gray-500">{ob.employee?.department} • {ob.employee?.position}</div>
                    </div>
                  </div>
                  {ob.status === "completed" ? (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full dark:bg-emerald-900/30 dark:text-emerald-400 uppercase">
                      <CheckCircle size={10} /> Done
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full dark:bg-amber-900/30 dark:text-amber-400 uppercase">
                      <Clock size={10} /> {ob.status}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-3 flex justify-between items-center">
                  <span>Last Day: {format(new Date(ob.lastWorkingDate), "MMM dd, yyyy")}</span>
                  <span className="font-medium text-indigo-600 dark:text-indigo-400">
                    {ob.tasks.filter(t => t.status === "completed").length}/{ob.tasks.length} tasks
                  </span>
                </div>
              </Card>
            ))
          )}
        </div>

        <div className="lg:col-span-2">
          {selectedOffboarding ? (
            <Card className="p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start mb-6 pb-6 border-b border-gray-100 dark:border-gray-800">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <UserMinus className="text-red-500" /> 
                    {selectedOffboarding.employee?.user?.fullName} Offboarding
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">Initiated by {selectedOffboarding.initiatedBy?.fullName}</p>
                </div>
                <div className="mt-4 sm:mt-0 text-right">
                  <div className="text-xs text-gray-500 uppercase font-semibold">Reason</div>
                  <div className="text-sm text-gray-900 dark:text-white mt-1 capitalize">{selectedOffboarding.reason.replace('_', ' ')}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <CheckCircle size={16} className="text-indigo-500" />
                    Offboarding Checklist
                  </h3>
                  <div className="space-y-3">
                    {selectedOffboarding.tasks.map(task => (
                      <div 
                        key={task._id} 
                        className={`flex items-start gap-3 p-3 rounded-lg border ${task.status === 'completed' ? 'bg-gray-50 border-gray-200 dark:bg-gray-800/50 dark:border-gray-700' : 'bg-white border-gray-200 shadow-sm dark:bg-gray-900 dark:border-gray-700'}`}
                      >
                        <button 
                          onClick={() => toggleTaskStatus(task._id, task.status)}
                          className={`mt-0.5 flex-shrink-0 h-5 w-5 rounded border flex items-center justify-center transition-colors ${task.status === 'completed' ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-300 text-transparent hover:border-indigo-400'}`}
                        >
                          <CheckCircle size={14} />
                        </button>
                        <div>
                          <div className={`text-sm font-medium ${task.status === 'completed' ? 'text-gray-500 line-through dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>
                            {task.title}
                          </div>
                          {task.completedAt && (
                            <div className="text-[10px] text-gray-400 mt-0.5">
                              Completed on {format(new Date(task.completedAt), "MMM dd, hh:mm a")}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <ShieldAlert size={16} className="text-red-500" />
                      Critical System Flags
                    </h3>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50 dark:bg-gray-800/30 dark:border-gray-800">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">Assets Returned</div>
                          <div className="text-xs text-gray-500">Laptop, badge, keys</div>
                        </div>
                        <button 
                          onClick={() => handleUpdateStep(selectedOffboarding._id, { assetReturned: !selectedOffboarding.assetReturned })}
                          className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${selectedOffboarding.assetReturned ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                        >
                          <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${selectedOffboarding.assetReturned ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50 dark:bg-gray-800/30 dark:border-gray-800">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">Knowledge Transfer</div>
                          <div className="text-xs text-gray-500">Handoff documents signed</div>
                        </div>
                        <button 
                          onClick={() => handleUpdateStep(selectedOffboarding._id, { knowledgeTransferDone: !selectedOffboarding.knowledgeTransferDone })}
                          className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${selectedOffboarding.knowledgeTransferDone ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                        >
                          <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${selectedOffboarding.knowledgeTransferDone ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50 dark:bg-gray-800/30 dark:border-gray-800">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">Account Deactivated</div>
                          <div className="text-xs text-gray-500 text-red-500">Revokes all login access</div>
                        </div>
                        <button 
                          onClick={() => handleUpdateStep(selectedOffboarding._id, { accountDeactivated: !selectedOffboarding.accountDeactivated })}
                          className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${selectedOffboarding.accountDeactivated ? 'bg-red-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                        >
                          <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${selectedOffboarding.accountDeactivated ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center justify-between">
                      Exit Interview
                      <button 
                        onClick={() => handleUpdateStep(selectedOffboarding._id, { exitInterviewDone: !selectedOffboarding.exitInterviewDone })}
                        className={`text-xs px-2 py-1 rounded ${selectedOffboarding.exitInterviewDone ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'}`}
                      >
                        {selectedOffboarding.exitInterviewDone ? 'Completed' : 'Mark as Done'}
                      </button>
                    </h3>
                    <textarea 
                      placeholder="Add exit interview notes here..."
                      className="w-full text-sm rounded-lg border border-gray-200 bg-white p-3 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:bg-gray-900 dark:border-gray-700 dark:text-white min-h-[100px]"
                      defaultValue={selectedOffboarding.exitInterviewNotes || ""}
                      onBlur={(e) => {
                        if (e.target.value !== selectedOffboarding.exitInterviewNotes) {
                          handleUpdateStep(selectedOffboarding._id, { exitInterviewNotes: e.target.value });
                        }
                      }}
                    />
                  </div>

                  {selectedOffboarding.status === "completed" && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3 dark:bg-emerald-900/20 dark:border-emerald-900/50">
                      <CheckCircle className="text-emerald-500 flex-shrink-0" />
                      <div>
                        <div className="text-sm font-bold text-emerald-800 dark:text-emerald-400">Offboarding Completed</div>
                        <div className="text-xs text-emerald-600 dark:text-emerald-500 mt-1">All tasks and security measures have been successfully processed for this employee.</div>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </Card>
          ) : (
            <div className="h-full min-h-[400px] border border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center text-gray-500 bg-gray-50 dark:bg-gray-900/20 dark:border-gray-800">
              <UserMinus size={48} className="text-gray-300 mb-4 dark:text-gray-700" />
              <p>Select an offboarding record to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
