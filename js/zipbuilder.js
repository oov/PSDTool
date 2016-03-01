'use strict';
importScripts('3rd/jszip.min.js');

var z = new JSZip();
onmessage = function(e) {
   try {
      switch (e.data.method) {
         case 'add':
            z.file(e.data.name, e.data.buffer);
            break;
         case 'end':
            var ab = z.generate({
               type: 'arraybuffer'
            });
            postMessage({
               buffer: ab
            }, [ab]);
            break;
      }
   } catch (e) {
      postMessage({
         error: e
      });
   }
};
