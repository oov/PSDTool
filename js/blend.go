// +build ignore

package main

import (
	"log"
	"os"
	"strings"
	"text/template"
)

type code string

func (c code) Channel(ch string) string {
	return strings.NewReplacer("src", "s"+ch, "dest", "d"+ch, "ret", ch).Replace(string(c))
}

var blendBase = `
   function blend{{.Name}}(d, s, w, h, alpha) {
      var sr, sg, sb, sa, dr, dg, db, da;
      var a1, a2, a3, r, g, b, a, tmp;
      for (var i = 0, len = w * h << 2; i < len; i += 4) {
         sr = s[i], sg = s[i + 1], sb = s[i + 2], sa = s[i + 3];
         dr = d[i], dg = d[i + 1], db = d[i + 2], da = d[i + 3];

         tmp = 0 | (sa * alpha * 32897);
         a1 = (tmp * da) >> 23;
         a2 = (tmp * (255 - da)) >> 23;
         a3 = ((8388735 - tmp) * da) >> 23;
         a = a1 + a2 + a3;
         d[i + 3] = a;
         if (a) {
{{if .CodePerChannel}}{{.CodePerChannel.Channel "r"}}{{.CodePerChannel.Channel "g"}}{{.CodePerChannel.Channel "b"}}{{else}}{{.Code}}{{end}}
            d[i] = (r * a1 + sr * a2 + dr * a3) / a;
            d[i + 1] = (g * a1 + sg * a2 + dg * a3) / a;
            d[i + 2] = (b * a1 + sb * a2 + db * a3) / a;
         }
      }
   }
`

