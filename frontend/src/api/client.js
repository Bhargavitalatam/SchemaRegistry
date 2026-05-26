/** Empty string uses same-origin (nginx proxies /schemas and /validate to API). */
const API_URL = import.meta.env.VITE_API_URL ?? '';
const API_KEY = import.meta.env.VITE_API_KEY || '';

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (API_KEY && options.auth !== false) {
    headers['X-API-KEY'] = API_KEY;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error || res.statusText);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  getSubjects: () => request('/schemas/subjects', { auth: false }),
  getVersions: (subject) => request(`/schemas/${encodeURIComponent(subject)}/versions`, { auth: false }),
  getSchema: (subject, version) =>
    request(`/schemas/${encodeURIComponent(subject)}/versions/${version}`, { auth: false }),
  getLatestSchema: (subject) =>
    request(`/schemas/${encodeURIComponent(subject)}`, { auth: false }),
  checkCompatibility: (subject, baseVersion, targetVersion) =>
    request(`/schemas/${encodeURIComponent(subject)}/compatibility`, {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ base_version: baseVersion, target_version: targetVersion }),
    }),
  validatePayload: (subject, payload, version) => {
    const qs = version != null ? `?version=${version}` : '';
    return request(`/validate/${encodeURIComponent(subject)}${qs}`, {
      method: 'POST',
      auth: false,
      body: JSON.stringify(payload),
    });
  },
  registerSchema: (subject, schema) =>
    request(`/schemas/${encodeURIComponent(subject)}`, {
      method: 'POST',
      body: JSON.stringify({ schema }),
    }),
};
