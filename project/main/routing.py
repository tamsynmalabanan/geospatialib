from django.urls import path

from . import consumers

websocket_urlpatterns = [
    path("ws/thematic-map/<str:map_id>/", consumers.ThematicMapConsumer.as_asgi()),
]