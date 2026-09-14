from django.urls import path
from .views import SslCommerzInitView, SslCommerzSuccessView, SslCommerzFailView, SslCommerzCancelView

urlpatterns = [
    path('ssl/init/', SslCommerzInitView.as_view(), name='ssl-init'),
    path('ssl/success/', SslCommerzSuccessView.as_view(), name='ssl-success'),
    path('ssl/fail/', SslCommerzFailView.as_view(), name='ssl-fail'),
    path('ssl/cancel/', SslCommerzCancelView.as_view(), name='ssl-cancel'),
]
