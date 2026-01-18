# proctoring.py

def calculate_integrity_risk(events):
    score = 0
    for e in events:
        if e.type == "MULTIPLE_FACES":
            score += 5
        elif e.type == "TAB_SWITCH":
            score += 2
        elif e.type == "COPY_PASTE":
            score += 3
        elif e.type == "FACE_MISSING":
            score += 2

    if score >= 7:
        return "HIGH"
    if score >= 3:
        return "MEDIUM"
    return "LOW"
