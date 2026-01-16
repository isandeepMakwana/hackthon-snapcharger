from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette import status
from starlette.exceptions import HTTPException as StarletteHTTPException


def format_error(code: str, message: str, details=None) -> dict:
    payload = {'code': code, 'message': message}
    if details is not None:
        payload['details'] = details
    return {'error': payload}


def _sanitize_error_details(details):
    if isinstance(details, bytes):
        return details.decode('utf-8', errors='replace')
    if isinstance(details, list):
        return [_sanitize_error_details(item) for item in details]
    if isinstance(details, dict):
        return {key: _sanitize_error_details(value) for key, value in details.items()}
    return details


def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    detail = exc.detail
    if isinstance(detail, dict) and 'code' in detail and 'message' in detail:
        return JSONResponse(status_code=exc.status_code, content={'error': detail})
    return JSONResponse(
        status_code=exc.status_code,
        content=format_error('HTTP_ERROR', str(detail))
    )


def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content=format_error(
            'VALIDATION_ERROR',
            'Request validation failed.',
            _sanitize_error_details(exc.errors())
        )
    )


def internal_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=format_error('INTERNAL_ERROR', 'An unexpected error occurred.')
    )