var blendModes = []struct {
	Name           string
	Code           string
	CodePerChannel code
}{
	// ----------------------------------------------------------------
	// References:
	// https://www.w3.org/TR/compositing-1/#blending
	// http://dunnbypaul.net/blends/
	// https://mouaif.wordpress.com/2009/01/05/photoshop-math-with-glsl-shaders/
	// ----------------------------------------------------------------
	{
		Name: "Normal",
		CodePerChannel: `
            ret = src;
`,
	},
	// ----------------------------------------------------------------
	{
		Name: "Darken",
		CodePerChannel: `
            if (src < dest) {
               ret = src;
            } else {
               ret = dest;
            }
`,
	},
	{
		Name: "Multiply",
		CodePerChannel: `
            ret = src * dest * 32897 >> 23;
`,
	},
	{
		Name: "ColorBurn",
		CodePerChannel: `
            if (dest == 255) {
               ret = 255;
            } else if (src == 0) {
               ret = 0;
            } else {
               ret = 255 - Math.min(255, (255 - dest) / src * 255);
            }
`,
	},
	{
		Name: "LinearBurn",
		CodePerChannel: `
            ret = Math.max(0, dest + src - 255);
`,
	},
	{
		Name: "DarkerColor",
		Code: `
            if (lum(sr, sg, sb) < lum(dr, dg, db)) {
               r = sr;
               g = sg;
               b = sb;
            } else {
               r = dr;
               g = dg;
               b = db;
            }
`,
	},
	// ----------------------------------------------------------------
	{
		Name: "Lighten",
		CodePerChannel: `
            if (src > dest) {
               ret = src;
            } else {
               ret = dest;
            }
`,
	},
	{
		Name: "Screen",
		CodePerChannel: `
            ret = src + dest - (src * dest * 32897 >> 23);
`,
	},
	{
		Name: "ColorDodge",
		CodePerChannel: `
            if (dest == 0) {
               ret = 0;
            } else if (src == 255) {
               ret = 255;
            } else {
               ret = Math.min(255, dest * 255 / (255 - src));
            }
`,
	},
	{
		Name: "LinearDodge",
		CodePerChannel: `
            ret = src + dest;
`,
	},
	{
		Name: "LighterColor",
		Code: `
            if (lum(sr, sg, sb) > lum(dr, dg, db)) {
               r = sr;
               g = sg;
               b = sb;
            } else {
               r = dr;
               g = dg;
               b = db;
            }
`,
	},
	// ----------------------------------------------------------------
	{
		Name: "Overlay",
		CodePerChannel: `
            if (dest < 128) {
               ret = src * dest * 32897 >> 22;
            } else {
               ret = 255 - ((255 - ((dest - 128) << 1)) * (255 - src) * 32897 >> 23);
            }
`,
	},
	{
		Name: "SoftLight",
		CodePerChannel: `
            if (src < 128) {
               ret = dest - (((255 - (src << 1)) * dest * 32897 >> 23) * (255 - dest) * 32897 >> 23);
            } else {
               if (dest < 64) {
                  tmp = ((((dest << 4) - 3060) * 32897 >> 23) * dest + 1020) * dest * 32897 >> 23;
               } else {
                  tmp = Math.sqrt(dest / 255) * 255;
               }
               ret = dest + (((src << 1) - 255) * (tmp - dest) * 32897 >> 23);
            }
`,
	},
	{
		Name: "HardLight",
		CodePerChannel: `
            if (src < 128) {
               ret = dest * src * 32897 >> 22;
            } else {
               tmp = (src << 1) - 255;
               ret = dest + tmp - (dest * tmp * 32897 >> 23);
            }
`,
	},
	{
		Name: "VividLight",
		CodePerChannel: `
            if (src < 128) {
               tmp = src << 1;
               if (src == 0) {
                  ret = tmp;
               } else {
                  ret = Math.max(0, (255 - ((255 - dest) * 255) / tmp));
               }
            } else {
               tmp = ((src - 128) << 1) + 1;
               /* if (dest == 0) {
                  ret = 255;
               } else */
               if (tmp == 255) {
                  ret = tmp;
               } else {
                  ret = Math.min(255, ((dest * 255) / (255 - tmp)));
               }
            }
`,
	},
	{
		Name: "LinearLight",
		CodePerChannel: `
            if (src < 128) {
               ret = dest + (src << 1) - 255;
            } else {
               ret = dest + ((src - 128) << 1);
            }
`,
	},
	{
		Name: "PinLight",
		CodePerChannel: `
            if (src < 128) {
               tmp = src << 1;
               if (tmp < dest) {
                  ret = tmp;
               } else {
                  ret = dest;
               }
            } else {
               tmp = (src - 128) << 1;
               if (tmp > dest) {
                  ret = tmp;
               } else {
                  ret = dest;
               }
            }
`,
	},
	{
		Name: "HardMix",
		CodePerChannel: `
            if (src < 128) {
               tmp = src << 1;
               if (src != 0) {
                  tmp = Math.max(0, (255 - ((255 - dest) * 255) / tmp));
               }
            } else {
               if (dest == 0) {
                  tmp = 0;
               } else {
                  tmp = ((src - 128) << 1) + 1;
                  if (tmp != 255) {
                     tmp = Math.min(255, ((dest * 255) / (255 - tmp)));
                  }
               }
            }
            ret = tmp < 128 ? 0 : 255;
`,
	},
	// ----------------------------------------------------------------
	{
		Name: "Difference",
		CodePerChannel: `
            tmp = dest - src;
            ret = tmp < 0 ? -tmp : tmp;
`,
	},
	{
		Name: "Exclusion",
		CodePerChannel: `
            ret = dest + src - (dest * src * 32897 >> 22);
`,
	},
	{
		Name: "Subtract",
		CodePerChannel: `
            ret = Math.max(0, dest - src);
`,
	},
	{
		Name: "Divide",
		CodePerChannel: `
            if (dest == 0) {
               ret = 0;
            } else if (src == 0) {
               ret = 255;
            } else {
               ret = Math.min(255, dest / src * 255);
            }
`,
	},
	// ----------------------------------------------------------------
	{
		Name: "Hue",
		Code: `
            tmp = setSat(sr, sg, sb, sat(dr, dg, db));
            r = (tmp & 0xff0000) >> 16;
            g = (tmp & 0xff00) >> 8;
            b = tmp & 0xff;
            tmp = setLum(r, g, b, lum(dr, dg, db));
            r = (tmp & 0xff0000) >> 16;
            g = (tmp & 0xff00) >> 8;
            b = tmp & 0xff;
`,
	},
	{
		Name: "Saturation",
		Code: `
            tmp = setSat(dr, dg, db, sat(sr, sg, sb));
            r = (tmp & 0xff0000) >> 16;
            g = (tmp & 0xff00) >> 8;
            b = tmp & 0xff;
            tmp = setLum(r, g, b, lum(dr, dg, db));
            r = (tmp & 0xff0000) >> 16;
            g = (tmp & 0xff00) >> 8;
            b = tmp & 0xff;
`,
	},
	{
		Name: "Color",
		Code: `
            tmp = setLum(sr, sg, sb, lum(dr, dg, db));
            r = (tmp & 0xff0000) >> 16;
            g = (tmp & 0xff00) >> 8;
            b = tmp & 0xff;
`,
	},
	{
		Name: "Luminosity",
		Code: `
            tmp = setLum(dr, dg, db, lum(sr, sg, sb));
            r = (tmp & 0xff0000) >> 16;
            g = (tmp & 0xff00) >> 8;
            b = tmp & 0xff;
`,
	},
}

