export const artistInitialState = {
  suggestions: [],
  input: '',
  selected: null,
  suggestionLoading: false,
}

export function artistReducer(state, action) {
  switch (action.type) {
    case 'changeArtistInput':
      return {
        ...state,
        input: action.payload,
        suggestions: action.payload ? state.suggestions : [],
      }
    case 'selectArtist':
      return {
        ...state,
        input: action.payload.name,
        selected: { ...action.payload },
        suggestions: [],
      }
    case 'searchArtistStart':
      return {
        ...state,
        suggestionLoading: true,
      }
    case 'searchArtistEnd':
      return {
        ...state,
        suggestionLoading: false,
        suggestions: action.payload,
      }
    case 'reset':
      return artistInitialState
    default:
      throw new Error(
        `Invalid action.type: "${action.type}" was provided to artistReducer.`
      )
  }
}

export const appInitialState = {
  status: 'idle',
}

export function appReducer(state, action) {
  const allowedStatus = ['loggedOut', 'idle', 'submitting', 'success', 'error']
  switch (action.type) {
    case 'setAppState':
      const { status, message } = action.payload
      if (allowedStatus.includes(status)) {
        return { status, message }
      } else {
        throw new Error(
          `Invalid status: "${status}" was provided to setAppState.`
        )
      }
    default:
      throw new Error(
        `Invalid action.type: "${action.type}" was provided to appState.`
      )
  }
}

export const playlistInitialState = {
  list: [],
  fetching: false,
  selected: null,
  formVisible: false,
  input: '',
}

export function playlistReducer(state, action) {
  switch (action.type) {
    case 'setPlaylistPayload':
      return {
        ...state,
        ...action.payload,
      }
    default:
      throw new Error(
        `Invalid action.type: "${action.type}" was provided to playlistReducer.`
      )
  }
}
