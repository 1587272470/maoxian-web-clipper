"use strict";

import Log from './lib/log.js';
import T from './lib/tool.js';
import ExtMsg from './lib/ext-msg.js';
import MxWcEvent from './lib/event.js';
import Config from './lib/config.js';

import MxHtmlClipper from './clipping/clip-as-html.js';
import MxMarkdownClipper from './clipping/clip-as-markdown.js';

import MxWcAssistantMain from './assistant/main.js';

/*
 * @param {Object} message: {
 *   fold, mimeTypeDict
 * }
 */
function backgroundMessageHandler(message) {
  return new Promise(function(resolve, reject) {
    // FIXME
    //
    // what if the frame src atribute is not exist
    // it's content set by srcdoc attribute
    //
    // Actually, this message is sent to this frame
    // by background.js
    // Maybe it's safe to remove this "if".
    //
    if (message.frameUrl === window.location.href) {
      switch (message.type) {
        case 'frame.toHtml':
          MxHtmlClipper.getElemHtml(getParams(message)).then((result) => {
            result.title = window.document.title;
            resolve(result);
          });
          break;
        case 'frame.toMd':
          MxMarkdownClipper.getElemHtml(getParams(message)).then(resolve);
          break;
      }
    }
  });
}

function getParams(message) {
  const {clipId, frames, storageInfo, mimeTypeDict, config} = message.body;

  const headerParams = {
    refUrl: window.location.href,
    userAgent: window.navigator.userAgent,
    referrerPolicy: config.requestReferrerPolicy,
  }

  storageInfo.assetRelativePath = T.calcPath(
    storageInfo.frameFileFolder, storageInfo.assetFolder
  );

  return {
    clipId: clipId,
    frames: frames,
    storageInfo: storageInfo,
    elem: window.document.body,
    docUrl: window.location.href,
    baseUrl: window.document.baseURI,
    mimeTypeDict: mimeTypeDict,
    parentFrameId: message.frameId,
    config: config,
    headerParams: headerParams,
    needFixStyle: false,
    win: window,
  }
}

function listenFrameMessage() {
  MxWcEvent.initFrameMsg({
    id: window.location.href,
    origin: window.location.origin
  });
  MxWcEvent.handleBroadcastInternal();
  Config.load().then((config) => {
    if (config.communicateWithThirdParty) {
      MxWcEvent.handleBroadcastPublic();
    }
  });
}

function initMxWcAssistant() {
  Config.load().then((config) => {
    if (config.assistantEnabled) {
      MxWcAssistantMain.init();
    } else {
      Log.debug("Assistant disabled");
    }
  });
}

// This script only run in web page and it's external iframes (NOT includes inline iframe)
function init() {
  if (document) {
    if (document.documentElement.tagName.toUpperCase() === 'HTML') {
      if(window === window.top){
        // Main window
        MxWcAssistantMain.listenInternalEvent();
        initMxWcAssistant();
      }else{
        // Iframe
        initMxWcAssistant();
        ExtMsg.listen('content-frame', backgroundMessageHandler);
        listenFrameMessage();
      }
    } else {
      // feed or others
    }
  }
}

init();

