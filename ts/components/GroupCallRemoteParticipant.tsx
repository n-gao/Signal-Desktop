// Copyright 2020-2021 Signal Messenger, LLC
// SPDX-License-Identifier: AGPL-3.0-only

import React, {
  useState,
  useRef,
  useMemo,
  useCallback,
  useEffect,
  CSSProperties,
} from 'react';
import classNames from 'classnames';
import { noop } from 'lodash';
import {
  GroupCallRemoteParticipantType,
  VideoFrameSource,
} from '../types/Calling';
import { LocalizerType } from '../types/Util';
import { CallBackgroundBlur } from './CallBackgroundBlur';
import { Avatar, AvatarSize } from './Avatar';
import { ConfirmationModal } from './ConfirmationModal';
import { Intl } from './Intl';
import { ContactName } from './conversation/ContactName';
import { useIntersectionObserver } from '../util/hooks';
import { MAX_FRAME_SIZE } from '../calling/constants';

type BasePropsType = {
  getFrameBuffer: () => ArrayBuffer;
  getGroupCallVideoFrameSource: (demuxId: number) => VideoFrameSource;
  i18n: LocalizerType;
  remoteParticipant: GroupCallRemoteParticipantType;
};

type InPipPropsType = {
  isInPip: true;
};

type InOverflowAreaPropsType = {
  height: number;
  isInPip?: false;
  width: number;
};

type InGridPropsType = InOverflowAreaPropsType & {
  left: number;
  top: number;
};

export type PropsType = BasePropsType &
  (InPipPropsType | InOverflowAreaPropsType | InGridPropsType);