var source = `// DO NOT EDIT.
// Generate with: go generate
var blend = (function() {
   'use strict';

   function lum(r, g, b) {
      return (r * 77 + g * 151 + b * 28) >> 8;
   }

   function setLum(r, g, b, lm) {
      lm -= lum(r, g, b);
      return clipColor(r + lm, g + lm, b + lm);
   }

   function clipColor(r, g, b) {
      var lm = lum(r, g, b);
      var min = Math.min(r, g, b);
      var max = Math.max(r, g, b);
      if (min < 0) {
         r = lm + (((r - lm) * lm) / (lm - min));
         g = lm + (((g - lm) * lm) / (lm - min));
         b = lm + (((b - lm) * lm) / (lm - min));
      }
      if (max > 255) {
         r = lm + (((r - lm) * (255 - lm)) / (max - lm));
         g = lm + (((g - lm) * (255 - lm)) / (max - lm));
         b = lm + (((b - lm) * (255 - lm)) / (max - lm));
      }
      return (r << 16) | (g << 8) | b;
   }

   function sat(r, g, b) {
      return Math.max(r, g, b) - Math.min(r, g, b);
   }

   function setSat(r, g, b, sat) {
      if (r <= g) {
         if (g <= b) {
            return setSatMinMidMax(r, g, b, sat);
         } else if (r <= b) {
            sat = setSatMinMidMax(r, b, g, sat);
            return (sat & 0xff0000) | ((sat & 0xff) << 8) | ((sat & 0xff00) >> 8);
         }
         sat = setSatMinMidMax(b, r, g, sat);
         return ((sat & 0xffff) << 8) | ((sat & 0xff0000) >> 16);
      } else if (r <= b) {
         sat = setSatMinMidMax(g, r, b, sat);
         return ((sat & 0xff00) << 8) | ((sat & 0xff0000) >> 8) | (sat & 0xff);
      } else if (g <= b) {
         sat = setSatMinMidMax(g, b, r, sat);
         return ((sat & 0xff) << 16) | ((sat & 0xffff00) >> 8);
      }
      sat = setSatMinMidMax(b, g, r, sat);
      return ((sat & 0xff) << 16) | (sat & 0xff00) | ((sat & 0xff0000) >> 16);
   }

   function setSatMinMidMax(min, mid, max, sat) {
      if (max > min) {
         return ((((mid - min) * sat) / (max - min)) << 8) | sat;
      }
      return 0;
   }

{{range .}}{{template "blendBase" .}}{{end}}
   var blendModes = {
      // 'pass-through': blendPassThrough,
      'source-over': blendNormal,
      // 'dissolve': blendDissolve,

      'darken': blendDarken,
      'multiply': blendMultiply,
      'color-burn': blendColorBurn,
      'linear-burn': blendLinearBurn,
      'darker-color': blendDarkerColor,

      'lighten': blendLighten,
      'screen': blendScreen,
      'color-dodge': blendColorDodge,
      'linear-dodge': blendLinearDodge,
      'lighter-color': blendLighterColor,

      'overlay': blendOverlay,
      'soft-light': blendSoftLight,
      'hard-light': blendHardLight,
      'vivid-light': blendVividLight,
      'linear-light': blendLinearLight,
      'pin-light': blendPinLight,
      'hard-mix': blendHardMix,

      'difference': blendDifference,
      'exclusion': blendExclusion,
      'subtract': blendSubtract,
      'divide': blendDivide,

      'hue': blendHue,
      'saturation': blendSaturation,
      'color': blendColor,
      'luminosity': blendLuminosity
   };

   var implementedBlendModes = {};

   function blend(dest, src, dx, dy, sw, sh, alpha, blendMode) {
      if (blendMode == 'normal') {
         blendMode = 'source-over';
      }
      if (blendMode in implementedBlendModes) {
         var dctx = dest.getContext('2d');
         dctx.save();
         dctx.globalAlpha = alpha;
         dctx.globalCompositeOperation = blendMode;
         dctx.drawImage(src, dx, dy);
         dctx.restore();
         // console.log('native: '+blendMode);
         return;
      }

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
      if (!(blendMode in blendModes)) {
         throw new Error('unimplemeneted blend mode: ' + blendMode);
      }
      blendModes[blendMode](d, s, sw, sh, alpha);
      dctx.putImageData(imgData, dx, dy);
      // console.log('js: '+blendMode);
   }

   function enumImplementedBlendModes() {
      var r = {};
      var c = document.createElement('canvas');
      var ctx = c.getContext('2d');
      for (var bm in blendModes) {
         ctx.globalCompositeOperation = bm;
         if (ctx.globalCompositeOperation == bm) {
            r[bm] = undefined;
         }
      }
      return r;
   }

   function detectBrokenColorDodge(callback) {
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
         callback(c.data[0] < 128);
      }
   }

   implementedBlendModes = enumImplementedBlendModes();
   detectBrokenColorDodge(function(brokenColorDodge) {
      if (brokenColorDodge) {
         delete implementedBlendModes['color-dodge'];
      }
   });

   return blend;
})();
`

func main() {
	f, err := os.Create("blend.js")
	if err != nil {
		log.Fatal(err)
	}
	defer f.Close()
	tpl := template.Must(template.New("").Parse(source))
	tpl.New("blendBase").Parse(blendBase)
	tpl.Execute(f, blendModes)
}
