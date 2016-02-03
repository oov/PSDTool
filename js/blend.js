// DO NOT EDIT.
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


   function blendNormal(d, s, w, h, alpha) {
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

            r = sr;

            g = sg;

            b = sb;

            d[i] = (r * a1 + sr * a2 + dr * a3) / a;
            d[i + 1] = (g * a1 + sg * a2 + dg * a3) / a;
            d[i + 2] = (b * a1 + sb * a2 + db * a3) / a;
         }
      }
   }

   function blendDarken(d, s, w, h, alpha) {
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

            if (sr < dr) {
               r = sr;
            } else {
               r = dr;
            }

            if (sg < dg) {
               g = sg;
            } else {
               g = dg;
            }

            if (sb < db) {
               b = sb;
            } else {
               b = db;
            }

            d[i] = (r * a1 + sr * a2 + dr * a3) / a;
            d[i + 1] = (g * a1 + sg * a2 + dg * a3) / a;
            d[i + 2] = (b * a1 + sb * a2 + db * a3) / a;
         }
      }
   }

   function blendMultiply(d, s, w, h, alpha) {
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

            r = sr * dr * 32897 >> 23;

            g = sg * dg * 32897 >> 23;

            b = sb * db * 32897 >> 23;

            d[i] = (r * a1 + sr * a2 + dr * a3) / a;
            d[i + 1] = (g * a1 + sg * a2 + dg * a3) / a;
            d[i + 2] = (b * a1 + sb * a2 + db * a3) / a;
         }
      }
   }

   function blendColorBurn(d, s, w, h, alpha) {
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

            if (dr == 255) {
               r = 255;
            } else if (sr == 0) {
               r = 0;
            } else {
               r = 255 - Math.min(255, (255 - dr) / sr * 255);
            }

            if (dg == 255) {
               g = 255;
            } else if (sg == 0) {
               g = 0;
            } else {
               g = 255 - Math.min(255, (255 - dg) / sg * 255);
            }

            if (db == 255) {
               b = 255;
            } else if (sb == 0) {
               b = 0;
            } else {
               b = 255 - Math.min(255, (255 - db) / sb * 255);
            }

            d[i] = (r * a1 + sr * a2 + dr * a3) / a;
            d[i + 1] = (g * a1 + sg * a2 + dg * a3) / a;
            d[i + 2] = (b * a1 + sb * a2 + db * a3) / a;
         }
      }
   }

   function blendLinearBurn(d, s, w, h, alpha) {
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

            r = Math.max(0, dr + sr - 255);

            g = Math.max(0, dg + sg - 255);

            b = Math.max(0, db + sb - 255);

            d[i] = (r * a1 + sr * a2 + dr * a3) / a;
            d[i + 1] = (g * a1 + sg * a2 + dg * a3) / a;
            d[i + 2] = (b * a1 + sb * a2 + db * a3) / a;
         }
      }
   }

   function blendDarkerColor(d, s, w, h, alpha) {
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

            if (lum(sr, sg, sb) < lum(dr, dg, db)) {
               r = sr;
               g = sg;
               b = sb;
            } else {
               r = dr;
               g = dg;
               b = db;
            }

            d[i] = (r * a1 + sr * a2 + dr * a3) / a;
            d[i + 1] = (g * a1 + sg * a2 + dg * a3) / a;
            d[i + 2] = (b * a1 + sb * a2 + db * a3) / a;
         }
      }
   }

   function blendLighten(d, s, w, h, alpha) {
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

            if (sr > dr) {
               r = sr;
            } else {
               r = dr;
            }

            if (sg > dg) {
               g = sg;
            } else {
               g = dg;
            }

            if (sb > db) {
               b = sb;
            } else {
               b = db;
            }

            d[i] = (r * a1 + sr * a2 + dr * a3) / a;
            d[i + 1] = (g * a1 + sg * a2 + dg * a3) / a;
            d[i + 2] = (b * a1 + sb * a2 + db * a3) / a;
         }
      }
   }

   function blendScreen(d, s, w, h, alpha) {
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

            r = sr + dr - (sr * dr * 32897 >> 23);

            g = sg + dg - (sg * dg * 32897 >> 23);

            b = sb + db - (sb * db * 32897 >> 23);

            d[i] = (r * a1 + sr * a2 + dr * a3) / a;
            d[i + 1] = (g * a1 + sg * a2 + dg * a3) / a;
            d[i + 2] = (b * a1 + sb * a2 + db * a3) / a;
         }
      }
   }

   function blendColorDodge(d, s, w, h, alpha) {
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

            if (dr == 0) {
               r = 0;
            } else if (sr == 255) {
               r = 255;
            } else {
               r = Math.min(255, dr * 255 / (255 - sr));
            }

            if (dg == 0) {
               g = 0;
            } else if (sg == 255) {
               g = 255;
            } else {
               g = Math.min(255, dg * 255 / (255 - sg));
            }

            if (db == 0) {
               b = 0;
            } else if (sb == 255) {
               b = 255;
            } else {
               b = Math.min(255, db * 255 / (255 - sb));
            }

            d[i] = (r * a1 + sr * a2 + dr * a3) / a;
            d[i + 1] = (g * a1 + sg * a2 + dg * a3) / a;
            d[i + 2] = (b * a1 + sb * a2 + db * a3) / a;
         }
      }
   }

   function blendLinearDodge(d, s, w, h, alpha) {
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

            r = sr + dr;

            g = sg + dg;

            b = sb + db;

            d[i] = (r * a1 + sr * a2 + dr * a3) / a;
            d[i + 1] = (g * a1 + sg * a2 + dg * a3) / a;
            d[i + 2] = (b * a1 + sb * a2 + db * a3) / a;
         }
      }
   }

   function blendLighterColor(d, s, w, h, alpha) {
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

            if (lum(sr, sg, sb) > lum(dr, dg, db)) {
               r = sr;
               g = sg;
               b = sb;
            } else {
               r = dr;
               g = dg;
               b = db;
            }

            d[i] = (r * a1 + sr * a2 + dr * a3) / a;
            d[i + 1] = (g * a1 + sg * a2 + dg * a3) / a;
            d[i + 2] = (b * a1 + sb * a2 + db * a3) / a;
         }
      }
   }

   function blendOverlay(d, s, w, h, alpha) {
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

            if (dr < 128) {
               r = sr * dr * 32897 >> 22;
            } else {
               r = 255 - ((255 - ((dr - 128) << 1)) * (255 - sr) * 32897 >> 23);
            }

            if (dg < 128) {
               g = sg * dg * 32897 >> 22;
            } else {
               g = 255 - ((255 - ((dg - 128) << 1)) * (255 - sg) * 32897 >> 23);
            }

            if (db < 128) {
               b = sb * db * 32897 >> 22;
            } else {
               b = 255 - ((255 - ((db - 128) << 1)) * (255 - sb) * 32897 >> 23);
            }

            d[i] = (r * a1 + sr * a2 + dr * a3) / a;
            d[i + 1] = (g * a1 + sg * a2 + dg * a3) / a;
            d[i + 2] = (b * a1 + sb * a2 + db * a3) / a;
         }
      }
   }

   function blendSoftLight(d, s, w, h, alpha) {
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

            if (sr < 128) {
               r = dr - (((255 - (sr << 1)) * dr * 32897 >> 23) * (255 - dr) * 32897 >> 23);
            } else {
               if (dr < 64) {
                  tmp = ((((dr << 4) - 3060) * 32897 >> 23) * dr + 1020) * dr * 32897 >> 23;
               } else {
                  tmp = Math.sqrt(dr / 255) * 255;
               }
               r = dr + (((sr << 1) - 255) * (tmp - dr) * 32897 >> 23);
            }

            if (sg < 128) {
               g = dg - (((255 - (sg << 1)) * dg * 32897 >> 23) * (255 - dg) * 32897 >> 23);
            } else {
               if (dg < 64) {
                  tmp = ((((dg << 4) - 3060) * 32897 >> 23) * dg + 1020) * dg * 32897 >> 23;
               } else {
                  tmp = Math.sqrt(dg / 255) * 255;
               }
               g = dg + (((sg << 1) - 255) * (tmp - dg) * 32897 >> 23);
            }

            if (sb < 128) {
               b = db - (((255 - (sb << 1)) * db * 32897 >> 23) * (255 - db) * 32897 >> 23);
            } else {
               if (db < 64) {
                  tmp = ((((db << 4) - 3060) * 32897 >> 23) * db + 1020) * db * 32897 >> 23;
               } else {
                  tmp = Math.sqrt(db / 255) * 255;
               }
               b = db + (((sb << 1) - 255) * (tmp - db) * 32897 >> 23);
            }

            d[i] = (r * a1 + sr * a2 + dr * a3) / a;
            d[i + 1] = (g * a1 + sg * a2 + dg * a3) / a;
            d[i + 2] = (b * a1 + sb * a2 + db * a3) / a;
         }
      }
   }

   function blendHardLight(d, s, w, h, alpha) {
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

            if (sr < 128) {
               r = dr * sr * 32897 >> 22;
            } else {
               tmp = (sr << 1) - 255;
               r = dr + tmp - (dr * tmp * 32897 >> 23);
            }

            if (sg < 128) {
               g = dg * sg * 32897 >> 22;
            } else {
               tmp = (sg << 1) - 255;
               g = dg + tmp - (dg * tmp * 32897 >> 23);
            }

            if (sb < 128) {
               b = db * sb * 32897 >> 22;
            } else {
               tmp = (sb << 1) - 255;
               b = db + tmp - (db * tmp * 32897 >> 23);
            }

            d[i] = (r * a1 + sr * a2 + dr * a3) / a;
            d[i + 1] = (g * a1 + sg * a2 + dg * a3) / a;
            d[i + 2] = (b * a1 + sb * a2 + db * a3) / a;
         }
      }
   }

   function blendVividLight(d, s, w, h, alpha) {
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

            if (sr < 128) {
               tmp = sr << 1;
               if (sr == 0) {
                  r = tmp;
               } else {
                  r = Math.max(0, (255 - ((255 - dr) * 255) / tmp));
               }
            } else {
               tmp = ((sr - 128) << 1) + 1;
               /* if (dr == 0) {
                  r = 255;
               } else */
               if (tmp == 255) {
                  r = tmp;
               } else {
                  r = Math.min(255, ((dr * 255) / (255 - tmp)));
               }
            }

            if (sg < 128) {
               tmp = sg << 1;
               if (sg == 0) {
                  g = tmp;
               } else {
                  g = Math.max(0, (255 - ((255 - dg) * 255) / tmp));
               }
            } else {
               tmp = ((sg - 128) << 1) + 1;
               /* if (dg == 0) {
                  g = 255;
               } else */
               if (tmp == 255) {
                  g = tmp;
               } else {
                  g = Math.min(255, ((dg * 255) / (255 - tmp)));
               }
            }

            if (sb < 128) {
               tmp = sb << 1;
               if (sb == 0) {
                  b = tmp;
               } else {
                  b = Math.max(0, (255 - ((255 - db) * 255) / tmp));
               }
            } else {
               tmp = ((sb - 128) << 1) + 1;
               /* if (db == 0) {
                  b = 255;
               } else */
               if (tmp == 255) {
                  b = tmp;
               } else {
                  b = Math.min(255, ((db * 255) / (255 - tmp)));
               }
            }

            d[i] = (r * a1 + sr * a2 + dr * a3) / a;
            d[i + 1] = (g * a1 + sg * a2 + dg * a3) / a;
            d[i + 2] = (b * a1 + sb * a2 + db * a3) / a;
         }
      }
   }

   function blendLinearLight(d, s, w, h, alpha) {
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

            if (sr < 128) {
               r = dr + (sr << 1) - 255;
            } else {
               r = dr + ((sr - 128) << 1);
            }

            if (sg < 128) {
               g = dg + (sg << 1) - 255;
            } else {
               g = dg + ((sg - 128) << 1);
            }

            if (sb < 128) {
               b = db + (sb << 1) - 255;
            } else {
               b = db + ((sb - 128) << 1);
            }

            d[i] = (r * a1 + sr * a2 + dr * a3) / a;
            d[i + 1] = (g * a1 + sg * a2 + dg * a3) / a;
            d[i + 2] = (b * a1 + sb * a2 + db * a3) / a;
         }
      }
   }

   function blendPinLight(d, s, w, h, alpha) {
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

            if (sr < 128) {
               tmp = sr << 1;
               if (tmp < dr) {
                  r = tmp;
               } else {
                  r = dr;
               }
            } else {
               tmp = (sr - 128) << 1;
               if (tmp > dr) {
                  r = tmp;
               } else {
                  r = dr;
               }
            }

            if (sg < 128) {
               tmp = sg << 1;
               if (tmp < dg) {
                  g = tmp;
               } else {
                  g = dg;
               }
            } else {
               tmp = (sg - 128) << 1;
               if (tmp > dg) {
                  g = tmp;
               } else {
                  g = dg;
               }
            }

            if (sb < 128) {
               tmp = sb << 1;
               if (tmp < db) {
                  b = tmp;
               } else {
                  b = db;
               }
            } else {
               tmp = (sb - 128) << 1;
               if (tmp > db) {
                  b = tmp;
               } else {
                  b = db;
               }
            }

            d[i] = (r * a1 + sr * a2 + dr * a3) / a;
            d[i + 1] = (g * a1 + sg * a2 + dg * a3) / a;
            d[i + 2] = (b * a1 + sb * a2 + db * a3) / a;
         }
      }
   }

   function blendHardMix(d, s, w, h, alpha) {
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

            if (sr < 128) {
               tmp = sr << 1;
               if (sr != 0) {
                  tmp = Math.max(0, (255 - ((255 - dr) * 255) / tmp));
               }
            } else {
               if (dr == 0) {
                  tmp = 0;
               } else {
                  tmp = ((sr - 128) << 1) + 1;
                  if (tmp != 255) {
                     tmp = Math.min(255, ((dr * 255) / (255 - tmp)));
                  }
               }
            }
            r = tmp < 128 ? 0 : 255;

            if (sg < 128) {
               tmp = sg << 1;
               if (sg != 0) {
                  tmp = Math.max(0, (255 - ((255 - dg) * 255) / tmp));
               }
            } else {
               if (dg == 0) {
                  tmp = 0;
               } else {
                  tmp = ((sg - 128) << 1) + 1;
                  if (tmp != 255) {
                     tmp = Math.min(255, ((dg * 255) / (255 - tmp)));
                  }
               }
            }
            g = tmp < 128 ? 0 : 255;

            if (sb < 128) {
               tmp = sb << 1;
               if (sb != 0) {
                  tmp = Math.max(0, (255 - ((255 - db) * 255) / tmp));
               }
            } else {
               if (db == 0) {
                  tmp = 0;
               } else {
                  tmp = ((sb - 128) << 1) + 1;
                  if (tmp != 255) {
                     tmp = Math.min(255, ((db * 255) / (255 - tmp)));
                  }
               }
            }
            b = tmp < 128 ? 0 : 255;

            d[i] = (r * a1 + sr * a2 + dr * a3) / a;
            d[i + 1] = (g * a1 + sg * a2 + dg * a3) / a;
            d[i + 2] = (b * a1 + sb * a2 + db * a3) / a;
         }
      }
   }

   function blendDifference(d, s, w, h, alpha) {
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

            tmp = dr - sr;
            r = tmp < 0 ? -tmp : tmp;

            tmp = dg - sg;
            g = tmp < 0 ? -tmp : tmp;

            tmp = db - sb;
            b = tmp < 0 ? -tmp : tmp;

            d[i] = (r * a1 + sr * a2 + dr * a3) / a;
            d[i + 1] = (g * a1 + sg * a2 + dg * a3) / a;
            d[i + 2] = (b * a1 + sb * a2 + db * a3) / a;
         }
      }
   }

   function blendExclusion(d, s, w, h, alpha) {
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

            r = dr + sr - (dr * sr * 32897 >> 22);

            g = dg + sg - (dg * sg * 32897 >> 22);

            b = db + sb - (db * sb * 32897 >> 22);

            d[i] = (r * a1 + sr * a2 + dr * a3) / a;
            d[i + 1] = (g * a1 + sg * a2 + dg * a3) / a;
            d[i + 2] = (b * a1 + sb * a2 + db * a3) / a;
         }
      }
   }

   function blendSubtract(d, s, w, h, alpha) {
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

            r = Math.max(0, dr - sr);

            g = Math.max(0, dg - sg);

            b = Math.max(0, db - sb);

            d[i] = (r * a1 + sr * a2 + dr * a3) / a;
            d[i + 1] = (g * a1 + sg * a2 + dg * a3) / a;
            d[i + 2] = (b * a1 + sb * a2 + db * a3) / a;
         }
      }
   }

   function blendDivide(d, s, w, h, alpha) {
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

            if (dr == 0) {
               r = 0;
            } else if (sr == 0) {
               r = 255;
            } else {
               r = Math.min(255, dr / sr * 255);
            }

            if (dg == 0) {
               g = 0;
            } else if (sg == 0) {
               g = 255;
            } else {
               g = Math.min(255, dg / sg * 255);
            }

            if (db == 0) {
               b = 0;
            } else if (sb == 0) {
               b = 255;
            } else {
               b = Math.min(255, db / sb * 255);
            }

            d[i] = (r * a1 + sr * a2 + dr * a3) / a;
            d[i + 1] = (g * a1 + sg * a2 + dg * a3) / a;
            d[i + 2] = (b * a1 + sb * a2 + db * a3) / a;
         }
      }
   }

   function blendHue(d, s, w, h, alpha) {
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

            tmp = setSat(sr, sg, sb, sat(dr, dg, db));
            r = (tmp & 0xff0000) >> 16;
            g = (tmp & 0xff00) >> 8;
            b = tmp & 0xff;
            tmp = setLum(r, g, b, lum(dr, dg, db));
            r = (tmp & 0xff0000) >> 16;
            g = (tmp & 0xff00) >> 8;
            b = tmp & 0xff;

            d[i] = (r * a1 + sr * a2 + dr * a3) / a;
            d[i + 1] = (g * a1 + sg * a2 + dg * a3) / a;
            d[i + 2] = (b * a1 + sb * a2 + db * a3) / a;
         }
      }
   }

   function blendSaturation(d, s, w, h, alpha) {
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

            tmp = setSat(dr, dg, db, sat(sr, sg, sb));
            r = (tmp & 0xff0000) >> 16;
            g = (tmp & 0xff00) >> 8;
            b = tmp & 0xff;
            tmp = setLum(r, g, b, lum(dr, dg, db));
            r = (tmp & 0xff0000) >> 16;
            g = (tmp & 0xff00) >> 8;
            b = tmp & 0xff;

            d[i] = (r * a1 + sr * a2 + dr * a3) / a;
            d[i + 1] = (g * a1 + sg * a2 + dg * a3) / a;
            d[i + 2] = (b * a1 + sb * a2 + db * a3) / a;
         }
      }
   }

   function blendColor(d, s, w, h, alpha) {
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

            tmp = setLum(sr, sg, sb, lum(dr, dg, db));
            r = (tmp & 0xff0000) >> 16;
            g = (tmp & 0xff00) >> 8;
            b = tmp & 0xff;

            d[i] = (r * a1 + sr * a2 + dr * a3) / a;
            d[i + 1] = (g * a1 + sg * a2 + dg * a3) / a;
            d[i + 2] = (b * a1 + sb * a2 + db * a3) / a;
         }
      }
   }

   function blendLuminosity(d, s, w, h, alpha) {
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

            tmp = setLum(dr, dg, db, lum(sr, sg, sb));
            r = (tmp & 0xff0000) >> 16;
            g = (tmp & 0xff00) >> 8;
            b = tmp & 0xff;

            d[i] = (r * a1 + sr * a2 + dr * a3) / a;
            d[i + 1] = (g * a1 + sg * a2 + dg * a3) / a;
            d[i + 2] = (b * a1 + sb * a2 + db * a3) / a;
         }
      }
   }

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
