from flask import redirect, url_for, request
from flask.views import MethodView
from flask_smorest import Blueprint, abort
from flask_jwt_extended import create_access_token
from werkzeug.security import check_password_hash
from models import User
from db import db
from oauth_client import oauth # <--- Importamos la configuración

blp = Blueprint("Auth", "auth", url_prefix="/api", description="Autenticación y SSO")

# --- LOGIN TRADICIONAL (EMAIL/PASS) ---
@blp.route("/auth/login")
class Login(MethodView):
    def post(self):
        data = request.get_json()
        email = data.get("email")
        password = data.get("password")
        
        if not email or not password:
            abort(400, message="Email y contraseña son requeridos.")

        user = User.query.filter_by(email=email).first()
        
        if not user or not self.check_pass(user, password):
            abort(401, message="Credenciales incorrectas")

        token = create_access_token(identity=str(user.id), additional_claims={"role": user.role})
        return self.format_user_response(user, token), 200

    def check_pass(self, user, password):
        # Lógica híbrida (Hash o Texto plano para soporte legacy)
        try:
            if user.password and check_password_hash(user.password, password): return True
        except: pass
        return user.password == password

    def format_user_response(self, user, token):
        return {
            "access_token": token,
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role,
                "balance": float(user.balance or 0),
                "gender": user.gender
            }
        }

# --- RUTAS SSO (GOOGLE) ---
@blp.route("/login/google")
def login_google():
    # Redirige al usuario a la página de Google
    # IMPORTANTE: El redirect_uri debe ser tu URL de Render + /api/auth/google
    redirect_uri = url_for("Auth.auth_google", _external=True)
    # Parche para HTTPS en Render (a veces Render usa http internamente)
    redirect_uri = redirect_uri.replace("http://", "https://") 
    return oauth.google.authorize_redirect(redirect_uri)

@blp.route("/auth/google")
def auth_google():
    try:
        token = oauth.google.authorize_access_token()
        user_info = token.get('userinfo')
        if not user_info:
            # Soporte para versiones viejas de authlib que no parsean userinfo solo
            user_info = oauth.google.userinfo()
            
        return handle_sso_login(user_info, 'google')
    except Exception as e:
        return f"Error en Google Login: {str(e)}", 400

# --- RUTAS SSO (MICROSOFT) ---
@blp.route("/login/microsoft")
def login_microsoft():
    redirect_uri = url_for("Auth.auth_microsoft", _external=True)
    redirect_uri = redirect_uri.replace("http://", "https://")
    return oauth.microsoft.authorize_redirect(redirect_uri)

@blp.route("/auth/microsoft")
def auth_microsoft():
    try:
        token = oauth.microsoft.authorize_access_token()
        # Microsoft a veces requiere llamar a Graph API manualmente si no manda el ID token completo
        resp = oauth.microsoft.get('https://graph.microsoft.com/v1.0/me')
        user_info = resp.json()
        # Normalizamos campos (Microsoft usa 'mail' o 'userPrincipalName')
        user_info['email'] = user_info.get('mail') or user_info.get('userPrincipalName')
        user_info['name'] = user_info.get('displayName')
        
        return handle_sso_login(user_info, 'microsoft')
    except Exception as e:
        return f"Error en Microsoft Login: {str(e)}", 400

# --- LÓGICA COMÚN SSO ---
def handle_sso_login(user_data, provider):
    email = user_data.get('email')
    name = user_data.get('name', 'Usuario SSO')
    
    if not email:
        return "Error: No se pudo obtener el email del proveedor.", 400

    # 1. Buscar usuario en BD
    user = User.query.filter_by(email=email).first()

    # 2. Si no existe, crearlo automáticamente
    if not user:
        user = User(
            name=name,
            email=email,
            role='client',
            password=None, # Usuario SSO no tiene password
            balance=0.0,
            gender='man' # Default
        )
        db.session.add(user)
        db.session.commit()

    # 3. Generar Token JWT de nuestra App
    access_token = create_access_token(identity=str(user.id), additional_claims={"role": user.role})

    # 4. REDIRECCIÓN MÁGICA A LA APP MÓVIL
    # Esto abre la app de nuevo y le pasa el token en la URL
    # Usamos exp:// para Expo Go o tu esquema personalizado en producción
    movil_url = f"exp://?token={access_token}&user_id={user.id}"
    
    # Nota: En producción (APK), esto debería ser "estacionape://auth?..."
    # Puedes usar una variable de entorno para cambiar esto dinámicamente.
    
    return redirect(movil_url)