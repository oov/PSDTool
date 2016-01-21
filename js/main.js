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
         if (e.dataTransfer.files.length > 0) {
            loadAndExtract(e.dataTransfer.files[0]);
         }
         e.preventDefault();
         e.stopPropagation();
         return false;
      }, false);
      document.getElementById('inputfile').addEventListener('change', function(e) {
         loadAndExtract(document.getElementById('inputfile').files[0]);
      }, false);
      document.getElementById('samplefile').addEventListener('click', function(e) {
         loadAndExtract('img/' + document.getElementById('samplefile').getAttribute('data-filename'));
      }, false);
   }

   function loadAndExtract(file_or_url) {
      document.body.innerHTML = 'Now Loading...';
      loadAsArrayBuffer(file_or_url).then(function(ab) {
         document.body.innerHTML = '';
         try {
            extract(ab);
         } catch (e) {
            document.body.innerHTML = e;
         }
      }, function(e) {
         document.body.innerHTML = 'cannot read the psd file';
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

   function extract(arrayBuffer) {
      var root = parsePSD(arrayBuffer);

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
      document.body.appendChild(main);
   }

   function render(canvas, root) {
      function r(ctx, layer) {
         if (!layer.visibleInput.checked || layer.Opacity == 0) {
            return
         }
         if (layer.Canvas) {
            ctx.globalAlpha = layer.Opacity / 255;
            switch (layer.BlendMode) {
               case 'normal',
               'darken', 'multiply', 'color-burn',
               'lighten', 'screen', 'color-dodge',
               'overlay', 'soft-light', 'hard-light',
               'difference', 'exclusion',
               'hue', 'saturation', 'color', 'luminosity':
                  ctx.globalCompositeOperation = layer.BlendMode;
            }
            ctx.drawImage(layer.Canvas, layer.X, layer.Y);
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
            } else {
               layer.li.classList.add('psdtool-hidden');
            }
            for (var i = 0; i < layer.Layer.length; ++i) {
               r(layer.Layer[i]);
            }
         }
         for (var i = 0; i < root.Layer.length; ++i) {
            r(root.Layer[i]);
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
      name.className = 'psdtool-layer-name';
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
      div.appendChild(name);
      return div;
   }

   document.addEventListener('DOMContentLoaded', init, false);
})();
