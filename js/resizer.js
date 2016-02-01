'use strict';

onmessage = function(e) {
   var sw = e.data.width,
      sh = e.data.height,
      tw = 0 | sw * e.data.scale,
      th = 0 | sh * e.data.scale;
   var tmp = new Float32Array(tw * th << 2);
   downScaleCanvasCalculate(tmp, new Uint8Array(e.data.buf), e.data.scale, sw, sh, tw, th);
   var dest = new Uint8ClampedArray(tw * th << 2);
   downScaleCanvasFinalize(dest, tmp);
   postMessage({
      buf: dest.buffer
   }, [dest.buffer]);
};

// convert float32 array into a UInt8Clamped Array
function downScaleCanvasFinalize(dest, src) {
   for (var i = 0, len = src.length, ma; i < len; i += 4) {
      if (src[i + 3] == 0) {
         continue;
      }
      ma = 255 / src[i + 3];
      dest[i] = src[i] * ma;
      dest[i + 1] = src[i + 1] * ma;
      dest[i + 2] = src[i + 2] * ma;
      dest[i + 3] = src[i + 3];
   }
}

function downScaleCanvasCalculate(tbuf, sbuf, scale, sw, sh, tw, th) {
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
