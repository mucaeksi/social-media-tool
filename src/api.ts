export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
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
  if (!response.ok)
    throw new ApiError(data.error ?? "İşlem tamamlanamadı.", response.status);
  return data as T;
}
