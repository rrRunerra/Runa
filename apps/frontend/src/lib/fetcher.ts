export const fetcher = async (key: string | [string, string?]) => {
  const url = typeof key === "string" ? key : key[0];
  const token = typeof key === "string" ? undefined : key[1];

  const headers: HeadersInit = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, { headers });
  if (!res.ok) {
    const errJson = await res.json().catch(() => null);
    const errMsg = errJson?.message || `Request failed with status ${res.status}`;
    throw new Error(Array.isArray(errMsg) ? errMsg[0] : errMsg);
  }
  return res.json();
};
