const assert = require("assert");
const emailNotificationService = require("../services/emailNotification.service");
const transcriptionService = require("../services/transcription.service");
const skillMatcherService = require("../services/skillMatcher.service");
const conversationAgentService = require("../services/conversationAgent.service");

async function runTests() {
  console.log("\n==================================================");
  console.log("       VERIFYING RECRUITMENT INTERVIEW SERVICES");
  console.log("==================================================\n");

  // Test 1: Email Notification Service Simulation
  try {
    const success = await emailNotificationService.sendInterviewScheduledEmail({
      candidateEmail: "test@candidate.com",
      candidateName: "John Doe",
      jobTitle: "Software Engineer",
      inviteLink: "http://localhost:5173/candidate/interview/live?token=123",
      scheduledAt: new Date(),
    });
    assert.strictEqual(success, true, "Email sending should return true.");
    console.log("✅ 1. Email Notification Service: PASS");
  } catch (error) {
    console.error("❌ 1. Email Notification Service: FAIL", error.message);
  }

  // Test 2: Transcription Service Fallback Mode
  try {
    // Write a temp file for transcription testing
    const fs = require("fs");
    const path = require("path");
    const tempFilePath = path.join(__dirname, "../uploads", "temp_test_audio.webm");
    if (!fs.existsSync(path.dirname(tempFilePath))) {
      fs.mkdirSync(path.dirname(tempFilePath));
    }
    fs.writeFileSync(tempFilePath, "dummy audio content");

    const transcript = await transcriptionService.transcribeAudioFile(tempFilePath);
    assert.ok(transcript.includes("[Fallback Speech Transcript]") || typeof transcript === "string", "Transcript should return a string.");
    
    // Cleanup
    try { fs.unlinkSync(tempFilePath); } catch (e) {}
    
    console.log("✅ 2. Transcription Service: PASS");
  } catch (error) {
    console.error("❌ 2. Transcription Service: FAIL", error.message);
  }

  // Test 3: Skill Matcher Local Heuristics
  try {
    const transcript = "I have built frontend apps in React and styled them. I also write backend servers in Node.js.";
    const requiredSkills = ["React", "Node.js", "Docker"];
    
    const results = await skillMatcherService.extractSkillsFromTranscript(transcript, requiredSkills);
    
    assert.strictEqual(results["React"].score, 8, "React score should be 8 since it is explicitly mentioned.");
    assert.strictEqual(results["Docker"].score, 4, "Docker score should be 4 since it is not mentioned.");
    assert.ok(results["React"].evidence.includes("React"), "Evidence should detail React mentions.");
    
    console.log("✅ 3. Skill Matcher Service: PASS");
  } catch (error) {
    console.error("❌ 3. Skill Matcher Service: FAIL", error.message);
  }

  // Test 4: Conversation Agent Questions Heuristics
  try {
    const history = [
      { speaker: "CANDIDATE", text: "I have built a web application using React hooks." }
    ];
    const skills = ["React", "Node.js"];
    
    const nextQuestion = await conversationAgentService.generateNextQuestion(history, skills);
    assert.ok(nextQuestion.length > 10, "Should generate a valid question.");
    
    const suggestions = await conversationAgentService.generateQuestionSuggestions(history, skills);
    assert.strictEqual(suggestions.length, 3, "Should return exactly 3 suggested questions.");
    
    console.log("✅ 4. AI Conversation Agent: PASS");
  } catch (error) {
    console.error("❌ 4. AI Conversation Agent: FAIL", error.message);
  }

  console.log("\n==================================================");
  console.log("             ALL TESTS RUN COMPLETED");
  console.log("==================================================\n");
}

runTests().catch(console.error);