export const GroupCallRemoteParticipant: React.FC<PropsType> = React.memo(
  props => {
    const { getFrameBuffer, getGroupCallVideoFrameSource, i18n } = props;

    const {
      avatarPath,
      color,
      demuxId,
      hasRemoteAudio,
      hasRemoteVideo,
      isBlocked,
      profileName,
      title,
      videoAspectRatio,
    } = props.remoteParticipant;

    const [isWide, setIsWide] = useState<boolean>(
      videoAspectRatio ? videoAspectRatio >= 1 : true
    );
    const [hasHover, setHover] = useState(false);
    const [showBlockInfo, setShowBlockInfo] = useState(false);

    const remoteVideoRef = useRef<HTMLCanvasElement | null>(null);
    const canvasContextRef = useRef<CanvasRenderingContext2D | null>(null);

    const [
      intersectionRef,
      intersectionObserverEntry,
    ] = useIntersectionObserver();
    const isVisible = intersectionObserverEntry
      ? intersectionObserverEntry.isIntersecting
      : true;

    const videoFrameSource = useMemo(
      () => getGroupCallVideoFrameSource(demuxId),
      [getGroupCallVideoFrameSource, demuxId]
    );

    const renderVideoFrame = useCallback(() => {
      const canvasEl = remoteVideoRef.current;
      if (!canvasEl) {
        return;
      }

      const canvasContext = canvasContextRef.current;
      if (!canvasContext) {
        return;
      }

      // This frame buffer is shared by all participants, so it may contain pixel data
      //   for other participants, or pixel data from a previous frame. That's why we
      //   return early and use the `frameWidth` and `frameHeight`.
      const frameBuffer = getFrameBuffer();
      const frameDimensions = videoFrameSource.receiveVideoFrame(frameBuffer);
      if (!frameDimensions) {
        return;
      }

      const [frameWidth, frameHeight] = frameDimensions;

      if (
        frameWidth < 2 ||
        frameHeight < 2 ||
        frameWidth * frameHeight > MAX_FRAME_SIZE
      ) {
        return;
      }

      canvasEl.width = frameWidth;
      canvasEl.height = frameHeight;

      canvasContext.putImageData(
        new ImageData(
          new Uint8ClampedArray(frameBuffer, 0, frameWidth * frameHeight * 4),
          frameWidth,
          frameHeight
        ),
        0,
        0
      );

      setIsWide(frameWidth > frameHeight);
    }, [getFrameBuffer, videoFrameSource]);

    useEffect(() => {
      if (!hasRemoteVideo || !isVisible) {
        return noop;
      }

      let rafId = requestAnimationFrame(tick);

      function tick() {
        renderVideoFrame();
        rafId = requestAnimationFrame(tick);
      }

      return () => {
        cancelAnimationFrame(rafId);
      };
    }, [hasRemoteVideo, isVisible, renderVideoFrame, videoFrameSource]);

    let canvasStyles: CSSProperties;
    let containerStyles: CSSProperties;

    // If our `width` and `height` props don't match the canvas's aspect ratio, we want to
    //   fill the container. This can happen when RingRTC gives us an inaccurate
    //   `videoAspectRatio`, or if the container is an unexpected size.
    if (isWide) {
      canvasStyles = { width: '100%' };
    } else {
      canvasStyles = { height: '100%' };
    }

    let avatarSize: number;

    // TypeScript isn't smart enough to know that `isInPip` by itself disambiguates the
    //   types, so we have to use `props.isInPip` instead.
    // eslint-disable-next-line react/destructuring-assignment
    if (props.isInPip) {
      containerStyles = canvasStyles;
      avatarSize = AvatarSize.FIFTY_TWO;
    } else {
      const { width, height } = props;
      const shorterDimension = Math.min(width, height);

      if (shorterDimension >= 240) {
        avatarSize = AvatarSize.ONE_HUNDRED_TWELVE;
      } else if (shorterDimension >= 180) {
        avatarSize = AvatarSize.EIGHTY;
      } else {
        avatarSize = AvatarSize.FIFTY_TWO;
      }

      containerStyles = {
        height,
        width,
      };

      if ('top' in props) {
        containerStyles.position = 'absolute';
        containerStyles.top = props.top;
        containerStyles.left = props.left;
      }
    }

    const showHover = hasHover && !props.isInPip;
    const canShowVideo = hasRemoteVideo && !isBlocked && isVisible;

    return (
      <>
        {showBlockInfo && (
          <ConfirmationModal
            i18n={i18n}
            onClose={() => {
              setShowBlockInfo(false);
            }}
            title={
              <div className="module-ongoing-call__group-call-remote-participant__blocked--modal-title">
                <Intl
                  i18n={i18n}
                  id="calling__you-have-blocked"
                  components={[
                    <ContactName
                      key="name"
                      profileName={profileName}
                      title={title}
                      i18n={i18n}
                    />,
                  ]}
                />
              </div>
            }
            actions={[
              {
                text: i18n('ok'),
                action: () => {
                  setShowBlockInfo(false);
                },
                style: 'affirmative',
              },
            ]}
          >
            {i18n('calling__block-info')}
          </ConfirmationModal>
        )}

        <div
          className="module-ongoing-call__group-call-remote-participant"
          ref={intersectionRef}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          style={containerStyles}
        >
          {showHover && (
            <div
              className={classNames(
                'module-ongoing-call__group-call-remote-participant--title',
                {
                  'module-ongoing-call__group-call-remote-participant--audio-muted': !hasRemoteAudio,
                }
              )}
            >
              <ContactName
                module="module-ongoing-call__group-call-remote-participant--contact-name"
                profileName={profileName}
                title={title}
                i18n={i18n}
              />
            </div>
          )}
          {canShowVideo ? (
            <canvas
              className="module-ongoing-call__group-call-remote-participant__remote-video"
              style={canvasStyles}
              ref={canvasEl => {
                remoteVideoRef.current = canvasEl;
                if (canvasEl) {
                  canvasContextRef.current = canvasEl.getContext('2d', {
                    alpha: false,
                    desynchronized: true,
                    storage: 'discardable',
                  } as CanvasRenderingContext2DSettings);
                } else {
                  canvasContextRef.current = null;
                }
              }}
            />
          ) : (
            <CallBackgroundBlur avatarPath={avatarPath} color={color}>
              {isBlocked ? (
                <>
                  <i className="module-ongoing-call__group-call-remote-participant__blocked" />
                  <button
                    type="button"
                    className="module-ongoing-call__group-call-remote-participant__blocked--info"
                    onClick={() => {
                      setShowBlockInfo(true);
                    }}
                  >
                    {i18n('moreInfo')}
                  </button>
                </>
              ) : (
                <Avatar
                  avatarPath={avatarPath}
                  color={color || 'ultramarine'}
                  noteToSelf={false}
                  conversationType="direct"
                  i18n={i18n}
                  profileName={profileName}
                  title={title}
                  size={avatarSize}
                />
              )}
            </CallBackgroundBlur>
          )}
        </div>
      </>
    );
  }
);
