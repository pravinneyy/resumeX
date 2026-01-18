from datetime import datetime
from database import db

# --- USER MODEL ---
class User(db.Model):
    id = db.Column(db.String(100), primary_key=True) # Clerk ID
    name = db.Column(db.String(100))
    email = db.Column(db.String(100))
    role = db.Column(db.String(50)) 
    last_login = db.Column(db.DateTime, default=datetime.utcnow)

# --- JOB MODEL ---
class Job(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    company = db.Column(db.String(100), nullable=False)
    location = db.Column(db.String(100), nullable=False)
    salary = db.Column(db.String(50), nullable=False)
    type = db.Column(db.String(50), nullable=False)
    skills = db.Column(db.String(200), nullable=False)
    recruiter_id = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship
    applications = db.relationship('Application', backref='job_details', lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "company": self.company,
            "location": self.location,
            "salary": self.salary,
            "type": self.type,
            "skills": self.skills.split(','),
            "posted": self.created_at.strftime("%Y-%m-%d"),
            "recruiter_id": self.recruiter_id
        }

# --- APPLICATION MODEL ---
class Application(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    job_id = db.Column(db.Integer, db.ForeignKey('job.id'), nullable=False)
    candidate_id = db.Column(db.String(100), nullable=False)
    candidate_name = db.Column(db.String(100), nullable=False)
    candidate_email = db.Column(db.String(100), nullable=False)
    status = db.Column(db.String(50), default="Applied") 
    applied_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Resume Data
    resume_filename = db.Column(db.String(200), nullable=True) 
    parsed_skills = db.Column(db.String(500), nullable=True)   

    def to_dict(self):
        return {
            "id": self.id,
            "job_id": self.job_id,
            "job_title": self.job_details.title if self.job_details else "Unknown Job",
            "candidate_name": self.candidate_name,
            "candidate_email": self.candidate_email,
            "status": self.status,
            "applied_at": self.applied_at.strftime("%Y-%m-%d"),
            "resume_url": f"http://127.0.0.1:5000/uploads/{self.resume_filename}" if self.resume_filename else None,
            "skills": self.parsed_skills.split(',') if self.parsed_skills else []
        }