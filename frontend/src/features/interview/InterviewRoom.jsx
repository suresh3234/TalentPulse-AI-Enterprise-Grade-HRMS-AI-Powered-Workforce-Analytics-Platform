import { useEffect, useRef, useState } from "react";
import { Camera, Mic, MicOff, Video, VideoOff, ScreenShare, PhoneOff, Send, MessageSquare, Sparkles, Volume2, Award, Clock } from "lucide-react";
import { getSocket } from "../../utils/socket";
import API from "../../api/axiosInstance";
import useWebRTC from "./useWebRTC";
import useAIAgent from "./useAIAgent";
import toast from "react-hot-toast";
import "./InterviewRoom.css";

export default function InterviewRoom() {
  const queryParams = new URLSearchParams(window.location.search);
  const token = queryParams.get("token");

  const [sessionInfo, setSessionInfo] = useState(null);
  const [userRole, setUserRole] = useState("candidate"); // "hr" | "candidate"
  const [userId, setUserId] = useState(`user_${Math.random().toString(36).substring(5)}`);
  
  const [activeTab, setActiveTab] = useState("chat"); // "chat" | "transcript" | "ai"
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  
  // Timer state
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerIntervalRef = useRef(null);

  // AI Co-Interviewer states
  const [aiAgentActive, setAiAgentActive] = useState(false);
  const [realtimeCandidateTranscript, setRealtimeCandidateTranscript] = useState("");

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  // Video element refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // 1. Fetch Session Invite Info
  useEffect(() => {
    if (!token) {
      toast.error("Invalid invitation link. Missing session token.");
      return;
    }

    const fetchSession = async () => {
      try {
        const res = await API.get(`/interview/token/${token}`);
        setSessionInfo(res.data?.data);

        // Determine user identity
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          try {
            const user = JSON.parse(storedUser);
            if (["admin", "hr", "recruiter", "manager"].includes(user.role)) {
              setUserRole("hr");
              setUserId(user._id);
            }
          } catch (e) {}
        }
      } catch (err) {
        toast.error("Failed to load interview session details. Verify the invite link.");
      }
    };
    fetchSession();
  }, [token]);

  const sessionId = sessionInfo?.sessionId;

  // 2. Initialize WebRTC peer connections
  const {
    localStream,
    remoteStream,
    connectionState,
    isMuted,
    isCameraOff,
    isScreenSharing,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
    endCall,
  } = useWebRTC(sessionId, userId);

  // 3. Initialize AI Agent Hook
  const {
    aiQuestion,
    speechText,
    isListening,
    isSpeaking,
    isStreamingQuestion,
    aiSuggestions,
    transcriptHistory,
    startListening,
    stopListening,
    triggerAIAgentTurn,
    setSpeechText,
  } = useAIAgent(sessionId, ["React", "Node.js", "System Design", "Communication"]);

  // 4. Map media streams to HTML Video elements
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // 5. Connect Socket events for chat and co-interviewer updates
  useEffect(() => {
    if (!sessionId) return;
    const socket = getSocket();

    socket.on("chat-message", (msg) => {
      setChatMessages((prev) => [...prev, msg]);
    });

    socket.on("ai-cointerviewer-state", ({ active }) => {
      setAiAgentActive(active);
      if (userRole === "candidate") {
        if (active) {
          toast.success("AI Co-Interviewer is formulating the next question...");
        }
      }
    });

    socket.on("ai-cointerviewer-turn", ({ transcript }) => {
      if (userRole === "hr") {
        setRealtimeCandidateTranscript(transcript);
      }
    });

    // Start elapsed interview timer
    timerIntervalRef.current = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    // Call start session endpoint on the backend
    if (userRole === "hr") {
      API.post(`/interview/${sessionId}/start`).catch(console.error);
    }

    return () => {
      socket.off("chat-message");
      socket.off("ai-cointerviewer-state");
      socket.off("ai-cointerviewer-turn");
      clearInterval(timerIntervalRef.current);
    };
  }, [sessionId, userRole]);

  // 6. Handle chat sending
  const sendChatMessage = () => {
    if (!chatInput.trim()) return;
    const socket = getSocket();
    socket.emit("chat-message", {
      roomId: sessionId,
      message: chatInput,
      sender: userRole === "hr" ? "Hiring Manager" : "Candidate",
    });
    setChatInput("");
  };

  // 7. Handle Interview Recording
  const startRecording = () => {
    if (!localStream) return;
    try {
      recordedChunksRef.current = [];
      const options = { mimeType: "video/webm;codecs=vp9,opus" };
      
      // Combine local stream and remote stream tracks if possible, 
      // or record local stream as primary.
      const mediaRecorder = new MediaRecorder(localStream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        toast.success("Recording captured successfully.");
      };

      mediaRecorder.start(1000); // chunk size 1s
      setIsRecording(true);
      toast.success("Video interview recording started.");
    } catch (e) {
      toast.error("Failed to start MediaRecorder on this browser.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // 8. End the Interview (HR Only triggers post-processing pipeline)
  const handleEndInterview = async () => {
    stopRecording();
    endCall();

    const telemetryPayload = {
      eyeContactPercentage: 94,
      blinkCount: 16,
      attentionScore: 92,
      lipMovementScore: 84,
      stressIndicator: 12,
      avgWordsPerMinute: 118,
    };

    const endSession = async () => {
      toast.loading("Ending call and compiling candidate evaluation report...", { id: "ending" });
      try {
        const formData = new FormData();
        formData.append("clientTelemetry", JSON.stringify(telemetryPayload));

        if (recordedChunksRef.current.length > 0) {
          const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
          formData.append("video", blob, "interview_recording.webm");
        }

        await API.post(`/interview/${sessionId}/end`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        toast.success("Candidate report successfully registered in pipeline!", { id: "ending" });
        window.location.href = "/recruitment";
      } catch (err) {
        toast.dismiss("ending");
        toast.error("Failed to upload recording and run analysis.");
        window.location.href = "/recruitment";
      }
    };

    if (userRole === "hr") {
      await endSession();
    } else {
      toast.success("Call disconnected.");
      window.location.href = "/";
    }
  };

  const formatTimer = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (!sessionInfo) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-400 text-sm">
        <div className="flex flex-col items-center gap-3">
          <Clock className="animate-spin text-indigo-500" size={32} />
          Loading secure video space...
        </div>
      </div>
    );
  }

  return (
    <div className="interview-room-container">
      {/* Header Bar */}
      <header className="room-header">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 p-2 text-white">
            <Video size={18} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-none">{sessionInfo.jobTitle}</h1>
            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">
              {userRole === "hr" ? `Candidate: ${sessionInfo.candidateName}` : `Interviewer: ${sessionInfo.hrName}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-slate-900 border border-slate-800 rounded-full px-4 py-1.5 text-xs">
          {isRecording && (
            <span className="flex items-center gap-1.5 font-bold text-red-500">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-ping"></span>
              RECORDING
            </span>
          )}
          <span className="text-slate-500">|</span>
          <span className="flex items-center gap-1 text-slate-300 font-mono font-semibold">
            <Clock size={12} />
            {formatTimer(elapsedTime)}
          </span>
          <span className="text-slate-500">|</span>
          <span className={`font-bold ${connectionState === "connected" ? "text-emerald-500" : "text-amber-500"}`}>
            {connectionState.toUpperCase()}
          </span>
        </div>
      </header>

      {/* Main Workspace grid */}
      <div className="room-grid">
        {/* Videos viewport */}
        <div className="video-workspace">
          <div className="dual-video-layout">
            {/* Local Peer Stream */}
            <div className="video-box local">
              {localStream && !isCameraOff ? (
                <video ref={localVideoRef} autoPlay playsInline muted className="video-stream" />
              ) : (
                <div className="video-placeholder">
                  <VideoOff size={36} />
                  <span className="text-xs">Camera Offline</span>
                </div>
              )}
              <div className="video-label">
                {userRole === "hr" ? "Hiring Manager (You)" : `${sessionInfo.candidateName} (You)`}
              </div>
            </div>

            {/* Remote Peer Stream */}
            <div className="video-box remote">
              {remoteStream ? (
                <video ref={remoteVideoRef} autoPlay playsInline className="video-stream" />
              ) : (
                <div className="video-placeholder">
                  <VideoOff size={36} />
                  <span className="text-xs">Waiting for peer stream...</span>
                </div>
              )}
              <div className="video-label">
                {userRole === "hr" ? `${sessionInfo.candidateName}` : `${sessionInfo.hrName}`}
              </div>
            </div>
          </div>

          {/* Floating Controls Toolbar */}
          <div className="control-dock">
            <button onClick={toggleMute} className={`dock-btn ${isMuted ? "danger" : ""}`} title={isMuted ? "Unmute Mic" : "Mute Mic"}>
              {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
            
            <button onClick={toggleCamera} className={`dock-btn ${isCameraOff ? "danger" : ""}`} title={isCameraOff ? "Camera On" : "Camera Off"}>
              {isCameraOff ? <VideoOff size={18} /> : <Video size={18} />}
            </button>
            
            <button onClick={toggleScreenShare} className={`dock-btn ${isScreenSharing ? "active" : ""}`} title="Share Screen">
              <ScreenShare size={18} />
            </button>

            {userRole === "hr" && (
              <button 
                onClick={isRecording ? stopRecording : startRecording} 
                className={`dock-btn ${isRecording ? "danger" : "success"}`}
                title={isRecording ? "Stop Recording" : "Start Recording"}
              >
                <div className={`h-3 w-3 rounded-full ${isRecording ? "bg-white" : "bg-white"}`} />
              </button>
            )}

            <button onClick={handleEndInterview} className="dock-btn danger" title="End Interview">
              <PhoneOff size={18} />
            </button>
          </div>
        </div>

        {/* Sidebar panels */}
        <div className="room-sidebar">
          <div className="sidebar-tabs">
            <button onClick={() => setActiveTab("chat")} className={`tab-btn ${activeTab === "chat" ? "active" : ""}`}>
              Chat Panel
            </button>
            {userRole === "hr" ? (
              <button onClick={() => setActiveTab("ai")} className={`tab-btn ${activeTab === "ai" ? "active" : ""}`}>
                AI Co-Interviewer
              </button>
            ) : (
              <button onClick={() => setActiveTab("transcript")} className={`tab-btn ${activeTab === "transcript" ? "active" : ""}`}>
                AI Speaking
              </button>
            )}
          </div>

          <div className="tab-content">
            {activeTab === "chat" && (
              <div className="flex flex-col h-full">
                <div className="chat-messages">
                  {chatMessages.map((msg, i) => {
                    const isOwn = (userRole === "hr" && msg.sender === "Hiring Manager") || 
                                  (userRole === "candidate" && msg.sender === "Candidate");
                    return (
                      <div key={i} className={`chat-bubble ${isOwn ? "sent" : "received"}`}>
                        <div className="text-[9px] text-white/50 mb-0.5">{msg.sender}</div>
                        <div>{msg.message}</div>
                      </div>
                    );
                  })}
                  {chatMessages.length === 0 && (
                    <div className="text-center text-slate-500 text-xs py-8">
                      No messages sent in this session.
                    </div>
                  )}
                </div>
                <div className="chat-input-bar">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
                    placeholder="Type in-room message..."
                    className="chat-input"
                  />
                  <button onClick={sendChatMessage} className="chat-send-btn">
                    <Send size={14} />
                  </button>
                </div>
              </div>
            )}

            {activeTab === "transcript" && (
              <div className="space-y-4">
                <div className="live-tips-panel">
                  <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-bold">
                    <Sparkles size={13} />
                    RecruitAI Speaking Mode
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Speak into the mic when the AI finishes voicing its questions. Your speech will be transcribed.
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">AI Question Prompt</span>
                  <p className="text-xs text-indigo-300 font-semibold mt-1 leading-relaxed">
                    {aiQuestion || "Waiting for Hiring Manager to prompt the AI Co-Interviewer..."}
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-2">
                  <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Your Spoken Answer</span>
                  <textarea
                    value={speechText}
                    onChange={(e) => setSpeechText(e.target.value)}
                    placeholder="Speech transcription will append here. Edit if needed."
                    className="w-full bg-transparent text-slate-300 text-xs outline-none border-none resize-none min-h-[80px]"
                  />
                  <div className="flex gap-2 justify-end mt-2 pt-2 border-t border-slate-900">
                    {isListening ? (
                      <button onClick={stopListening} className="rounded bg-red-950 border border-red-900 px-3 py-1 text-[10px] text-red-400 font-bold">
                        Stop Mic
                      </button>
                    ) : (
                      <button onClick={startListening} className="rounded bg-indigo-600 px-3 py-1 text-[10px] text-white font-bold">
                        Speak Answer
                      </button>
                    )}
                    <button 
                      onClick={() => triggerAIAgentTurn(speechText)}
                      disabled={!speechText.trim()}
                      className="rounded bg-emerald-600 px-3 py-1 text-[10px] text-white font-bold disabled:opacity-50"
                    >
                      Send Answer
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "ai" && (
              <div className="space-y-4">
                <div className="live-tips-panel">
                  <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-bold">
                    <Sparkles size={13} />
                    AI Co-Interviewer Control Console
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    RecruitAI dynamically generates contextual follow-ups based on the candidate's last answer.
                  </p>
                </div>

                {/* Candidate spoken transcript */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Live Candidate Transcription</span>
                  <p className="text-xs text-slate-300 mt-1 font-medium italic min-h-[30px] leading-relaxed">
                    {realtimeCandidateTranscript || "Waiting for candidate to speak..."}
                  </p>
                  {realtimeCandidateTranscript && (
                    <button
                      onClick={() => triggerAIAgentTurn(realtimeCandidateTranscript)}
                      className="mt-3 w-full bg-indigo-600 hover:bg-indigo-700 py-1.5 rounded-lg text-[10px] font-bold text-white shadow-md transition"
                    >
                      Analyze & Trigger AI Response
                    </button>
                  )}
                </div>

                {/* AI Suggestions sidebar */}
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider block mb-2">AI-Generated Next Question Suggestions</span>
                  {aiSuggestions.map((sug, i) => (
                    <div key={i} onClick={() => speakQuestion(sug)} className="suggestion-card flex items-start gap-2">
                      <Volume2 size={13} className="text-indigo-400 mt-0.5 flex-shrink-0" />
                      <span>{sug}</span>
                    </div>
                  ))}
                  {aiSuggestions.length === 0 && (
                    <div className="text-center text-slate-500 text-[11px] py-4">
                      Suggestions will appear once candidate answers are processed.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
