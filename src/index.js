import React, { useState, useRef } from "react";
import ReactDOM from "react-dom";
import SpotifyLogin from "react-spotify-login";
import { useTransition, animated} from "react-spring";

import * as Spotify from "./Spotify";
import "./styles.css";
import Illustration from "./icons/Illustration";
import Spinner from "./icons/Spinner";
import Check from './icons/Check'
import Info from './icons/Info'
import Alert from './icons/Alert'

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [value, setValue] = useState("");
  const [lines, setLines] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [removeDups, setRemoveDups] = useState(true);
  const [message, setMessage] = useState({});
  const summaryDivRef = useRef(null);
  const usernameRef = useRef(null);

  const onSpotifySuccess = ({ access_token }) => {
    localStorage.setItem(Spotify.key, access_token);
    setLoggedIn(true);
    fetchPlaylists();
  };

  const onTextAreaChange = ({ target: { value } }) => {
    setMessage({})
    setValue(value);
    setLines(!!value ? value.split("\n").filter(x => !!x) : []);
  };

  const onPlaylistSelect = (playlist) => {
    setMessage({})
    setSelectedPlaylist(playlist);
    setShowForm(false);
  }

  const onSubmit = async () => {
    setMessage({})
    setLoading(true);
    try {
      const tracks = await Spotify.bulkSearch(lines);
      let uris = tracks.filter(x => x !== null).map(t => t.uri);
      if (removeDups && selectedPlaylist.id !== 'new') {
        // remove duplicate tracks
        const playlistTracks = await Spotify.fetchPlaylistTracks(selectedPlaylist.id)
        uris = uris.filter(uri => !playlistTracks.includes(uri))
      }
      if (uris.length === 0) {
        return setMessage({
          content: 'No tracks were added to the selected playlist.',
          type: 'error'
        })
      }
      if (selectedPlaylist.id === "new") {
        const newPlaylistID = await Spotify.createPlaylist(
          selectedPlaylist.name,
          usernameRef.current
        );
        await Spotify.addTracksToPlaylist(newPlaylistID, uris);
      } else {
        await Spotify.addTracksToPlaylist(selectedPlaylist.id, uris);
      }
      // reset UI
      setLines(false);
      setSelectedPlaylist({});
      setValue("");
      setName("");
      setShowForm(false);
      setMessage({
        content: (
          <>
            <span>{uris.length}</span> tracks (out of <span>{tracks.length}</span> lines) were added to <span>"{selectedPlaylist.name}"</span>.
        </>),
        type: 'info'
      })
      // refresh playlists count
      setPlaylists(await Spotify.fetchPlaylists(usernameRef.current));
    } catch (e) {
      console.log(e);
      setMessage({ content: 'Something went wrong, please try again (or not).', type: 'error' })
    } finally {
      setLoading(false);
    }
  };

  async function fetchPlaylists() {
    const token = localStorage.getItem(Spotify.key);
    if (token) {
      setLoggedIn(true);
      try {
        const username = await Spotify.fetchUsername();
        usernameRef.current = username;
        setPlaylists(await Spotify.fetchPlaylists(username));
      } catch (e) {
        console.log(e)
        if (e.message === 'TOKEN_EXPIRED') {
          setLoggedIn(false)
        }
      }
    }
  }
  React.useEffect(() => {
    setFetching(true);
    fetchPlaylists().then(() => setFetching(false));
  }, []);

  React.useEffect(() => {
    // scroll to summary effect
    if (selectedPlaylist.id && lines.length > 0 && summaryDivRef.current) {
      summaryDivRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedPlaylist.id, lines.length]);

  const messageProps = useTransition(message.content, null, {
    from: { position: 'absolute', opacity: 0 },
    enter: { opacity: 1 },
    leave: { opacity: 0 },
  })

  const transitions = useTransition(playlists, playlist => playlist.id, {
    from: { transform: "translate3d(80px,0,0)" },
    enter: { transform: "translate3d(0,0px,0)" },
    leave: { transform: "translate3d(80px,0,0)" }
  });

  return (
    <>
      <div className="wrapper">
        <div className="left">
          <h1 className="title">
            <span>Pastify:</span> quick way to create playlists.
          </h1>
          <p className="description">
            Just paste your list of tracks below and we will do the rest.
          </p>
          {!loggedIn && (
            <SpotifyLogin
              clientId={process.env.REACT_APP_SPOTIFY_CLIENT_ID}
              redirectUri={process.env.REACT_APP_SPOTIFY_REDIRECT_URI}
              scope="playlist-modify-public"
              onSuccess={onSpotifySuccess}
              onFailure={console.log} // TODO: handle this
              className="button"
            />
          )}
        </div>
        <div className="right">
          <Illustration />
        </div>
      </div>
      {loggedIn && (
        <>
          <div className="wrapper">
            <div className="textarea">
              <h3 className="subtitle">Paste tracks here</h3>
              <textarea
                rows={15}
                placeholder={`Example: \n\nJID - GENERAL\nBAS - DOPAMINE\nTRAVIS SCOTT - 90210\nEARL SWEATSHIRT - GRIEF\nBABY KEEM - HONEST\nEARTHGANG - MEDITATE\nKENDRICK LAMAR - MONEY TREES\nKANYE WEST - LATE\nPUSHA T - NOSETALGIA\nJACK BOYS - WHAT TO DO`}
                value={value}
                style={{
                  borderColor:
                    lines.length > 0 ? "var(--button-bg)" : "var(--gray-color)"
                }}
                onChange={onTextAreaChange}
              />
              <label htmlFor='checkbox' className='checkbox'>
                <input style={{ display: 'none' }} id='checkbox' type='checkbox' checked={removeDups} onChange={(e) => setRemoveDups(e.target.checked)} />
                <div>
                  <Check checked={removeDups} />
                  <span>Remove duplicates</span>
                </div>
              </label>
            </div>
            <div className="playlists">
              {fetching ? (
                <h3 className="subtitle">
                  Fetching your <span>public</span> playlists...
                </h3>
              ) : (
                  <h3 className="subtitle">
                    Pick a playlist or{" "}
                    <span
                      style={{ cursor: "pointer" }}
                      onClick={() => setShowForm(!showForm)}
                    >
                      create
                  </span>{" "}
                    a new one
                </h3>
                )}
              {showForm && (
                <input
                  value={name}
                  onChange={e => {
                    const name = e.target.value;
                    setName(name);
                    if (!!name) {
                      setSelectedPlaylist({ id: "new", name });
                    } else {
                      setSelectedPlaylist({});
                    }
                  }}
                  required
                  placeholder="Give it a name first"
                  className="input"
                />
              )}
              {fetching ? (
                <Spinner />
              ) : (
                  <div className='playlists-wrapper'>
                    {transitions.map(({ item: playlist, props, key }) => {
                      let classes = "playlist";
                      if (selectedPlaylist.id === playlist.id) {
                        classes += " playlist--selected";
                      }
                      return (
                        <animated.div
                          key={key}
                          className={classes}
                          style={props}
                          onClick={() => onPlaylistSelect(playlist)}
                        >
                          <div className="playlist-img">
                            <img src={playlist.img} alt={playlist.name} />
                          </div>
                          <div className="playlist-details">
                            <span className="playlist-title">{playlist.name}</span>
                            <span className="playlist-total">
                              <span>{playlist.total}</span> tracks currently
                            </span>
                          </div>
                        </animated.div>
                      );
                    })}
                  </div>
                )}
            </div>
          </div>
          <div className="wrapper">
            <div className="summary-wrapper" ref={summaryDivRef}>
              {lines.length > 0 && selectedPlaylist.id && (
                <>
                  <p className="summary-text">
                    You want to add <span>{lines.length}</span> songs to the
                  playlist <span>{selectedPlaylist.name}</span> ?
                </p>
                  <button
                    className="button"
                    disabled={loading}
                    style={loading ? { filter: "opacity(0.7)" } : {}}
                    onClick={onSubmit}
                  >
                    {loading ? (
                      <>
                        <Spinner /> <span>Hold on...</span>
                      </>
                    ) : (
                        "Yes, do your job."
                      )}
                  </button>
                </>
              )}
              {messageProps.map(({ item, key, props }) => item && (
                <animated.p key={key} style={props} className='message-text'>
                  {message.type === 'error' ? <Alert /> : <Info />}
                  <span className={message.type === 'error' ? "error-text" : 'info-text'}>
                    {message.content}
                  </span>
                </animated.p>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}

const rootElement = document.getElementById("root");
ReactDOM.render(<App />, rootElement);
