"""Run a SQL query against prod Logfire traces and print the rows.

Usage: LOGFIRE_READ_TOKEN=... python3 scripts/logfire_query.py "SELECT ..."

Exits non-zero on any failure, so watch scripts can't mistake an error for
an empty (clean) result. Set W to change the column width (default 160).
"""

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

QUERY_URL = "https://logfire-eu.pydantic.dev/v1/query"


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    token = os.environ.get("LOGFIRE_READ_TOKEN")
    if not token:
        sys.exit("LOGFIRE_READ_TOKEN is not set")
    request = urllib.request.Request(
        f"{QUERY_URL}?{urllib.parse.urlencode({'sql': sys.argv[1]})}",
        headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
    )
    try:
        data = json.load(urllib.request.urlopen(request, timeout=60))
    except urllib.error.HTTPError as e:
        sys.exit(f"HTTP {e.code}: {e.read()[:500].decode()}")
    except (urllib.error.URLError, TimeoutError) as e:
        sys.exit(f"Logfire unreachable: {e}")

    width = int(os.environ.get("W", "160"))
    columns = data.get("columns", [])
    print(" | ".join(c["name"] for c in columns))
    for row in zip(*(c["values"] for c in columns), strict=True):
        print(" | ".join(str(v)[:width] for v in row))


if __name__ == "__main__":
    main()
