from authlib.integrations.flask_client import OAuth
import os

oauth = OAuth()

def register_oauth(app):
    oauth.init_app(app)
    
    # Configuración de Google
    oauth.register(
        name='google',
        client_id=os.getenv("GOOGLE_CLIENT_ID"),
        client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
        server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
        client_kwargs={'scope': 'openid profile email'}
    )

    # Configuración de Microsoft (Azure AD)
    oauth.register(
        name='microsoft',
        client_id=os.getenv("MICROSOFT_CLIENT_ID"),
        client_secret=os.getenv("MICROSOFT_CLIENT_SECRET"),
        server_metadata_url='https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration',
        client_kwargs={'scope': 'openid profile email User.Read'}
    )