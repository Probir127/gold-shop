from __future__ import annotations
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import auth_views, client_views, conversation_views
from .views import invoice_views, dashboard_views, whatsapp_views, service_views, bot_test_views, analytics_views, bot_config_views, reset_views, knowledge_views, team_views, public_views, telegram_views, instagram_views, messenger_views, ai_analytics_views, contact_views

urlpatterns = [
    # Public (Widget)
    path('public/config/<slug:tenant_slug>/', public_views.PublicBotConfigView.as_view()),
    path('public/chat/<slug:tenant_slug>/',   public_views.PublicChatView.as_view()),
    path('contact/enquiry/', contact_views.ContactEnquiryView.as_view()),
    # Auth
    path('auth/login/',         auth_views.LoginView.as_view()),
    path('auth/refresh/',       auth_views.RefreshView.as_view()),
    path('auth/me/',            auth_views.MeView.as_view()),
    path('auth/token/refresh/', TokenRefreshView.as_view()),

    # Team (Phase 3)
    path('team/members/', team_views.MemberListAPIView.as_view()),
    path('team/invite/',  team_views.InviteMemberAPIView.as_view()),
    path('team/remove/<uuid:member_id>/', team_views.RemoveMemberAPIView.as_view()),

    # Dashboard
    path('dashboard/stats/', dashboard_views.StatsView.as_view()),

    # Clients
    path('clients/',           client_views.ClientListCreateView.as_view()),
    path('clients/<uuid:pk>/', client_views.ClientDetailView.as_view()),

    # Conversations
    path('conversations/<uuid:client_id>/', conversation_views.ConversationListView.as_view()),
    path('conversations/send/',             conversation_views.SendMessageView.as_view()),

    # Invoices
    path('invoices/',                     invoice_views.InvoiceListCreateView.as_view()),
    path('invoices/<uuid:pk>/',           invoice_views.InvoiceDetailView.as_view()),
    path('invoices/<uuid:pk>/html/',      invoice_views.InvoiceHTMLView.as_view(), name='invoice-html'),
    path('invoices/pdf/<str:token>/',     invoice_views.InvoicePDFDownloadView.as_view(), name='invoice-pdf'),
    path('invoices/<uuid:pk>/pdf/',       invoice_views.GeneratePDFView.as_view()),
    path('invoices/<uuid:pk>/send/',      invoice_views.SendInvoiceView.as_view()),
    path('invoices/<uuid:pk>/mark-paid/', invoice_views.MarkInvoicePaidView.as_view()),

    # Services
    path('services/', service_views.ServiceListView.as_view()),

    # WhatsApp webhook (no auth required — Meta calls this)
    path('whatsapp/',                     whatsapp_views.WebhookView.as_view()),
    path('whatsapp/<slug:tenant_slug>/',  whatsapp_views.WebhookView.as_view()),

    # Bot toggle
    path('clients/<uuid:client_id>/toggle-bot/', conversation_views.ToggleBotView.as_view()),

    # Bot UI Sandbox
    path('bot-test/',       bot_test_views.BotTestView.as_view()),
    path('bot-test/clear/', bot_test_views.BotTestClearView.as_view()),

    # Phase 2: Analytics & Handoff
    path('analytics/bot/',                            analytics_views.BotAnalyticsListView.as_view()),
    path('analytics/ai-stats/',                       ai_analytics_views.AIAnalyticsStatsView.as_view()),
    path('clients/<uuid:client_id>/claim-handoff/',   analytics_views.HandoffClaimView.as_view()),
    path('clients/<uuid:client_id>/release-handoff/', analytics_views.HandoffReleaseView.as_view()),

    # Phase 7: Bot Training — read/update the live system prompt
    path('bot-config/', bot_config_views.BotConfigView.as_view()),

    # Knowledge Base
    path('knowledge-sources/',          knowledge_views.KnowledgeSourceListCreateView.as_view()),
    path('knowledge-sources/<uuid:pk>/', knowledge_views.KnowledgeSourceDetailView.as_view()),
    path('knowledge-sources/<uuid:pk>/sync/', knowledge_views.KnowledgeSourceSyncView.as_view()),

    # Phase 6: Omnichannel (Telegram & Instagram)
    path('webhooks/telegram/<slug:tenant_slug>/', telegram_views.TelegramWebhookView.as_view(), name='telegram-webhook'),
    path('webhooks/telegram/<slug:tenant_slug>/register/', telegram_views.TelegramWebhookRegisterView.as_view(), name='telegram-webhook-register'),
    path('webhooks/instagram/<slug:tenant_slug>/', instagram_views.InstagramWebhookView.as_view(), name='instagram-webhook'),
    path('webhooks/messenger/<slug:tenant_slug>/', messenger_views.MessengerWebhookView.as_view(), name='messenger-webhook'),

    # Maintenance: Manual reset actions
    path('reset/',           reset_views.ResetView.as_view(),     name='reset-app'),
]
