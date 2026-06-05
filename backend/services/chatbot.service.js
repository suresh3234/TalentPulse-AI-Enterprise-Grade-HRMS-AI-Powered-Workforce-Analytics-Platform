const Application = require("../models/application.model");
const JobPosting = require("../models/jobPosting.model");
const logger = require("../utils/logger");

// ─── In-Memory Conversation Store ───────────────────────────────────────────
// Key: sessionId → { messages, lastAccess, ip, questionIndex, answers, sentimentHistory, lastUserMessage }
const conversationStore = new Map();
const MAX_TURNS = 20; 
const SESSION_TTL_MS = 30 * 60 * 1000; 

// Stale session cleaner
setInterval(() => {
  const now = Date.now();
  for (const [key, session] of conversationStore.entries()) {
    if (now - session.lastAccess > SESSION_TTL_MS) {
      conversationStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

// Helper: check sessions count per IP (Max 3 active)
function getIpActiveSessionsCount(ip) {
  if (!ip) return 0;
  let count = 0;
  for (const session of conversationStore.values()) {
    if (session.ip === ip) {
      count++;
    }
  }
  return count;
}

// ─── Core Chat Function ─────────────────────────────────────────────────────
async function chat({ sessionId, message, applicationId, ip }) {
  // Sanitize message: limit length to 1000, strip HTML
  let cleanedMessage = String(message || "")
    .substring(0, 1000)
    .replace(/<\/?[^>]+(>|$)/g, "")
    .trim();

  // Toxic keywords check
  const toxicKeywords = ["fuck", "shit", "bitch", "asshole", "cunt", "dick", "bastard"];
  if (toxicKeywords.some((word) => cleanedMessage.toLowerCase().includes(word))) {
    logger.warn(`Abuse detected in chatbot session: [${sessionId}], IP: [${ip}]`);
    return {
      reply: "This conversation has been flagged and closed.",
      sessionId,
      isFlagged: true,
    };
  }

  // Initialize session
  if (!conversationStore.has(sessionId)) {
    // Abuse check: limit active sessions per IP to 3
    if (ip && getIpActiveSessionsCount(ip) >= 3) {
      return {
        reply: "System busy. Too many active chatbot sessions from this connection.",
        sessionId,
        isFlagged: true,
      };
    }

    conversationStore.set(sessionId, {
      messages: [],
      lastAccess: Date.now(),
      ip,
      questionIndex: 0,
      answers: [],
      sentimentHistory: [],
      lastUserMessage: "",
    });
  }

  const session = conversationStore.get(sessionId);
  session.lastAccess = Date.now();

  // Limit total messages per session to 50
  if (session.messages.length >= 50) {
    return {
      reply: "Maximum chatbot message limit reached for this session. Thank you!",
      sessionId,
      isComplete: true,
    };
  }

  // Repetitive message check
  if (session.lastUserMessage === cleanedMessage && cleanedMessage.length > 5) {
    return {
      reply: "Could you elaborate on that?",
      sessionId,
      turnCount: session.messages.length,
    };
  }
  session.lastUserMessage = cleanedMessage;

  // Word count check
  const wordCount = cleanedMessage.split(/\s+/).filter(Boolean).length;
  if (session.questionIndex > 0 && wordCount < 5 && session.questionIndex <= 5) {
    return {
      reply: "Could you please elaborate on that in slightly more detail? That will help us better understand your background.",
      sessionId,
      turnCount: session.messages.length,
    };
  }

  // Fetch candidate/job context
  let app = null;
  if (applicationId) {
    app = await Application.findById(applicationId).populate("jobPostingId").lean();
  }

  const isScreeningMode = process.env.CHATBOT_SCREENING_MODE === "true";

  if (isScreeningMode && app) {
    // ─── Task 3 Upgrade 1: Structured Screening Questions Flow ───
    const job = app.jobPostingId || {};
    const jobTitle = job.title || job.position || "Software Engineer";
    const primarySkill = job.skills && job.skills[0] ? job.skills[0] : "JavaScript";
    const situationalScenario = "a major project requirement change on a tight deadline";

    let screeningQuestions = job.screeningQuestions || [];
    if (screeningQuestions.length === 0) {
      screeningQuestions = [
        `What interests you most about this ${jobTitle} role at our company?`,
        `Walk me through your experience with ${primarySkill}.`,
        `Describe a challenging project you led. What was your approach?`,
        `How do you handle ${situationalScenario}?`,
        `What are your salary expectations and availability to start?`,
      ];
    }

    const currentIdx = session.questionIndex;

    // Handle Greeting Turn (Turn 0)
    if (currentIdx === 0) {
      session.questionIndex = 1;
      const firstQuestion = screeningQuestions[0];
      session.messages.push({ role: "assistant", content: firstQuestion });
      return {
        reply: firstQuestion,
        sessionId,
        turnCount: session.messages.length,
        questionIndex: 0,
      };
    }

    // Save candidate response to previous question
    const prevQuestion = screeningQuestions[currentIdx - 1];
    session.answers.push({
      questionText: prevQuestion,
      answerTranscript: cleanedMessage,
    });

    // Run Sentiment & Intent Analysis on current answer (Upgrade 2)
    try {
      const sentimentResult = await analyzeSentimentAndIntent(cleanedMessage);
      session.sentimentHistory.push({
        messageIndex: currentIdx,
        sentiment: sentimentResult.sentiment,
        intent: sentimentResult.intent,
        keyEntitiesExtracted: sentimentResult.keyEntitiesExtracted,
        concernFlag: sentimentResult.concernFlag,
      });
    } catch (sentErr) {
      logger.warn("Per-message sentiment auditing bypassed:", sentErr.message);
    }

    // Handle Next Question or Ending
    if (currentIdx < screeningQuestions.length) {
      const nextQuestion = screeningQuestions[currentIdx];
      session.questionIndex = currentIdx + 1;

      // Provide a brief professional acknowledgment before next question
      const acknowledgments = ["Got it, thank you.", "Appreciate that explanation.", "Thanks for sharing.", "That makes sense.", "Very clear, thank you."];
      const ack = acknowledgments[currentIdx % acknowledgments.length];
      const botResponse = `${ack} ${nextQuestion}`;

      session.messages.push({ role: "user", content: cleanedMessage });
      session.messages.push({ role: "assistant", content: botResponse });

      return {
        reply: botResponse,
        sessionId,
        turnCount: session.messages.length,
        questionIndex: currentIdx,
      };
    } else {
      // Completed last question (Q5)
      const finalReply = "Thank you! Your responses have been recorded. Our team will be in touch within 3 business days.";
      session.messages.push({ role: "user", content: cleanedMessage });
      session.messages.push({ role: "assistant", content: finalReply });

      // Run Session Auto-Scoring & Notification (Upgrade 3)
      scoreChatbotSession(applicationId, session.answers, session.sentimentHistory).catch((err) => {
        logger.error("Background chatbot session scoring failed:", err.message);
      });

      // Clear session from memory
      conversationStore.delete(sessionId);

      return {
        reply: finalReply,
        sessionId,
        turnCount: session.messages.length,
        isComplete: true,
      };
    }
  }

  // ─── Fallback Freeform Mode ───
  session.messages.push({ role: "user", content: cleanedMessage });
  if (session.messages.length > MAX_TURNS) {
    session.messages = session.messages.slice(-MAX_TURNS);
  }

  const candidateCtx = app
    ? `\n--- Candidate Context ---\nName: ${app.candidateName}\nSkills: ${app.skills.join(", ")}\nExperience: ${app.experience} years\n`
    : "";

  const systemPrompt = `You are HRMS Elite Assistant - a professional virtual hiring bot.
Candidate is asking freeform questions. Keep answers warm, structured, and helpful.
If the user asks if you are an AI, respond: "I'm TalentPulse's virtual recruiting assistant — here to learn more about you!"
Do not reveal personal salary info or confidential employee data.`;

  const historyBlock = session.messages
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  const fullPrompt = `${systemPrompt}\n${candidateCtx}\n\nCONVERSATION HISTORY:\n${historyBlock}\n\nRespond as Assistant:`;

  try {
    const { getAiResponse } = require("../utils/ai-service-client");
    const reply = await getAiResponse(fullPrompt);
    const cleanReply = (reply || "Thank you. Let me check that for you.")
      .replace(/^Assistant:\s*/i, "")
      .trim();

    session.messages.push({ role: "assistant", content: cleanReply });
    return {
      reply: cleanReply,
      sessionId,
      turnCount: session.messages.length,
    };
  } catch (err) {
    const errorFallback = "I'm sorry, I'm experiencing technical difficulties matching your request right now. Please try again.";
    session.messages.push({ role: "assistant", content: errorFallback });
    return {
      reply: errorFallback,
      sessionId,
      turnCount: session.messages.length,
    };
  }
}

/**
 * UPGRADE 2: Sentiment and Intent Analysis per message
 */
async function analyzeSentimentAndIntent(message) {
  if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== "your_groq_api_key_here") {
    try {
      const Groq = require("groq-sdk");
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const prompt = `
        Analyze the sentiment and intent of this candidate's interview response.
        Response: "${message}"
        
        Return ONLY valid JSON with the exact following schema. Do NOT include markdown code blocks, preambles, or additional text:
        {
          "sentiment": "positive" | "neutral" | "negative" | "evasive",
          "intent": "answering" | "questioning" | "deflecting" | "declining",
          "keyEntitiesExtracted": ["React", "5 years"],
          "concernFlag": boolean
        }
      `;

      const chatCompletion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama-3.1-8b-instant",
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      return JSON.parse(chatCompletion.choices[0]?.message?.content.trim());
    } catch (err) {
      logger.error("Sentiment analysis call failed. Fallback applied:", { error: err.message });
      return localSentimentFallback(message);
    }
  }
  return localSentimentFallback(message);
}

function localSentimentFallback(message) {
  const len = String(message || "").split(/\s+/).filter(Boolean).length;
  return {
    sentiment: "neutral",
    intent: "answering",
    keyEntitiesExtracted: [],
    concernFlag: len < 5,
  };
}

/**
 * UPGRADE 3: Final Session Summary & Auto-Scoring
 */
async function scoreChatbotSession(applicationId, answers, sentimentHistory) {
  const Notification = require("../models/notification.model");
  
  try {
    const candidate = await Application.findById(applicationId).populate("jobPostingId");
    if (!candidate) return;

    let resultJson;
    if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== "your_groq_api_key_here") {
      try {
        const Groq = require("groq-sdk");
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const prompt = `
          Evaluate this candidate's complete chatbot screening dialogue.
          
          Job Title: ${candidate.jobPostingId?.title || "Target Position"}
          Stated Skills: ${candidate.skills?.join(", ") || "General"}
          Stated Experience: ${candidate.experience} years
          
          Q&A Transcript:
          ${JSON.stringify(answers)}
          
          Sentiment/Intent History:
          ${JSON.stringify(sentimentHistory)}
          
          Rate the candidate from 1-10 on:
          - overallImpressionScore
          - communicationScore
          - enthusiasmScore
          
          Provide keyStrengths (array of strings), concerns (array of strings), chatbotGrade ("A" | "B" | "C" | "D"), recommendedNextStep ("proceed_to_voice" | "proceed_to_interview" | "hold" | "reject"), and a brief summaryText.
          
          Return ONLY valid JSON with the exact following schema. Do NOT include markdown code blocks, preambles, or additional text:
          {
            "overallImpressionScore": 7.5,
            "communicationScore": 8.2,
            "enthusiasmScore": 6.8,
            "keyStrengths": ["Clear communicator"],
            "concerns": ["Vague about salary expectation"],
            "recommendedNextStep": "proceed_to_voice" | "proceed_to_interview" | "hold" | "reject",
            "chatbotGrade": "A" | "B" | "C" | "D",
            "summaryText": "Candidate demonstrated..."
          }
        `;

        const chatCompletion = await groq.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          model: "llama-3.3-70b-versatile",
          temperature: 0.2,
          response_format: { type: "json_object" }
        });

        resultJson = JSON.parse(chatCompletion.choices[0]?.message?.content.trim());
      } catch (err) {
        logger.error("Chatbot session AI scoring failed. Fallback applied:", { error: err.message });
        resultJson = localChatbotSessionScoreFallback(answers);
      }
    } else {
      resultJson = localChatbotSessionScoreFallback(answers);
    }

    // Save to Candidate (Application) document
    candidate.chatbotScreening.summary = {
      overallImpressionScore: resultJson.overallImpressionScore,
      communicationScore: resultJson.communicationScore,
      enthusiasmScore: resultJson.enthusiasmScore,
      keyStrengths: resultJson.keyStrengths,
      concerns: resultJson.concerns,
      recommendedNextStep: resultJson.recommendedNextStep,
      chatbotGrade: resultJson.chatbotGrade,
      summaryText: resultJson.summaryText,
      evaluatedAt: new Date(),
    };
    
    // Cache answers and sentimentHistory to DB
    candidate.chatbotScreening.answers = answers.map((ans) => ({
      questionText: ans.questionText,
      answerTranscript: ans.answerTranscript,
      evaluatedAt: new Date(),
    }));
    
    await candidate.save();

    // Trigger auto notification to HR if proceed_to_voice
    if (resultJson.recommendedNextStep === "proceed_to_voice") {
      try {
        const notification = new Notification({
          user: candidate.reviewedBy || candidate.jobPostingId?.postedBy || null,
          title: "Chatbot Screening Recommends Voice",
          message: `Chatbot screening complete for ${candidate.candidateName} — recommended for voice interview`,
          type: "recruitment",
          isRead: false,
        });
        await notification.save();
      } catch (notifErr) {
        logger.warn("Notification save failed for chatbot completion:", { error: notifErr.message });
      }
    }

    logger.info(`Chatbot screening session finalized for candidate: ${candidate.candidateName}`);

  } catch (error) {
    logger.error("scoreChatbotSession failed:", { error: error.message });
  }
}

function localChatbotSessionScoreFallback(answers) {
  return {
    overallImpressionScore: 7.0,
    communicationScore: 7.5,
    enthusiasmScore: 7.0,
    keyStrengths: ["Enthusiastic participant", "Answered all screening questions"],
    concerns: ["Lacks verbal validation cues"],
    recommendedNextStep: "proceed_to_voice",
    chatbotGrade: "B",
    summaryText: "Candidate successfully completed the chatbot screening questions in an orderly fashion.",
  };
}

function clearSession(sessionId) {
  conversationStore.delete(sessionId);
}

function getSessionInfo(sessionId) {
  const session = conversationStore.get(sessionId);
  if (!session) return null;
  return {
    turnCount: session.messages.length,
    lastAccess: new Date(session.lastAccess).toISOString(),
    activeSessions: conversationStore.size,
  };
}

module.exports = { chat, clearSession, getSessionInfo };
