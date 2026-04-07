#!/bin/bash
# ==============================================================================
# Script de déploiement pour HierIci (Django) sur VPS Ubuntu
# Ce script installe les dépendances système, configure PostgreSQL, clone le dépôt,
# installe l'environnement virtuel, configure Gunicorn et Apache en reverse proxy.
# ==============================================================================

# Arrêter le script si une commande échoue
set -e

# ================= Configuration =================
PROJECT_NAME="HierIci"
PROJECT_DIR="/var/www/hierici"
GITHUB_REPO="https://github.com/NiavlysLossam/HierIci.git" # <-- À REMPLACER
DOMAIN="votre-domaine.com"                                     # <-- À REMPLACER
ADMIN_EMAIL="admin@votre-domaine.com"                          # <-- À REMPLACER (pour le certificat SSL HTTPS)

DB_NAME="hiericidb"
DB_USER="hiericiuser"
DB_PASS="MotDePasseTresSecurise123!"                            # <-- À REMPLACER
# =================================================

echo "🚀 Début du déploiement de $PROJECT_NAME..."

echo "📦 1. Mise à jour du système et installation des dépendances système..."
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3-pip python3-venv python3-dev libpq-dev postgresql postgresql-contrib apache2 git curl build-essential certbot python3-certbot-apache gdal-bin libgdal-dev python3-gdal binutils libproj-dev postgis

echo "🗄️ 2. Configuration de PostgreSQL..."
# On utilise EOF pour exécuter plusieurs requêtes SQL d'un coup en tant qu'utilisateur postgres
sudo -u postgres psql <<EOF
CREATE DATABASE $DB_NAME;
CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';
ALTER ROLE $DB_USER SET client_encoding TO 'utf8';
ALTER ROLE $DB_USER SET default_transaction_isolation TO 'read committed';
ALTER ROLE $DB_USER SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER DATABASE $DB_NAME OWNER TO $DB_USER;
\q
EOF

# Activation de l'extension PostGIS sur la base de données
sudo -u postgres psql -d $DB_NAME -c "CREATE EXTENSION IF NOT EXISTS postgis;"
sudo -u postgres psql -d $DB_NAME -c "CREATE EXTENSION IF NOT EXISTS postgis_topology;"

echo "📁 3. Préparation du répertoire du projet..."
sudo mkdir -p $PROJECT_DIR
sudo chown -R $USER:$USER $PROJECT_DIR
# Clonage
if [ ! -d "$PROJECT_DIR/.git" ]; then
    git clone $GITHUB_REPO $PROJECT_DIR
else
    echo "Le dépôt existe déjà, mise à jour (git pull)..."
    cd $PROJECT_DIR
    git pull
fi

cd $PROJECT_DIR

echo "🐍 4. Configuration de l'environnement virtuel et des dépendances Python..."
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
# Installation de gunicorn et psycopg2 (nécessaire pour PostgreSQL)
pip install gunicorn psycopg2-binary

echo "⚙️ 5. Création du fichier d'environnement (.env)..."
if [ ! -f "$PROJECT_DIR/.env" ]; then
    # On recherche l'emplacement exact de libgdal.so pour forcer Django à le trouver
    GDAL_PATH=$(find /usr/lib /usr/lib/x86_64-linux-gnu -name "libgdal.so*" -print -quit 2>/dev/null)

    cat <<EOF > $PROJECT_DIR/.env
SECRET_KEY=$(python3 -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())')
DEBUG=False
ALLOWED_HOSTS=$DOMAIN,127.0.0.1,localhost

# Base de données (utilisée par django-environ avec GeoDjango)
DATABASE_URL=postgis://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME

# Configuration spatiale (permet d'éviter "Could not find the GDAL library")
GDAL_LIBRARY_PATH=$GDAL_PATH
EOF

    echo "Fichier .env généré avec succès. N'oubliez pas d'adapter votre settings.py pour utiliser python-dotenv ou os.environ afin de lire ces variables."
else
    echo "Fichier .env existant détecté. Application du correctif GeoDjango..."
    # Force la mise à jour de postgres:// vers postgis:// si le script a été lancé une première fois avant la modif
    sed -i 's|DATABASE_URL=postgres://|DATABASE_URL=postgis://|g' "$PROJECT_DIR/.env"
    
    # Met systématiquement à jour les ALLOWED_HOSTS en fonction du domaine (très utile pour l'IP)
    sed -i -E "s/^ALLOWED_HOSTS=.*/ALLOWED_HOSTS=$DOMAIN,127.0.0.1,localhost/g" "$PROJECT_DIR/.env"
    
    # Ajoute le fix path pour GDAL si manquant
    if ! grep -q "GDAL_LIBRARY_PATH" "$PROJECT_DIR/.env" 2>/dev/null; then
        GDAL_PATH=$(find /usr/lib /usr/lib/x86_64-linux-gnu -name "libgdal.so*" -print -quit 2>/dev/null)
        echo "" >> "$PROJECT_DIR/.env"
        echo "# Configuration spatiale (permet d'éviter Could not find the GDAL library)" >> "$PROJECT_DIR/.env"
        echo "GDAL_LIBRARY_PATH=$GDAL_PATH" >> "$PROJECT_DIR/.env"
        echo "Correctif GDAL appliqué au fichier .env !"
    fi
