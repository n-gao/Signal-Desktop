// Copyright 2015-2021 Signal Messenger, LLC
// SPDX-License-Identifier: AGPL-3.0-only

// This file is here temporarily while we're switching off of Backbone into
// React. In the future, and in React-land, please just import and use
// ConfirmationModal directly. This is the thin API layer to bridge the gap
// while we convert things over. Please delete this file once all usages are
// ported over. Note: this file cannot have any imports/exports since it is
// being included in a <script /> tag.

type ConfirmationDialogViewProps = {
  cancelText?: string;
  confirmStyle?: 'affirmative' | 'negative';
  message: string;
  okText: string;
  reject?: () => void;
  resolve: () => void;
};

let confirmationDialogViewNode: HTMLElement | null = null;
let confirmationDialogPreviousFocus: HTMLElement | null = null;

function removeConfirmationDialog() {
  if (!confirmationDialogViewNode) {
    return;
  }

  window.ReactDOM.unmountComponentAtNode(confirmationDialogViewNode);
  document.body.removeChild(confirmationDialogViewNode);

  if (
    confirmationDialogPreviousFocus &&
    typeof confirmationDialogPreviousFocus.focus === 'function'
  ) {
    confirmationDialogPreviousFocus.focus();
  }
  confirmationDialogViewNode = null;
}

function showConfirmationDialog(options: ConfirmationDialogViewProps) {
  if (confirmationDialogViewNode) {
    removeConfirmationDialog();
  }

  confirmationDialogViewNode = document.createElement('div');
  document.body.appendChild(confirmationDialogViewNode);

  confirmationDialogPreviousFocus = document.activeElement as HTMLElement;

  window.ReactDOM.render(
    // eslint-disable-next-line react/react-in-jsx-scope, react/jsx-no-undef
    <window.Signal.Components.ConfirmationModal
      actions={[
        {
          action: () => {
            removeConfirmationDialog();
            options.resolve();
          },
          style: options.confirmStyle,
          text: options.okText || window.i18n('ok'),
        },
      ]}
      cancelText={options.cancelText || window.i18n('cancel')}
      i18n={window.i18n}
      onClose={() => {
        removeConfirmationDialog();
        if (options.reject) {
          options.reject();
        }
      }}
      title={options.message}
    />,
    confirmationDialogViewNode
  );
}

window.showConfirmationDialog = showConfirmationDialog;
