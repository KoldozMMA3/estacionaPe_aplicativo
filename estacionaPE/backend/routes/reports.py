from flask import jsonify
from flask.views import MethodView
from flask_smorest import Blueprint
from flask_jwt_extended import jwt_required
from sqlalchemy import func, desc
from db import db
from models import Parking, Reservation, User, Payment

# Definimos el Blueprint
blp = Blueprint("Reports", "reports", url_prefix="/api/reports", description="Reportes y Estadísticas")

# 1. REPORTES GENERALES (Resumen Global)
@blp.route("/summary")
class GeneralReport(MethodView):
    # @jwt_required()  <-- Descomenta si quieres protegerlo
    def get(self):
        """Resumen global (Usuarios, Ingresos, Reservas)"""
        total_users = User.query.count()
        total_parkings = Parking.query.count()
        total_reservations = Reservation.query.count()
        
        # Sumar ingresos solo de reservas pagadas
        total_income = db.session.query(func.sum(Payment.amount))\
            .filter(Payment.status == 'paid').scalar() or 0.00

        return {
            "total_users": total_users,
            "total_parkings": total_parkings,
            "total_reservations": total_reservations,
            "total_income": float(total_income)
        }

# 2. GANANCIA POR COCHERA
@blp.route("/revenue-by-parking")
class RevenueByParking(MethodView):
    def get(self):
        """Cuánto dinero ha generado cada cochera"""
        # Hacemos un JOIN entre Parking y Reservation, sumando el total_amount
        results = db.session.query(
            Parking.name,
            func.sum(Reservation.total_amount).label('total_revenue')
        ).join(Reservation).filter(Reservation.status == 'paid')\
         .group_by(Parking.id).order_by(desc('total_revenue')).all()

        return [
            {"parking": r[0], "revenue": float(r[1] or 0)} 
            for r in results
        ]

# 3. RESERVAS POR DÍA (Para gráficos)
@blp.route("/reservations-by-day")
class ReservationsByDay(MethodView):
    def get(self):
        """Cantidad de reservas agrupadas por fecha"""
        # Extraemos solo la parte de la FECHA (sin hora)
        results = db.session.query(
            func.date(Reservation.created_at).label('date'),
            func.count(Reservation.id).label('count')
        ).group_by(func.date(Reservation.created_at))\
         .order_by(func.date(Reservation.created_at)).all()

        return [
            {"date": str(r[0]), "count": r[1]} 
            for r in results
        ]

# 4. ESTADÍSTICAS POR DISTRITO
@blp.route("/stats-by-district")
class StatsByDistrict(MethodView):
    def get(self):
        """Cuántas cocheras hay en cada distrito"""
        results = db.session.query(
            Parking.district,
            func.count(Parking.id).label('count')
        ).filter(Parking.district != None)\
         .group_by(Parking.district).all()

        return [
            {"district": r[0], "parkings_count": r[1]} 
            for r in results
        ]

# 5. MEJORES COCHERAS (Top 5 más reservadas)
@blp.route("/best-parkings")
class BestParkings(MethodView):
    def get(self):
        """Las cocheras con más reservas completadas"""
        results = db.session.query(
            Parking.name,
            Parking.image_url,
            func.count(Reservation.id).label('res_count')
        ).join(Reservation)\
         .group_by(Parking.id)\
         .order_by(desc('res_count'))\
         .limit(5).all()

        return [
            {
                "name": r[0],
                "image": r[1],
                "reservations": r[2]
            } 
            for r in results
        ]