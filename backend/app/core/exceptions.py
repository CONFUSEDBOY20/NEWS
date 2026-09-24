from typing import Any, Optional, Dict

class TruthLensException(Exception):
    """Base exception class for all TruthLens application errors."""
    def __init__(
        self,
        message: str,
        code: str = "INTERNAL_ERROR",
        status_code: int = 500,
        details: Optional[Any] = None
    ):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details

class NotFoundException(TruthLensException):
    def __init__(self, message: str = "Requested resource not found", details: Optional[Any] = None):
        super().__init__(message=message, code="NOT_FOUND", status_code=404, details=details)

class ValidationException(TruthLensException):
    def __init__(self, message: str = "Validation failed for input data", details: Optional[Any] = None):
        super().__init__(message=message, code="VALIDATION_ERROR", status_code=422, details=details)

class AuthenticationException(TruthLensException):
    def __init__(self, message: str = "Invalid credentials or unauthorized access", details: Optional[Any] = None):
        super().__init__(message=message, code="UNAUTHORIZED", status_code=401, details=details)

class RateLimitException(TruthLensException):
    def __init__(self, message: str = "Rate limit exceeded. Please try again later.", details: Optional[Any] = None):
        super().__init__(message=message, code="RATE_LIMIT_EXCEEDED", status_code=429, details=details)

class ExternalAPIException(TruthLensException):
    def __init__(self, message: str = "External provider error or timeout", details: Optional[Any] = None):
        super().__init__(message=message, code="EXTERNAL_API_ERROR", status_code=502, details=details)
