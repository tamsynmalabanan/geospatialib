"""
Django settings for project project.

Generated by 'django-admin startproject' using Django 5.1.6.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/5.1/ref/settings/
"""

import os
from pathlib import Path
from decouple import config
from datetime import timedelta

if os.name == 'nt':
    VENV_BASE = os.environ['VIRTUAL_ENV']
    os.environ['PATH'] = os.path.join(VENV_BASE, 'Lib\\\\site-packages\\\\osgeo') + ';' + os.environ['PATH']
    os.environ['PROJ_LIB'] = os.path.join(VENV_BASE, 'Lib\\\\site-packages\\\\osgeo\\\\data\\\\proj') + ';' + os.environ['PATH']

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent
TEMPLATE_DIR = os.path.join(BASE_DIR, 'templates')

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.1/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = config('SECRET_KEY')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = config('DEBUG', cast=bool) 

ALLOWED_HOSTS = [
    '127.0.0.1',
    'localhost',
    config('HOST_IP'),
    config('HOST_DOMAIN'),
    f'www.{config('HOST_DOMAIN')}',
]

AUTH_USER_MODEL = 'customuser.User'
AUTHENTICATION_BACKENDS = (
    'customuser.backends.CustomAuthenticationBackend',
)

# allauth
SITE_ID = 1
SOCIALACCOUNT_LOGIN_ON_GET = True
SOCIALACCOUNT_PROVIDERS = {
    'google': {
        'SCOPE': [
            'profile',
            'email',
        ],
        'AUTH_PARAMS': {
            'access_type': 'online'
        },
    }
}

SOCIALACCOUNT_ADAPTER = 'customuser.adapters.CustomSocialAccountAdapter'

AUTHENTICATION_BACKENDS = (
    'customuser.backends.CustomAuthenticationBackend',
    'allauth.account.auth_backends.AuthenticationBackend',
)

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # postgres
    'django.contrib.postgres',

    # gis
    'django.contrib.gis',

    # social auth
    'django.contrib.sites',
    'allauth',    
    'allauth.account',
    'allauth.socialaccount',
    'allauth.socialaccount.providers.google',
    'django.contrib.humanize',

    # plugins
    'leaflet',
    'django_htmx',
    'celery',
    'widget_tweaks',
    'compressor',

    # project apps
    'customuser',
    'main',
    'htmx',
    'helpers',
]

REDIS_IP = config('REDIS_IP')

CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': f'redis://{REDIS_IP}:6379/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'CONNECTION_POOL_KWARGS': {
                'max_connections': 100,
                'retry_on_timeout': True,
            }
        }
    }
}

CONNECTION_POOL_KWARGS = {
    'max_connections': 100,
    'retry_on_timeout': True,
    'socket_timeout': 5,
    'socket_connect_timeout': 5,
}

# celery task
CELERY_BROKER_URL = f'redis://{REDIS_IP}:6379/0'
CELERY_RESULT_BACKEND = f'redis://{REDIS_IP}:6379/0'
CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True
CELERY_TASK_SOFT_TIME_LIMIT = 60
CELERY_TASK_MAX_MEMORY_PER_CHILD = 500000

CELERY_TASK_DEFAULT_QUEUE = 'default'
CELERY_TASK_QUEUES = {
    'high_priority': {'exchange': 'high_priority', 'routing_key': 'high_priority'},
    'low_priority': {'exchange': 'low_priority', 'routing_key': 'low_priority'},
    'default': {'exchange': 'default', 'routing_key': 'default'},
}

CELERY_TASK_ROUTES = {
    'main.tasks.onboard_collection': {'queue': 'low_priority'},
    # 'main.tasks.onboard_collection': {'queue': 'low_priority'},
}


# CELERY_BEAT_SCHEDULE = {
#     'onboard_collection': {
#         'task': 'main.tasks.test_task',
#         'schedule': timedelta(minutes=1),
#         'options': {'queue': 'high_priority', 'priority': 10}
#     },
# }

# CELERY_ACCEPT_CONTENT = ['application/json']
# CELERY_TASK_SERIALIZER = 'json'
# CELERY_RESULT_SERIALIZER = 'json'
# CELERY_TIMEZONE = 'UTC'

