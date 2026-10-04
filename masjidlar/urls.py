from django.urls import path

from . import views

urlpatterns = [
    path("", views.home, name="home"),
    path("masjid/<int:pk>/", views.detail, name="detail"),
    path("qoshish/", views.add, name="add"),
    path("api/masjidlar/", views.api_all, name="api_all"),
    path("api/yaqin/", views.api_nearby, name="api_nearby"),
    path("api/qidiruv/", views.api_search, name="api_search"),
]
