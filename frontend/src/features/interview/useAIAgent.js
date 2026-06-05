import { useEffect, useRef, useState } from "react";
import { getSocket } from "../../utils/socket";
import API from "../../api/axiosInstance";
import toast from "react-hot-toast";

/**
 * Custom hook to manage the AI Co-Interviewer speech recognition, synthesis, and streaming questions.
 * @param {string} roomId - WebSocket room ID
 * @param {string[]} jobSkills - Target skills of the job
 */
export default function useAIAgent(roomId, jobSkills) {
  const [aiQuestion, setAiQuestion] = useState("");
  const [speechText, setSpeechText] = useState("");
  
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isStreamingQuestion, setIsStreamingQuestion] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [transcriptHistory, setTranscriptHistory] = useState([]);

  const recognitionRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = getSocket();
    return () => {
      window.speechSynthesis.cancel();
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    };
  }, []);

  /**
   * Listen to candidate microphone in real-time
   */
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Web Speech API is not supported in this browser. Please use Google Chrome.");
      return;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    let finalTranscript = "";
    rec.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + " ";
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      const combined = finalTranscript + interim;
      setSpeechText(combined);

      // Emit candidate transcript live to the HR dashboard room
      if (socketRef.current) {
        socketRef.current.emit("ai-cointerviewer-turn", { roomId, transcript: combined });
      }
    };

    rec.onstart = () => {
      setIsListening(true);
      setSpeechText("");
    };

    rec.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = rec;
    rec.start();
  };

  /**
   * Stop speech-to-text listener
   */
  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  /**
   * Speaks the generated question using native browser text-to-speech (SpeechSynthesis)
   */
  const speakQuestion = (text) => {
    if (!text) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95; // Slightly slower for business clarity

    utterance.onstart = () => {
      setIsSpeaking(true);
      if (socketRef.current) {
        socketRef.current.emit("ai-cointerviewer-state", { roomId, active: true });
      }
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      if (socketRef.current) {
        socketRef.current.emit("ai-cointerviewer-state", { roomId, active: false });
      }
      // Resume listening for candidate response after AI finishes speaking
      startListening();
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      if (socketRef.current) {
        socketRef.current.emit("ai-cointerviewer-state", { roomId, active: false });
      }
      startListening();
    };

    window.speechSynthesis.speak(utterance);
  };

  /**
   * Submits candidate's answer, retrieves streaming follow-up question via SSE, 
   * and refreshes HR's recommended questions list.
   */
  const triggerAIAgentTurn = async (candidateText, skills = []) => {
    if (!candidateText || !candidateText.trim()) return;

    stopListening();
    setAiQuestion("");
    setIsStreamingQuestion(true);

    const updatedHistory = [...transcriptHistory, { speaker: "CANDIDATE", text: candidateText }];
    setTranscriptHistory(updatedHistory);

    try {
      // 1. Fetch suggestions in background
      API.post("/interview/ai/ai-suggestions", {
        transcriptHistory: updatedHistory,
        jobSkills: skills.length ? skills : jobSkills,
      }).then((res) => {
        if (res.data?.success && res.data.suggestions) {
          setAiSuggestions(res.data.suggestions);
        }
      }).catch(console.error);

      // 2. Establish SSE streaming connection to fetch question word-by-word
      const response = await fetch(`${API.defaults.baseURL || "http://localhost:5000/api"}/interview/ai/ai-question`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transcriptHistory: updatedHistory,
          jobSkills: skills.length ? skills : jobSkills,
        }),
      });

      if (!response.body) {
        throw new Error("ReadableStream not supported by server.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let finished = false;
      let questionBuffer = "";

      while (!finished) {
        const { value, done } = await reader.read();
        finished = done;
        if (value) {
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n").filter(l => l.trim().startsWith("data:"));

          for (const line of lines) {
            const jsonStr = line.replace("data:", "").trim();
            if (jsonStr === "[DONE]") {
              finished = true;
              break;
            }

            try {
              const data = JSON.parse(jsonStr);
              if (data.word) {
                questionBuffer += data.word;
                setAiQuestion(questionBuffer);
              } else if (data.error) {
                throw new Error(data.error);
              }
            } catch (err) {
              // Ignore partial JSON parse errors
            }
          }
        }
      }

      setIsStreamingQuestion(false);
      setTranscriptHistory(prev => [...prev, { speaker: "AI", text: questionBuffer }]);
      
      // Speak the completed question
      speakQuestion(questionBuffer);

    } catch (error) {
      setIsStreamingQuestion(false);
      toast.error("AI co-interviewer failed to stream follow-up question.");
      const fallback = "Thank you. Could you detail how you monitor performance of system APIs in high throughput setups?";
      setAiQuestion(fallback);
      setTranscriptHistory(prev => [...prev, { speaker: "AI", text: fallback }]);
      speakQuestion(fallback);
    }
  };

  return {
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
  };
}
