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
      throw new Error('Invalid action given to artistReducer.')
  }
}

export const playlistInitialState = {
  playlists: [],
  selected: null,
  loading: false,
  showForm: false,
}

export function playlistReducer(state, action) {
  switch (action.type) {
    case 'selectPlaylist':
      return {
        ...state,
        showForm: false,
        selected: action.payload,
      }

    default:
      throw new Error('Invalid action given to artistReducer.')
  }
}
