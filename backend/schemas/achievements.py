from pydantic import BaseModel


class Achievement(BaseModel):
    title: str
    description: str
    xp_bonus: int = 0
