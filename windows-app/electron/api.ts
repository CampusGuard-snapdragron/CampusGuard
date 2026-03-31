let cloudUrl = ''
let authToken = ''

export function configure(url: string, token: string) {
  cloudUrl = url.replace(/\/+$/, '')
  authToken = token
}

async function request(path: string, options: RequestInit = {}): Promise<any> {
  if (!cloudUrl) throw new Error('Cloud URL not configured')

  const headers: Record<string, string> = {
    'x-campusguard-token': authToken,
    ...((options.headers as Record<string, string>) || {}),
  }

  const res = await fetch(`${cloudUrl}${path}`, {
    ...options,
    headers,
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`API ${res.status}: ${body}`)
  }

  return res.json()
}

export function health() {
  if (!cloudUrl) throw new Error('Cloud URL not configured')
  return fetch(`${cloudUrl}/health`).then(r => r.json())
}

export function getAlerts(opts?: { limit?: number; offset?: number }) {
  const params = new URLSearchParams()
  if (opts?.limit) params.set('limit', String(opts.limit))
  if (opts?.offset) params.set('offset', String(opts.offset))
  const qs = params.toString()
  return request(`/alerts${qs ? `?${qs}` : ''}`)
}

export function getAlertById(id: number) {
  return request(`/alerts/${id}`)
}

export function getStats() {
  return request('/alerts/stats')
}

export function deleteAlert(id: number) {
  return request(`/alerts/${id}`, { method: 'DELETE' })
}

export function postAlert(alert: any) {
  return request('/alert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(alert),
  })
}
