import json
from datetime import datetime, date
from typing import Any
from fastapi.responses import JSONResponse


class _DatetimeEncoder(json.JSONEncoder):
    def default(self, obj: Any) -> Any:
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        return super().default(obj)


def _jsonable(data: Any) -> Any:
    """Recursively convert data to JSON-serializable form."""
    return json.loads(json.dumps(data, cls=_DatetimeEncoder))


def ok(data: Any = None, message: str = "Success", status_code: int = 200) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"status": True, "message": message, "data": _jsonable(data)},
    )


def err(message: str = "Error", status_code: int = 400) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"status": False, "message": message},
    )
