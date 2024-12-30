from django.shortcuts import render, redirect
from django.contrib.auth import get_user_model, authenticate
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
from django.contrib.auth import logout
from django.contrib import messages

from urllib.parse import urlparse, parse_qs