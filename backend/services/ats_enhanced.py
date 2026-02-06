"""
Enhanced ATS System - Production-Grade Resume Screening
=======================================================
This module extends the base AIGatekeeper with:
1. Education parsing (degree, field, institution)
2. Location extraction (city, country)
3. Soft skills detection
4. Job title extraction for seniority verification
5. Hard gate checking
6. Enhanced scoring formula; 

Used by the bulk upload system for scalable processing.
"""

import re
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from enum import Enum


class EducationLevel(Enum):
    PHD = "phd"
    MASTER = "master"
    BACHELOR = "bachelor"
    ASSOCIATE = "associate"
    HIGH_SCHOOL = "high_school"
    UNKNOWN = "unknown"


@dataclass
class EnhancedResumeData:
    """Structured resume data after enhanced parsing"""
    # Personal
    name: str
    email: str
    phone: str
    
    # Location
    location_city: Optional[str]
    location_country: Optional[str]
    
    # Education
    education_level: EducationLevel
    education_field: Optional[str]
    education_institution: Optional[str]
    graduation_year: Optional[int]
    
    # Experience
    experience_years: int
    job_titles: List[str]
    
    # Skills
    technical_skills: List[str]
    soft_skills: List[str]
    
    # Raw text for advanced matching
    raw_text: str


