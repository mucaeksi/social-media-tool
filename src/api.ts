export async function api<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(typeof options.body === "string"
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
  });
  if (response.status === 204) return undefined as T;
  const data = await response
    .json()
    .catch(() => ({ error: "Sunucudan geçerli bir yanıt alınamadı." }));
  if (response.status === 401)
    window.dispatchEvent(new Event("studio:session-expired"));
  if (!response.ok) throw new Error(data.error ?? "İşlem tamamlanamadı.");
  return data as T;
}
