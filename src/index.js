import React, { useState, useRef, useEffect, useReducer } from 'react'
import ReactDOM from 'react-dom'
import SpotifyLogin from 'react-spotify-login'
import { useTransition, animated } from 'react-spring'
import { useDebounce } from 'use-debounce'

import * as Spotify from './api'
import {
  artistInitialState,
  artistReducer,
  appInitialState,
  appReducer,
} from './reducers'
import './styles.css'
import Illustration from './icons/Illustration'
import Spinner from './icons/Spinner'
import Check from './icons/Check'
import Info from './icons/Info'
import Alert from './icons/Alert'

function App() {
  const [artistState, dispatchArtist] = useReducer(
    artistReducer,
    artistInitialState
  )
  const [appState, dispatchApp] = useReducer(appReducer, appInitialState)
  const setAppState = (payload) => dispatchApp({ type: 'setAppState', payload })

  const [value, setValue] = useState('')
  const [lines, setLines] = useState([])

  const [fetching, setFetching] = useState(false)
  const [playlists, setPlaylists] = useState([])
  const [selectedPlaylist, setSelectedPlaylist] = useState({})
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')

  const [removeDups, setRemoveDups] = useState(true)

  const [debouncedArtistInput] = useDebounce(artistState.input, 300)
  const summaryDivRef = useRef(null)
  const usernameRef = useRef(null)

  const onSpotifySuccess = ({ access_token }) => {
    localStorage.setItem(Spotify.key, access_token)
    setAppState({ status: 'idle' })
    fetchPlaylists()
  }

  const onTextAreaChange = ({ target: { value } }) => {
    setValue(value)
    setLines(!!value ? value.split('\n').filter((x) => !!x) : [])
  }

  const onPlaylistSelect = (playlist) => {
    setSelectedPlaylist(playlist)
    setShowForm(false)
  }

  const handleArtistSelect = (artist) => {
    dispatchArtist({
      type: 'selectArtist',
      payload: artist,
    })
  }

  const handleArtistInputChange = ({ target: { value } }) => {
    dispatchArtist({ type: 'changeArtistInput', payload: value })
  }

  useEffect(() => {
    if (!debouncedArtistInput) return
    if (artistState.selected?.name === debouncedArtistInput) return
    dispatchArtist({ type: 'searchArtistStart' })
    Spotify.searchArtists(debouncedArtistInput).then((artists) => {
      dispatchArtist({ type: 'searchArtistEnd', payload: artists })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedArtistInput])

  const handleSubmit = async () => {
    setAppState({ status: 'submitting' })
    try {
      const tracks = await Spotify.bulkSearch(lines, artistState.selected)
      let uris = tracks.filter((x) => x !== null).map((t) => t.uri)
      if (removeDups && selectedPlaylist.id !== 'new') {
        // remove duplicate tracks
        const playlistTracks = await Spotify.fetchPlaylistTracks(
          selectedPlaylist.id
        )
        uris = uris.filter((uri) => !playlistTracks.includes(uri))
      }
      if (uris.length === 0) {
        return setAppState({
          message: 'No tracks were added to the selected playlist.',
          status: 'error',
        })
      }
      if (selectedPlaylist.id === 'new') {
        const newPlaylistID = await Spotify.createPlaylist(
          selectedPlaylist.name,
          usernameRef.current
        )
        await Spotify.addTracksToPlaylist(newPlaylistID, uris)
      } else {
        await Spotify.addTracksToPlaylist(selectedPlaylist.id, uris)
      }
      // reset UI
      setLines(false)
      setSelectedPlaylist({})
      setValue('')
      setName('')
      setShowForm(false)
      dispatchArtist({ type: 'reset' })
      setAppState({
        message: (
          <>
            <span>{uris.length}</span> tracks (out of{' '}
            <span>{tracks.length}</span> lines) were added to{' '}
            <span>"{selectedPlaylist.name}"</span>.
          </>
        ),
        status: 'success',
      })
      // refresh playlists count
      setPlaylists(await Spotify.fetchPlaylists(usernameRef.current))
    } catch (e) {
      console.log(e)
      setAppState({
        message: 'Something went wrong, please try again (or not).',
        status: 'error',
      })
    }
  }

  async function fetchPlaylists() {
    const token = localStorage.getItem(Spotify.key)
    if (token) {
      setAppState({ status: 'idle' })
      try {
        const username = await Spotify.fetchUsername()
        usernameRef.current = username
        const playlists = await Spotify.fetchPlaylists(username)
        setPlaylists(playlists)
      } catch (e) {
        console.log(e)
        if (e.message === 'TOKEN_EXPIRED') {
          setAppState({ status: 'loggedOut' })
        }
      }
    }
  }

  useEffect(() => {
    setFetching(true)
    fetchPlaylists()
      .then(() => setFetching(false))
      .catch((e) => console.log(e))
  }, [])

  useEffect(() => {
    // scroll to summary effect
    if (selectedPlaylist.id && lines.length > 0 && summaryDivRef.current) {
      summaryDivRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [selectedPlaylist.id, lines.length])

  const messageProps = useTransition(appState, null, {
    from: { position: 'absolute', opacity: 0 },
    enter: { opacity: 1 },
    leave: { opacity: 0 },
  })

  const transitions = useTransition(playlists, (playlist) => playlist.id, {
    from: { transform: 'translate3d(80px,0,0)' },
    enter: { transform: 'translate3d(0,0px,0)' },
    leave: { transform: 'translate3d(80px,0,0)' },
  })

  console.log({ appState })
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
          {appState.status === 'loggedOut' && (
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
      {appState.status !== 'loggedOut' && (
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
                    lines.length > 0 ? 'var(--button-bg)' : 'var(--gray-color)',
                }}
                onChange={onTextAreaChange}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label
                  htmlFor="checkbox"
                  className="checkbox"
                  style={{ flex: 1 }}
                >
                  <input
                    style={{ display: 'none' }}
                    id="checkbox"
                    type="checkbox"
                    checked={removeDups}
                    onChange={(e) => setRemoveDups(e.target.checked)}
                  />
                  <div>
                    <Check checked={removeDups} />
                    <span>Remove duplicates</span>
                  </div>
                </label>
                <div style={{ flex: 1 }}>
                  <input
                    value={artistState.input}
                    id="artist"
                    className="input artist-input"
                    placeholder="Search by artist name"
                    onChange={handleArtistInputChange}
                  />
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <label htmlFor="artist" className="artist-label">
                      Artist prefix (optional)
                    </label>
                    {artistState.suggestionLoading && <Spinner />}
                  </div>
                  {artistState.suggestions.length > 0 && (
                    <ul className="suggestion-list">
                      {artistState.suggestions.map((artist) => (
                        <li
                          key={artist.id}
                          className="suggestion-item"
                          onClick={() => handleArtistSelect(artist)}
                        >
                          {artist.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
            <div className="playlists">
              {fetching ? (
                <h3 className="subtitle">
                  Fetching your <span>public</span> playlists...
                </h3>
              ) : (
                <h3 className="subtitle">
                  Pick a playlist or{' '}
                  <span
                    style={{ cursor: 'pointer' }}
                    onClick={() => setShowForm(!showForm)}
                  >
                    create
                  </span>{' '}
                  a new one
                </h3>
              )}
              {showForm && (
                <input
                  value={name}
                  onChange={(e) => {
                    const name = e.target.value
                    setName(name)
                    if (!!name) {
                      setSelectedPlaylist({ id: 'new', name })
                    } else {
                      setSelectedPlaylist({})
                    }
                  }}
                  required
                  placeholder="Give it a name first"
                  className="input"
                  autoFocus
                />
              )}
              {fetching ? (
                <Spinner />
              ) : (
                <div className="playlists-wrapper">
                  {transitions.map(({ item: playlist, props, key }) => {
                    let classes = 'playlist'
                    if (selectedPlaylist.id === playlist.id) {
                      classes += ' playlist--selected'
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
                          <span className="playlist-title">
                            {playlist.name}
                          </span>
                          <span className="playlist-total">
                            <span>{playlist.total}</span> tracks currently
                          </span>
                        </div>
                      </animated.div>
                    )
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
                    You want to add <span>{lines.length}</span> songs{' '}
                    {artistState.selected?.name ? (
                      <>
                        by <span>{artistState.selected?.name}</span>{' '}
                      </>
                    ) : (
                      ''
                    )}
                    to the playlist <span>{selectedPlaylist.name}</span> ?
                  </p>
                  <button
                    className="button"
                    disabled={appState.status === 'submitting'}
                    style={
                      appState.status === 'submitting'
                        ? { filter: 'opacity(0.7)' }
                        : {}
                    }
                    onClick={handleSubmit}
                  >
                    {appState.status === 'submitting' ? (
                      <>
                        <Spinner /> <span>Hold on...</span>
                      </>
                    ) : (
                      'Yes, do your job.'
                    )}
                  </button>
                </>
              )}
              {(appState.status === 'error' ||
                appState.status === 'success') && (
                <p className="message-text">
                  {appState.status === 'error' ? <Alert /> : <Info />}
                  <span
                    className={
                      appState.status === 'error' ? 'error-text' : 'info-text'
                    }
                  >
                    {appState.message}
                  </span>
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}

const rootElement = document.getElementById('root')
ReactDOM.render(<App />, rootElement)
