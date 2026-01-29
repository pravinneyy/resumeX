def calculate_psychometric_score(answers: dict) -> int:
    """
    Calculates score based on Likert Scale (1-5).
    Example: 10 questions. Max raw score = 50.
    """
    if not answers:
        return 0
        
    total_points = 0
    # Assuming all questions are positive traits (1=Bad, 5=Good)
    # In a real app, you'd have a map of positive/negative questions.
    max_possible = len(answers) * 5 
    
    for _, value in answers.items():
        total_points += int(value)

    if max_possible == 0:
        return 0

    # Normalize to 0-100 scale
    normalized_score = (total_points / max_possible) * 100
    return int(normalized_score)

def calculate_final_grade(tech_score, psycho_score, resume_score=75):
    """
    Weighted Average Formula for the Final Verdict.
    """
    # WEIGHTS (Adjust these to change the engine's bias)
    W_TECH = 0.50   # 50% Technical Skills
    W_PSY = 0.30    # 30% Culture Fit
    W_RES = 0.20    # 20% Resume Match
    
    final_score = (tech_score * W_TECH) + (psycho_score * W_PSY) + (resume_score * W_RES)
    
    return int(final_score)