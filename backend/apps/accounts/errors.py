from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError
from rest_framework.exceptions import ValidationError
from rest_framework.views import exception_handler


def api_exception_handler(exc, context):
    if isinstance(exc, DjangoValidationError):
        exc = ValidationError("Invalid identifier or field value.")
    if isinstance(exc, IntegrityError):
        exc = ValidationError(
            "This record conflicts with an existing record or a database constraint."
        )
    return exception_handler(exc, context)
