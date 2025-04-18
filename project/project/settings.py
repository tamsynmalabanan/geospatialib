"""
Django settings for project project.

Generated by 'django-admin startproject' using Django 5.1.6.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/5.1/ref/settings/
"""

from pathlib import Path
import os

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent
TEMPLATE_DIR = os.path.join(BASE_DIR, 'templates')

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.1/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-kvz^2g!8($@jbqf-dyi0#i3h%00d9sij!ixsm@%23+e7xv%nde'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = [
    '139.59.35.171',
    'www.geospatialib.com',
    'geospatialib.com',
    '127.0.0.1',
]

AUTHENTICATION_BACKENDS = (
    'customuser.backends.CustomAuthenticationBackend',
)

AUTH_USER_MODEL = 'customuser.User'

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

    # plugins
    'leaflet',
    'django_htmx',

    # project apps
    'customuser',
    'main',
    'htmx',
    'helpers',
]

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
        'locate': {
            'css': [
                'https://cdnjs.cloudflare.com/ajax/libs/leaflet-locatecontrol/0.83.1/L.Control.Locate.css', 
            ],
            'js': [
                'https://cdnjs.cloudflare.com/ajax/libs/leaflet-locatecontrol/0.83.1/L.Control.Locate.min.js',
            ],
            'auto_include': True,
        },
        # 'pattern': {
        #     'css': [
        #     ],
        #     'js': [
        #         'https://cdn.jsdelivr.net/npm/leaflet.pattern@0.1.0/dist/leaflet.pattern.min.js'
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
        'NAME': 'geospatialib',
        'USER': 'gsl_admin',
        'PASSWORD': 'case-wildlife-dumping',
        'HOST': 'localhost',
        'PORT': '',
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

STATIC_URL = 'static/'
# STATICFILES_DIRS = [os.path.join(BASE_DIR, 'static')]
# MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
# MEDIA_URL = 'media/'
STATIC_ROOT = os.path.join(BASE_DIR, 'static/')

# Default primary key field type
# https://docs.djangoproject.com/en/5.1/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
