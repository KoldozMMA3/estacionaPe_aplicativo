from datetime import datetime
from decimal import Decimal
from db import db

class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(180), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=True) 
    role = db.Column(db.String(20), nullable=False, default="client")
    balance = db.Column(db.Numeric(10, 2), default=0.00)
    
    # --- NUEVOS CAMPOS ---
    dni = db.Column(db.String(20))
    phone = db.Column(db.String(20))
    plate = db.Column(db.String(20))
    gender = db.Column(db.String(10))
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# ... (El resto de modelos Parking, Reservation, etc. déjalos igual) ...
# Solo asegúrate de no borrar las otras clases (Parking, etc.)
class Parking(db.Model):
    # ... (código existente de Parking) ...
    __tablename__ = "parkings"
    id = db.Column(db.Integer, primary_key=True)
    owner_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    name = db.Column(db.String(160), nullable=False)
    address = db.Column(db.String(200))
    district = db.Column(db.String(120))
    lat = db.Column(db.Float, nullable=False)
    lng = db.Column(db.Float, nullable=False)
    price_per_hour = db.Column(db.Numeric(10, 2), nullable=False, default=Decimal("0.00"))
    capacity = db.Column(db.Integer, nullable=False, default=0)
    available = db.Column(db.Integer, nullable=False, default=0)
    hours = db.Column(db.String(100))
    image_url = db.Column(db.String(255))
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Reservation(db.Model):
    __tablename__ = "reservations"
    id = db.Column(db.Integer, primary_key=True)
    parking_id = db.Column(db.Integer, db.ForeignKey("parkings.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime, nullable=True)
    status = db.Column(db.String(20), default="reserved") 
    total_amount = db.Column(db.Numeric(10, 2))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Payment(db.Model):
    __tablename__ = "payments"
    id = db.Column(db.Integer, primary_key=True)
    reservation_id = db.Column(db.Integer, db.ForeignKey("reservations.id"), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    method = db.Column(db.String(30), default="qr")
    status = db.Column(db.String(20), default="pending")
    provider_ref = db.Column(db.String(180))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Promotion(db.Model):
    __tablename__ = "promotions"
    id = db.Column(db.Integer, primary_key=True)
    parking_id = db.Column(db.Integer, db.ForeignKey("parkings.id"), nullable=False)
    title = db.Column(db.String(160), nullable=False)
    description = db.Column(db.Text)
    discount_percent = db.Column(db.Numeric(5, 2))
    flat_amount = db.Column(db.Numeric(10, 2))
    start_date = db.Column(db.DateTime)
    end_date = db.Column(db.DateTime)
    is_active = db.Column(db.Boolean, default=True)