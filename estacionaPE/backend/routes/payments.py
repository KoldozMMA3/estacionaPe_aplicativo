from flask.views import MethodView
from flask_smorest import Blueprint, abort
from db import db
from models import Payment, Reservation
from schemas import PaymentOut, PaymentCreate, PaymentUpdate
from flask_jwt_extended import jwt_required

blp = Blueprint("Payments", "payments", url_prefix="/api/payments", description="CRUD de pagos")

@blp.route("/")
class PayList(MethodView):
    @jwt_required()
    @blp.response(200, PaymentOut(many=True))
    def get(self):
        """Listar todos los pagos"""
        return Payment.query.order_by(Payment.id.desc()).all()

    @jwt_required()
    @blp.arguments(PaymentCreate)
    @blp.response(201, PaymentOut)
    def post(self, data):
        """Crear un pago manual"""
        p = Payment(**data)
        db.session.add(p)
        if p.status == "paid":
            res = Reservation.query.get(p.reservation_id)
            if res:
                res.status = "paid"
        db.session.commit()
        return p

@blp.route("/<int:pid>")
class PayResource(MethodView):
    @jwt_required()
    @blp.response(200, PaymentOut)
    def get(self, pid):
        return Payment.query.get_or_404(pid)

    @jwt_required()
    @blp.arguments(PaymentUpdate(partial=True))
    @blp.response(200, PaymentOut)
    def put(self, data, pid):
        p = Payment.query.get_or_404(pid)
        for k, v in data.items():
            setattr(p, k, v)
        
        if p.status == "paid":
            res = Reservation.query.get(p.reservation_id)
            if res:
                res.status = "paid"
        db.session.commit()
        return p

    @jwt_required()
    def delete(self, pid):
        p = Payment.query.get_or_404(pid)
        db.session.delete(p)
        db.session.commit()
        return {"message": "Pago eliminado"}, 200

# === FUNCIÓN ESPECIAL: Pagar Reserva (QR) ===
@blp.route("/pay-reservation/<int:rid>", methods=["POST"])
@jwt_required()
@blp.response(201, PaymentOut)
def pay_reservation(rid):
    """Pagar reserva (Soporta 'saldo' o 'yape')"""
    from flask import request
    from models import User # Importante importar User

    # Obtener datos del cuerpo (body) de la petición
    req_data = request.get_json() or {}
    method = req_data.get("method", "qr_app") # 'saldo', 'yape', 'qr'
    provider_ref = req_data.get("provider_ref", f"QR-{rid}")

    res = Reservation.query.get_or_404(rid)
    
    if res.status == 'paid':
        existing = Payment.query.filter_by(reservation_id=rid).first()
        if existing: return existing

    amount = res.total_amount or 0.00
    
    # --- LÓGICA PARA PAGAR CON SALDO (Como en tu App) ---
    if method == 'saldo':
        user_id = res.user_id # El dueño de la reserva
        user = User.query.get(user_id)
        
        if user.balance < amount:
            abort(400, message="Saldo insuficiente en cuenta.")
        
        # Descontar saldo
        user.balance -= amount
        provider_ref = "WALLET-APP"

    # Registrar el pago
    p = Payment(
        reservation_id=rid,
        amount=amount,
        method=method,
        status="paid",
        provider_ref=provider_ref
    )
    
    res.status = "paid"
    db.session.add(p)
    db.session.commit()
    
    return p