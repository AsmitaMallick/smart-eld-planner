from django.urls import path

from .views import LocationSearchView, TripPlanView


urlpatterns = [
    path("trip/plan/", TripPlanView.as_view(), name="trip-plan"),
    path("trip/location-search/", LocationSearchView.as_view(), name="trip-location-search"),
]
