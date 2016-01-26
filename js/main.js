(function() {
   'use strict';

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
      var bar = document.getElementById('progress-bar');

      fileOpenUi.style.display = 'none';
      manual.style.display = 'none';
      fileLoadingUi.style.display = 'block';
      errorReportUi.style.display = 'none';

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
         var p, msg;
         switch (phase) {
            case 0:
               p = (progress * 50).toFixed(0);
               msg = 'Parsing psd file...';
               break;
            case 1:
               p = (50 + progress * 50).toFixed(0)
               msg = 'Drawing "' + layer.Name + '" layer image...';
               break;
         }
         bar.style.width = p + '%';
         bar.setAttribute('aria-valuenow', p);
         barCaption.textContent = p + '% Complete';
         caption.textContent = p + '% ' + msg;
      }

      loadAsArrayBuffer(file_or_url)
         .then(parse.bind(this, progress))
         .then(initMain)
         .then(function(main) {
            fileLoadingUi.style.display = 'none';
            fileOpenUi.style.display = 'none';
            manual.style.display = 'none';
            errorReportUi.style.display = 'none';
            document.body.appendChild(main);
         }, function(e) {
            fileLoadingUi.style.display = 'none';
            fileOpenUi.style.display = 'block';
            manual.style.display = 'block';
            errorReportUi.style.display = 'block';
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
            canvas.width = root.Width;
            canvas.height = root.Height;

            sideContainer.appendChild(buildTree(root, render.bind(null, canvas, root)));

            var main = document.createElement('div');
            main.id = 'main';
            previewContainer.appendChild(canvas);
            main.appendChild(sideContainer);
            main.appendChild(previewContainer);

            render(canvas, root);
            deferred.resolve(main);
         } catch (e) {
            deferred.reject(e);
         }
      }, 1);
      return deferred.promise;
   }

   function draw(ctx, src, x, y, opacity, blendMode) {
      if (typeof opacity == 'object') {
         switch (opacity.BlendMode) {
            case 'normal':
               blendMode = 'source-over';
               break;
            case 'darken':
            case 'multiply':
            case 'color-burn':

            case 'lighten':
            case 'screen':
            case 'color-dodge':

            case 'overlay':
            case 'soft-light':
            case 'hard-light':
            case 'difference':
            case 'exclusion':

            case 'hue':
            case 'saturation':
            case 'color':
            case 'luminosity':
               blendMode = opacity.BlendMode;
               break;
         }
         opacity = opacity.Opacity / 255;
      }
      ctx.globalAlpha = opacity;
      ctx.globalCompositeOperation = blendMode;
      ctx.drawImage(src, x, y);
   }

   function render(canvas, root) {

      function r(ctx, layer) {
         if (!layer.visibleInput.checked || layer.Opacity == 0) {
            return
         }
         if (layer.Canvas && !layer.Clipping) {
            if (layer.clip.length) {
               if (layer.BlendClippedElements) {
                  var bb = document.createElement('canvas');
                  var bbctx = bb.getContext('2d');
                  bb.width = layer.Width;
                  bb.height = layer.Height;
                  draw(bbctx, layer.Canvas, 0, 0, 1, 'source-over');
                  for (var i = 0; i < layer.clip.length; ++i) {
                     var child = layer.clip[i];
                     if (!child.visibleInput.checked || child.Opacity == 0 || !child.Canvas) {
                        continue;
                     }
                     draw(bbctx, child.Canvas, child.X - layer.X, child.Y - layer.Y, child);
                  }
                  draw(bbctx, layer.Canvas, 0, 0, 1, 'destination-in');
                  draw(ctx, bb, layer.X, layer.Y, layer);
               } else {
                  draw(ctx, layer.Canvas, layer.X, layer.Y, layer);
                  for (var i = 0; i < layer.clip.length; ++i) {
                     var child = layer.clip[i];
                     if (!child.visibleInput.checked || child.Opacity == 0 || !child.Canvas) {
                        continue;
                     }
                     var bb = document.createElement('canvas');
                     var bbctx = bb.getContext('2d');
                     bb.width = child.Width;
                     bb.height = child.Height;
                     draw(bbctx, child.Canvas, 0, 0, 1, 'copy');
                     draw(bbctx, layer.Canvas, layer.X - child.X, layer.Y - child.Y, 1, 'destination-in');
                     draw(ctx, bb, child.X, child.Y, child);
                  }
               }
            } else {
               draw(ctx, layer.Canvas, layer.X, layer.Y, layer);
            }
         }
         for (var i = 0; i < layer.Layer.length; ++i) {
            r(ctx, layer.Layer[i]);
         }
      }
      var ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      if (root.invertInput.checked) {
         ctx.translate(canvas.width, 0);
         ctx.scale(-1, 1);
      }
      for (var i = 0; i < root.Layer.length; ++i) {
         r(ctx, root.Layer[i]);
      }
      ctx.restore();
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
            for (var i = 0; i < layer.Layer.length; ++i) {
               r(layer.Layer[i]);
            }
         }
         for (var i = 0; i < root.Layer.length; ++i) {
            r(root.Layer[i]);
         }
      }

      function registerClippingGroup(layers) {
         var clip = [];
         for (var i = layers.length - 1; i >= 0; --i) {
            var layer = layers[i];
            registerClippingGroup(layer.Layer);
            if (layer.Clipping) {
               clip.unshift(layer);
               layer.clip = [];
            } else {
               for (var j = 0; j < clip.length; ++j) {
                  clip[j].clippedBy = layer;
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
         for (var i = layer.Layer.length - 1; i >= 0; --i) {
            r(children, layer.Layer[i], layer);
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
      for (var i = root.Layer.length - 1; i >= 0; --i) {
         r(ul, root.Layer[i], root);
      }

      registerClippingGroup(root.Layer);

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

   document.addEventListener('DOMContentLoaded', init, false);
})();
