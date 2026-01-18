import os
from flask import Flask, send_from_directory
from flask_cors import CORS
from database import db

# Import Blueprints
from routes_admin import admin_bp
from routes_jobs import jobs_bp

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Configuration
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///jobs.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Initialize DB with App
db.init_app(app)

# Register Blueprints
app.register_blueprint(admin_bp, url_prefix='/api')
app.register_blueprint(jobs_bp, url_prefix='/api')

# Global Route for File Serving (Cannot be in blueprint easily)
@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# Create Tables
with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(debug=True, port=5000)