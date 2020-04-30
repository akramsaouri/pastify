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
  playlistInitialState,
  defaultReducer,
  formInitialState,
} from './reducers'
import './styles.css'
import { Alert, Check, Illustration, Info, Spinner } from './icons'

function App() {
  const [artistState, dispatchArtist] = useReducer(
    artistReducer,
    artistInitialState
  )
  const [appState, dispatchApp] = useReducer(appReducer, appInitialState)
  const setAppState = (payload) => dispatchApp({ type: 'setAppState', payload })
  const [playlistState, setPlaylistState] = useReducer(
    defaultReducer,
    playlistInitialState
  )
  const [formState, setFormState] = useReducer(defaultReducer, formInitialState)
  const [removeDups, setRemoveDups] = useState(true)
  const [debouncedArtistInput] = useDebounce(artistState.input, 300)
  const summaryDivRef = useRef(null)
  const usernameRef = useRef(null)

  useEffect(() => {
    // fire searchArtists fn on debounced event
    if (!debouncedArtistInput) return
    if (artistState.selected?.name === debouncedArtistInput) return
    dispatchArtist({ type: 'searchArtistStart' })
    Spotify.searchArtists(debouncedArtistInput).then((artists) => {
      dispatchArtist({ type: 'searchArtistEnd', payload: artists })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedArtistInput])

  useEffect(() => {
    // scroll to summary effect
    if (
      playlistState.selected?.id &&
      formState.lines.length > 0 &&
      summaryDivRef.current
    ) {
      summaryDivRef.current.scrollIntoView({ behavior: 'smooth' })
      if (['success', 'error'].includes(appState.status)) {
        // recover from last submit result
        setAppState({
          status: 'ready',
          message: null,
          skip: true,
        })
      }
    }
  }, [playlistState.selected?.id, formState.value])

  useEffect(() => {
    async function fetchPlaylists() {
      try {
        if (!usernameRef.current) {
          usernameRef.current = await Spotify.fetchUsername()
        }
        return Spotify.fetchPlaylists(usernameRef.current)
      } catch (e) {
        console.log(e)
        if (e.message === 'TOKEN_EXPIRED') {
          setAppState({ status: 'loggedOut' })
        }
      }
    }
    const allowedStatus = ['ready', 'success']
    if (!allowedStatus.includes(appState.status)) return
    if (appState.skip) return
    // refresh playlists state on every one of these phases:
    // - on mount (if token still valid/exists)
    // - on post submit
    // - on successfull login
    const token = localStorage.getItem(Spotify.key)
    if (token) {
      setPlaylistState({ fetching: true })
      fetchPlaylists().then((playlists) => {
        setPlaylistState({ list: playlists, fetching: false })
      })
    } else {
      setAppState({ status: 'loggedOut' })
    }
  }, [appState.status])

  const handleLoginSuccess = ({ access_token }) => {
    localStorage.setItem(Spotify.key, access_token)
    setAppState({ status: 'ready' })
  }

  const handleTextAreaChange = ({ target: { value } }) => {
    const lines = !!value ? value.split('\n').filter((x) => !!x) : []
    setFormState({
      value,
      lines,
    })
  }

  const handlePlaylistSelect = (playlist) => {
    setPlaylistState({
      selected: playlist,
      formVisible: false,
    })
  }

  const handleArtistSelect = (artist) => {
    dispatchArtist({
      type: 'selectArtist',
      payload: artist,
    })
  }

  const handlePlaylistInputChange = ({ target: { value } }) => {
    const newState = {
      input: value,
    }
    if (!!value) {
      newState.selected = { id: 'new', name: value }
    } else {
      newState.selected = {}
    }
    setPlaylistState({ ...newState })
  }

  const handleArtistInputChange = ({ target: { value } }) => {
    dispatchArtist({ type: 'changeArtistInput', payload: value })
  }

  const handleSubmit = async () => {
    setAppState({ status: 'submitting' })
    try {
      const tracks = await Spotify.bulkSearch(
        formState.lines,
        artistState.selected
      )
      let uris = tracks.filter((x) => x !== null).map((t) => t.uri)
      if (removeDups) {
        // remove duplicate tracks
        const playlistTracks = await Spotify.fetchPlaylistTracks(
          playlistState.selected.id
        )
        uris = uris.filter((uri) => !playlistTracks.includes(uri))
      }
      if (uris.length === 0) {
        return setAppState({
          message: 'No tracks were added to the selected playlist.',
          status: 'error',
        })
      }
      if (playlistState.selected.id === 'new') {
        const newPlaylistID = await Spotify.createPlaylist(
          playlistState.selected.name,
          usernameRef.current
        )
        await Spotify.addTracksToPlaylist(newPlaylistID, uris)
      } else {
        await Spotify.addTracksToPlaylist(playlistState.selected.id, uris)
      }
      // reset UI
      dispatchArtist({ type: 'reset' })
      setFormState({
        lines: [],
        value: '',
      })
      setPlaylistState({ ...playlistInitialState, list: playlistState.list })
      setAppState({
        message: (
          <>
            <span>{uris.length}</span> tracks (out of{' '}
            <span>{tracks.length}</span> lines) were added to{' '}
            <span>"{playlistState.selected.name}"</span>.
          </>
        ),
        status: 'success',
      })
    } catch (e) {
      console.log(e)
      setAppState({
        message: 'Something went wrong, please try again (or not).',
        status: 'error',
      })
    }
  }

  const messageProps = useTransition(appState, null, {
    from: { position: 'absolute', opacity: 0 },
    enter: { opacity: 1 },
    leave: { opacity: 0 }, // TODO: make this work again
  })

  const transitions = useTransition(
    playlistState.list,
    (playlist) => playlist?.id,
    {
      from: { transform: 'translate3d(80px,0,0)' },
      enter: { transform: 'translate3d(0,0px,0)' },
      leave: { transform: 'translate3d(80px,0,0)' },
    }
  )

  console.log('current status: ', appState.status)
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
              onSuccess={handleLoginSuccess}
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
                value={formState.value}
                style={{
                  borderColor:
                    formState.lines.length > 0
                      ? 'var(--button-bg)'
                      : 'var(--gray-color)',
                }}
                onChange={handleTextAreaChange}
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
                    // TODO:disable this on form visible
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
              {playlistState.fetching ? (
                <h3 className="subtitle">
                  Fetching your <span>public</span> playlists...
                </h3>
              ) : (
                <h3 className="subtitle">
                  Pick a playlist or{' '}
                  <span
                    style={{ cursor: 'pointer' }}
                    onClick={() => setPlaylistState({ formVisible: true })}
                  >
                    create
                  </span>{' '}
                  a new one
                </h3>
              )}
              {playlistState.formVisible && (
                <input
                  value={playlistState.input}
                  onChange={handlePlaylistInputChange}
                  required
                  placeholder="Give it a name first"
                  className="input"
                  autoFocus
                />
              )}
              {playlistState.fetching ? (
                <Spinner />
              ) : (
                <div className="playlists-wrapper">
                  {transitions.map(({ item: playlist, props, key }) => {
                    let classes = 'playlist'
                    if (playlistState.selected?.id === playlist.id) {
                      classes += ' playlist--selected'
                    }
                    return (
                      <animated.div
                        key={key}
                        className={classes}
                        style={props}
                        onClick={() => handlePlaylistSelect(playlist)}
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
              {['ready', 'submitting'].includes(appState.status) &&
                formState.lines.length > 0 &&
                playlistState.selected?.id && (
                  <>
                    <p className="summary-text">
                      You want to add <span>{formState.lines.length}</span>{' '}
                      songs{' '}
                      {artistState.selected?.name ? (
                        <>
                          by <span>{artistState.selected?.name}</span>{' '}
                        </>
                      ) : (
                        ''
                      )}
                      to the playlist <span>{playlistState.selected.name}</span>{' '}
                      ?
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
              {['success', 'error'].includes(appState.status) &&
                appState.message && (
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
