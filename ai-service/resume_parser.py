import re
import logging

logger = logging.getLogger("ai-service")

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    logger.warn("scikit-learn not available. Falling back to lightweight count-based similarity calculation.")

def get_word_frequencies(text):
    words = re.findall(r'\b\w+\b', text.lower())
    freq = {}
    for w in words:
        freq[w] = freq.get(w, 0) + 1
    return freq

def calculate_local_cosine_similarity(text1, text2):
    freq1 = get_word_frequencies(text1)
    freq2 = get_word_frequencies(text2)
    
    all_words = set(freq1.keys()).union(set(freq2.keys()))
    
    dot_product = 0
    norm_a = 0
    norm_b = 0
    
    for w in all_words:
        val1 = freq1.get(w, 0)
        val2 = freq2.get(w, 0)
        dot_product += val1 * val2
        norm_a += val1 ** 2
        norm_b += val2 ** 2
        
    if norm_a == 0 or norm_b == 0:
        return 0.0
        
    return dot_product / ((norm_a ** 0.5) * (norm_b ** 0.5))

def match_resume_to_jd(resume_text, jd_skills, required_experience):
    try:
        # Normalize inputs
        resume_clean = resume_text.lower()
        skills_matched = []
        skills_missing = []
        
        # Skill matching
        for skill in jd_skills:
            skill_clean = skill.lower()
            # Check for exact word boundaries or substrings
            pattern = r'\b' + re.escape(skill_clean) + r'\b'
            if re.search(pattern, resume_clean) or skill_clean in resume_clean:
                skills_matched.append(skill)
            else:
                skills_missing.append(skill)
                
        # Semantic Cosine Similarity matching
        jd_text = " ".join(jd_skills)
        if SKLEARN_AVAILABLE:
            try:
                vectorizer = TfidfVectorizer(stop_words='english')
                tfidf = vectorizer.fit_transform([resume_text, jd_text])
                similarity = float(cosine_similarity(tfidf[0:1], tfidf[1:2])[0][0])
            except Exception as tfidf_err:
                logger.error(f"TF-IDF calculation failed: {tfidf_err}")
                similarity = calculate_local_cosine_similarity(resume_text, jd_text)
        else:
            similarity = calculate_local_cosine_similarity(resume_text, jd_text)
            
        # ATS Score components:
        # 1. Skill Match Score (50%)
        # 2. Semantic Similarity Score (30%)
        # 3. Experience Match Score (20% - heuristics based on experience years)
        skill_match_pct = (len(skills_matched) / len(jd_skills)) * 100 if jd_skills else 80.0
        semantic_score = similarity * 100
        
        # Look for experience references in resume
        exp_match = re.search(r'(\d+)\+?\s*years?\s*experience', resume_clean)
        extracted_exp = int(exp_match.group(1)) if exp_match else 3
        
        if extracted_exp >= required_experience:
            exp_score = 100.0
        else:
            exp_score = (extracted_exp / required_experience) * 100 if required_experience else 100.0
            
        ats_score = int(skill_match_pct * 0.5 + semantic_score * 0.3 + exp_score * 0.2)
        ats_score = min(100, max(15, ats_score))
        
        # Strengths & Weaknesses
        strengths = []
        weaknesses = []
        improvements = []
        
        if len(skills_matched) > 2:
            strengths.append(f"Strong overlap in core skills: {', '.join(skills_matched[:3])}")
        if exp_score >= 80:
            strengths.append(f"Demonstrates sufficient experience level of {extracted_exp} years.")
            
        if skills_missing:
            weaknesses.append(f"Missing required technical competencies: {', '.join(skills_missing[:3])}")
            improvements.append(f"Add projects or certifications demonstrating: {', '.join(skills_missing[:3])}")
            
        if exp_score < 70:
            weaknesses.append(f"Experience level ({extracted_exp} years) is below target of {required_experience} years.")
            improvements.append("Highlight leadership inside projects to offset experience duration gaps.")
            
        if not strengths:
            strengths.append("Structured resume layout and legible vocabulary.")
            
        return {
            "atsScore": ats_score,
            "resumeScore": min(100, int(semantic_score * 0.6 + skill_match_pct * 0.4)),
            "skillMatchPercentage": int(skill_match_pct),
            "matchedSkills": skills_matched,
            "missingSkills": skills_missing,
            "strengths": strengths,
            "weaknesses": weaknesses,
            "recommendedImprovements": improvements,
            "candidateSuitabilityScore": ats_score
        }
    except Exception as err:
        logger.error(f"match_resume_to_jd error: {err}")
        return {
            "atsScore": 60,
            "resumeScore": 60,
            "skillMatchPercentage": 50,
            "matchedSkills": [],
            "missingSkills": jd_skills,
            "strengths": ["Legible resume format."],
            "weaknesses": ["Analysis fell back to defaults."],
            "recommendedImprovements": ["Ensure resume keywords match JD listing."],
            "candidateSuitabilityScore": 60
        }
