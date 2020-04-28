import { fetchWithAutoPaging } from 'spotify-auto-paging'

export const key = 'spotifyToken'
const headers = () => ({
  Authorization: `Bearer ${localStorage.getItem(key)}`,
})

const toJson = (res) => {
  if (res.status === 401) {
    localStorage.removeItem(key)
    throw new Error('TOKEN_EXPIRED')
  } else {
    return res.json()
  }
}

export const fetchUsername = async () => {
  const url = `https://api.spotify.com/v1/me`
  const { id: username } = await fetch(url, { headers: headers() }).then(toJson)
  return username
}

export const fetchPlaylists = async (username) => {
  const url = `https://api.spotify.com/v1/me/playlists`
  const playlists = await fetchWithAutoPaging({
    initialUrl: url,
    accessToken: localStorage.getItem(key),
  })
  return playlists
    .filter(({ owner }) => owner.id === username)
    .map(({ name, id, images, tracks: { total } }) => {
      let img = '/music.svg'
      if (images.length > 0) {
        const image = images.find((x) => x.width === 60 || x.width === null)
        if (image) {
          img = image.url
        }
      }
      return {
        name,
        id,
        img,
        total,
      }
    })
}

export const createPlaylist = async (playlistName, username) => {
  const url = `https://api.spotify.com/v1/users/${username}/playlists`
  const body = JSON.stringify({
    name: playlistName,
  })
  const { id } = await fetch(url, {
    headers: headers(),
    method: 'POST',
    body,
  }).then(toJson)
  return id
}

export const addTracksToPlaylist = (playlistID, uris) => {
  const url = `https://api.spotify.com/v1/playlists/${playlistID}/tracks?uris=${uris.join(
    ','
  )}`
  return fetch(url, {
    method: 'POST',
    headers: headers(),
  }).then(toJson)
}

export const bulkSearch = async (lines, selectedArtist) => {
  if (selectedArtist?.name) {
    lines = lines.map((line) => line + ' ' + selectedArtist.name)
  }
  const url = (q) => `https://api.spotify.com/v1/search?q=${q}&type=track`
  const searchLine = async (line) => {
    const {
      tracks: { items, total },
    } = await fetch(url(line), { headers: headers() }).then(toJson)
    if (total > 0) {
      const item = items[0]
      if (item.type === 'track') {
        return {
          uri: item.uri,
        }
      }
    }
    return null
  }
  return Promise.all(lines.map(searchLine))
}

export const searchArtists = async (q) => {
  const url = `https://api.spotify.com/v1/search?q=${q}&type=artist&limit=10`
  const {
    artists: { items },
  } = await fetch(url, { headers: headers() }).then(toJson)
  return items.map((artist) => ({
    id: artist.id,
    name: artist.name,
  }))
}

export const fetchPlaylistTracks = async (playlistID) => {
  const url = `https://api.spotify.com/v1/playlists/${playlistID}/tracks`
  const tracks = await fetchWithAutoPaging({
    initialUrl: url,
    accessToken: localStorage.getItem(key),
  })
  return tracks.map((item) => item.track.uri)
}
