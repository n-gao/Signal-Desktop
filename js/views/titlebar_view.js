// Copyright 2017-2021 Signal Messenger, LLC
// SPDX-License-Identifier: AGPL-3.0-only

/* global Whisper */

// eslint-disable-next-line func-names
(function () {
    window.Whisper = window.Whisper || {};
  
    Whisper.TitlebarView = Whisper.View.extend({
      tagName: 'header',
      className: 'titlebar',
      templateName: 'titlebar',
      events: {
        'click .min-button': 'onMinimize',
        'click .max-button': 'onMaximize',
        'click .restore-button': 'onRestore',
        'click .close-button': 'onClose',
      },
      initialize() {
        this.render();
        window.subscribeToMaximizeStatusChange(status => this.onMaximizeStatusChanged(status));
      },
      render_attributes() {
        return {
            application_title: window.getTitle(),
        };
      },
      onMinimize(e) {
        window.minimize();
        e.stopPropagation();
      },
      onMaximize(e) {
        window.maximize();
        e.stopPropagation();
      },
      onRestore(e) {
        window.restore();
        e.stopPropagation();
      },
      onClose(e) {
        window.shutdown();
        e.stopPropagation();
      },

      onMaximizeStatusChanged(status) {
        if (status) {
          this.$el[0].classList.add("maximized");
        } else {
          this.$el[0].classList.remove("maximized");
        }
      }
    });
  })();
  