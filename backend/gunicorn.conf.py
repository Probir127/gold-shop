def post_worker_init(worker):
    from core.mail_outbox import start_delivery_worker
    start_delivery_worker()
    worker.log.info('Persistent email delivery worker started')
