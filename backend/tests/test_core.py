import json
from starlette.requests import Request
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.exceptions import RequestValidationError
from app.core.exceptions import (
    http_exception_handler,
    internal_exception_handler,
    validation_exception_handler
)
from app.core.rate_limit import limiter, rate_limit


def make_request():
    return Request({'type': 'http', 'method': 'GET', 'path': '/', 'headers': []})


def test_http_exception_handler_with_detail_dict():
    request = make_request()
    exc = StarletteHTTPException(status_code=401, detail={'code': 'UNAUTHORIZED', 'message': 'No token'})
    response = http_exception_handler(request, exc)
    payload = json.loads(response.body)
    assert response.status_code == 401
    assert payload['error']['code'] == 'UNAUTHORIZED'


def test_http_exception_handler_with_string_detail():
    request = make_request()
    exc = StarletteHTTPException(status_code=400, detail='Bad input')
    response = http_exception_handler(request, exc)
    payload = json.loads(response.body)
    assert payload['error']['code'] == 'HTTP_ERROR'


def test_validation_exception_handler():
    request = make_request()
    exc = RequestValidationError([
        {'loc': ['body', 'email'], 'msg': 'Invalid email', 'type': 'value_error'}
    ])
    response = validation_exception_handler(request, exc)
    payload = json.loads(response.body)
    assert response.status_code == 400
    assert payload['error']['code'] == 'VALIDATION_ERROR'


def test_internal_exception_handler():
    request = make_request()
    response = internal_exception_handler(request, Exception('boom'))
    payload = json.loads(response.body)
    assert response.status_code == 500
    assert payload['error']['code'] == 'INTERNAL_ERROR'


def test_rate_limiter_blocks_requests():
    key = 'test-key'
    assert limiter.is_allowed(key, limit=1, window_seconds=60) is True
    assert limiter.is_allowed(key, limit=1, window_seconds=60) is False


def test_rate_limit_dependency_raises():
    dependency = rate_limit(limit=1, window_seconds=60)
    request = Request({
        'type': 'http',
        'method': 'GET',
        'path': '/rate',
        'headers': [],
        'client': ('127.0.0.1', 12345)
    })

    assert limiter.is_allowed('127.0.0.1:/rate', limit=1, window_seconds=60) is True
    assert limiter.is_allowed('127.0.0.1:/rate', limit=1, window_seconds=60) is False
    try:
        import asyncio
        asyncio.run(dependency(request))
    except Exception as exc:
        assert getattr(exc, 'status_code', None) == 429
