import json
import logging
import urllib.request
import urllib.error
from typing import Optional

from app.config import settings

logger = logging.getLogger("credvault.telegram")
logging.basicConfig(level=logging.INFO)

API_BASE = "https://api.telegram.org"


def _call(method: str, params: dict, timeout: int = 10) -> Optional[dict]:
    if not settings.telegram_bot_token:
        return None
    url = f"{API_BASE}/bot{settings.telegram_bot_token}/{method}"
    data = json.dumps(params).encode("utf-8")
    req = urllib.request.Request(
        url, data=data, headers={"Content-Type": "application/json"}, method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
            if not payload.get("ok"):
                logger.warning(f"[telegram] API xatolik qaytardi: {payload}")
                return None
            return payload.get("result")
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        logger.warning(f"[telegram] So'rov muvaffaqiyatsiz: {exc}")
        return None


def send_telegram_message(chat_id: str, text: str) -> bool:
    """Bot orqali xabar yuboradi. Token sozlanmagan bo'lsa (dev muhiti),
    xabarni konsolga chiqaradi, shunda funksionallikni bot sozlanmasdan ham sinash mumkin."""
    if not settings.telegram_bot_token:
        logger.info(
            "\n===== [DEV] TELEGRAM_BOT_TOKEN sozlanmagan — xabar yuborish o'rniga konsolga chiqarildi =====\n"
            f"Kimga (chat_id): {chat_id}\n\n{text}\n"
            "=================================================================\n"
        )
        return True

    result = _call("sendMessage", {"chat_id": chat_id, "text": text})
    if result is None:
        logger.error(f"[telegram] Xabar yuborilmadi -> chat_id={chat_id}")
        return False
    logger.info(f"[telegram] Xabar yuborildi -> chat_id={chat_id}")
    return True


def get_latest_start_chat() -> Optional[dict]:
    """Botga eng oxirgi /start yoki har qanday xabar yuborgan foydalanuvchini topadi.
    Superadmin Telegramni bog'lashda ('Aniqlash' tugmasi) ishlatiladi."""
    updates = _call("getUpdates", {"limit": 20, "timeout": 0})
    if not updates:
        return None

    for update in reversed(updates):
        message = update.get("message") or update.get("my_chat_member")
        if not message:
            continue
        chat = message.get("chat") or {}
        frm = message.get("from") or {}
        if chat.get("type") != "private":
            continue
        return {
            "chat_id": str(chat.get("id")),
            "telegram_username": frm.get("username"),
            "telegram_first_name": frm.get("first_name"),
            "telegram_last_name": frm.get("last_name"),
        }
    return None