# Optional: This is to ensure Django sessions are stored in Redis
SESSION_ENGINE = f'django.contrib.sessions.backends.{config('SESSION_ENGINE')}'
SESSION_CACHE_ALIAS = 'default'

LEAFLET_CONFIG = {
    # 'SPATIAL_EXTENT': (5.0, 44.0, 7.5, 46),
    'DEFAULT_CENTER': (45, 0),
    'DEFAULT_ZOOM': 2,
    'MIN_ZOOM': 1,
    'MAX_ZOOM': 20,
    'DEFAULT_PRECISION': 6,
    
    'TILES': [],
    # 'OVERLAYS': [('Cadastral', 'http://server/a/{z}/{x}/{y}.png', {'attribution': '&copy; IGN'})],
    # 'ATTRIBUTION_PREFIX': 'Powered by django-leaflet',
    
    'SCALE': None,
    # 'MINIMAP': True,
    'RESET_VIEW': True,

    'NO_GLOBALS': False,
    'FORCE_IMAGE_PATH': True,

    'PLUGINS': {
        'geocoder': {
            'css': [
                '/static/plugins/leaflet-control-geocoder/css/Control.Geocoder.css', 
                # 'https://unpkg.com/leaflet-control-geocoder/dist/Control.Geocoder.css', 
            ],
            'js': [
                '/static/plugins/leaflet-control-geocoder/js/Control.Geocoder.js', 
                # 'https://unpkg.com/leaflet-control-geocoder/dist/Control.Geocoder.js',
            ],
            'auto_include': True,
        },
        # 'locate': {
        #     'css': [
        #         'https://cdnjs.cloudflare.com/ajax/libs/leaflet-locatecontrol/0.83.1/L.Control.Locate.css', 
        #     ],
        #     'js': [
        #         'https://cdnjs.cloudflare.com/ajax/libs/leaflet-locatecontrol/0.83.1/L.Control.Locate.min.js',
        #     ],
        #     'auto_include': True,
        # },
    },
}

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',

    # social auth
    'allauth.account.middleware.AccountMiddleware',

    # htmx
    'django_htmx.middleware.HtmxMiddleware',

    'htmx.middleware.HTMXDomainRestriction',
]

ROOT_URLCONF = 'project.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [TEMPLATE_DIR],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',

                'main.context_processors.forms',
            ],
        },
    },
]

WSGI_APPLICATION = 'project.wsgi.application'


# Database
# https://docs.djangoproject.com/en/5.1/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.contrib.gis.db.backends.postgis',
        'NAME': config('DB_DEFAULT_NAME'),
        'USER': config('DB_DEFAULT_USER'),
        'PASSWORD': config('DB_DEFAULT_PASSWORD'),
        'HOST': config('DB_DEFAULT_HOST'),
        'PORT': config('DB_DEFAULT_PORT'),
    }
}

# Password validation
# https://docs.djangoproject.com/en/5.1/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.1/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.1/howto/static-files/

# STATIC_ROOT = os.path.join(BASE_DIR, 'static/')
# STATICFILES_DIRS = [os.path.join(BASE_DIR, 'static')]
# MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
# MEDIA_URL = 'media/'

STATIC_URL = '/static/'
STATICFILES_DIRS = [
    BASE_DIR / 'static',
] if not DEBUG else []
STATIC_ROOT = BASE_DIR / config('STATIC_ROOT')
STATICFILES_STORAGE = 'django.contrib.staticfiles.storage.ManifestStaticFilesStorage'


STATICFILES_FINDERS = (
    'django.contrib.staticfiles.finders.FileSystemFinder',
    'django.contrib.staticfiles.finders.AppDirectoriesFinder',
    # other finders..
    'compressor.finders.CompressorFinder',
)

COMPRESS_ENABLED = not DEBUG
COMPRESS_OFFLINE = not DEBUG


# Default primary key field type
# https://docs.djangoproject.com/en/5.1/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


SECURE_HSTS_SECONDS = 0 if DEBUG else 60*60*24*365
SECURE_HSTS_PRELOAD = not DEBUG
SECURE_HSTS_INCLUDE_SUBDOMAINS = not DEBUG
SECURE_SSL_REDIRECT = not DEBUG

SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

LOGOUT_REDIRECT_URL = '/'