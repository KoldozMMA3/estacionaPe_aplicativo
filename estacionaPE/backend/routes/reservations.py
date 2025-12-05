from flask.views import MethodView
from flask_smorest import Blueprint, abort
from db import db
from models import Reservation, Parking
from schemas import ReservationSchema, ReservationUpdate
from flask_jwt_extended import jwt_required
from flask import request
from sqlalchemy import and_

from datetime import datetime, timedelta
import math

blp = Blueprint("Reservations", "reservations", url_prefix="/api/reservations", description="CRUD de reservas + acciones")

# --- UTILIDAD: HORA PERÚ ---
def get_lima_now():
    """Retorna la fecha/hora actual en Lima (UTC-5)"""
    return datetime.utcnow() - timedelta(hours=5)

def adjust_to_lima(dt_obj):
    """Ajusta una fecha UTC a Lima si es necesario"""
    if dt_obj:
        return dt_obj - timedelta(hours=5)
    return dt_obj

@blp.route("/")
class ReservationsList(MethodView):
    @jwt_required()
    @blp.response(200, ReservationSchema(many=True))
    def get(self):
        """Listar todas las reservas"""
        return Reservation.query.order_by(Reservation.id.desc()).all()

    @jwt_required()
    @blp.arguments(ReservationSchema)
    @blp.response(201, ReservationSchema)
    def post(self, data):
        """Crear una nueva reserva con validaciones"""
        
        parking_id = data.get("parking_id")
        user_id = data.get("user_id")
        
        # Ajustamos las horas recibidas a Hora Lima
        start_time = adjust_to_lima(data["start_time"].replace(tzinfo=None))
        end_time = adjust_to_lima(data["end_time"].replace(tzinfo=None))
        
        # Actualizamos la data
        data["start_time"] = start_time
        data["end_time"] = end_time
        data["created_at"] = get_lima_now()

        # --- VALIDACIÓN 1: COCHERA LLENA ---
        parking = Parking.query.get_or_404(parking_id)
        if parking.available <= 0:
            abort(400, message="La cochera está llena (0 espacios disponibles).")

        # --- VALIDACIÓN 2: USUARIO YA TIENE RESERVA EN ESE HORARIO ---
        existing_overlap = Reservation.query.filter(
            Reservation.user_id == user_id,
            Reservation.parking_id == parking_id,
            Reservation.status.in_(["reserved", "paid", "pending"]),
            Reservation.start_time < end_time,
            Reservation.end_time > start_time
        ).first()

        if existing_overlap:
            abort(400, message="Ya tienes una reserva en este horario. No puedes ocupar dos espacios simultáneamente.")

        # --- CREACIÓN ---
        r = Reservation(**data)
        
        # Descontar espacio disponible
        parking.available -= 1
        
        db.session.add(r)
        db.session.add(parking)
        db.session.commit()
        
        return r

@blp.route("/<int:rid>")
class ReservationResource(MethodView):
    @jwt_required()
    @blp.response(200, ReservationSchema)
    def get(self, rid):
        """Obtener una reserva por ID"""
        return Reservation.query.get_or_404(rid)

    @jwt_required()
    @blp.arguments(ReservationUpdate(partial=True)) 
    @blp.response(200, ReservationSchema)
    def put(self, data, rid):
        """Actualizar reserva"""
        r = Reservation.query.get_or_404(rid)
        
        for k, v in data.items():
            setattr(r, k, v)
            
        db.session.commit()
        return r

    @jwt_required()
    def delete(self, rid):
        """Eliminar reserva (y liberar espacio si aplica)"""
        r = Reservation.query.get_or_404(rid)
        
        # Si se elimina una reserva activa, devolver el espacio
        if r.status in ["reserved", "paid", "pending"]:
            parking = Parking.query.get(r.parking_id)
            if parking and parking.available < parking.capacity:
                parking.available += 1
                db.session.add(parking)

        db.session.delete(r)
        db.session.commit()
        return {"message": "Reserva eliminada correctamente"}, 200

# ============================================================
# FUNCIONES ESPECIALES
# ============================================================

@blp.route("/estimate", methods=["GET"])
@jwt_required()
def estimate():
    """
    Estima el costo. Recibe horas y calcula en base a tarifa.
    """
    def parse_iso(s: str) -> datetime:
        return datetime.fromisoformat(s.replace("Z",""))

    parking_id = request.args.get("parking_id", type=int)
    start_str  = request.args.get("start")
    end_str    = request.args.get("end")

    if not (parking_id and start_str and end_str):
        abort(400, message="Faltan datos (parking_id, start, end)")

    try:
        start = parse_iso(start_str)
        end   = parse_iso(end_str)
    except:
        abort(400, message="Formato de fecha inválido")

    if end <= start:
        abort(400, message="La hora fin debe ser mayor a inicio")

    parking = Parking.query.get_or_404(parking_id)
    seconds = (end - start).total_seconds()
    
    # Mínimo 1 hora
    hours = max(1, math.ceil(seconds / 3600.0))
    
    total = round(hours * float(parking.price_per_hour), 2)

    return {
        "parking_id": parking_id,
        "duration_hours": hours,
        "estimated_cost": total,
        "unit_price": str(parking.price_per_hour)
    }, 200