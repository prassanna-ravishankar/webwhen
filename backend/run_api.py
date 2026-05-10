#!/usr/bin/env python3
import uvicorn

from webwhen.core.config import settings

if __name__ == "__main__":
    uvicorn.run(
        "webwhen.api.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.api_reload,
        server_header=False,
    )
