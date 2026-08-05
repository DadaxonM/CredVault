"""Rate limiting (slowapi) uchun umumiy limiter.

Alohida modulda saqlanadi, chunki uni ham `main.py`, ham `routers/auth.py`
import qiladi — aks holda aylanma import (circular import) yuzaga kelardi.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request


def real_client_ip(request: Request) -> str:
    """Haqiqiy foydalanuvchi IP manzilini aniqlaydi.

    Ilova nginx orqasida ishlaydi, shu sababli `request.client.host` har doim
    nginx konteynerining IP'sini beradi. nginx esa `X-Real-IP` sarlavhasini
    `$remote_addr` bilan MAJBURAN o'rnatadi (mijoz uni soxtalashtira olmaydi),
    shuning uchun rate limiting uchun aynan shu sarlavhaga tayanamiz.
    """
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    xff = request.headers.get("x-forwarded-for")
    if xff:
        # Faqat birinchi (eng chekka) qiymatni olamiz.
        return xff.split(",")[0].strip()
    return get_remote_address(request)


limiter = Limiter(key_func=real_client_ip)
