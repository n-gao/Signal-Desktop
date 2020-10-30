import { take, uniq } from 'lodash';
import { ThunkAction } from 'redux-thunk';
import { EmojiPickDataType } from '../../components/emoji/EmojiPicker';
import dataInterface from '../../sql/Client';
import { useBoundActions } from '../../util/hooks';

const { updateEmojiUsage } = dataInterface;

// State

export type EmojisStateType = {
  readonly recents: Array<string>;
};

// Actions

type UseEmojiAction = {
  type: 'emojis/USE_EMOJI';
  payload: string;
};

type EmojisActionType = UseEmojiAction;

// Action Creators

export const actions = {
  onUseEmoji,
  useEmoji,
};

export const useActions = (): typeof actions => useBoundActions(actions);

function onUseEmoji({
  shortName,
}: EmojiPickDataType): ThunkAction<void, unknown, unknown, UseEmojiAction> {
  return async dispatch => {
    try {
      await updateEmojiUsage(shortName);
      dispatch(useEmoji(shortName));
    } catch (err) {
      // Errors are ignored.
    }
  };
}

function useEmoji(payload: string): UseEmojiAction {
  return {
    type: 'emojis/USE_EMOJI',
    payload,
  };
}

// Reducer

function getEmptyState(): EmojisStateType {
  return {
    recents: [],
  };
}

export function reducer(
  state: EmojisStateType = getEmptyState(),
  action: EmojisActionType
): EmojisStateType {
  if (action.type === 'emojis/USE_EMOJI') {
    const { payload } = action;

    return {
      ...state,
      recents: take(uniq([payload, ...state.recents]), 32),
    };
  }

  return state;
}
