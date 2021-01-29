// Copyright 2019-2020 Signal Messenger, LLC
// SPDX-License-Identifier: AGPL-3.0-only

import * as React from 'react';
import classNames from 'classnames';
import { get, noop } from 'lodash';
import { Manager, Popper, Reference } from 'react-popper';
import { createPortal } from 'react-dom';
import { EmojiPicker, Props as EmojiPickerProps } from './EmojiPicker';
import { LocalizerType } from '../../types/Util';

export type OwnProps = {
  readonly i18n: LocalizerType;
};

export type Props = OwnProps &
  Pick<
    EmojiPickerProps,
    'doSend' | 'onPickEmoji' | 'onSetSkinTone' | 'recentEmojis' | 'skinTone'
  >;

enum OpenState {
  HIDDEN = 0,
  VISIBLE,
  FADEOUT,
}

export const EmojiButton = React.memo(
  ({
    i18n,
    doSend,
    onPickEmoji,
    skinTone,
    onSetSkinTone,
    recentEmojis,
  }: Props) => {
    const [openState, setOpenState] = React.useState<OpenState>(
      OpenState.HIDDEN
    );
    const [popperRoot, setPopperRoot] = React.useState<HTMLElement | null>(
      null
    );

    const hide = React.useCallback(() => {
      if (openState !== OpenState.VISIBLE) {
        return;
      }
      setOpenState(OpenState.FADEOUT);
      setTimeout(() => {
        setOpenState(OpenState.HIDDEN);
      }, 200);
    }, [openState, popperRoot, setOpenState]);

    const handleClickButton = React.useCallback(() => {
      if (popperRoot) {
        hide();
      } else {
        setOpenState(OpenState.VISIBLE);
      }
    }, [popperRoot, setOpenState]);

    const handleClose = React.useCallback(() => {
      hide();
    }, [setOpenState]);

    // Create popper root and handle outside clicks
    React.useEffect(() => {
      if (openState === OpenState.VISIBLE) {
        const root = document.createElement('div');
        setPopperRoot(root);
        document.body.appendChild(root);
        const handleOutsideClick = ({ target }: MouseEvent) => {
          if (!root.contains(target as Node)) {
            hide();
          }
        };
        document.addEventListener('click', handleOutsideClick);

        return () => {
          document.body.removeChild(root);
          document.removeEventListener('click', handleOutsideClick);
          setPopperRoot(null);
        };
      }

      return noop;
    }, [openState !== OpenState.HIDDEN, setOpenState, setPopperRoot]);

    // Install keyboard shortcut to open emoji picker
    React.useEffect(() => {
      const handleKeydown = (event: KeyboardEvent) => {
        const { ctrlKey, key, metaKey, shiftKey } = event;
        const commandKey = get(window, 'platform') === 'darwin' && metaKey;
        const controlKey = get(window, 'platform') !== 'darwin' && ctrlKey;
        const commandOrCtrl = commandKey || controlKey;

        // We don't want to open up if the conversation has any panels open
        const panels = document.querySelectorAll('.conversation .panel');
        if (panels && panels.length > 1) {
          return;
        }

        if (commandOrCtrl && shiftKey && (key === 'j' || key === 'J')) {
          event.stopPropagation();
          event.preventDefault();

          if (openState === OpenState.HIDDEN) {
            setOpenState(OpenState.VISIBLE);
          } else {
            hide();
          }
        }
      };
      document.addEventListener('keydown', handleKeydown);

      return () => {
        document.removeEventListener('keydown', handleKeydown);
      };
    }, [openState !== OpenState.HIDDEN, setOpenState]);

    return (
      <Manager>
        <Reference>
          {({ ref }) => (
            <button
              type="button"
              ref={ref}
              onClick={handleClickButton}
              className={classNames({
                'module-emoji-button__button': true,
                'module-emoji-button__button--active':
                  openState > OpenState.HIDDEN,
              })}
              aria-label={i18n('EmojiButton__label')}
            />
          )}
        </Reference>
        {openState && popperRoot
          ? createPortal(
              <Popper placement="top-start">
                {({ ref, style }) => (
                  <EmojiPicker
                    ref={ref}
                    i18n={i18n}
                    style={style}
                    onPickEmoji={onPickEmoji}
                    doSend={doSend}
                    onClose={handleClose}
                    skinTone={skinTone}
                    onSetSkinTone={onSetSkinTone}
                    recentEmojis={recentEmojis}
                    fadeout={openState === OpenState.FADEOUT}
                  />
                )}
              </Popper>,
              popperRoot
            )
          : null}
      </Manager>
    );
  }
);
