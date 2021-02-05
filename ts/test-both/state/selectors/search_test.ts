// Copyright 2021 Signal Messenger, LLC
// SPDX-License-Identifier: AGPL-3.0-only

import { assert } from 'chai';

import {
  ConversationType,
  getEmptyState as getEmptyConversationState,
  MessageType,
} from '../../../state/ducks/conversations';
import { noopAction } from '../../../state/ducks/noop';
import { getEmptyState as getEmptySearchState } from '../../../state/ducks/search';
import { getEmptyState as getEmptyUserState } from '../../../state/ducks/user';
import { getMessageSearchResultSelector } from '../../../state/selectors/search';

import { StateType, reducer as rootReducer } from '../../../state/reducer';

describe('both/state/selectors/search', () => {
  const getEmptyRootState = (): StateType => {
    return rootReducer(undefined, noopAction());
  };

  function getDefaultMessage(id: string): MessageType {
    return {
      id,
      conversationId: 'conversationId',
      source: 'source',
      sourceUuid: 'sourceUuid',
      type: 'incoming' as const,
      received_at: Date.now(),
      attachments: [],
      sticker: {},
      unread: false,
    };
  }

  function getDefaultConversation(id: string): ConversationType {
    return {
      id,
      type: 'direct',
      title: `${id} title`,
    };
  }

  describe('#getMessageSearchResultSelector', () => {
    it('returns undefined if message not found in lookup', () => {
      const state = getEmptyRootState();
      const selector = getMessageSearchResultSelector(state);

      const actual = selector('random-id');

      assert.strictEqual(actual, undefined);
    });

    it('returns undefined if type is unexpected', () => {
      const id = 'message-id';
      const state = {
        ...getEmptyRootState(),
        search: {
          ...getEmptySearchState(),
          messageLookup: {
            [id]: {
              ...getDefaultMessage(id),
              type: 'keychange' as const,
              snippet: 'snippet',
            },
          },
        },
      };
      const selector = getMessageSearchResultSelector(state);

      const actual = selector(id);

      assert.strictEqual(actual, undefined);
    });

    it('returns incoming message', () => {
      const searchId = 'search-id';
      const fromId = 'from-id';
      const toId = 'to-id';

      const from = getDefaultConversation(fromId);
      const to = getDefaultConversation(toId);

      const state = {
        ...getEmptyRootState(),
        conversations: {
          ...getEmptyConversationState(),
          conversationLookup: {
            [fromId]: from,
            [toId]: to,
          },
        },
        search: {
          ...getEmptySearchState(),
          messageLookup: {
            [searchId]: {
              ...getDefaultMessage(searchId),
              type: 'incoming' as const,
              sourceUuid: fromId,
              conversationId: toId,
              snippet: 'snippet',
            },
          },
        },
      };
      const selector = getMessageSearchResultSelector(state);

      const actual = selector(searchId);
      const expected = {
        from,
        to,

        id: searchId,
        conversationId: toId,
        sentAt: undefined,
        snippet: 'snippet',

        isSelected: false,
        isSearchingInConversation: false,
      };

      assert.deepEqual(actual, expected);
    });
    it('returns outgoing message and caches appropriately', () => {
      const searchId = 'search-id';
      const fromId = 'from-id';
      const toId = 'to-id';

      const from = getDefaultConversation(fromId);
      const to = getDefaultConversation(toId);

      const state = {
        ...getEmptyRootState(),
        user: {
          ...getEmptyUserState(),
          ourConversationId: fromId,
        },
        conversations: {
          ...getEmptyConversationState(),
          conversationLookup: {
            [fromId]: from,
            [toId]: to,
          },
        },
        search: {
          ...getEmptySearchState(),
          messageLookup: {
            [searchId]: {
              ...getDefaultMessage(searchId),
              type: 'outgoing' as const,
              conversationId: toId,
              snippet: 'snippet',
            },
          },
        },
      };
      const selector = getMessageSearchResultSelector(state);

      const actual = selector(searchId);
      const expected = {
        from,
        to,

        id: searchId,
        conversationId: toId,
        sentAt: undefined,
        snippet: 'snippet',

        isSelected: false,
        isSearchingInConversation: false,
      };

      assert.deepEqual(actual, expected);

      // Update the conversation lookup, but not the conversations in question
      const secondState = {
        ...state,
        conversations: {
          ...state.conversations,
          conversationLookup: {
            ...state.conversations.conversationLookup,
          },
        },
      };
      const secondSelector = getMessageSearchResultSelector(secondState);
      const secondActual = secondSelector(searchId);

      assert.strictEqual(secondActual, actual);

      // Update a conversation involved in rendering this search result
      const thirdState = {
        ...state,
        conversations: {
          ...state.conversations,
          conversationLookup: {
            ...state.conversations.conversationLookup,
            [fromId]: {
              ...from,
              name: 'new-name',
            },
          },
        },
      };

      const thirdSelector = getMessageSearchResultSelector(thirdState);
      const thirdActual = thirdSelector(searchId);

      assert.notStrictEqual(actual, thirdActual);
    });
  });
});
