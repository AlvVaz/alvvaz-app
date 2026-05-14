type TelegramSendMessageInput = {
  chatId: string;
  text: string;
};

export async function sendTelegramMessage({ chatId, text }: TelegramSendMessageInput) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN.");
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const description =
      payload && typeof payload === "object" && "description" in payload
        ? String(payload.description)
        : "No se pudo enviar el mensaje de Telegram.";
    throw new Error(description);
  }

  return payload;
}

