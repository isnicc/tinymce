/**
 * Storage.js
 *
 * Released under LGPL License.
 * Copyright (c) 1999-2017 Ephox Corp. All rights reserved
 *
 * License: http://www.tinymce.com/license
 * Contributing: http://www.tinymce.com/contributing
 */

import LocalStorage from 'tinymce/core/api/util/LocalStorage';
import Tools from 'tinymce/core/api/util/Tools';
import * as Events from '../api/Events';
import * as Settings from '../api/Settings';
import { Editor } from 'tinymce/core/api/Editor';
import { Cell } from '@ephox/katamari';

const isEmpty = (editor: Editor, html?: string) => {
  const forcedRootBlockName = editor.settings.forced_root_block;

  html = Tools.trim(typeof html === 'undefined' ? editor.getBody().innerHTML : html);

  return html === '' || new RegExp(
    '^<' + forcedRootBlockName + '[^>]*>((\u00a0|&nbsp;|[ \t]|<br[^>]*>)+?|)<\/' + forcedRootBlockName + '>|<br>$', 'i'
  ).test(html);
};

const hasDraft = (editor: Editor) => {
  const time = parseInt(LocalStorage.getItem(Settings.getAutoSavePrefix(editor) + 'time'), 10) || 0;

  if (new Date().getTime() - time > Settings.getAutoSaveRetention(editor)) {
    removeDraft(editor, false);
    return false;
  }

  return true;
};

const removeDraft = (editor: Editor, fire?: boolean) => {
  const prefix = Settings.getAutoSavePrefix(editor);

  LocalStorage.removeItem(prefix + 'draft');
  LocalStorage.removeItem(prefix + 'time');

  if (fire !== false) {
    Events.fireRemoveDraft(editor);
  }
};

const storeDraft = (editor: Editor) => {
  const prefix = Settings.getAutoSavePrefix(editor);

  if (!isEmpty(editor) && editor.isDirty()) {
    LocalStorage.setItem(prefix + 'draft', editor.getContent({ format: 'raw', no_events: true }) as string);
    LocalStorage.setItem(prefix + 'time', new Date().getTime().toString());
    Events.fireStoreDraft(editor);
  }
};

const restoreDraft = (editor: Editor) => {
  const prefix = Settings.getAutoSavePrefix(editor);

  if (hasDraft(editor)) {
    editor.setContent(LocalStorage.getItem(prefix + 'draft'), { format: 'raw' });
    Events.fireRestoreDraft(editor);
  }
};

const startStoreDraft = (editor: Editor, started: Cell<boolean>) => {
  const interval = Settings.getAutoSaveInterval(editor);

  if (!started.get()) {
    setInterval(() => {
      if (!editor.removed) {
        storeDraft(editor);
      }
    }, interval);

    started.set(true);
  }
};

const restoreLastDraft = (editor: Editor) => {
  editor.undoManager.transact(() => {
    restoreDraft(editor);
    removeDraft(editor);
  });

  editor.focus();
};

export {
  isEmpty,
  hasDraft,
  removeDraft,
  storeDraft,
  restoreDraft,
  startStoreDraft,
  restoreLastDraft
};