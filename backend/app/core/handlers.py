from fastapi import Request, status, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from datetime import datetime, timezone
import logging
from app.core.exceptions import TruthLensException

logger = logging.getLogger("truthlens.backend")

def format_error_response(code: str, message: str, details: any = None, status_code: int = 500, request_id: str = None) -> JSONResponse:
    content = {
        "error": {
            "code": code,
            "message": message,
            "details": details
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "status_code": status_code
    }
    if request_id:
        content["request_id"] = request_id
    return JSONResponse(status_code=status_code, content=content)

async def truthlens_exception_handler(request: Request, exc: TruthLensException):
    request_id = getattr(request.state, "request_id", None)
    logger.warning(f"[{exc.code}] {exc.message} | Path: {request.url.path} | RequestID: {request_id}")
    return format_error_response(
        code=exc.code,
        message=exc.message,
        details=exc.details,
        status_code=exc.status_code,
        request_id=request_id
    )

async def http_exception_handler(request: Request, exc: HTTPException):
    request_id = getattr(request.state, "request_id", None)
    detail_msg = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
    logger.warning(f"[HTTP_{exc.status_code}] {detail_msg} | Path: {request.url.path} | RequestID: {request_id}")
    return format_error_response(
        code=f"HTTP_{exc.status_code}",
        message=detail_msg,
        details=exc.detail if not isinstance(exc.detail, str) else None,
        status_code=exc.status_code,
        request_id=request_id
    )

async def validation_exception_handler(request: Request, exc: RequestValidationError):
    request_id = getattr(request.state, "request_id", None)
    errors = []
    for err in exc.errors():
        loc = " -> ".join(str(l) for l in err.get("loc", []))
        errors.append({
            "field": loc,
            "message": err.get("msg", "Invalid value"),
            "type": err.get("type", "value_error")
        })
    logger.warning(f"[VALIDATION_ERROR] {len(errors)} field errors | Path: {request.url.path} | RequestID: {request_id}")
    return format_error_response(
        code="VALIDATION_ERROR",
        message="Request body or query parameter validation failed",
        details=errors,
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        request_id=request_id
    )

async def generic_exception_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, "request_id", None)
    logger.error(f"[UNHANDLED_EXCEPTION] {str(exc)} | Path: {request.url.path} | RequestID: {request_id}", exc_info=True)
    return format_error_response(
        code="INTERNAL_SERVER_ERROR",
        message="An unexpected server error occurred. Please try again later.",
        details=str(exc) if request.app.debug else None,
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        request_id=request_id
    )