fi

echo "🗃️ 6. Application des migrations et collecte des fichiers statiques..."
python manage.py migrate
# Création du superutilisateur par défaut (optionnel)
# echo "from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.filter(username='admin').exists() or User.objects.create_superuser('admin', 'admin@example.com', 'admin')" | python manage.py shell

# Création du dossier medias et collecte des statiques
mkdir -p photos_media
python manage.py collectstatic --noinput

echo "🔒 7. Permissions pour l'utilisateur www-data (Apache)..."
sudo chown -R $USER:www-data $PROJECT_DIR
sudo find $PROJECT_DIR -type d -exec chmod 775 {} \;
sudo find $PROJECT_DIR -type f -exec chmod 664 {} \;
# Rendre le fichier binaire Gunicorn exécutable par le propriétaire
chmod 775 $PROJECT_DIR/venv/bin/gunicorn
# Apache a besoin des droits d'écriture sur les médias
sudo chown -R www-data:www-data $PROJECT_DIR/photos_media
sudo chown -R www-data:www-data $PROJECT_DIR/staticfiles

echo "🔌 8. Configuration de Gunicorn (Service Systemd)..."
GUNICORN_SERVICE="/etc/systemd/system/gunicorn_${PROJECT_NAME,,}.service"
sudo bash -c "cat > $GUNICORN_SERVICE" <<EOF
[Unit]
Description=gunicorn daemon for $PROJECT_NAME
After=network.target

[Service]
User=$USER
Group=www-data
WorkingDirectory=$PROJECT_DIR
ExecStart=$PROJECT_DIR/venv/bin/gunicorn \\
          --access-logfile - \\
          --workers 3 \\
          --bind unix:/run/gunicorn_${PROJECT_NAME,,}.sock \\
          hierici.wsgi:application

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl start gunicorn_${PROJECT_NAME,,}
sudo systemctl enable gunicorn_${PROJECT_NAME,,}

echo "🌐 9. Configuration d'Apache en Reverse Proxy..."
APACHE_CONF="/etc/apache2/sites-available/${PROJECT_NAME,,}.conf"
sudo bash -c "cat > $APACHE_CONF" <<EOF
<VirtualHost *:80>
    ServerName $DOMAIN
    ServerAdmin webmaster@$DOMAIN

    DocumentRoot $PROJECT_DIR

    # Servir les fichiers statiques de Django via Apache
    Alias /static $PROJECT_DIR/staticfiles
    <Directory $PROJECT_DIR/staticfiles>
        Require all granted
    </Directory>

    # Servir les fichiers médias uploadés par les utilisateurs
    Alias /media $PROJECT_DIR/photos_media
    <Directory $PROJECT_DIR/photos_media>
        Require all granted
    </Directory>

    # Proxy pour transmettre toutes les autres requêtes à Gunicorn
    <Location />
        ProxyPass "unix:/run/gunicorn_${PROJECT_NAME,,}.sock|http://127.0.0.1/"
        ProxyPassReverse "unix:/run/gunicorn_${PROJECT_NAME,,}.sock|http://127.0.0.1/"
    </Location>

    ErrorLog \${APACHE_LOG_DIR}/${PROJECT_NAME,,}_error.log
    CustomLog \${APACHE_LOG_DIR}/${PROJECT_NAME,,}_access.log combined
</VirtualHost>
EOF

# Activation des modules Apache et redémarrage
sudo a2enmod proxy proxy_http
sudo a2ensite ${PROJECT_NAME,,}.conf
sudo systemctl restart apache2

echo "🔒 10. Configuration du HTTPS avec Let's Encrypt (Certbot)..."
# On lance Certbot en mode non-interactif. Il va d'ailleurs reconfigurer Apache pour rediriger le HTTP (80) vers HTTPS (443).
# Note : Cela échouera si l'enregistrement DNS du domaine ne pointe pas encore vers l'IP publique du serveur.
sudo certbot --apache --non-interactive --agree-tos --redirect -d $DOMAIN -m $ADMIN_EMAIL || echo "⚠️ Attention : L'obtention du certificat SSL a échoué. Vérifiez que votre domaine DNS pointe bien sur ce serveur, et tapez plus tard : sudo certbot --apache"

echo "✅ Le déploiement de $PROJECT_NAME sur le serveur VPS est terminé !"
echo "👉 Vous pouvez désormais accéder au site via http://$DOMAIN"
