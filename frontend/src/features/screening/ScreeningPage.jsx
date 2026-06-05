import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Camera, Video, VideoOff, Play, CheckCircle2, AlertCircle, Clock, RefreshCw } from "lucide-react";
import API from "../../api/axiosInstance";
import Card from "../../components/Card";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

export default function ScreeningPage() {
  const { token } = useParams();
  const [session, setSession] = useState(null);
  
  // Setup Permissions State
  const [stage, setStage] = useState("setup"); // "setup" | "screening" | "completed"
  const [cameraAllowed, setCameraAllowed] = useState(false);
  const [micAllowed, setMicAllowed] = useState(false);
  
  // Active Screening State
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timer, setTimer] = useState(60); // 60 seconds max per answer
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // References
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const recordedChunksRef = useRef([]);

  // Fetch Screening invitation details
  useEffect(() => {
    if (!token) return;

    const fetchSession = async () => {
      try {
        const res = await API.get(`/screening/${token}`);
        setSession(res.data?.data);
      } catch (err) {
        toast.error("Failed to load screening details. Ensure the invitation link is valid.");
      }
    };
    fetchSession();
  }, [token]);

  // Request media device permissions
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraAllowed(true);
      setMicAllowed(true);
      toast.success("Camera and Microphone loaded successfully!");
    } catch (err) {
      setCameraAllowed(false);
      setMicAllowed(false);
      toast.error("Please grant camera and microphone permissions to proceed.");
    }
  };

  const handleStartScreening = () => {
    if (!cameraAllowed || !micAllowed) return;
    setStage("screening");
    setTimer(60);
  };

  // Recording triggers
  const startRecordingAnswer = () => {
    if (!videoRef.current?.srcObject) return;
    
    recordedChunksRef.current = [];
    const stream = videoRef.current.srcObject;
    const options = { mimeType: "video/webm;codecs=vp9,opus" };

    try {
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        await uploadVideoAnswer();
      };

      recorder.start();
      setIsRecording(true);
      setTimer(60);

      // Start countdown interval
      timerIntervalRef.current = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            stopRecordingAnswer();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (err) {
      toast.error("Failed to initiate media recorder.");
    }
  };

  const stopRecordingAnswer = () => {
    if (mediaRecorderRef.current && isRecording) {
      clearInterval(timerIntervalRef.current);
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Upload video chunk
  const uploadVideoAnswer = async () => {
    if (recordedChunksRef.current.length === 0) return;
    
    setIsUploading(true);
    toast.loading("Uploading recorded answer chunk...", { id: "uploading" });

    try {
      const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
      const file = new File([blob], `answer_q${currentIdx}.webm`, { type: "video/webm" });

      const formData = new FormData();
      formData.append("video", file);
      formData.append("questionIndex", currentIdx);

      await API.post(`/screening/${token}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Answer uploaded successfully!", { id: "uploading" });
      setIsUploading(false);

      // Move to next question or complete screening session
      if (currentIdx < session.questions.length - 1) {
        setCurrentIdx((prev) => prev + 1);
        setTimer(60);
      } else {
        submitFinalScreening();
      }
    } catch (err) {
      setIsUploading(false);
      toast.error("Failed to upload recorded answer. Retrying recommended.", { id: "uploading" });
    }
  };

  // Submit and run AI evaluation pipeline
  const submitFinalScreening = async () => {
    setStage("completed");
    
    // Stop local camera stream tracks
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }

    toast.loading("RecruitAI is processing your responses & running skill checks...", { id: "submitting" });

    try {
      await API.post(`/screening/${token}/submit`);
      toast.success("Screening successfully submitted and scored!", { id: "submitting" });
    } catch (err) {
      toast.dismiss("submitting");
      toast.error("Failed to run final report compiler.");
    }
  };

  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-400 text-sm">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="animate-spin text-indigo-500" size={32} />
          Loading screening environment...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 font-sans">
      
      {/* Header banner */}
      <header className="flex items-center justify-between border-b border-slate-900 pb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 p-2">
            <Video size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">HireMind AI Screening</h1>
            <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">Position: {session.jobTitle}</p>
          </div>
        </div>

        {stage === "screening" && (
          <div className="flex items-center gap-4 bg-slate-900 px-4 py-2 rounded-2xl border border-slate-800 text-xs">
            <span className="flex items-center gap-1.5 font-bold text-red-500">
              <span className={`h-2 w-2 rounded-full bg-red-500 ${isRecording ? "animate-ping" : ""}`}></span>
              {isRecording ? "RECORDING" : "IDLE"}
            </span>
            <span className="h-3 w-[1px] bg-slate-800"></span>
            <span className="flex items-center gap-1 text-slate-300 font-semibold font-mono">
              <Clock size={13} />
              {timer}s remaining
            </span>
          </div>
        )}
      </header>

      {/* Main Workspace content */}
      <main className="flex-1 my-6 flex items-center justify-center">
        <AnimatePresence mode="wait">
          
          {/* 1. SETUP SCREEN */}
          {stage === "setup" && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl space-y-6"
            >
              <Card className="bg-slate-900/60 border-slate-800 p-6 space-y-6 backdrop-blur-md rounded-[32px] text-center shadow-2xl">
                <div className="max-w-md mx-auto space-y-3">
                  <div className="inline-flex rounded-full bg-indigo-500/10 border border-indigo-500/20 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-indigo-400">
                    💻 Hardware calibration
                  </div>
                  <h2 className="text-xl font-bold text-white">Self-Recorded Screening Setup</h2>
                  <p className="text-xs text-slate-400">
                    Hello {session.candidateName}. To submit your application, record a video response of up to 60 seconds for each question. Calibrate your webcam to continue.
                  </p>
                </div>

                {/* Local Camera stream checker */}
                <div className="relative aspect-video rounded-3xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center max-w-md mx-auto shadow-inner">
                  {cameraAllowed ? (
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100" />
                  ) : (
                    <div className="text-center space-y-3 p-4">
                      <div className="rounded-full bg-slate-900 border border-slate-800 p-4 text-slate-500 inline-block">
                        <VideoOff size={28} />
                      </div>
                      <p className="text-xs text-slate-500">Camera preview currently offline.</p>
                      <button
                        type="button"
                        onClick={startCamera}
                        className="rounded-xl bg-slate-800 hover:bg-slate-750 px-4 py-2 text-xs font-bold text-white transition active:scale-95"
                      >
                        Request Permissions
                      </button>
                    </div>
                  )}
                </div>

                {/* Requirements check list */}
                <div className="grid grid-cols-2 gap-3 max-w-md mx-auto text-left text-xs bg-slate-950/60 p-4 rounded-2xl border border-slate-800/40">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${cameraAllowed ? "bg-emerald-500" : "bg-slate-700"}`} />
                    <span className="font-semibold text-slate-300">Webcam Permission</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${micAllowed ? "bg-emerald-500" : "bg-slate-700"}`} />
                    <span className="font-semibold text-slate-300">Microphone Permission</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleStartScreening}
                    disabled={!cameraAllowed || !micAllowed}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition active:scale-95"
                  >
                    <Play size={16} />
                    Begin Screening Session
                  </button>
                </div>
              </Card>
            </motion.div>
          )}

          {/* 2. SCREENING ACTIVE SCREEN */}
          {stage === "screening" && (
            <motion.div
              key="screening"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch"
            >
              {/* Left col: Webcam Stream display */}
              <div className="lg:col-span-7 flex flex-col gap-4">
                <div className="relative aspect-video rounded-[30px] bg-slate-950 border border-slate-900 overflow-hidden shadow-2xl">
                  {/* Real video stream */}
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100" />
                  
                  {/* Progress recording border */}
                  {isRecording && (
                    <div className="absolute inset-0 border-4 border-red-500 rounded-[30px] pointer-events-none animate-pulse"></div>
                  )}

                  {/* Audio Waveform simulated in UI */}
                  {isRecording && (
                    <div className="absolute bottom-4 left-4 flex gap-1 h-6 items-end bg-slate-950/80 px-3 py-1.5 rounded-full border border-slate-800">
                      {[0.5, 0.9, 0.3, 0.7, 0.4, 0.8, 0.5, 0.7, 0.3, 0.6].map((v, i) => (
                        <span 
                          key={i} 
                          className="w-0.5 bg-red-500 rounded-full animate-bounce" 
                          style={{ 
                            height: `${v * 100}%`, 
                            animationDuration: `${0.4 + i * 0.08}s` 
                          }} 
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right col: Question pane & Recording triggers */}
              <div className="lg:col-span-5 flex flex-col justify-between gap-4">
                
                {/* Question Details */}
                <Card className="bg-slate-900/60 border-slate-800 p-6 space-y-4 flex-1 flex flex-col justify-center rounded-[30px]">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-slate-950 border border-slate-850 px-3 py-0.5 text-[9px] font-bold text-indigo-400 uppercase tracking-widest">
                      Question {currentIdx + 1} of {session.questions.length}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white leading-relaxed">
                    {session.questions[currentIdx] || "Preparing question prompt..."}
                  </h3>
                </Card>

                {/* Video Capture Control Dock */}
                <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-[28px] flex flex-col gap-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Step: Record Answer</span>
                    <span className="text-slate-500">Maximum: 60s</span>
                  </div>

                  <div className="flex gap-3">
                    {!isRecording ? (
                      <button
                        onClick={startRecordingAnswer}
                        disabled={isUploading}
                        className="flex-1 py-3 bg-red-600 hover:bg-red-750 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg transition active:scale-95 flex items-center justify-center gap-1.5"
                      >
                        <Video size={14} />
                        Record Response
                      </button>
                    ) : (
                      <button
                        onClick={stopRecordingAnswer}
                        className="flex-1 py-3 bg-slate-100 hover:bg-white text-slate-900 font-bold text-xs rounded-xl shadow-lg transition active:scale-95 flex items-center justify-center gap-1.5"
                      >
                        <AlertCircle size={14} />
                        Stop & Upload
                      </button>
                    )}
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* 3. COMPLETED SUCCESS SCREEN */}
          {stage === "completed" && (
            <motion.div
              key="completed"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-md text-center space-y-6"
            >
              <Card className="bg-slate-900/60 border-slate-800 p-6 space-y-6 backdrop-blur-md rounded-[32px] shadow-2xl">
                <div className="flex justify-center">
                  <div className="rounded-full bg-emerald-500/10 border border-emerald-500/20 p-4 text-emerald-400 inline-block">
                    <CheckCircle2 size={44} />
                  </div>
                </div>

                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-white">Screening Interview Finished</h2>
                  <p className="text-xs text-slate-400 px-4 leading-relaxed">
                    Thank you, {session.candidateName}. Your self-recorded answers have been successfully uploaded and processed. RecruitAI has registered your scorecard in the recruitment portal.
                  </p>
                </div>

                <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-2xl text-left text-xs leading-relaxed text-slate-500 italic">
                  "Recruiters will review your facial pacing, skill evidence scores, and answers. You are now free to close this browser window."
                </div>
              </Card>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="text-center text-[10px] text-slate-600 border-t border-slate-900 pt-4">
        © {new Date().getFullYear()} HireMind AI Recruitment Platform. Equal opportunity compliant virtual screening.
      </footer>
    </div>
  );
}
