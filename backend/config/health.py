from django.db import connection, DatabaseError
from django.http import JsonResponse


def readiness(request):
    """Readiness checks connectivity without exposing connection details."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except DatabaseError:
        return JsonResponse({"status": "unavailable"}, status=503)
    return JsonResponse({"status": "ready"})
