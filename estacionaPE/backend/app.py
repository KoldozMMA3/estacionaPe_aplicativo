from flask import Flask
from flask_smorest import Api
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate  # <--- ESTO ERA LO QUE FALTABA
from db import db
import config

# --- IMPORTAR RUTAS ---
from routes.auth import blp as AuthBLP
from routes.users import blp as UsersBLP          
from routes.parkings import blp as ParkingsBLP
from routes.reservations import blp as ReservationsBLP
from routes.payments import blp as PaymentsBLP      
from routes.promotions import blp as PromotionsBLP  
from routes.reports import blp as ReportsBLP
from oauth_client import register_oauth

def create_app():
    app = Flask(__name__)
    
    # Cargar configuración desde config.py
    app.config["SQLALCHEMY_DATABASE_URI"] = config.SQLALCHEMY_DATABASE_URI
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SECRET_KEY"] = config.SECRET_KEY
    app.config["JWT_SECRET_KEY"] = config.SECRET_KEY
    
    app.config["API_TITLE"] = config.API_TITLE
    app.config["API_VERSION"] = config.API_VERSION
    app.config["OPENAPI_VERSION"] = config.OPENAPI_VERSION

    db.init_app(app)
    
    # Inicializar Migrate correctamente ahora que está importado
    migrate = Migrate(app, db)
    
    JWTManager(app)

    # Inicializar OAuth (SSO)
    register_oauth(app)
    
    api = Api(app)
    
    # --- REGISTRAR BLUEPRINTS ---
    api.register_blueprint(AuthBLP)
    api.register_blueprint(UsersBLP)
    api.register_blueprint(ParkingsBLP)
    api.register_blueprint(ReservationsBLP)
    
    # --- ¡AQUÍ REGISTRAMOS LOS NUEVOS MÓDULOS! ---
    api.register_blueprint(PaymentsBLP)    
    api.register_blueprint(PromotionsBLP)  
    api.register_blueprint(ReportsBLP)

    # Esto asegura que las tablas se creen si no existen al iniciar
    #with app.app_context():
    #    db.create_all()

    return app

if __name__ == "__main__":
    app = create_app()
    # 0.0.0.0 permite que el celular vea la PC
    app.run(host="0.0.0.0", port=5000, debug=True)