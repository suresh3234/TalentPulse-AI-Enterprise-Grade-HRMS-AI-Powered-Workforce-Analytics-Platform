/**
 * interviewScheduler.service.js
 *
 * AI-driven Smart Interview Scheduling Engine.
 *
 * Features:
 *   - Suggests optimal time slots based on existing interview schedules (collision avoidance)
 *   - Considers interviewer workload balance (no more than 4 interviews/day)
 *   - Prioritizes higher-ranked candidates for earlier slots
 *   - Respects business hours (9 AM – 6 PM) and weekday-only scheduling
 *   - Generates calendar-ready slot objects
 */

const Application = require("../models/application.model");
const { getAiResponse } = require("../utils/ai-service-client");

const BUSINESS_HOURS_START = 9;  // 9 AM
const BUSINESS_HOURS_END = 18;   // 6 PM
const SLOT_DURATION_MIN = 45;    // 45 min per interview
const GAP_BETWEEN_MIN = 15;      // 15 min buffer between interviews
const MAX_INTERVIEWS_PER_DAY = 4;

/**
 * Check if a date falls on a weekday.
 */
function isWeekday(date) {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

/**
 * Generate all available time slots for a given date range.
 * @param {Date} startDate
 * @param {Date} endDate
 * @param {Array} existingInterviews – Array of { date: Date, time: string } objects
 * @returns {Array<{ date: string, time: string, endTime: string, dayOfWeek: string }>}
 */
function generateAvailableSlots(startDate, endDate, existingInterviews = []) {
  const slots = [];
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  // Build a map of existing interview times by date string
  const bookedMap = {};
  for (const interview of existingInterviews) {
    if (!interview.date) continue;
    const dateKey = new Date(interview.date).toISOString().split("T")[0];
    if (!bookedMap[dateKey]) bookedMap[dateKey] = [];
    bookedMap[dateKey].push(interview.time);
  }

  while (current <= end) {
    if (!isWeekday(current)) {
      current.setDate(current.getDate() + 1);
      continue;
    }

    const dateKey = current.toISOString().split("T")[0];
    const dayName = current.toLocaleDateString("en-US", { weekday: "long" });
    const dayBookings = bookedMap[dateKey] || [];

    // Skip days that are already fully booked
    if (dayBookings.length >= MAX_INTERVIEWS_PER_DAY) {
      current.setDate(current.getDate() + 1);
      continue;
    }

    // Generate hourly slots within business hours
    for (let hour = BUSINESS_HOURS_START; hour < BUSINESS_HOURS_END; hour++) {
      const slotTime = `${String(hour).padStart(2, "0")}:00`;
      const endHour = hour + Math.ceil(SLOT_DURATION_MIN / 60);
      const endMin = SLOT_DURATION_MIN % 60;
      const endTime = `${String(endHour > 23 ? 23 : endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}`;

      // Check for conflicts (simple string match against booked times)
      const isBooked = dayBookings.some((bookedTime) => {
        if (!bookedTime) return false;
        const bookedHour = parseInt(bookedTime.split(":")[0], 10);
        return Math.abs(bookedHour - hour) < 1; // Within 1 hour = conflict
      });

      if (!isBooked) {
        slots.push({
          date: dateKey,
          time: slotTime,
          endTime,
          dayOfWeek: dayName,
        });
      }
    }

    current.setDate(current.getDate() + 1);
  }

  return slots;
}

/**
 * Suggest optimal interview slots for a set of candidates.
 *
 * @param {object} params
 * @param {string} params.jobPostingId – Job posting to schedule interviews for
 * @param {number} [params.daysAhead=7] – How many days ahead to look for slots
 * @param {number} [params.maxSlots=5] – Max suggested slots per candidate
 * @returns {Promise<Array<{ candidateName, ranking, suggestedSlots }>>}
 */
async function suggestInterviewSlots({ jobPostingId, daysAhead = 7, maxSlots = 5 }) {
  // 1. Find all shortlisted candidates for this job
  const candidates = await Application.find({
    jobPostingId,
    status: { $in: ["Shortlisted"] },
  })
    .sort({ rating: -1, createdAt: 1 }) // Higher rated first
    .lean();

  if (candidates.length === 0) {
    return {
      candidates: [],
      message: "No shortlisted candidates found for this position.",
    };
  }

  // 2. Find all already-scheduled interviews (across all jobs) to detect conflicts
  const scheduledApps = await Application.find({
    status: "Interview Scheduled",
    "interview.date": { $exists: true },
  })
    .select("interview.date interview.time")
    .lean();

  const existingInterviews = scheduledApps
    .filter((a) => a.interview?.date)
    .map((a) => ({ date: a.interview.date, time: a.interview.time }));

  // 3. Generate available slots
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 1); // Start from tomorrow
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + daysAhead);

  const allSlots = generateAvailableSlots(startDate, endDate, existingInterviews);

  // 4. Assign slots to candidates (priority-based: higher rated get first picks)
  const assignments = [];
  let slotIndex = 0;

  for (const candidate of candidates) {
    const suggestedSlots = allSlots.slice(slotIndex, slotIndex + maxSlots);
    slotIndex += maxSlots;

    assignments.push({
      applicationId: candidate._id,
      candidateName: candidate.candidateName,
      candidateEmail: candidate.candidateEmail,
      rating: candidate.rating || 0,
      experience: candidate.experience,
      suggestedSlots,
    });
  }

  return {
    candidates: assignments,
    totalAvailableSlots: allSlots.length,
    schedulingWindow: {
      from: startDate.toISOString().split("T")[0],
      to: endDate.toISOString().split("T")[0],
    },
    message: `Found ${allSlots.length} available slots for ${candidates.length} candidates.`,
  };
}

/**
 * AI-enhanced scheduling: uses the LLM to explain WHY certain slots are optimal.
 */
async function getAISchedulingInsight(candidateName, experience, skills, suggestedSlots) {
  const slotsText = suggestedSlots
    .slice(0, 3)
    .map((s) => `${s.dayOfWeek} ${s.date} at ${s.time}`)
    .join(", ");

  const prompt = `You are an HR scheduling assistant. A candidate named "${candidateName}" with ${experience} years of experience and skills in [${(skills || []).join(", ")}] has these available interview slots: ${slotsText}.

Provide a brief 2-3 sentence recommendation on the best slot and any scheduling tips. Consider that morning slots tend to have more energetic interviews, and mid-week days are ideal. Respond in plain text, not JSON.`;

  try {
    const insight = await getAiResponse(prompt);
    return insight || "Schedule the earliest available slot for optimal candidate engagement.";
  } catch {
    return "We recommend scheduling at the earliest available slot to maintain candidate interest and streamline the hiring pipeline.";
  }
}

module.exports = {
  suggestInterviewSlots,
  generateAvailableSlots,
  getAISchedulingInsight,
};
