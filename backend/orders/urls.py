from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrderViewSet
from .customer_auth import (
    CustomerLoginView,
    CustomerRegisterView,
    CustomerVerifyEmailView,
    CustomerResendVerificationView,
)
from rest_framework_simplejwt.views import TokenRefreshView

router = DefaultRouter()
router.register('orders', OrderViewSet)

urlpatterns = [
    path('customer/auth/login/', CustomerLoginView.as_view()),
    path('customer/auth/register/', CustomerRegisterView.as_view()),
    path('customer/auth/verify-email/', CustomerVerifyEmailView.as_view()),
    path('customer/auth/resend-code/', CustomerResendVerificationView.as_view()),
    path('customer/auth/refresh/', TokenRefreshView.as_view()),
    path('', include(router.urls)),
]
