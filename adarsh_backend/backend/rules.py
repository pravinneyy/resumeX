# rules.py
def make_decision(tech, psycho, integrity):
    if integrity == "HIGH":
        return "NO_HIRE", "High integrity risk detected"

    if tech >= 70 and psycho >= 60:
        return "HIRE", "Strong technical and psychometric performance"

    if tech >= 80 and psycho < 50:
        return "NO_HIRE", "Technically strong but low psychometric fit"

    return "NO_HIRE", "Did not meet minimum thresholds"