class EnhancedATSParser:
    """
    Enhanced resume parser with education, location, and soft skills extraction.
    """
    
    # ===== SOFT SKILLS DATABASE =====
    SOFT_SKILLS = {
        # Communication
        "communication", "written communication", "verbal communication", 
        "presentation", "public speaking", "storytelling",
        
        # Leadership
        "leadership", "team lead", "mentoring", "coaching", "management",
        "decision making", "strategic thinking", "vision",
        
        # Collaboration
        "teamwork", "collaboration", "cross-functional", "interpersonal",
        "relationship building", "stakeholder management",
        
        # Problem Solving
        "problem solving", "analytical", "critical thinking", "research",
        "troubleshooting", "debugging", "root cause analysis",
        
        # Work Ethic
        "self-motivated", "proactive", "initiative", "attention to detail",
        "time management", "organization", "prioritization", "multitasking",
        
        # Adaptability
        "adaptability", "flexibility", "fast learner", "quick learner",
        "continuous learning", "growth mindset",
        
        # Creativity
        "creativity", "innovation", "design thinking", "brainstorming",
    }
    
    # ===== EDUCATION PATTERNS =====
    DEGREE_PATTERNS = {
        EducationLevel.PHD: [
            r'\bph\.?d\.?\b', r'\bdoctor(?:ate)?\b', r'\bdr\.\s', 
            r'\bdoctoral\b', r'\bpostdoc\b'
        ],
        EducationLevel.MASTER: [
            r'\bm\.?s\.?\b(?!\s*office)', r'\bm\.?a\.?\b', r'\bm\.?b\.?a\.?\b', 
            r'\bmaster(?:\'?s)?\b', r'\bm\.?tech\b', r'\bm\.?sc\b', r'\bm\.?eng\b'
        ],
        EducationLevel.BACHELOR: [
            r'\bb\.?s\.?\b', r'\bb\.?a\.?\b', r'\bbachelor(?:\'?s)?\b',
            r'\bb\.?tech\b', r'\bb\.?sc\b', r'\bb\.?e\.?\b', r'\bundergrad(?:uate)?\b'
        ],
        EducationLevel.ASSOCIATE: [
            r'\bassociate(?:\'?s)?\s*(?:degree)?\b', r'\ba\.?s\.?\b', r'\ba\.?a\.?\b'
        ],
        EducationLevel.HIGH_SCHOOL: [
            r'\bhigh\s*school\b', r'\bh\.?s\.?\s*diploma\b', r'\bged\b'
        ]
    }
    
    # ===== EDUCATION FIELDS =====
    EDUCATION_FIELDS = {
        "computer science": ["computer science", "cs", "computing", "informatics"],
        "engineering": ["engineering", "engineer"],
        "software engineering": ["software engineering", "software eng"],
        "information technology": ["information technology", "it", "information systems"],
        "data science": ["data science", "data analytics", "analytics"],
        "mathematics": ["mathematics", "math", "applied math", "statistics"],
        "physics": ["physics", "applied physics"],
        "business": ["business", "mba", "business administration", "management"],
        "economics": ["economics", "finance", "accounting"],
        "electrical engineering": ["electrical engineering", "ee", "electronics"],
        "mechanical engineering": ["mechanical engineering", "me"],
    }
    
    # ===== UNIVERSITY KEYWORDS =====
    UNIVERSITY_KEYWORDS = [
        "university", "college", "institute", "school of", "faculty of",
        "iit", "mit", "stanford", "harvard", "oxford", "cambridge", "berkeley"
    ]
    
    # ===== COUNTRY/LOCATION PATTERNS =====
    COUNTRIES = [
        "united states", "usa", "us", "india", "uk", "united kingdom", "canada",
        "australia", "germany", "france", "singapore", "netherlands", "ireland",
        "japan", "china", "brazil", "spain", "italy", "sweden", "switzerland"
    ]
    
    MAJOR_CITIES = [
        "new york", "san francisco", "seattle", "austin", "boston", "chicago",
        "los angeles", "denver", "atlanta", "bangalore", "hyderabad", "pune",
        "mumbai", "delhi", "chennai", "london", "berlin", "amsterdam", "dublin",
        "toronto", "vancouver", "sydney", "melbourne", "singapore", "tokyo"
    ]
    
    # ===== JOB TITLE PATTERNS =====
    SENIORITY_PATTERNS = {
        "senior": [r'\bsenior\b', r'\bsr\.?\b', r'\blead\b', r'\bprincipal\b', r'\bstaff\b'],
        "mid": [r'\bmid[- ]?level\b', r'\b(?:software|full[- ]?stack)\s+(?:engineer|developer)\b'],
        "junior": [r'\bjunior\b', r'\bjr\.?\b', r'\bentry[- ]?level\b', r'\bintern\b', r'\btrainee\b'],
        "manager": [r'\bmanager\b', r'\bdirector\b', r'\bhead\s+of\b', r'\bvp\b', r'\bchief\b']
    }
    
    @staticmethod
    def extract_education(text: str) -> Tuple[EducationLevel, Optional[str], Optional[str], Optional[int]]:
        """
        Extract education details from resume text.
        
        Returns: (level, field, institution, graduation_year)
        """
        text_lower = text.lower()
        
        # 1. Detect education level
        education_level = EducationLevel.UNKNOWN
        for level, patterns in EnhancedATSParser.DEGREE_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, text_lower):
                    education_level = level
                    break
            if education_level != EducationLevel.UNKNOWN:
                break
        
        # 2. Detect education field
        education_field = None
        for field_name, keywords in EnhancedATSParser.EDUCATION_FIELDS.items():
            for keyword in keywords:
                if keyword in text_lower:
                    education_field = field_name
                    break
            if education_field:
                break
        
        # 3. Detect institution
        institution = None
        for keyword in EnhancedATSParser.UNIVERSITY_KEYWORDS:
            # Look for "University of X" or "X University" patterns
            pattern = rf'([A-Z][a-zA-Z\s]+\s+{keyword})|({keyword}\s+of\s+[A-Z][a-zA-Z\s]+)'
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                institution = match.group(0).strip()
                break
        
        # 4. Detect graduation year
        graduation_year = None
        # Look for years in education context
        year_pattern = r'(?:graduat|class\s+of|batch\s+of).*?(20\d{2}|19\d{2})'
        match = re.search(year_pattern, text_lower)
        if match:
            graduation_year = int(match.group(1))
        else:
            # Fallback: Look for recent years near education keywords
            edu_context = r'(?:university|college|degree|bachelor|master|phd).*?(20\d{2})'
            match = re.search(edu_context, text_lower)
            if match:
                graduation_year = int(match.group(1))
        
        return education_level, education_field, institution, graduation_year
    
    @staticmethod
    def extract_location(text: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Extract location (city, country) from resume.
        
        Returns: (city, country)
        """
        text_lower = text.lower()
        
        city = None
        country = None
        
        # Check for cities
        for c in EnhancedATSParser.MAJOR_CITIES:
            if c in text_lower:
                city = c.title()
                break
        
        # Check for countries
        for c in EnhancedATSParser.COUNTRIES:
            if c in text_lower:
                country = c.title()
                if c == "us" or c == "usa":
                    country = "United States"
                elif c == "uk":
                    country = "United Kingdom"
                break
        
        return city, country
    
    @staticmethod
    def extract_soft_skills(text: str) -> List[str]:
        """
        Extract soft skills from resume text.
        """
        text_lower = text.lower()
        detected = []
        
        for skill in EnhancedATSParser.SOFT_SKILLS:
            if skill in text_lower:
                detected.append(skill.title())
        
        return list(set(detected))
    
    @staticmethod
    def extract_job_titles(text: str) -> List[str]:
        """
        Extract job titles from resume to verify seniority.
        """
        # Common job title patterns
        title_patterns = [
            r'(?:^|\n)\s*([A-Z][a-zA-Z\s]+(?:Engineer|Developer|Manager|Analyst|Designer|Architect|Lead|Director))',
            r'(?:worked as|position|role|title)[:\s]+([A-Za-z\s]+(?:Engineer|Developer|Manager|Analyst))',
        ]
        
        titles = []
        for pattern in title_patterns:
            matches = re.findall(pattern, text)
            titles.extend([m.strip() for m in matches if len(m.strip()) < 50])
        
        return list(set(titles))[:5]  # Return top 5 unique titles
    
    @staticmethod
    def detect_seniority(text: str, experience_years: int) -> str:
        """
        Detect candidate's seniority level based on titles and experience.
        
        Returns: 'senior', 'mid', 'junior', 'manager'
        """
        text_lower = text.lower()
        
        # Check for explicit seniority in titles
        for level, patterns in EnhancedATSParser.SENIORITY_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, text_lower):
                    return level
        
        # Fallback to experience-based detection
        if experience_years >= 7:
            return "senior"
        elif experience_years >= 3:
            return "mid"
        else:
            return "junior"


class HardGateChecker:
    """
    Checks hard requirements (auto-reject conditions).
    """
    
    @staticmethod
    def check_experience_gate(
        candidate_experience: int, 
        required_experience: int
    ) -> Tuple[bool, Optional[str]]:
        """Check if candidate meets minimum experience requirement."""
        if required_experience > 0 and candidate_experience < required_experience:
            return False, f"Requires {required_experience}+ years, has {candidate_experience}"
        return True, None
    
    @staticmethod
    def check_education_gate(
        candidate_education: EducationLevel,
        required_education: str
    ) -> Tuple[bool, Optional[str]]:
        """Check if candidate meets education requirement."""
        if not required_education or required_education.lower() == "any":
            return True, None
        
        education_hierarchy = {
            "high_school": 1,
            "associate": 2, 
            "bachelor": 3,
            "master": 4,
            "phd": 5
        }
        
        required_level = education_hierarchy.get(required_education.lower(), 0)
        candidate_level = education_hierarchy.get(candidate_education.value, 0)
        
        if candidate_level < required_level:
            return False, f"Requires {required_education}, has {candidate_education.value}"
        return True, None
    
    @staticmethod
    def check_must_have_skills(
        candidate_skills: List[str],
        must_have_skills: List[str]
    ) -> Tuple[bool, Optional[str], List[str]]:
        """
        Check if candidate has ALL must-have skills.
        
        Returns: (passed, reason, missing_skills)
        """
        if not must_have_skills:
            return True, None, []
        
        candidate_skills_lower = [s.lower() for s in candidate_skills]
        missing = []
        
        for skill in must_have_skills:
            skill_lower = skill.lower().strip()
            if not skill_lower:
                continue
            
            # Check for exact or partial match
            found = False
            for cs in candidate_skills_lower:
                if skill_lower in cs or cs in skill_lower:
                    found = True
                    break
            
            if not found:
                missing.append(skill)
        
        if missing:
            return False, f"Missing required skills: {', '.join(missing)}", missing
        return True, None, []
    
    @staticmethod
    def check_location_gate(
        candidate_city: Optional[str],
        candidate_country: Optional[str],
        location_requirement: str,
        allowed_locations: List[str]
    ) -> Tuple[bool, Optional[str]]:
        """Check location requirements."""
        if location_requirement.lower() in ["any", "remote"]:
            return True, None
        
        if not allowed_locations:
            return True, None
        
        # Check if candidate location matches any allowed location
        candidate_location = f"{candidate_city or ''} {candidate_country or ''}".lower().strip()
        
        if not candidate_location:
            # Can't determine location - pass with warning
            return True, None
        
        for allowed in allowed_locations:
            if allowed.lower() in candidate_location or candidate_location in allowed.lower():
                return True, None
        
        return False, f"Location {candidate_location} not in allowed: {', '.join(allowed_locations)}"
    
    @staticmethod
    def run_all_gates(
        candidate_experience: int,
        candidate_education: EducationLevel,
        candidate_skills: List[str],
        candidate_city: Optional[str],
        candidate_country: Optional[str],
        job_min_experience: int,
        job_required_education: Optional[str],
        job_must_have_skills: List[str],
        job_location_requirement: str,
        job_allowed_locations: List[str]
    ) -> Tuple[bool, List[str]]:
        """
        Run all hard gate checks.
        
        Returns: (all_passed, list_of_failure_reasons)
        """
        failures = []
        
        # Experience gate
        passed, reason = HardGateChecker.check_experience_gate(
            candidate_experience, job_min_experience
        )
        if not passed:
            failures.append(reason)
        
        # Education gate
        passed, reason = HardGateChecker.check_education_gate(
            candidate_education, job_required_education
        )
        if not passed:
            failures.append(reason)
        
        # Must-have skills gate
        passed, reason, _ = HardGateChecker.check_must_have_skills(
            candidate_skills, job_must_have_skills
        )
        if not passed:
            failures.append(reason)
        
        # Location gate
        passed, reason = HardGateChecker.check_location_gate(
            candidate_city, candidate_country,
            job_location_requirement, job_allowed_locations
        )
        if not passed:
            failures.append(reason)
        
        return len(failures) == 0, failures


class EnhancedScorer:
    """
    Enhanced scoring with multiple factors.
    
    Formula:
    - 50% Technical Skills Match
    - 25% Experience Match
    - 15% Education Match (if required)
    - 10% Location/Other Bonus
    """
    
    @staticmethod
    def calculate_skill_score(
        matching_skills: List[str],
        required_skills: List[str],
        nice_to_have_skills: List[str],
        candidate_skills: List[str]
    ) -> float:
        """
        Calculate skill match score (0-50 points).
        
        Required skills get more weight than nice-to-have.
        """
        if not required_skills and not nice_to_have_skills:
            return 25.0  # Default if no requirements
        
        score = 0.0
        
        # Required skills (worth up to 40 points)
        if required_skills:
            ratio = len(matching_skills) / len(required_skills)
            score += ratio * 40
        else:
            score += 20  # Half points if no required skills specified
        
        # Nice-to-have skills (worth up to 10 points)
        if nice_to_have_skills:
            candidate_lower = [s.lower() for s in candidate_skills]
            nice_matches = 0
            for skill in nice_to_have_skills:
                skill_lower = skill.lower().strip()
                if any(skill_lower in cs or cs in skill_lower for cs in candidate_lower):
                    nice_matches += 1
            
            if nice_to_have_skills:
                score += (nice_matches / len(nice_to_have_skills)) * 10
        else:
            score += 5  # Half points if no nice-to-have specified
        
        return min(50.0, score)
    
    @staticmethod
    def calculate_experience_score(
        candidate_years: int,
        required_years: int
    ) -> float:
        """
        Calculate experience match score (0-25 points).
        """
        if required_years <= 0:
            # No requirement - give points for having experience
            if candidate_years >= 5:
                return 25.0
            elif candidate_years >= 2:
                return 20.0
            elif candidate_years >= 1:
                return 15.0
            else:
                return 10.0
        
        ratio = min(candidate_years / required_years, 1.5)  # Cap at 150%
        return min(25.0, ratio * 25)
    
    @staticmethod
    def calculate_education_score(
        candidate_education: EducationLevel,
        required_education: Optional[str]
    ) -> float:
        """
        Calculate education match score (0-15 points).
        """
        if not required_education or required_education.lower() == "any":
            # No requirement - give partial credit based on education
            education_points = {
                EducationLevel.PHD: 15,
                EducationLevel.MASTER: 12,
                EducationLevel.BACHELOR: 10,
                EducationLevel.ASSOCIATE: 7,
                EducationLevel.HIGH_SCHOOL: 5,
                EducationLevel.UNKNOWN: 5
            }
            return education_points.get(candidate_education, 5)
        
        education_hierarchy = {
            "high_school": 1,
            "associate": 2,
            "bachelor": 3,
            "master": 4,
            "phd": 5
        }
        
        required_level = education_hierarchy.get(required_education.lower(), 0)
        candidate_level = education_hierarchy.get(candidate_education.value, 0)
        
        if candidate_level >= required_level:
            return 15.0
        elif candidate_level == required_level - 1:
            return 10.0  # One level below
        else:
            return 5.0
    
    @staticmethod
    def calculate_bonus_score(
        soft_skills: List[str],
        location_matched: bool
    ) -> float:
        """
        Calculate bonus points (0-10 points).
        
        - Soft skills: Up to 5 points
        - Location match: Up to 5 points
        """
        score = 0.0
        
        # Soft skills (up to 5 points)
        if soft_skills:
            soft_skill_points = min(len(soft_skills), 5)  # 1 point per skill, max 5
            score += soft_skill_points
        
        # Location match (5 points if matched or no requirement)
        if location_matched:
            score += 5.0
        
        return min(10.0, score)
    
    @staticmethod
    def calculate_total_score(
        matching_skills: List[str],
        required_skills: List[str],
        nice_to_have_skills: List[str],
        candidate_skills: List[str],
        candidate_experience: int,
        required_experience: int,
        candidate_education: EducationLevel,
        required_education: Optional[str],
        soft_skills: List[str],
        location_matched: bool
    ) -> Tuple[int, Dict]:
        """
        Calculate total ATS score (0-100).
        
        Returns: (total_score, breakdown_dict)
        """
        skill_score = EnhancedScorer.calculate_skill_score(
            matching_skills, required_skills, nice_to_have_skills, candidate_skills
        )
        
        experience_score = EnhancedScorer.calculate_experience_score(
            candidate_experience, required_experience
        )
        
        education_score = EnhancedScorer.calculate_education_score(
            candidate_education, required_education
        )
        
        bonus_score = EnhancedScorer.calculate_bonus_score(
            soft_skills, location_matched
        )
        
        total = int(skill_score + experience_score + education_score + bonus_score)
        total = min(100, max(0, total))
        
        breakdown = {
            "skill_score": round(skill_score, 1),
            "experience_score": round(experience_score, 1),
            "education_score": round(education_score, 1),
            "bonus_score": round(bonus_score, 1),
            "total": total
        }
        
        return total, breakdown
    
    @staticmethod
    def get_decision(
        score: int,
        passed_hard_gates: bool,
        auto_advance_threshold: int = 75,
        auto_reject_threshold: int = 40
    ) -> Tuple[str, str]:
        """
        Determine decision based on score and gates.
        
        Returns: (decision, status)
        - decision: ADVANCE, REVIEW, REJECT
        - status: Application status to set
        """
        if not passed_hard_gates:
            return "REJECT", "ATS Rejected"
        
        if score >= auto_advance_threshold:
            return "ADVANCE", "Assessment Invited"
        elif score >= auto_reject_threshold:
            return "REVIEW", "Pending Review"
        else:
            return "REJECT", "ATS Rejected"
