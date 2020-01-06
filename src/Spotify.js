export const key = "spotifyToken";
const headers = () => ({
  Authorization: "Bearer " + localStorage.getItem(key)
});

const toJson = res => {
  if (res.status === 401) {
    // token no more valid
    localStorage.removeItem(key);
  } else {
    return res.json();
  }
};

export const fetchUsername = async () => {
  const url = `https://api.spotify.com/v1/me`;
  const { id: username } = await fetch(url, { headers: headers() }).then(
    toJson
  );
  return username;
};

export const fetchPlaylists = async username => {
  const url = `https://api.spotify.com/v1/me/playlists`;
  const { items } = await fetch(url, { headers: headers() }).then(toJson);
  return items
    .filter(({ owner }) => owner.id === username)
    .map(({ name, id, images, tracks: { total } }) => {
      let img = "https://picsum.photos/60";
      if (images.length > 0) {
        const image = images.find(x => x.width === 60 || x.width === null);
        if (image) {
          img = image.url;
        }
      }
      return {
        name,
        id,
        img,
        total
      };
    });
};

export const createPlaylist = async (playlistName, username) => {
  const url = `https://api.spotify.com/v1/users/${username}/playlists`;
  const body = JSON.stringify({
    name: playlistName
  });
  const { id } = await fetch(url, {
    headers: headers(),
    method: "POST",
    body
  }).then(toJson);
  return id;
};

export const addTracksToPlaylist = (playlistID, uris) => {
  uris = uris = uris.join(",");
  const url = `https://api.spotify.com/v1/playlists/${playlistID}/tracks?uris=${uris}`;
  return fetch(url, {
    method: "POST",
    headers: headers()
  }).then(toJson);
};

export const bulkSearch = async lines => {
  const url = q => `https://api.spotify.com/v1/search?q=${q}&type=track`;
  const searchLine = async line => {
    const {
      tracks: { items, total }
    } = await fetch(url(line), { headers: headers() }).then(toJson);
    if (total > 0) {
      const item = items[0];
      if (item.type === "track") {
        return {
          uri: item.uri
        };
      }
    }
    return null;
  };
  return Promise.all(lines.map(searchLine)).then(arr =>
    arr.filter(x => x !== null)
  );
};
