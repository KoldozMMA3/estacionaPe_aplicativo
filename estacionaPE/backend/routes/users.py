from flask.views import MethodView
from flask_smorest import Blueprint, abort
from db import db
from models import User
from schemas import UserOut, UserCreate, UserUpdate
from flask_jwt_extended import jwt_required
from werkzeug.security import generate_password_hash

blp = Blueprint("Users", "users", url_prefix="/api/users", description="CRUD de usuarios")

@blp.route("/")
class UsersList(MethodView):
    @jwt_required()
    @blp.response(200, UserOut(many=True))
    def get(self):
        """Listar todos los usuarios"""
        return User.query.order_by(User.id.desc()).all()

    @blp.arguments(UserCreate)
    @blp.response(201, UserOut)
    def post(self, data):
        """Crear un nuevo usuario"""

        # 🔍 Validar si el email ya está registrado
        if User.query.filter_by(email=data["email"]).first():
            abort(400, message="El correo ya está registrado.")

        # 🔐 Encriptar la contraseña antes de guardar
        if "password" in data:
            data["password"] = generate_password_hash(data["password"])

        user = User(**data)
        db.session.add(user)
        db.session.commit()
        return user


@blp.route("/<int:user_id>")
class UserResource(MethodView):
    @jwt_required()
    @blp.response(200, UserOut)
    def get(self, user_id):
        """Obtener usuario por ID"""
        return User.query.get_or_404(user_id)

    @jwt_required()
    @blp.arguments(UserUpdate)
    @blp.response(200, UserOut)
    def put(self, data, user_id):
        """Actualizar usuario (Perfil y Contraseña)"""
        user = User.query.get_or_404(user_id)

        # 1. VALIDAR CORREO DUPLICADO
        if "email" in data and data["email"] != user.email:
            existing = User.query.filter_by(email=data["email"]).first()
            if existing:
                abort(400, message="No se puede cambiar a este correo porque ya está en uso.")

        # 2. CAMBIAR CONTRASEÑA (Si se envía)
        if "password" in data and data["password"]:
            data["password"] = generate_password_hash(data["password"])

        for key, value in data.items():
            setattr(user, key, value)

        db.session.commit()
        return user

    @jwt_required()
    def delete(self, user_id):
        """Eliminar usuario"""
        user = User.query.get_or_404(user_id)
        db.session.delete(user)
        db.session.commit()
        return {"message": "Usuario eliminado correctamente"}, 200