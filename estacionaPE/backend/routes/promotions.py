from flask.views import MethodView
from flask_smorest import Blueprint, abort
from db import db
from models import Promotion
from schemas import PromotionOut, PromotionCreate, PromotionUpdate
from flask_jwt_extended import jwt_required
from datetime import datetime

blp = Blueprint("Promotions", "promotions", url_prefix="/api/promotions", description="CRUD de promociones")

@blp.route("/")
class PromoList(MethodView):
    @jwt_required()
    @blp.response(200, PromotionOut(many=True))
    def get(self):
        """Listar todas las promociones (Admin)"""
        return Promotion.query.order_by(Promotion.id.desc()).all()

    @jwt_required()
    @blp.arguments(PromotionCreate)
    @blp.response(201, PromotionOut)
    def post(self, data):
        """Crear una nueva promoción"""
        promo = Promotion(**data)
        db.session.add(promo)
        db.session.commit()
        return promo

@blp.route("/<int:pid>")
class PromoResource(MethodView):
    @jwt_required()
    @blp.response(200, PromotionOut)
    def get(self, pid):
        """Obtener detalle de una promoción"""
        return Promotion.query.get_or_404(pid)

    @jwt_required()
    @blp.arguments(PromotionUpdate(partial=True))
    @blp.response(200, PromotionOut)
    def put(self, data, pid):
        """Actualizar promoción"""
        p = Promotion.query.get_or_404(pid)
        
        for k, v in data.items():
            setattr(p, k, v)
            
        db.session.commit()
        return p

    @jwt_required()
    def delete(self, pid):
        """Eliminar promoción"""
        p = Promotion.query.get_or_404(pid)
        db.session.delete(p)
        db.session.commit()
        return {"message": "Promoción eliminada"}, 200

# ============================================================
# ENDPOINTS ESPECIALES (NO-CRUD)
# ============================================================

@blp.route("/by-parking/<int:parking_id>")
class PromosByParking(MethodView):
    # NOTA: Quitamos @jwt_required() si quieres que las promos sean públicas en el mapa
    # Si quieres seguridad, déjalo puesto. Aquí lo dejo abierto para facilitar pruebas.
    @blp.response(200, PromotionOut(many=True))
    def get(self, parking_id):
        """Ver promociones ACTIVAS de una cochera (para la App)"""
        now = datetime.utcnow()
        
        # Filtra: que sea de la cochera + que esté activa + que no haya vencido
        results = Promotion.query.filter(
            Promotion.parking_id == parking_id,
            Promotion.is_active == True,
            Promotion.end_date >= now
        ).order_by(Promotion.id.desc()).all()
        
        return results