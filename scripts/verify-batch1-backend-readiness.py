"""Read-only configured backend probes; suppress diagnostics containing secrets."""
import asyncio
import contextlib
import io
import json
import os
from pathlib import Path

outcomes = {}
with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
    if Path('/app/root_config.env').is_file():
        from dotenv import dotenv_values
        root_config = dotenv_values('/app/root_config.env')
        redis_url = root_config.get('REDIS_PUBLIC_URL') or root_config.get('REDIS_URL')
        if redis_url:
            os.environ['REDIS_URL'] = redis_url
            outcomes['redis_configuration_source'] = 'repository public Redis endpoint'
    from core.config import settings
    from supabase import create_client
    import redis

    async def verify():
        try:
            client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
            await asyncio.wait_for(asyncio.to_thread(
                lambda: client.table('profiles').select('id').limit(1).execute()), 25)
            outcomes['supabase_profile_read'] = 'PASS'
        except Exception as error:
            outcomes['supabase_profile_read'] = type(error).__name__
        try:
            connection = redis.from_url(settings.REDIS_URL, socket_timeout=8, socket_connect_timeout=8)
            await asyncio.wait_for(asyncio.to_thread(connection.ping), 12)
            outcomes['redis_ping'] = 'PASS'
            connection.close()
        except Exception as error:
            outcomes['redis_ping'] = type(error).__name__
        try:
            from core.health_checks import get_readiness_status
            result = await asyncio.wait_for(get_readiness_status(), 40)
            outcomes['application_readiness'] = result.get('status', 'UNKNOWN')
            outcomes['checks'] = {name: check['status'] for name, check in result.get('checks', {}).items()}
        except Exception as error:
            outcomes['application_readiness'] = type(error).__name__
    asyncio.run(verify())
print(json.dumps(outcomes, indent=2))
