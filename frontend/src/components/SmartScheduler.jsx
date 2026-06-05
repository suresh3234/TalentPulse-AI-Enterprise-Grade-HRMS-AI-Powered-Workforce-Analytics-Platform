import React, { useEffect, useState } from "react";
import { Calendar, RefreshCw, Sparkles, User, AlertCircle } from "lucide-react";
import API, { getApiErrorMessage } from "../api/axiosInstance";
import toast from "react-hot-toast";


export default function SmartScheduler({ candidate, jobPostingId, onSlotBooked }) {
  const [slots, setSlots] = useState([]);
  const [insight, setInsight] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [loadingInsight, setLoadingInsight] = useState(true);
  const [error, setError] = useState("");
  const [bookingSlot, setBookingSlot] = useState(null);
  const [bookedSlot, setBookedSlot] = useState(null);
  const [showManualOverride, setShowManualOverride] = useState(false);
  const [manualDateTime, setManualDateTime] = useState("");

  const candidateId = candidate?.applicationId || candidate?._id;
  const candidateName = candidate?.candidateName || "Candidate";

  const fetchSlots = async () => {
    setLoadingSlots(true);
    setError("");
    try {
      const res = await API.get(`/recruitment/job/${jobPostingId}/smart-schedule`, {
        params: { daysAhead: 7, maxSlots: 5 }
      });
      const fetchedData = res.data?.data || {};
      const candidatesList = fetchedData.candidates || [];
      const currentCandidateData = candidatesList.find(c => String(c.applicationId || c._id) === String(candidateId));
      const fetchedSlots = currentCandidateData?.suggestedSlots || [];
      setSlots(fetchedSlots);
      
      // Fetch AI scheduling insights once slots are ready
      if (fetchedSlots.length > 0) {
        fetchInsight(fetchedSlots);
      } else {
        setLoadingInsight(false);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to fetch slots. Please try again."));
    } finally {
      setLoadingSlots(false);
    }
  };

  const fetchInsight = async (suggestedSlots) => {
    setLoadingInsight(true);
    try {
      const res = await API.post("/recruitment/smart-schedule/insight", {
        candidateName,
        experience: candidate?.experience || 3,
        skills: candidate?.skills || [],
        suggestedSlots: suggestedSlots
      });
      setInsight(res.data?.data?.insight || "Candidate is highly responsive to standard business hours. Morning times are recommended.");
    } catch (err) {
      console.warn("Could not retrieve AI scheduling insight:", err.message);
      setInsight("AI Insight: Suggest scheduling in the morning hours to maximize interview engagement.");
    } finally {
      setLoadingInsight(false);
    }
  };

  const handleBookSlot = async (slot) => {
    const slotTime = typeof slot === "string" ? slot : `${slot.date}T${slot.time}:00`;
    setBookingSlot(slot);
    try {
      const res = await API.post("/recruitment/schedule", {
        candidateId,
        jobPostingId,
        slot: slotTime
      });
      
      if (res.data?.success) {
        setBookedSlot(slot);
        if (onSlotBooked) {
          onSlotBooked(slotTime);
        }
      } else {
        throw new Error(res.data?.message || "Booking failed");
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to book the interview slot."));
    } finally {
      setBookingSlot(null);
    }
  };

  const handleManualBook = async (e) => {
    e.preventDefault();
    if (!manualDateTime) return;
    await handleBookSlot(new Date(manualDateTime).toISOString());
    setShowManualOverride(false);
  };

  useEffect(() => {
    if (jobPostingId && candidateId) {
      fetchSlots();
      setBookedSlot(null);
      setShowManualOverride(false);
    }
  }, [jobPostingId, candidateId]);

  const formatSlotTime = (slot) => {
    if (!slot) return { dateStr: "N/A", timeStr: "N/A" };
    const isoString = typeof slot === "string" ? slot : `${slot.date}T${slot.time}:00`;
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return { dateStr: "Invalid Date", timeStr: "N/A" };
    const dateStr = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    const timeStr = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    return { dateStr, timeStr };
  };

  return (
    <div className="rounded-3xl border border-indigo-100 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-2xl bg-indigo-50 p-2.5 text-indigo-600">
            <Calendar size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">🗓️ AI-Suggested Interview Slots</h3>
            <p className="text-xs text-slate-400">Best times based on interviewer availability & AI</p>
          </div>
        </div>
        <button
          onClick={fetchSlots}
          disabled={loadingSlots || !!bookedSlot}
          className="rounded-xl p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-30 transition"
          title="Refresh suggestions"
        >
          <RefreshCw size={14} className={loadingSlots ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Slots Section */}
      <div className="mt-4 space-y-2">
        {loadingSlots ? (
          // Skeleton Loader (3 rows)
          Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/50 p-3 animate-pulse">
              <div className="space-y-2">
                <div className="h-4 w-28 rounded bg-slate-200"></div>
                <div className="h-3 w-16 rounded bg-slate-200"></div>
              </div>
              <div className="h-8 w-24 rounded-xl bg-slate-200"></div>
            </div>
          ))
        ) : error ? (
          // Error State
          <div className="flex flex-col items-center justify-center py-4 text-center space-y-2">
            <AlertCircle size={24} className="text-rose-500" />
            <p className="text-xs text-slate-500 font-medium">{error}</p>
            <button
              onClick={fetchSlots}
              className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition"
            >
              Retry
            </button>
          </div>
        ) : slots.length === 0 ? (
          // Empty State
          <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
            No available slots found in the next 7 days. Try extending range.
          </div>
        ) : (
          // Slots List
          slots.slice(0, 5).map((slot, idx) => {
            const { dateStr, timeStr } = formatSlotTime(slot);
            const slotTime = typeof slot === "string" ? slot : `${slot.date}T${slot.time}:00`;
            const isSelected = bookedSlot !== null && (
              bookedSlot === slot || 
              (typeof bookedSlot === "string" ? bookedSlot : `${bookedSlot.date}T${bookedSlot.time}:00`) === slotTime
            );
            const isDisabled = bookedSlot !== null && !isSelected;

            return (
              <div
                key={idx}
                className={`flex items-center justify-between rounded-2xl border p-3 transition-all duration-200 ${
                  isSelected
                    ? "border-emerald-200 bg-emerald-50/40"
                    : "border-slate-100 bg-slate-50/30 hover:border-indigo-150 hover:bg-white hover:-translate-y-0.5 hover:shadow-sm"
                }`}
              >
                <div>
                  <span className="text-xs font-bold text-slate-800">{dateStr}</span>
                  <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-400">
                    <span>● {timeStr}</span>
                    <span>·</span>
                    <span>45 min</span>
                  </div>
                </div>

                {isSelected ? (
                  <span className="rounded-xl bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700 flex items-center gap-1 animate-fade-in">
                    ✅ Interview Scheduled!
                  </span>
                ) : (
                  <button
                    onClick={() => handleBookSlot(slot)}
                    disabled={isDisabled || bookingSlot !== null}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold text-white transition ${
                      bookingSlot === slot
                        ? "bg-slate-400 cursor-not-allowed"
                        : "bg-emerald-500 hover:bg-emerald-600 shadow-sm active:scale-95"
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    {bookingSlot === slot ? "Booking..." : "Book This"}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* AI Insight Box */}
      {!loadingSlots && slots.length > 0 && (
        <div className="mt-4 rounded-2xl bg-gradient-to-r from-blue-50/70 to-indigo-50/50 border border-blue-100/50 p-3 flex items-start gap-2.5">
          <div className="text-indigo-600 mt-0.5 flex-shrink-0 animate-bounce">
            <Sparkles size={14} />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">🤖 AI Insight</div>
            {loadingInsight ? (
              <div className="h-3 w-40 bg-slate-200 rounded animate-pulse mt-1"></div>
            ) : (
              <p className="mt-1 text-[11px] italic leading-normal text-indigo-900 font-medium">
                "{insight}"
              </p>
            )}
          </div>
        </div>
      )}

      {/* Bottom Actions */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <button
          onClick={fetchSlots}
          disabled={loadingSlots || !!bookedSlot}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline transition disabled:opacity-30 disabled:no-underline"
        >
          Refresh Suggestions
        </button>

        {showManualOverride ? (
          <form onSubmit={handleManualBook} className="flex items-center gap-2 mt-2 w-full animate-slide-down">
            <input
              type="datetime-local"
              required
              value={manualDateTime}
              onChange={(e) => setManualDateTime(e.target.value)}
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs outline-none focus:border-indigo-300 transition text-slate-700"
            />
            <button
              type="submit"
              disabled={!manualDateTime || bookingSlot !== null}
              className="rounded-xl bg-slate-900 px-3 py-1 text-xs font-bold text-white hover:bg-slate-800 transition"
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={() => setShowManualOverride(false)}
              className="text-xs text-slate-400 hover:text-slate-600 px-1 py-1"
            >
              Cancel
            </button>
          </form>
        ) : (
          <button
            onClick={() => setShowManualOverride(true)}
            disabled={!!bookedSlot}
            className="text-xs font-semibold text-slate-500 hover:text-slate-700 hover:underline transition disabled:opacity-30 disabled:no-underline"
          >
            Manual Override
          </button>
        )}
      </div>
    </div>
  );
}
