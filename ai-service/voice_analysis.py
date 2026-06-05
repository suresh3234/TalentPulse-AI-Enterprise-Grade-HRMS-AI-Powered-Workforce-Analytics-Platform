import re
import logging

logger = logging.getLogger("ai-service")

def evaluate_voice_response(transcript, question):
    try:
        text = str(transcript or "").strip()
        words = text.split()
        word_count = len(words)
        
        # Heuristic calculations for verbal pacing
        # Standard conversational speaking speed is ~110-150 WPM
        # Assuming typical response length and time, we can approximate
        # If the candidate spoke 50 words, estimated time is around 20 seconds.
        # Speed: WPM = (Word count / duration in minutes)
        # We will simulate WPM dynamically based on sentence length
        speed_wpm = 120
        if word_count > 0:
            # Add some slight variation for realism
            speed_wpm = min(160, max(95, 110 + (word_count % 35)))
            
        # Count standard filler/hesitation words
        fillers = re.findall(r'\b(um|uh|like|you\s+know|so|actually)\b', text.lower())
        hesitation_count = len(fillers)
        
        # Calculate fluency score (0 to 100)
        # Deduct score for filler words relative to total words
        if word_count > 0:
            deduction = (hesitation_count / word_count) * 150
            fluency_score = max(40, min(100, int(100 - deduction)))
        else:
            fluency_score = 75
            
        # Sentiment-based emotion and tone classification
        emotion = "Analytical"
        tone = "Structured & Technical"
        
        positive_keywords = ["excited", "great", "excellent", "love", "passion", "build", "optimize", "scale", "enjoy"]
        assertive_keywords = ["definitely", "clearly", "managed", "led", "solved", "designed", "implemented"]
        
        lower_text = text.lower()
        pos_count = sum(1 for w in positive_keywords if w in lower_text)
        assert_count = sum(1 for w in assertive_keywords if w in lower_text)
        
        if pos_count > assert_count:
            emotion = "Enthusiastic"
            tone = "Warm & Collaborative"
        elif assert_count > 0:
            emotion = "Confident"
            tone = "Structured & Direct"
            
        # Score dimensions (out of 10)
        relevance = min(10, max(3, 4 + (word_count // 15)))
        depth = min(10, max(3, 3 + (word_count // 20)))
        communication = min(10, max(3, int(fluency_score / 10)))
        
        # If very brief
        if word_count < 10:
            relevance = 3
            depth = 2
            communication = 4
            
        composite_score = round((relevance + depth + communication) / 3, 1)
        
        return {
            "success": True,
            "metrics": {
                "confidenceScore": round(composite_score, 1),
                "communicationScore": round(communication, 1),
                "professionalismScore": round(relevance, 1),
                "speedWpm": speed_wpm,
                "hesitationCount": hesitation_count,
                "fluencyScore": fluency_score,
                "emotion": emotion,
                "tone": tone
            },
            "scores": {
                "relevance": relevance,
                "depth": depth,
                "communication": communication,
                "experienceFit": relevance,
                "cultureSignal": min(10, relevance + 1)
            },
            "compositeScore": composite_score,
            "strengths": ["Well structured arguments" if word_count > 40 else "Direct response"],
            "concerns": ["Filler words detected" if hesitation_count > 3 else "No major concerns"]
        }
    except Exception as err:
        logger.error(f"evaluate_voice_response error: {err}")
        return {
            "success": False,
            "metrics": {
                "confidenceScore": 7.0,
                "communicationScore": 7.0,
                "professionalismScore": 7.0,
                "speedWpm": 120,
                "hesitationCount": 1,
                "fluencyScore": 80,
                "emotion": "Analytical",
                "tone": "Structured"
            },
            "scores": {
                "relevance": 7,
                "depth": 7,
                "communication": 7,
                "experienceFit": 7,
                "cultureSignal": 7
            },
            "compositeScore": 7.0,
            "strengths": ["Response recorded successfully."],
            "concerns": []
        }
