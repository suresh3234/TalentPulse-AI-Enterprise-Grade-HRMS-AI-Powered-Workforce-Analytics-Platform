import API, { getApiErrorMessage } from "./axiosInstance";

const normalizeCollectionResponse = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return [];
};

export const getJobPostings = async (params) => {
  try {
    const response = await API.get("/recruitment/job", { params });
    return normalizeCollectionResponse(response.data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to load job postings"));
  }
};

export const getJobApplications = async (jobPostingId, params) => {
  try {
    const response = await API.get(`/recruitment/job/${jobPostingId}/applications`, { params });
    return normalizeCollectionResponse(response.data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to load job applications"));
  }
};

export const getInterviewQuestions = async (applicationId, count = 3) => {
  try {
    const response = await API.get(`/recruitment/application/${applicationId}/interview-questions`, {
      params: { count }
    });
    return response.data?.data || { questions: [] };
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to generate interview questions"));
  }
};

export const submitVoiceAnswerScore = async (applicationId, question, responseText) => {
  try {
    const response = await API.post("/recruitment/voice-interview/score", {
      applicationId,
      question,
      response: responseText
    });
    return response.data?.data || { score: 0, remarks: "" };
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to submit and score voice answer"));
  }
};

export const transcribeAudioFile = async (audioBlob) => {
  try {
    const formData = new FormData();
    formData.append("audio", audioBlob, "interview_response.webm");
    const response = await API.post("/recruitment/voice-interview/transcribe", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data?.data?.text || "";
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to transcribe audio file"));
  }
};

export const uploadResumeAndApply = async (jobPostingId, file) => {
  try {
    const formData = new FormData();
    formData.append("jobPostingId", jobPostingId);
    formData.append("resume", file);
    const response = await API.post("/recruitment/application/upload-resume", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to upload and screen resume"));
  }
};

export const downloadCandidateReport = async (applicationId, format = "pdf", candidateName = "Candidate") => {
  try {
    const response = await API.get(`/recruitment/application/${applicationId}/report/${format}`, {
      responseType: "blob"
    });
    const blob = new Blob([response.data], { type: format === "pdf" ? "application/pdf" : "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Candidate_Report_${candidateName.replace(/\s+/g, "_")}.${format}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, `Failed to download ${format.toUpperCase()} report`));
  }
};

export const createJobPosting = async (jobData) => {
  try {
    const response = await API.post("/recruitment/job/create", jobData);
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to create job posting"));
  }
};

export const updateJobPosting = async (id, jobData) => {
  try {
    const response = await API.put(`/recruitment/job/${id}`, jobData);
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to update job posting"));
  }
};

export const deleteJobPosting = async (id) => {
  try {
    const response = await API.delete(`/recruitment/job/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to delete job posting"));
  }
};

export const analyzeJD = async (description) => {
  try {
    const response = await API.post("/recruitment/job/analyze-jd", { description });
    return response.data?.data || null;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to analyze job description"));
  }
};

export const submitVideoInterviewResult = async (videoData) => {
  try {
    const response = await API.post("/recruitment/video-interview/result", videoData);
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to submit video interview results"));
  }
};

export const getVideoInterviewSummary = async (applicationId) => {
  try {
    const response = await API.get(`/recruitment/video-interview/${applicationId}/summary`);
    return response.data?.data || null;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to load video interview summary"));
  }
};
