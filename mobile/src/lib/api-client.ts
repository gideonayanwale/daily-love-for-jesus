export async function fetchHello() {
  try {
    const res = await fetch('https://example.com/api/hello')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (err) {
    return { error: String(err) }
  }
}
