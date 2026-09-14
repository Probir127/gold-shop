from __future__ import annotations
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from ..models import Client, Conversation, BotAnalytics
from ..utils.ai_bot import generate_reply
from rest_framework import status

TEST_BOT_PHONE = "TEST_BOT_000"


class BotTestView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Fetch history for the test bot — scoped to tenant."""
        tenant = request.tenant
        if not tenant:
            return Response({'detail': 'No tenant context.'}, status=400)

        client, _ = Client.objects.get_or_create(
            tenant=tenant,
            phone=TEST_BOT_PHONE,
            defaults={'name': 'Bot Simulator', 'status': 'lead', 'bot_enabled': True}
        )

        conversations = Conversation.objects.filter(tenant=tenant, client=client).order_by('timestamp')
        data = [
            {
                'id': msg.id,
                'direction': msg.direction,
                'message_text': msg.message_text,
                'timestamp': msg.timestamp,
                'channel': msg.channel
            }
            for msg in conversations
        ]
        return Response(data)

    def post(self, request):
        """Send a message to the test bot — scoped to tenant."""
        tenant = request.tenant
        if not tenant:
            return Response({'detail': 'No tenant context.'}, status=400)

        message_text = request.data.get('message', '').strip()
        if not message_text:
            return Response({"error": "Message is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Get or create dummy client for this tenant
        client, _ = Client.objects.get_or_create(
            tenant=tenant,
            phone=TEST_BOT_PHONE,
            defaults={'name': 'Bot Simulator', 'status': 'lead', 'bot_enabled': True}
        )

        # Save user message
        Conversation.objects.create(
            tenant=tenant,
            client=client,
            direction='inbound',
            channel='web',  # Testing is usually via web
            message_text=message_text
        )

        # Generate AI response using tenant context
        result = generate_reply(client, message_text, tenant=tenant, channel='web')
        reply_text = result['reply']

        # Save AI message
        ai_msg = Conversation.objects.create(
            tenant=tenant,
            client=client,
            direction='outbound',
            channel='web',
            message_text=reply_text
        )

        # Record Bot Analytics
        BotAnalytics.objects.create(
            tenant=tenant,
            client=client,
            channel='web',
            user_message=message_text,
            bot_reply=reply_text,
            intent=result.get('intent', 'general'),
            sentiment=result.get('sentiment', 'neutral'),
            response_time_ms=result.get('response_time_ms', 150),
            was_fallback=result.get('was_fallback', False),
            was_escalated=result.get('was_escalated', False),
            is_resolved=not result.get('was_escalated', False),
        )

        return Response({
            'reply':          reply_text,
            'intent':         result['intent'],
            'was_fallback':   result['was_fallback'],
            'was_escalated':  result['was_escalated'],
            'response_time_ms': result['response_time_ms'],
            'id':             ai_msg.id,
            'timestamp':      ai_msg.timestamp
        })


class BotTestClearView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Clear the chat history for the test bot — scoped to tenant."""
        tenant = request.tenant
        if not tenant:
            return Response({'detail': 'No tenant context.'}, status=400)

        client = Client.objects.filter(tenant=tenant, phone=TEST_BOT_PHONE).first()
        if client:
            Conversation.objects.filter(tenant=tenant, client=client).delete()
        return Response({"status": "History cleared"})
