# CÓDIGO ACTUALIZADO DE routes/auth.py
from flask.views import MethodView
from flask_smorest import Blueprint, abort
from flask_jwt_extended import create_access_token
from werkzeug.security import check_password_hash # <--- IMPORTANTE
from flask import request
from models import User
from db import db 

blp = Blueprint("Auth", "auth", url_prefix="/api/auth", description="Autenticación")

@blp.route("/login")
class Login(MethodView):
    def post(self):
        data = request.get_json()
        email = data.get("email")
        password = data.get("password")
        
        if not email or not password:
            abort(400, message="Email y contraseña son requeridos.")

        user = User.query.filter_by(email=email).first()
        
        if not user:
            abort(401, message="Credenciales incorrectas")

        # LOGICA DE VERIFICACIÓN CORREGIDA: Primero intenta comparar hash, luego texto plano
        password_ok = False
        
        try:
            if user.password and check_password_hash(user.password, password):
                password_ok = True
        except ValueError:
            # Si el campo password no es un hash (es texto plano, como el usuario 'carlos' insertado en SQL)
            if user.password == password:
                password_ok = True

        if not password_ok:
            abort(401, message="Credenciales incorrectas")

        # Generar el token
        token = create_access_token(
            identity=str(user.id),
            additional_claims={"role": user.role}
        )
        
        return {
            "access_token": token,
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role,
                # AQUÍ ESTÁ LA CLAVE: Devuelve el saldo real de la BD
                "balance": float(user.balance), 
                "dni": user.dni,
                "phone": user.phone,
                "plate": user.plate,
                "gender": user.gender
            }
        }, 200