from marshmallow import Schema, fields, validate

# ============================================================
# 1. USUARIOS (Definir esto PRIMERO para evitar NameError)
# ============================================================

class UsuarioBase(Schema):
    name = fields.String(required=True, validate=validate.Length(min=1, max=120))
    email = fields.Email(required=True)
    # password es load_only para que nunca se envíe al frontend al leer datos
    password = fields.String(required=True, load_only=True)
    role = fields.String(required=True, validate=validate.OneOf(["client", "owner", "admin"]))
    
    # Nuevos campos de perfil
    dni = fields.String()
    phone = fields.String()
    plate = fields.String()
    gender = fields.String()

class UsuarioSalida(UsuarioBase):
    id = fields.Int(dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    # El balance se envía como string para evitar problemas de precisión decimal en JSON
    balance = fields.Decimal(as_string=True)

class UsuarioCrear(UsuarioBase): 
    pass

class UsuarioActualizar(Schema):
    name = fields.String(validate=validate.Length(min=1, max=120))
    email = fields.Email()
    role = fields.String(validate=validate.OneOf(["client","owner","admin"]))
    dni = fields.String()
    phone = fields.String()
    plate = fields.String()
    gender = fields.String()
    balance = fields.Decimal(as_string=True)
    password = fields.String(load_only=True) # Permitir actualizar contraseña

class LoginSchema(Schema):
    email = fields.Str(required=True)
    password = fields.Str(required=True)


# ============================================================
# 2. COCHERAS (Parkings)
# ============================================================

class CocheraBase(Schema):
    owner_id = fields.Int(allow_none=True)
    name = fields.String(required=True)
    address = fields.String()
    district = fields.String()
    lat = fields.Float(required=True)
    lng = fields.Float(required=True)
    price_per_hour = fields.Decimal(as_string=True, required=True)
    capacity = fields.Int(required=True)
    available = fields.Int(required=True)
    description = fields.String()
    hours = fields.String()
    image_url = fields.String()

class CocheraSalida(CocheraBase):
    id = fields.Int(dump_only=True)
    created_at = fields.DateTime(dump_only=True)

class CocheraCrear(CocheraBase): 
    pass

class CocheraActualizar(Schema):
    owner_id = fields.Int()
    name = fields.String()
    address = fields.String()
    district = fields.String()
    lat = fields.Float()
    lng = fields.Float()
    price_per_hour = fields.Decimal(as_string=True)
    capacity = fields.Int()
    available = fields.Int()
    description = fields.String()
    hours = fields.String()
    image_url = fields.String()


# ============================================================
# 3. RESERVAS
# ============================================================

class ReservaBase(Schema):
    parking_id = fields.Int(required=True)
    user_id = fields.Int(required=True)
    start_time = fields.DateTime(required=True)
    end_time = fields.DateTime(allow_none=True)
    status = fields.Str(validate=validate.OneOf(["reserved","cancelled","completed","paid","pending"]))
    total_amount = fields.Decimal(as_string=True, allow_none=True)

class ReservaSalida(ReservaBase):
    id = fields.Int(dump_only=True)
    created_at = fields.DateTime(dump_only=True)

class ReservaCrear(ReservaBase): 
    pass

class ReservaActualizar(Schema):
    start_time = fields.DateTime()
    end_time = fields.DateTime()
    status = fields.Str(validate=validate.OneOf(["reserved","cancelled","completed","paid","pending"]))
    total_amount = fields.Decimal(as_string=True)


# ============================================================
# 4. PAGOS
# ============================================================

class PagoBase(Schema):
    reservation_id = fields.Int(required=True)
    amount = fields.Decimal(as_string=True, required=True)
    method = fields.Str()
    status = fields.Str(validate=validate.OneOf(["pending","paid","failed"]))
    provider_ref = fields.Str(allow_none=True)

class PagoSalida(PagoBase):
    id = fields.Int(dump_only=True)
    created_at = fields.DateTime(dump_only=True)

class PagoCrear(PagoBase): 
    pass

class PagoActualizar(Schema):
    amount = fields.Decimal(as_string=True)
    method = fields.Str()
    status = fields.Str(validate=validate.OneOf(["pending","paid","failed"]))
    provider_ref = fields.Str()


# ============================================================
# 5. PROMOCIONES
# ============================================================

class PromocionBase(Schema):
    parking_id = fields.Int(required=True)
    title = fields.String(required=True)
    description = fields.String(allow_none=True)
    discount_percent = fields.Decimal(as_string=True, allow_none=True)
    flat_amount = fields.Decimal(as_string=True, allow_none=True)
    start_date = fields.DateTime(required=True)
    end_date = fields.DateTime(required=True)
    is_active = fields.Boolean()

class PromocionSalida(PromocionBase):
    id = fields.Int(dump_only=True)

class PromocionCrear(PromocionBase): 
    pass

class PromocionActualizar(Schema):
    parking_id = fields.Int()
    title = fields.String()
    description = fields.String()
    discount_percent = fields.Decimal(as_string=True)
    flat_amount = fields.Decimal(as_string=True)
    start_date = fields.DateTime()
    end_date = fields.DateTime()
    is_active = fields.Boolean()


# ============================================================
# 6. ALIAS (Crucial para que las rutas encuentren los esquemas)
# ============================================================

# Users
UserOut      = UsuarioSalida
UserCreate   = UsuarioCrear
UserUpdate   = UsuarioActualizar

# Parkings
ParkingOut     = CocheraSalida
ParkingCreate  = CocheraCrear
ParkingUpdate  = CocheraActualizar
ParkingSchema  = CocheraSalida 

# Reservations
ReservationOut     = ReservaSalida
ReservationCreate  = ReservaCrear
ReservationUpdate  = ReservaActualizar
ReservationSchema  = ReservaSalida

# Payments
PaymentOut     = PagoSalida
PaymentCreate  = PagoCrear
PaymentUpdate  = PagoActualizar
PaymentSchema  = PagoSalida

# Promotions
PromotionOut     = PromocionSalida
PromotionCreate  = PromocionCrear
PromotionUpdate  = PromocionActualizar