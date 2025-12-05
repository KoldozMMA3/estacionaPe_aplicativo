from flask.views import MethodView
from flask_smorest import Blueprint, abort
from db import db
from models import Parking
from schemas import ParkingOut, ParkingCreate, ParkingUpdate
from flask_jwt_extended import jwt_required
from flask import request
from sqlalchemy import or_

blp = Blueprint("Parkings", "parkings", url_prefix="/api/parkings", description="CRUD de cocheras")

@blp.route("/")
class ParkingsList(MethodView):
    # GET /api/parkings/ (Dejado abierto para que el mapa cargue sin login)
    @blp.response(200, ParkingOut(many=True))
    def get(self):
        """Listar todas las cocheras para el mapa"""
        return Parking.query.order_by(Parking.id.desc()).all()

    @jwt_required()
    @blp.arguments(ParkingCreate)
    @blp.response(201, ParkingOut)
    def post(self, data):
        """Crear una nueva cochera"""
        p = Parking(**data)
        
        # Validar lógica simple
        if p.available > p.capacity:
            p.available = p.capacity
            
        db.session.add(p)
        db.session.commit()
        return p


@blp.route("/<int:pid>")
class ParkingResource(MethodView):
    @jwt_required()
    @blp.response(200, ParkingOut)
    def get(self, pid):
        """Obtener detalle de una cochera por ID"""
        return Parking.query.get_or_404(pid)

    @jwt_required()
    @blp.arguments(ParkingUpdate)
    @blp.response(200, ParkingOut)
    def put(self, data, pid):
        """Actualizar cochera (precio, foto, etc.)"""
        p = Parking.query.get_or_404(pid)
        
        for k, v in data.items():
            setattr(p, k, v)
            
        # Validaciones extra
        if p.available < 0: p.available = 0
        if p.available > p.capacity: p.available = p.capacity
            
        db.session.commit()
        return p

    @jwt_required()
    def delete(self, pid):
        """Eliminar cochera"""
        p = Parking.query.get_or_404(pid)
        db.session.delete(p)
        db.session.commit()
        # [ANTES: return {"message": se quedaba sin cerrar]
        return {"message": "Cochera eliminada correctamente"}, 200 # <-- ¡CORREGIDO!


# ============================================================
# FUNCIONES ESPECIALES (NO-CRUD)
# ============================================================

# 🔍 1. Buscador para la App (Barra de búsqueda)
@blp.route("/search", methods=["GET"])
def search():
    from flask import request
    
    q = request.args.get("q", "").strip().lower()
    available_only = request.args.get("available_only", "false").lower() == "true"
    
    query = Parking.query

    if q:
        like_str = f"%{q}%"
        # Busca por nombre, dirección o distrito
        query = query.filter(
            or_(
                Parking.name.ilike(like_str),
                Parking.address.ilike(like_str),
                Parking.district.ilike(like_str)
            )
        )
    
    if available_only:
        query = query.filter(Parking.available > 0)

    # Ordenar por precio
    results = query.order_by(Parking.price_per_hour.asc()).all()
    
    # Usamos el Schema manualmente para serializar la lista
    from schemas import ParkingOut
    return ParkingOut(many=True).dump(results), 200


# 🔧 2. Ajuste rápido de disponibilidad (Entrada/Salida de autos)
@blp.route("/<int:pid>/adjust-available", methods=["POST"])
@jwt_required()
def adjust_available(pid):
    from flask import request

    data = request.get_json() or {}
    delta = int(data.get("delta", 0)) # -1 o +1

    p = Parking.query.get_or_404(pid)

    nuevo_valor = p.available + delta
    if nuevo_valor < 0: nuevo_valor = 0
    if nuevo_valor > p.capacity: nuevo_valor = p.capacity

    p.available = nuevo_valor
    db.session.commit()

    return {
        "message": "Disponibilidad actualizada",
        "id": p.id,
        "available": p.available
    }, 200


# 👤 3. Cocheras por Dueño (Para perfil de "Mis Locales")
@blp.route("/owner/<int:owner_id>", methods=["GET"])
@jwt_required()
def get_by_owner(owner_id):
    parkings = Parking.query.filter_by(owner_id=owner_id).all()
    from schemas import ParkingOut
    return ParkingOut(many=True).dump(parkings), 200