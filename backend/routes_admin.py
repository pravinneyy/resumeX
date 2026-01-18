from flask import Blueprint, request, jsonify
from datetime import datetime
from database import db
from models import User

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/users/sync', methods=['POST'])
def sync_user():
    data = request.json
    user = User.query.get(data['id'])
    
    if user:
        user.name = data['name']
        user.email = data['email']
        user.role = data['role']
        user.last_login = datetime.utcnow()
    else:
        user = User(
            id=data['id'],
            name=data['name'],
            email=data['email'],
            role=data['role'],
            last_login=datetime.utcnow()
        )
        db.session.add(user)
    
    db.session.commit()
    return jsonify({"message": "User synced"}), 200

@admin_bp.route('/admin/users', methods=['GET'])
def get_all_users():
    users = User.query.order_by(User.last_login.desc()).all()
    result = []
    for u in users:
        result.append({
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "last_login": u.last_login.strftime("%Y-%m-%d %H:%M:%S")
        })
    return jsonify(result)