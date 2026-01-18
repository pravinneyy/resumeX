import os
from flask import Blueprint, request, jsonify, current_app, send_from_directory
from werkzeug.utils import secure_filename
from database import db
from models import Job, Application
from resume_reader import extract_text_from_file, parse_resume_sections

jobs_bp = Blueprint('jobs', __name__)

# --- JOB ROUTES ---
@jobs_bp.route('/jobs', methods=['GET', 'POST'])
def jobs_route():
    if request.method == 'POST':
        data = request.json
        new_job = Job(
            title=data['title'],
            company=data.get('company', 'ResumeX Inc'),
            location=data['location'],
            salary=data['salary'],
            type=data['type'],
            skills=data['skills'],
            recruiter_id=data['recruiterId']
        )
        db.session.add(new_job)
        db.session.commit()
        return jsonify({"message": "Job created", "job": new_job.to_dict()}), 201
    
    jobs = Job.query.order_by(Job.created_at.desc()).all()
    return jsonify([job.to_dict() for job in jobs])

# --- APPLICATION & RESUME ROUTES ---
@jobs_bp.route('/apply', methods=['POST'])
def apply_job():
    if 'resume' not in request.files:
        return jsonify({"message": "No resume file uploaded"}), 400
    
    file = request.files['resume']
    data = request.form

    existing = Application.query.filter_by(job_id=data['jobId'], candidate_id=data['candidateId']).first()
    if existing:
        return jsonify({"message": "You have already applied!"}), 400

    # Save File
    filename = secure_filename(f"{data['candidateId']}_{data['jobId']}_{file.filename}")
    filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)

    # Parse Resume using the Logic Module
    text = extract_text_from_file(filepath)
    parsed_data = parse_resume_sections(text)
    skills_str = ",".join(parsed_data['skills'])

    application = Application(
        job_id=data['jobId'],
        candidate_id=data['candidateId'],
        candidate_name=data['candidateName'],
        candidate_email=data['candidateEmail'],
        resume_filename=filename,
        parsed_skills=skills_str
    )
    db.session.add(application)
    db.session.commit()

    return jsonify({"message": "Application submitted successfully!"}), 201

@jobs_bp.route('/recruiter/applications', methods=['GET'])
def get_recruiter_applications():
    recruiter_id = request.args.get('recruiterId')
    applications = db.session.query(Application).join(Job).filter(Job.recruiter_id == recruiter_id).all()
    return jsonify([app.to_dict() for app in applications])

@jobs_bp.route('/candidate/applications', methods=['GET'])
def get_candidate_applications():
    candidate_id = request.args.get('candidateId')
    applications = Application.query.filter_by(candidate_id=candidate_id).all()
    return jsonify([app.to_dict() for app in applications])

# Resume Parser (Standalone)
@jobs_bp.route('/resume/parse', methods=['POST'])
def parse_resume_route():
    if 'file' not in request.files:
        return jsonify({"message": "No file uploaded"}), 400
    
    file = request.files['file']
    filename = secure_filename(file.filename)
    filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)

    text = extract_text_from_file(filepath)
    parsed_data = parse_resume_sections(text)

    return jsonify(parsed_data)