/// <reference path="../typings/browser.d.ts" />
'use strict';
importScripts('3rd/jszip.min.js');

let z = new JSZip();
onmessage = function(e) {
   try {
      switch (e.data.method) {
         case 'add':
            z.file(e.data.name, e.data.buffer);
            break;
         case 'end':
            let ab: ArrayBuffer = z.generate({
               type: 'arraybuffer'
            });
            postMessage({
               buffer: ab
            }, <any>[ab]);
            break;
      }
   } catch (e) {
      postMessage({
         error: e
      }, undefined);
   }
};
