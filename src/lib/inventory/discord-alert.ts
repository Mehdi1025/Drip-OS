export async function postDiscordWebhook(
  webhookUrl: string,
  content: string
): Promise<void> {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Discord webhook failed (${response.status})${body ? `: ${body}` : ""}`
    );
  }
}

export async function notifyDiscordStockAlerts(messages: string[]): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL?.trim();
  if (!webhookUrl || messages.length === 0) {
    return;
  }

  const results = await Promise.allSettled(
    messages.map((content) => postDiscordWebhook(webhookUrl, content))
  );

  for (const result of results) {
    if (result.status === "rejected") {
      console.error("[inventory] Discord alert failed", result.reason);
    }
  }
}
