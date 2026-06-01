export function imgUrl(url) {
  if (!url) return null
  return `/api/img?url=${encodeURIComponent(url)}`
}
