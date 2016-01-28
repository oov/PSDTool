(function() {
   'use strict';

   var hasBrokenColorDodge = false;

   function init() {
      var dz = document.getElementById('dropzone');
      dz.addEventListener('dragenter', function(e) {
         this.classList.add('psdtool-drop-active');
         e.preventDefault();
         e.stopPropagation();
         return false;
      }, false);
      dz.addEventListener('dragover', function(e) {
         this.classList.add('psdtool-drop-active');
         e.preventDefault();
         e.stopPropagation();
         return false;
      }, false);
      dz.addEventListener('dragleave', function(e) {
         this.classList.remove('psdtool-drop-active');
         e.preventDefault();
         e.stopPropagation();
         return false;
      }, false);
      dz.addEventListener('drop', function(e) {
         this.classList.remove('psdtool-drop-active');
         if (e.dataTransfer.files.length > 0) {
            loadAndParse(e.dataTransfer.files[0]);
         }
         e.preventDefault();
         e.stopPropagation();
         return false;
      }, false);
      document.getElementById('inputfile').addEventListener('change', function(e) {
         loadAndParse(document.getElementById('inputfile').files[0]);
      }, false);
      document.getElementById('samplefile').addEventListener('click', function(e) {
         loadAndParse('img/' + document.getElementById('samplefile').getAttribute('data-filename'));
      }, false);
   }

   function loadAndParse(file_or_url) {
      var fileOpenUi = document.getElementById('file-open-ui');
      var manual = document.getElementById('manual');
      var fileLoadingUi = document.getElementById('file-loading-ui');
      var errorReportUi = document.getElementById('error-report-ui');
      var main = document.getElementById('main');
      var bar = document.getElementById('progress-bar');

      fileOpenUi.style.display = 'none';
      manual.style.display = 'none';
      fileLoadingUi.style.display = 'block';
      errorReportUi.style.display = 'none';
      main.style.display = 'none';

      var barCaptionContainer = bar.querySelector('.psdtool-progress-bar-caption');
      var barCaption = document.createTextNode('0% Complete');
      var captionContainer = document.getElementById('progress-caption');
      var caption = document.createTextNode('Now loading...');
      var errorMessageContainer = document.getElementById('error-message');
      var errorMessage = document.createTextNode('');

      barCaptionContainer.innerHTML = '';
      barCaptionContainer.appendChild(barCaption);
      captionContainer.innerHTML = '';
      captionContainer.appendChild(caption);
      errorMessageContainer.innerHTML = '';
      errorMessageContainer.appendChild(errorMessage);

      function progress(phase, progress, layer) {
         var p, msg, ptext;
         switch (phase) {
            case 0:
               p = progress * 50;
               msg = 'Parsing psd file...';
               break;
            case 1:
               p = 50 + progress * 50;
               msg = 'Drawing "' + layer.Name + '" layer image...';
               break;
         }
         ptext = p.toFixed(0) + '%';
         bar.style.width = p + '%';
         bar.setAttribute('aria-valuenow', ptext);
         barCaption.textContent = ptext + ' Complete';
         caption.textContent = ptext + ' ' + msg;
      }

      loadAsArrayBuffer(file_or_url)
         .then(parse.bind(this, progress))
         .then(initMain)
         .then(function() {
            fileLoadingUi.style.display = 'none';
            fileOpenUi.style.display = 'none';
            manual.style.display = 'none';
            errorReportUi.style.display = 'none';
            main.style.display = 'block';
         }, function(e) {
            fileLoadingUi.style.display = 'none';
            fileOpenUi.style.display = 'block';
            manual.style.display = 'block';
            errorReportUi.style.display = 'block';
            main.style.display = 'none';
            errorMessage.textContent = e;
            console.error(e);
         });
   }

   function loadAsArrayBuffer(file_or_url) {
      var deferred = m.deferred();
      if (typeof file_or_url == 'string') {
         var xhr = new XMLHttpRequest();
         xhr.open('GET', file_or_url);
         xhr.responseType = 'arraybuffer';
         xhr.onload = function(e) {
            deferred.resolve(xhr.response);
         };
         xhr.onerror = function(e) {
            deferred.reject(e);
         }
         xhr.send(null);
         return deferred.promise;
      }
      var r = new FileReader();
      r.readAsArrayBuffer(file_or_url);
      r.onload = function(e) {
         deferred.resolve(r.result);
      };
      r.onerror = function(e) {
         deferred.reject(e);
      }
      return deferred.promise;
   }

   function parse(progress, arrayBuffer) {
      var deferred = m.deferred();
      parsePSD(arrayBuffer, progress, function(root) {
         deferred.resolve(root);
      }, function(e) {
         deferred.reject(e);
      });
      return deferred.promise;
   }

   function initMain(root) {
      var deferred = m.deferred();
      setTimeout(function() {
         try {
            var sideContainer = document.createElement('div');
            sideContainer.id = 'side-container';

            var previewContainer = document.createElement('div');
            previewContainer.id = 'preview-container';

            var canvas = document.createElement('canvas');
            sideContainer.appendChild(buildTree(root, render.bind(null, canvas, root)));

            var main = document.getElementById('main');
            main.innerHTML = '';
            previewContainer.appendChild(canvas);
            main.appendChild(sideContainer);
            main.appendChild(previewContainer);
            render(canvas, root);
            deferred.resolve();
         } catch (e) {
            deferred.reject(e);
         }
      }, 1);
      return deferred.promise;
   }

   function draw(ctx, src, x, y, opacity, blendMode) {
      switch (blendMode) {
         case 'source-over':
         case 'destination-in':
         case 'destination-out':
            break;

         case 'normal':
            blendMode = 'source-over';
            break;

         case 'darken':
         case 'multiply':
         case 'color-burn':

         case 'lighten':
         case 'screen':
            // case 'color-dodge': sometimes broken in chrome

         case 'overlay':
         case 'soft-light':
         case 'hard-light':
         case 'difference':
         case 'exclusion':

         case 'hue':
         case 'saturation':
         case 'color':
         case 'luminosity':
            break;

         case 'color-dodge':
            if (!hasBrokenColorDodge) {
               break;
            }

         case 'linear-dodge':
            blend(ctx.canvas, src, x, y, src.width, src.height, opacity, blendMode);
            return;
      }
      ctx.globalAlpha = opacity / 255;
      ctx.globalCompositeOperation = blendMode;
      ctx.drawImage(src, x, y);
   }

   function clear(ctx) {
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
   }

   function drawLayer(ctx, layer, x, y, opacity, blendMode) {
      if (!layer.visibleInput.checked || opacity == 0) {
         return false;
      }
      var bb = layer.Buffer;
      var bbctx = bb.getContext('2d');

      clear(bbctx);
      if (layer.Child.length) {
         for (var i = 0, child; i < layer.Child.length; ++i) {
            child = layer.Child[i];
            if (!child.Clipping) {
               drawLayer(bbctx, child, -layer.X, -layer.Y, child.Opacity, child.BlendMode);
            }
         }
      } else if (layer.Canvas) {
         draw(bbctx, layer.Canvas, 0, 0, 255, 'source-over');
      }

      if (layer.MaskCanvas) {
         draw(
            bbctx,
            layer.MaskCanvas,
            layer.MaskX - layer.X,
            layer.MaskY - layer.Y,
            255,
            layer.MaskDefaultColor ? 'destination-out' : 'destination-in'
         );
      }

      if (!layer.clip.length) {
         draw(ctx, bb, x + layer.X, y + layer.Y, opacity, blendMode);
         return true;
      }

      var cbb = layer.ClippingBuffer;
      var cbbctx = cbb.getContext('2d');

      if (layer.BlendClippedElements) {
         clear(cbbctx);
         draw(cbbctx, bb, 0, 0, 255, 'source-over');
         var changed = false;
         for (var i = 0, child; i < layer.clip.length; ++i) {
            child = layer.clip[i];
            changed = drawLayer(
               cbbctx,
               child, -layer.X, -layer.Y,
               child.Opacity,
               child.BlendMode
            ) || changed;
         }
         if (changed) {
            draw(cbbctx, bb, 0, 0, 255, 'destination-in');
         }
         draw(ctx, cbb, x + layer.X, y + layer.Y, opacity, blendMode);
         return true;
      }

      // this is minor code path.
      // it is only used when "Blend Clipped Layers as Group" is unchecked in Photoshop's Layer Style dialog.
      draw(ctx, bb, x + layer.X, y + layer.Y, opacity, blendMode);
      clear(cbbctx);
      for (var i = 0, child; i < layer.clip.length; ++i) {
         child = layer.clip[i];
         if (!drawLayer(cbbctx, child, -layer.X, -layer.Y, 255, 'source-over')) {
            continue;
         }
         draw(cbbctx, bb, 0, 0, 255, 'destination-in');
         draw(ctx, cbb, x + layer.X, y + layer.Y, child.Opacity, child.BlendMode);
         clear(cbbctx);
      }
      return true;
   }

   function render(canvas, root) {
      canvas.width = root.Width;
      canvas.height = root.Height;

      var s = Date.now();
      var ctx = canvas.getContext('2d');
      ctx.save();
      if (root.invertInput.checked) {
         ctx.translate(canvas.width, 0);
         ctx.scale(-1, 1);
      }
      for (var i = 0, layer; i < root.Child.length; ++i) {
         layer = root.Child[i];
         if (!layer.Clipping) {
            drawLayer(ctx, layer, 0, 0, layer.Opacity, layer.BlendMode);
         }
      }
      ctx.restore();
      console.log("rendering: " + (Date.now() - s));

      var scale = 1;
      if (scale != 1) {
         s = Date.now();
         downScaleCanvas(canvas, canvas, scale);
         console.log("resize: " + (Date.now() - s));
      }
   }

   function linearDodge(d, s, w, h, alpha) {
      var sr, sg, sb, sa, dr, dg, db, da;
      var a1, a2, a3, r, g, b, a;
      for (var i = 0, len = w * h << 2; i < len; i += 4) {
         sr = s[i], sg = s[i + 1], sb = s[i + 2], sa = (s[i + 3] * alpha * 32897) >> 23;
         dr = d[i], dg = d[i + 1], db = d[i + 2], da = d[i + 3];

         a = sa * 32897;
         a1 = (a * da) >> 23;
         a2 = (a * (255 - da)) >> 23;
         a3 = ((8388735 - a) * da) >> 23;
         a = a1 + a2 + a3;
         d[i + 3] = a;
         if (a) {
            r = sr + dr;
            g = sg + dg;
            b = sb + db;

            d[i] = (r * a1 + sr * a2 + dr * a3) / a;
            d[i + 1] = (g * a1 + sg * a2 + dg * a3) / a;
            d[i + 2] = (b * a1 + sb * a2 + db * a3) / a;
         }
      }
   }

   function colorDodge(d, s, w, h, alpha) {
      var sr, sg, sb, sa, dr, dg, db, da;
      var a1, a2, a3, r, g, b, a;
      for (var i = 0, len = w * h << 2; i < len; i += 4) {
         sr = s[i], sg = s[i + 1], sb = s[i + 2], sa = (s[i + 3] * alpha * 32897) >> 23;
         dr = d[i], dg = d[i + 1], db = d[i + 2], da = d[i + 3];

         a = sa * 32897;
         a1 = (a * da) >> 23;
         a2 = (a * (255 - da)) >> 23;
         a3 = ((8388735 - a) * da) >> 23;
         a = a1 + a2 + a3;
         d[i + 3] = a;
         if (a) {
            r = sr == 255 ? 255 : dr == 0 ? 0 : dr * 255 / (255 - sr);
            g = sg == 255 ? 255 : dg == 0 ? 0 : dg * 255 / (255 - sg);
            b = sb == 255 ? 255 : db == 0 ? 0 : db * 255 / (255 - sb);

            d[i] = (r * a1 + sr * a2 + dr * a3) / a;
            d[i + 1] = (g * a1 + sg * a2 + dg * a3) / a;
            d[i + 2] = (b * a1 + sb * a2 + db * a3) / a;
         }
      }
   }

   function blend(dest, src, dx, dy, sw, sh, alpha, blendMode) {
      var sx = 0;
      var sy = 0;
      if (dx >= dest.width || dy >= dest.height || dx + sw < 0 || dy + sh < 0 || alpha == 0) {
         return;
      }
      if (sw > src.width) {
         sw = src.width;
      }
      if (sh > src.height) {
         sh = src.height;
      }
      if (dx < 0) {
         sw += dx;
         sx -= dx;
         dx = 0;
      }
      if (dy < 0) {
         sh += dy;
         sy -= dy;
         dy = 0;
      }
      if (dx + sw > dest.width) {
         sw = dest.width - dx;
      }
      if (dy + sh > dest.height) {
         sh = dest.height - dy;
      }
      var dctx = dest.getContext('2d');
      var imgData = dctx.getImageData(dx, dy, sw, sh);
      var d = imgData.data;
      var s = src.getContext('2d').getImageData(sx, sy, sw, sh).data;
      switch (blendMode) {
         case 'linear-dodge':
            linearDodge(d, s, sw, sh, alpha);
            break;
         case 'color-dodge':
            colorDodge(d, s, sw, sh, alpha);
            break;
      }
      dctx.putImageData(imgData, dx, dy);
   }

   // this code is based on http://jsfiddle.net/gamealchemist/kpQyE/14/
   // changes are:
   //   added alpha-channel support
   //   avoid "optimized too many times" in chrome
   function downScaleCanvas(dest, src, scale) {
      var sw = src.width,
         sh = src.height,
         tw = Math.floor(src.width * scale),
         th = Math.floor(src.height * scale);
      var sbuf = src.getContext('2d').getImageData(0, 0, sw, sh).data,
         tbuf = new Float32Array(4 * sw * sh);

      calc(tbuf, sbuf, scale, sw, sh, tw, th);

      dest.width = tw;
      dest.height = th;

      var ctx = dest.getContext('2d');
      var imgData = ctx.getImageData(0, 0, tw, th);
      finalize(imgData.data, tbuf);
      ctx.putImageData(imgData, 0, 0);
      return;

      // convert float32 array into a UInt8Clamped Array
      function finalize(bb, fb) {
         for (var i = 0, len = fb.length, ma; i < len; i += 4) {
            if (fb[i + 3] == 0) {
               continue;
            }
            ma = 255 / fb[i + 3];
            bb[i] = fb[i] * ma | 0;
            bb[i + 1] = fb[i + 1] * ma | 0;
            bb[i + 2] = fb[i + 2] * ma | 0;
            bb[i + 3] = fb[i + 3] | 0;
         }
      }

      function calc(tbuf, sbuf, scale, sw, sh, tw, th) {
         var sqScale = scale * scale; // square scale = area of source pixel within target
         var sx = 0,
            sy = 0,
            sIndex = 0; // source x,y, index within source array
         var tx = 0,
            ty = 0,
            yIndex = 0,
            tIndex = 0,
            tIndex2 = 0; // target x,y, x,y index within target array
         var tX = 0,
            tY = 0; // rounded tx, ty
         var w = 0,
            nw = 0,
            wx = 0,
            nwx = 0,
            wy = 0,
            nwy = 0; // weight / next weight x / y
         // weight is weight of current source point within target.
         // next weight is weight of current source point within next target's point.
         var crossX = false; // does scaled px cross its current px right border ?
         var crossY = false; // does scaled px cross its current px bottom border ?
         var sR = 0,
            sG = 0,
            sB = 0,
            sA = 0;

         for (sy = 0; sy < sh; sy++) {
            ty = sy * scale; // y src position within target
            tY = 0 | ty; // rounded : target pixel's y
            yIndex = (tY * tw) << 2; // line index within target array
            crossY = (tY != (0 | ty + scale));
            if (crossY) { // if pixel is crossing botton target pixel
               wy = (tY + 1 - ty); // weight of point within target pixel
               nwy = (ty + scale - tY - 1); // ... within y+1 target pixel
            }
            for (sx = 0; sx < sw; sx++, sIndex += 4) {
               tx = sx * scale; // x src position within target
               tX = 0 | tx; // rounded : target pixel's x
               tIndex = yIndex + (tX << 2); // target pixel index within target array
               crossX = (tX != (0 | tx + scale));
               if (crossX) { // if pixel is crossing target pixel's right
                  wx = (tX + 1 - tx); // weight of point within target pixel
                  nwx = (tx + scale - tX - 1); // ... within x+1 target pixel
               }
               sR = sbuf[sIndex]; // retrieving r,g,b for curr src px.
               sG = sbuf[sIndex + 1];
               sB = sbuf[sIndex + 2];
               sA = sbuf[sIndex + 3];
               if (sA == 0) {
                  continue;
               }
               if (sA < 255) {
                  // x * 32897 >> 23 == x / 255
                  sR = (sR * sA * 32897) >> 23;
                  sG = (sG * sA * 32897) >> 23;
                  sB = (sB * sA * 32897) >> 23;
               }

               if (!crossX && !crossY) { // pixel does not cross
                  // just add components weighted by squared scale.
                  tbuf[tIndex] += sR * sqScale;
                  tbuf[tIndex + 1] += sG * sqScale;
                  tbuf[tIndex + 2] += sB * sqScale;
                  tbuf[tIndex + 3] += sA * sqScale;
               } else if (crossX && !crossY) { // cross on X only
                  w = wx * scale;
                  // add weighted component for current px
                  tbuf[tIndex] += sR * w;
                  tbuf[tIndex + 1] += sG * w;
                  tbuf[tIndex + 2] += sB * w;
                  tbuf[tIndex + 3] += sA * w;
                  // add weighted component for next (tX+1) px
                  nw = nwx * scale;
                  tbuf[tIndex + 4] += sR * nw;
                  tbuf[tIndex + 5] += sG * nw;
                  tbuf[tIndex + 6] += sB * nw;
                  tbuf[tIndex + 7] += sA * nw;
               } else if (crossY && !crossX) { // cross on Y only
                  w = wy * scale;
                  // add weighted component for current px
                  tbuf[tIndex] += sR * w;
                  tbuf[tIndex + 1] += sG * w;
                  tbuf[tIndex + 2] += sB * w;
                  tbuf[tIndex + 3] += sA * w;
                  // add weighted component for next (tY+1) px
                  tIndex2 = tIndex + (tw << 2);
                  nw = nwy * scale;
                  tbuf[tIndex2] += sR * nw;
                  tbuf[tIndex2 + 1] += sG * nw;
                  tbuf[tIndex2 + 2] += sB * nw;
                  tbuf[tIndex2 + 3] += sA * nw;
               } else { // crosses both x and y : four target points involved
                  // add weighted component for current px
                  w = wx * wy;
                  tbuf[tIndex] += sR * w;
                  tbuf[tIndex + 1] += sG * w;
                  tbuf[tIndex + 2] += sB * w;
                  tbuf[tIndex + 3] += sA * w;
                  // for tX + 1; tY px
                  nw = nwx * wy;
                  tbuf[tIndex + 4] += sR * nw; // same for x
                  tbuf[tIndex + 5] += sG * nw;
                  tbuf[tIndex + 6] += sB * nw;
                  tbuf[tIndex + 7] += sA * nw;
                  // for tX ; tY + 1 px
                  tIndex2 = tIndex + (tw << 2);
                  nw = wx * nwy;
                  tbuf[tIndex2] += sR * nw; // same for mul
                  tbuf[tIndex2 + 1] += sG * nw;
                  tbuf[tIndex2 + 2] += sB * nw;
                  tbuf[tIndex2 + 3] += sA * nw;
                  // for tX + 1 ; tY +1 px
                  nw = nwx * nwy;
                  tbuf[tIndex2 + 4] += sR * nw; // same for both x and y
                  tbuf[tIndex2 + 5] += sG * nw;
                  tbuf[tIndex2 + 6] += sB * nw;
                  tbuf[tIndex2 + 7] += sA * nw;
               }
            } // end for sx
         } // end for sy
      }
   }

   function buildTree(root, redraw) {
      var cid = 0;

      function updateClass() {
         function r(layer) {
            if (layer.visibleInput.checked) {
               layer.li.classList.remove('psdtool-hidden');
               for (var i = 0; i < layer.clip.length; ++i) {
                  layer.clip[i].li.classList.remove('psdtool-hidden-by-clipping');
               }
            } else {
               layer.li.classList.add('psdtool-hidden');
               for (var i = 0; i < layer.clip.length; ++i) {
                  layer.clip[i].li.classList.add('psdtool-hidden-by-clipping');
               }
            }
            for (var i = 0; i < layer.Child.length; ++i) {
               r(layer.Child[i]);
            }
         }
         for (var i = 0; i < root.Child.length; ++i) {
            r(root.Child[i]);
         }
      }

      function registerClippingGroup(layers) {
         var clip = [];
         for (var i = layers.length - 1; i >= 0; --i) {
            var layer = layers[i];
            registerClippingGroup(layer.Child);
            if (layer.Clipping) {
               clip.unshift(layer);
               layer.clip = [];
            } else {
               if (clip.length) {
                  for (var j = 0; j < clip.length; ++j) {
                     clip[j].clippedBy = layer;
                  }
                  layer.ClippingBuffer = document.createElement('canvas');
                  layer.ClippingBuffer.width = layer.Buffer.width;
                  layer.ClippingBuffer.height = layer.Buffer.height;
               }
               layer.clip = clip;
               clip = [];
            }
         }
      }

      function r(ul, layer, parentLayer) {
         layer.id = ++cid;
         layer.parentLayer = parentLayer;

         var prop = buildLayerProp(layer, parentLayer);
         var children = document.createElement('ul');
         for (var i = layer.Child.length - 1; i >= 0; --i) {
            r(children, layer.Child[i], layer);
         }

         var li = document.createElement('li');
         if (layer.Folder) {
            li.classList.add('psdtool-folder');
         }
         layer.li = li;

         var input = prop.querySelector('.psdtool-layer-visible');
         if (input) {
            input.addEventListener('click', function() {
               for (var p = layer.parentLayer; p.visibleInput;) {
                  p.visibleInput.checked = true;
                  p = p.parentLayer;
               }
               if (layer.clippedBy) {
                  layer.clippedBy.visibleInput.checked = true;
               }
               redraw();
               updateClass();
            }, false);
         }

         li.appendChild(prop);
         li.appendChild(children);
         ul.appendChild(li);
      }


      var invert = document.createElement('label');
      invert.id = 'invert';
      invert.setAttribute('title', document.body.getAttribute('data-invert-title'));
      var check = document.createElement('input');
      check.type = 'checkbox';
      check.addEventListener('click', function(e) {
         redraw();
      }, false)
      root.invertInput = check;
      invert.appendChild(check);
      invert.appendChild(document.createTextNode(document.body.getAttribute('data-invert-caption')));

      root.id = 'r'
      var ul = document.createElement('ul');
      ul.id = 'layer-tree';
      for (var i = root.Child.length - 1; i >= 0; --i) {
         r(ul, root.Child[i], root);
      }

      registerClippingGroup(root.Child);

      var set = {};
      var radios = ul.querySelectorAll('.psdtool-layer-visible[type=radio]');
      for (var i = 0; i < radios.length; ++i) {
         if (radios[i].name in set) {
            continue;
         }
         set[radios[i].name] = 1;
         var rinShibuyas = ul.querySelectorAll('.psdtool-layer-visible[type=radio][name=' + radios[i].name + ']:checked');
         if (!rinShibuyas.length) {
            radios[i].checked = true;
            continue;
         }
         for (var j = 1; j < rinShibuyas.length; ++j) {
            rinShibuyas[j].checked = false;
         }
      }
      updateClass();

      var div = document.createElement('div');
      div.appendChild(invert);
      div.appendChild(ul);
      return div;
   }

   function buildLayerProp(layer, parentLayer) {
      var name = document.createElement('label');
      var visible = document.createElement('input');
      var layerName = layer.Name;
      switch (layerName.charAt(0)) {
         case '!':
            visible.className = 'psdtool-layer-visible';
            visible.name = 'l' + layer.id;
            visible.type = 'checkbox';
            visible.checked = true;
            visible.disabled = true;
            visible.style.display = 'none';
            layerName = layerName.substring(1);
            break;
         case '*':
            visible.className = 'psdtool-layer-visible';
            visible.name = 'r' + parentLayer.id;
            visible.type = 'radio';
            visible.checked = layer.Visible;
            layerName = layerName.substring(1);
            break;
         default:
            visible.className = 'psdtool-layer-visible';
            visible.name = 'l' + layer.id;
            visible.type = 'checkbox';
            visible.checked = layer.Visible;
            break;

      }
      layer.visibleInput = visible;
      name.appendChild(visible);

      if (layer.Folder) {
         var icon = document.createElement('span');
         icon.className = 'psdtool-icon glyphicon glyphicon-folder-open';
         icon.setAttribute('aria-hidden', 'true');
         name.appendChild(icon);
      } else if (layer.Canvas) {
         if (layer.Clipping) {
            var clip = document.createElement('img');
            clip.className = 'psdtool-clipped-mark';
            clip.src = 'img/clipped.svg';
            clip.alt = 'clipped mark';
            name.appendChild(clip);
         }
         var thumb = document.createElement('canvas');
         thumb.className = 'psdtool-thumbnail';
         thumb.width = 96;
         thumb.height = 96;
         var w = layer.Canvas.width,
            h = layer.Canvas.height;
         if (w > h) {
            w = thumb.width;
            h = thumb.width / layer.Canvas.width * h;
         } else {
            h = thumb.height;
            w = thumb.height / layer.Canvas.height * w;
         }
         var ctx = thumb.getContext('2d');
         ctx.drawImage(
            layer.Canvas, (thumb.width - w) / 2, (thumb.height - h) / 2, w, h);
         name.appendChild(thumb);
      }
      name.appendChild(document.createTextNode(layerName));

      var div = document.createElement('div');
      div.className = 'psdtool-layer-name';
      div.appendChild(name);
      return div;
   }

   function detectBrokenColorDodge() {
      var img = new Image();
      img.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAGUlEQVQI1wXBAQEAAAgCIOz/5TJI20UGhz5D2wX8PWbkFQAAAABJRU5ErkJggg==";
      img.onload = function() {
         var c = document.createElement('canvas');
         c.width = 257;
         c.height = 256;

         var ctx = c.getContext('2d');
         ctx.fillStyle = "rgb(255, 255, 255)";
         ctx.fillRect(0, 0, c.width, c.height);
         ctx.globalAlpha = 0.5;
         ctx.globalCompositeOperation = 'color-dodge';
         ctx.drawImage(img, 0, 0);

         var c = ctx.getImageData(0, 0, 1, 1);
         hasBrokenColorDodge = c.data[0] < 128;
      }
   }

   detectBrokenColorDodge();
   document.addEventListener('DOMContentLoaded', init, false);
})();
