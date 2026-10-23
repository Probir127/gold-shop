"""Only installed by sahara_gold.local_testing."""
from django.http import JsonResponse
class LocalSafetyMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
    def __call__(self, request):
        if request.path.startswith(('/api/payments/', '/api/webhooks/', '/api/whatsapp/')):
            return JsonResponse({'detail':'External payment and messaging actions are disabled in local testing.'}, status=503)
        response = self.get_response(request)
        response['X-Sahara-Environment'] = 'local-testing'
        return response
