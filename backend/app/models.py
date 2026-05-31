from typing import Any, Dict
from pydantic import BaseModel


class GenerateRequest(BaseModel):
    docType: str            # 'memo' | 'minit' | 'diary'
    payload: Dict[str, Any]  # type + site story / meeting points / day notes
