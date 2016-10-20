(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";
// DO NOT EDIT.
// Generate with: go generate
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
        }
        else if (r <= b) {
            sat = setSatMinMidMax(r, b, g, sat);
            return (sat & 0xff0000) | ((sat & 0xff) << 8) | ((sat & 0xff00) >> 8);
        }
        sat = setSatMinMidMax(b, r, g, sat);
        return ((sat & 0xffff) << 8) | ((sat & 0xff0000) >> 16);
    }
    else if (r <= b) {
        sat = setSatMinMidMax(g, r, b, sat);
        return ((sat & 0xff00) << 8) | ((sat & 0xff0000) >> 8) | (sat & 0xff);
    }
    else if (g <= b) {
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
function copyAlpha(d, s, w, h, alpha) {
    for (var i = 0, len = w * h << 2; i < len; i += 4) {
        d[i + 3] = s[i + 3] * alpha;
    }
}
function copyOpaque(d, s, w, h, alpha) {
    var a = 255 * alpha;
    for (var i = 0, len = w * h << 2; i < len; i += 4) {
        d[i + 0] = s[i + 0];
        d[i + 1] = s[i + 1];
        d[i + 2] = s[i + 2];
        d[i + 3] = a;
    }
}
function blendNormal(d, s, w, h, alpha) {
    var sr, sg, sb, sa, dr, dg, db, da;
    var a1, a2, a3, r, g, b, a, tmp;
    for (var i = 0, len = w * h << 2; i < len; i += 4) {
        sr = s[i];
        sg = s[i + 1];
        sb = s[i + 2];
        sa = s[i + 3];
        dr = d[i];
        dg = d[i + 1];
        db = d[i + 2];
        da = d[i + 3];
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
        sr = s[i];
        sg = s[i + 1];
        sb = s[i + 2];
        sa = s[i + 3];
        dr = d[i];
        dg = d[i + 1];
        db = d[i + 2];
        da = d[i + 3];
        tmp = 0 | (sa * alpha * 32897);
        a1 = (tmp * da) >> 23;
        a2 = (tmp * (255 - da)) >> 23;
        a3 = ((8388735 - tmp) * da) >> 23;
        a = a1 + a2 + a3;
        d[i + 3] = a;
        if (a) {
            if (sr < dr) {
                r = sr;
            }
            else {
                r = dr;
            }
            if (sg < dg) {
                g = sg;
            }
            else {
                g = dg;
            }
            if (sb < db) {
                b = sb;
            }
            else {
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
        sr = s[i];
        sg = s[i + 1];
        sb = s[i + 2];
        sa = s[i + 3];
        dr = d[i];
        dg = d[i + 1];
        db = d[i + 2];
        da = d[i + 3];
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
        sr = s[i];
        sg = s[i + 1];
        sb = s[i + 2];
        sa = s[i + 3];
        dr = d[i];
        dg = d[i + 1];
        db = d[i + 2];
        da = d[i + 3];
        tmp = 0 | (sa * alpha * 32897);
        a1 = (tmp * da) >> 23;
        a2 = (tmp * (255 - da)) >> 23;
        a3 = ((8388735 - tmp) * da) >> 23;
        a = a1 + a2 + a3;
        d[i + 3] = a;
        if (a) {
            if (dr === 255) {
                r = 255;
            }
            else if (sr === 0) {
                r = 0;
            }
            else {
                r = 255 - Math.min(255, (255 - dr) / sr * 255);
            }
            if (dg === 255) {
                g = 255;
            }
            else if (sg === 0) {
                g = 0;
            }
            else {
                g = 255 - Math.min(255, (255 - dg) / sg * 255);
            }
            if (db === 255) {
                b = 255;
            }
            else if (sb === 0) {
                b = 0;
            }
            else {
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
        sr = s[i];
        sg = s[i + 1];
        sb = s[i + 2];
        sa = s[i + 3];
        dr = d[i];
        dg = d[i + 1];
        db = d[i + 2];
        da = d[i + 3];
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
        sr = s[i];
        sg = s[i + 1];
        sb = s[i + 2];
        sa = s[i + 3];
        dr = d[i];
        dg = d[i + 1];
        db = d[i + 2];
        da = d[i + 3];
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
            }
            else {
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
        sr = s[i];
        sg = s[i + 1];
        sb = s[i + 2];
        sa = s[i + 3];
        dr = d[i];
        dg = d[i + 1];
        db = d[i + 2];
        da = d[i + 3];
        tmp = 0 | (sa * alpha * 32897);
        a1 = (tmp * da) >> 23;
        a2 = (tmp * (255 - da)) >> 23;
        a3 = ((8388735 - tmp) * da) >> 23;
        a = a1 + a2 + a3;
        d[i + 3] = a;
        if (a) {
            if (sr > dr) {
                r = sr;
            }
            else {
                r = dr;
            }
            if (sg > dg) {
                g = sg;
            }
            else {
                g = dg;
            }
            if (sb > db) {
                b = sb;
            }
            else {
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
        sr = s[i];
        sg = s[i + 1];
        sb = s[i + 2];
        sa = s[i + 3];
        dr = d[i];
        dg = d[i + 1];
        db = d[i + 2];
        da = d[i + 3];
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
        sr = s[i];
        sg = s[i + 1];
        sb = s[i + 2];
        sa = s[i + 3];
        dr = d[i];
        dg = d[i + 1];
        db = d[i + 2];
        da = d[i + 3];
        tmp = 0 | (sa * alpha * 32897);
        a1 = (tmp * da) >> 23;
        a2 = (tmp * (255 - da)) >> 23;
        a3 = ((8388735 - tmp) * da) >> 23;
        a = a1 + a2 + a3;
        d[i + 3] = a;
        if (a) {
            if (dr === 0) {
                r = 0;
            }
            else if (sr === 255) {
                r = 255;
            }
            else {
                r = Math.min(255, dr * 255 / (255 - sr));
            }
            if (dg === 0) {
                g = 0;
            }
            else if (sg === 255) {
                g = 255;
            }
            else {
                g = Math.min(255, dg * 255 / (255 - sg));
            }
            if (db === 0) {
                b = 0;
            }
            else if (sb === 255) {
                b = 255;
            }
            else {
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
        sr = s[i];
        sg = s[i + 1];
        sb = s[i + 2];
        sa = s[i + 3];
        dr = d[i];
        dg = d[i + 1];
        db = d[i + 2];
        da = d[i + 3];
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
        sr = s[i];
        sg = s[i + 1];
        sb = s[i + 2];
        sa = s[i + 3];
        dr = d[i];
        dg = d[i + 1];
        db = d[i + 2];
        da = d[i + 3];
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
            }
            else {
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
        sr = s[i];
        sg = s[i + 1];
        sb = s[i + 2];
        sa = s[i + 3];
        dr = d[i];
        dg = d[i + 1];
        db = d[i + 2];
        da = d[i + 3];
        tmp = 0 | (sa * alpha * 32897);
        a1 = (tmp * da) >> 23;
        a2 = (tmp * (255 - da)) >> 23;
        a3 = ((8388735 - tmp) * da) >> 23;
        a = a1 + a2 + a3;
        d[i + 3] = a;
        if (a) {
            if (dr < 128) {
                r = sr * dr * 32897 >> 22;
            }
            else {
                r = 255 - ((255 - ((dr - 128) << 1)) * (255 - sr) * 32897 >> 23);
            }
            if (dg < 128) {
                g = sg * dg * 32897 >> 22;
            }
            else {
                g = 255 - ((255 - ((dg - 128) << 1)) * (255 - sg) * 32897 >> 23);
            }
            if (db < 128) {
                b = sb * db * 32897 >> 22;
            }
            else {
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
        sr = s[i];
        sg = s[i + 1];
        sb = s[i + 2];
        sa = s[i + 3];
        dr = d[i];
        dg = d[i + 1];
        db = d[i + 2];
        da = d[i + 3];
        tmp = 0 | (sa * alpha * 32897);
        a1 = (tmp * da) >> 23;
        a2 = (tmp * (255 - da)) >> 23;
        a3 = ((8388735 - tmp) * da) >> 23;
        a = a1 + a2 + a3;
        d[i + 3] = a;
        if (a) {
            if (sr < 128) {
                r = dr - (((255 - (sr << 1)) * dr * 32897 >> 23) * (255 - dr) * 32897 >> 23);
            }
            else {
                if (dr < 64) {
                    tmp = ((((dr << 4) - 3060) * 32897 >> 23) * dr + 1020) * dr * 32897 >> 23;
                }
                else {
                    tmp = Math.sqrt(dr / 255) * 255;
                }
                r = dr + (((sr << 1) - 255) * (tmp - dr) * 32897 >> 23);
            }
            if (sg < 128) {
                g = dg - (((255 - (sg << 1)) * dg * 32897 >> 23) * (255 - dg) * 32897 >> 23);
            }
            else {
                if (dg < 64) {
                    tmp = ((((dg << 4) - 3060) * 32897 >> 23) * dg + 1020) * dg * 32897 >> 23;
                }
                else {
                    tmp = Math.sqrt(dg / 255) * 255;
                }
                g = dg + (((sg << 1) - 255) * (tmp - dg) * 32897 >> 23);
            }
            if (sb < 128) {
                b = db - (((255 - (sb << 1)) * db * 32897 >> 23) * (255 - db) * 32897 >> 23);
            }
            else {
                if (db < 64) {
                    tmp = ((((db << 4) - 3060) * 32897 >> 23) * db + 1020) * db * 32897 >> 23;
                }
                else {
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
        sr = s[i];
        sg = s[i + 1];
        sb = s[i + 2];
        sa = s[i + 3];
        dr = d[i];
        dg = d[i + 1];
        db = d[i + 2];
        da = d[i + 3];
        tmp = 0 | (sa * alpha * 32897);
        a1 = (tmp * da) >> 23;
        a2 = (tmp * (255 - da)) >> 23;
        a3 = ((8388735 - tmp) * da) >> 23;
        a = a1 + a2 + a3;
        d[i + 3] = a;
        if (a) {
            if (sr < 128) {
                r = dr * sr * 32897 >> 22;
            }
            else {
                tmp = (sr << 1) - 255;
                r = dr + tmp - (dr * tmp * 32897 >> 23);
            }
            if (sg < 128) {
                g = dg * sg * 32897 >> 22;
            }
            else {
                tmp = (sg << 1) - 255;
                g = dg + tmp - (dg * tmp * 32897 >> 23);
            }
            if (sb < 128) {
                b = db * sb * 32897 >> 22;
            }
            else {
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
        sr = s[i];
        sg = s[i + 1];
        sb = s[i + 2];
        sa = s[i + 3];
        dr = d[i];
        dg = d[i + 1];
        db = d[i + 2];
        da = d[i + 3];
        tmp = 0 | (sa * alpha * 32897);
        a1 = (tmp * da) >> 23;
        a2 = (tmp * (255 - da)) >> 23;
        a3 = ((8388735 - tmp) * da) >> 23;
        a = a1 + a2 + a3;
        d[i + 3] = a;
        if (a) {
            if (sr < 128) {
                tmp = sr << 1;
                if (sr === 0) {
                    r = tmp;
                }
                else {
                    r = Math.max(0, (255 - ((255 - dr) * 255) / tmp));
                }
            }
            else {
                tmp = ((sr - 128) << 1) + 1;
                /* if (dr === 0) {
                    r = 255;
                } else */
                if (tmp === 255) {
                    r = tmp;
                }
                else {
                    r = Math.min(255, ((dr * 255) / (255 - tmp)));
                }
            }
            if (sg < 128) {
                tmp = sg << 1;
                if (sg === 0) {
                    g = tmp;
                }
                else {
                    g = Math.max(0, (255 - ((255 - dg) * 255) / tmp));
                }
            }
            else {
                tmp = ((sg - 128) << 1) + 1;
                /* if (dg === 0) {
                    g = 255;
                } else */
                if (tmp === 255) {
                    g = tmp;
                }
                else {
                    g = Math.min(255, ((dg * 255) / (255 - tmp)));
                }
            }
            if (sb < 128) {
                tmp = sb << 1;
                if (sb === 0) {
                    b = tmp;
                }
                else {
                    b = Math.max(0, (255 - ((255 - db) * 255) / tmp));
                }
            }
            else {
                tmp = ((sb - 128) << 1) + 1;
                /* if (db === 0) {
                    b = 255;
                } else */
                if (tmp === 255) {
                    b = tmp;
                }
                else {
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
        sr = s[i];
        sg = s[i + 1];
        sb = s[i + 2];
        sa = s[i + 3];
        dr = d[i];
        dg = d[i + 1];
        db = d[i + 2];
        da = d[i + 3];
        tmp = 0 | (sa * alpha * 32897);
        a1 = (tmp * da) >> 23;
        a2 = (tmp * (255 - da)) >> 23;
        a3 = ((8388735 - tmp) * da) >> 23;
        a = a1 + a2 + a3;
        d[i + 3] = a;
        if (a) {
            if (sr < 128) {
                r = dr + (sr << 1) - 255;
            }
            else {
                r = dr + ((sr - 128) << 1);
            }
            if (sg < 128) {
                g = dg + (sg << 1) - 255;
            }
            else {
                g = dg + ((sg - 128) << 1);
            }
            if (sb < 128) {
                b = db + (sb << 1) - 255;
            }
            else {
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
        sr = s[i];
        sg = s[i + 1];
        sb = s[i + 2];
        sa = s[i + 3];
        dr = d[i];
        dg = d[i + 1];
        db = d[i + 2];
        da = d[i + 3];
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
                }
                else {
                    r = dr;
                }
            }
            else {
                tmp = (sr - 128) << 1;
                if (tmp > dr) {
                    r = tmp;
                }
                else {
                    r = dr;
                }
            }
            if (sg < 128) {
                tmp = sg << 1;
                if (tmp < dg) {
                    g = tmp;
                }
                else {
                    g = dg;
                }
            }
            else {
                tmp = (sg - 128) << 1;
                if (tmp > dg) {
                    g = tmp;
                }
                else {
                    g = dg;
                }
            }
            if (sb < 128) {
                tmp = sb << 1;
                if (tmp < db) {
                    b = tmp;
                }
                else {
                    b = db;
                }
            }
            else {
                tmp = (sb - 128) << 1;
                if (tmp > db) {
                    b = tmp;
                }
                else {
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
        sr = s[i];
        sg = s[i + 1];
        sb = s[i + 2];
        sa = s[i + 3];
        dr = d[i];
        dg = d[i + 1];
        db = d[i + 2];
        da = d[i + 3];
        tmp = 0 | (sa * alpha * 32897);
        a1 = (tmp * da) >> 23;
        a2 = (tmp * (255 - da)) >> 23;
        a3 = ((8388735 - tmp) * da) >> 23;
        a = a1 + a2 + a3;
        d[i + 3] = a;
        if (a) {
            if (sr < 128) {
                tmp = sr << 1;
                if (sr !== 0) {
                    tmp = Math.max(0, (255 - ((255 - dr) * 255) / tmp));
                }
            }
            else {
                if (dr === 0) {
                    tmp = 0;
                }
                else {
                    tmp = ((sr - 128) << 1) + 1;
                    if (tmp !== 255) {
                        tmp = Math.min(255, ((dr * 255) / (255 - tmp)));
                    }
                }
            }
            r = tmp < 128 ? 0 : 255;
            if (sg < 128) {
                tmp = sg << 1;
                if (sg !== 0) {
                    tmp = Math.max(0, (255 - ((255 - dg) * 255) / tmp));
                }
            }
            else {
                if (dg === 0) {
                    tmp = 0;
                }
                else {
                    tmp = ((sg - 128) << 1) + 1;
                    if (tmp !== 255) {
                        tmp = Math.min(255, ((dg * 255) / (255 - tmp)));
                    }
                }
            }
            g = tmp < 128 ? 0 : 255;
            if (sb < 128) {
                tmp = sb << 1;
                if (sb !== 0) {
                    tmp = Math.max(0, (255 - ((255 - db) * 255) / tmp));
                }
            }
            else {
                if (db === 0) {
                    tmp = 0;
                }
                else {
                    tmp = ((sb - 128) << 1) + 1;
                    if (tmp !== 255) {
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
        sr = s[i];
        sg = s[i + 1];
        sb = s[i + 2];
        sa = s[i + 3];
        dr = d[i];
        dg = d[i + 1];
        db = d[i + 2];
        da = d[i + 3];
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
        sr = s[i];
        sg = s[i + 1];
        sb = s[i + 2];
        sa = s[i + 3];
        dr = d[i];
        dg = d[i + 1];
        db = d[i + 2];
        da = d[i + 3];
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
        sr = s[i];
        sg = s[i + 1];
        sb = s[i + 2];
        sa = s[i + 3];
        dr = d[i];
        dg = d[i + 1];
        db = d[i + 2];
        da = d[i + 3];
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
        sr = s[i];
        sg = s[i + 1];
        sb = s[i + 2];
        sa = s[i + 3];
        dr = d[i];
        dg = d[i + 1];
        db = d[i + 2];
        da = d[i + 3];
        tmp = 0 | (sa * alpha * 32897);
        a1 = (tmp * da) >> 23;
        a2 = (tmp * (255 - da)) >> 23;
        a3 = ((8388735 - tmp) * da) >> 23;
        a = a1 + a2 + a3;
        d[i + 3] = a;
        if (a) {
            if (dr === 0) {
                r = 0;
            }
            else if (sr === 0) {
                r = 255;
            }
            else {
                r = Math.min(255, dr / sr * 255);
            }
            if (dg === 0) {
                g = 0;
            }
            else if (sg === 0) {
                g = 255;
            }
            else {
                g = Math.min(255, dg / sg * 255);
            }
            if (db === 0) {
                b = 0;
            }
            else if (sb === 0) {
                b = 255;
            }
            else {
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
        sr = s[i];
        sg = s[i + 1];
        sb = s[i + 2];
        sa = s[i + 3];
        dr = d[i];
        dg = d[i + 1];
        db = d[i + 2];
        da = d[i + 3];
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
        sr = s[i];
        sg = s[i + 1];
        sb = s[i + 2];
        sa = s[i + 3];
        dr = d[i];
        dg = d[i + 1];
        db = d[i + 2];
        da = d[i + 3];
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
        sr = s[i];
        sg = s[i + 1];
        sb = s[i + 2];
        sa = s[i + 3];
        dr = d[i];
        dg = d[i + 1];
        db = d[i + 2];
        da = d[i + 3];
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
        sr = s[i];
        sg = s[i + 1];
        sb = s[i + 2];
        sa = s[i + 3];
        dr = d[i];
        dg = d[i + 1];
        db = d[i + 2];
        da = d[i + 3];
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
    'copy-alpha': copyAlpha,
    'copy-opaque': copyOpaque,
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
var implementedBlendModes = enumImplementedBlendModes();
function blend(dest, src, dx, dy, sw, sh, alpha, blendMode) {
    if (blendMode === 'normal') {
        blendMode = 'source-over';
    }
    if (blendMode in implementedBlendModes) {
        var dctx_1 = dest.getContext('2d');
        dctx_1.save();
        dctx_1.globalAlpha = alpha;
        dctx_1.globalCompositeOperation = blendMode;
        dctx_1.drawImage(src, dx, dy);
        dctx_1.restore();
        // console.log('native: '+blendMode);
        return;
    }
    var sx = 0;
    var sy = 0;
    if (dx >= dest.width || dy >= dest.height || dx + sw < 0 || dy + sh < 0 || alpha === 0) {
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
exports.blend = blend;
function enumImplementedBlendModes() {
    var r = {};
    var c = document.createElement('canvas');
    var ctx = c.getContext('2d');
    for (var _i = 0, _a = Object.keys(blendModes); _i < _a.length; _i++) {
        var bm = _a[_i];
        ctx.globalCompositeOperation = bm;
        if (ctx.globalCompositeOperation === bm) {
            r[bm] = undefined;
        }
    }
    return r;
}
function detectBrokenColorDodge() {
    return new Promise(function (resolve) {
        var img = new Image();
        img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg' +
            '0kAAAAGUlEQVQI1wXBAQEAAAgCIOz/5TJI20UGhz5D2wX8PWbkFQAAAABJRU5ErkJggg==';
        img.onload = function (e) {
            var c = document.createElement('canvas');
            c.width = 257;
            c.height = 256;
            var ctx = c.getContext('2d');
            ctx.fillStyle = 'rgb(255, 255, 255)';
            ctx.fillRect(0, 0, c.width, c.height);
            ctx.globalAlpha = 0.5;
            ctx.globalCompositeOperation = 'color-dodge';
            ctx.drawImage(img, 0, 0);
            var d = ctx.getImageData(0, 0, 1, 1);
            resolve(d.data[0] < 128);
        };
    });
}
detectBrokenColorDodge().then(function (isBroken) {
    if (isBroken) {
        delete implementedBlendModes['color-dodge'];
    }
});

},{}],2:[function(require,module,exports){
"use strict";
// Based on http://stackoverflow.com/a/18639999
// function makeCRCTable(): Uint32Array {
//     let c: number, n: number, k: number;
//     const crcTable = new Uint32Array(256);
//     for (n = 0; n < 256; n++) {
//         c = n;
//         for (k = 0; k < 8; k++) {
//             c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
//         }
//         crcTable[n] = c;
//     }
//     return crcTable;
// }
// const crcTable = makeCRCTable();
var crcTable = new Uint32Array([
    0, 1996959894, -301047508, -1727442502, 124634137, 1886057615, -379345611, -1637575261,
    249268274, 2044508324, -522852066, -1747789432, 162941995, 2125561021, -407360249, -1866523247,
    498536548, 1789927666, -205950648, -2067906082, 450548861, 1843258603, -187386543, -2083289657,
    325883990, 1684777152, -43845254, -1973040660, 335633487, 1661365465, -99664541, -1928851979,
    997073096, 1281953886, -715111964, -1570279054, 1006888145, 1258607687, -770865667, -1526024853,
    901097722, 1119000684, -608450090, -1396901568, 853044451, 1172266101, -589951537, -1412350631,
    651767980, 1373503546, -925412992, -1076862698, 565507253, 1454621731, -809855591, -1195530993,
    671266974, 1594198024, -972236366, -1324619484, 795835527, 1483230225, -1050600021, -1234817731,
    1994146192, 31158534, -1731059524, -271249366, 1907459465, 112637215, -1614814043, -390540237,
    2013776290, 251722036, -1777751922, -519137256, 2137656763, 141376813, -1855689577, -429695999,
    1802195444, 476864866, -2056965928, -228458418, 1812370925, 453092731, -2113342271, -183516073,
    1706088902, 314042704, -1950435094, -54949764, 1658658271, 366619977, -1932296973, -69972891,
    1303535960, 984961486, -1547960204, -725929758, 1256170817, 1037604311, -1529756563, -740887301,
    1131014506, 879679996, -1385723834, -631195440, 1141124467, 855842277, -1442165665, -586318647,
    1342533948, 654459306, -1106571248, -921952122, 1466479909, 544179635, -1184443383, -832445281,
    1591671054, 702138776, -1328506846, -942167884, 1504918807, 783551873, -1212326853, -1061524307,
    -306674912, -1698712650, 62317068, 1957810842, -355121351, -1647151185, 81470997, 1943803523,
    -480048366, -1805370492, 225274430, 2053790376, -468791541, -1828061283, 167816743, 2097651377,
    -267414716, -2029476910, 503444072, 1762050814, -144550051, -2140837941, 426522225, 1852507879,
    -19653770, -1982649376, 282753626, 1742555852, -105259153, -1900089351, 397917763, 1622183637,
    -690576408, -1580100738, 953729732, 1340076626, -776247311, -1497606297, 1068828381, 1219638859,
    -670225446, -1358292148, 906185462, 1090812512, -547295293, -1469587627, 829329135, 1181335161,
    -882789492, -1134132454, 628085408, 1382605366, -871598187, -1156888829, 570562233, 1426400815,
    -977650754, -1296233688, 733239954, 1555261956, -1026031705, -1244606671, 752459403, 1541320221,
    -1687895376, -328994266, 1969922972, 40735498, -1677130071, -351390145, 1913087877, 83908371,
    -1782625662, -491226604, 2075208622, 213261112, -1831694693, -438977011, 2094854071, 198958881,
    -2032938284, -237706686, 1759359992, 534414190, -2118248755, -155638181, 1873836001, 414664567,
    -2012718362, -15766928, 1711684554, 285281116, -1889165569, -127750551, 1634467795, 376229701,
    -1609899400, -686959890, 1308918612, 956543938, -1486412191, -799009033, 1231636301, 1047427035,
    -1362007478, -640263460, 1088359270, 936918000, -1447252397, -558129467, 1202900863, 817233897,
    -1111625188, -893730166, 1404277552, 615818150, -1160759803, -841546093, 1423857449, 601450431,
    -1285129682, -1000256840, 1567103746, 711928724, -1274298825, -1022587231, 1510334235, 755167117
]);
function getCRCTable() {
    return crcTable;
}
exports.getCRCTable = getCRCTable;
function crc32(src) {
    var table = crcTable;
    var u8a = new Uint8Array(src);
    var crc = 0 ^ (-1);
    for (var i = 0; i < u8a.length; i++) {
        crc = (crc >>> 8) ^ table[(crc ^ u8a[i]) & 0xFF];
    }
    return (crc ^ (-1)) >>> 0;
}
exports.crc32 = crc32;

},{}],3:[function(require,module,exports){
"use strict";
// this code is based on http://jsfiddle.net/gamealchemist/kpQyE/14/
// changes are:
//   added alpha-channel support
//   avoid "optimized too many times" in chrome
//   use web worker
//   convert to type script
var DownScaler = (function () {
    function DownScaler(src, scale) {
        this.src = src;
        this.scale = scale;
        this.dest = document.createElement('canvas');
    }
    Object.defineProperty(DownScaler.prototype, "destWidth", {
        get: function () { return 0 | Math.max(1, this.src.width * this.scale); },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DownScaler.prototype, "destHeight", {
        get: function () { return 0 | Math.max(1, this.src.height * this.scale); },
        enumerable: true,
        configurable: true
    });
    DownScaler.prototype.fast = function () {
        this.adjustSize();
        var ctx = this.dest.getContext('2d');
        if (!ctx) {
            throw new Error('cannot get CanvasRenderingContext2D from dest');
        }
        ctx.drawImage(this.src, 0, 0, this.src.width, this.src.height, 0, 0, Math.round(this.src.width * this.scale), Math.round(this.src.height * this.scale));
        return this.dest;
    };
    DownScaler.prototype.adjustSize = function () {
        var dw = this.destWidth;
        if (this.dest.width !== dw) {
            this.dest.width = dw;
        }
        var dh = this.destHeight;
        if (this.dest.height !== dh) {
            this.dest.height = dh;
        }
    };
    DownScaler.prototype.beautiful = function () {
        var srcCtx = this.src.getContext('2d');
        if (!srcCtx) {
            throw new Error('cannot get CanvasRenderingContext2D from src');
        }
        var srcImageData = srcCtx.getImageData(0, 0, this.src.width, this.src.height);
        var tmp = new Float32Array(this.destWidth * this.destHeight << 2);
        DownScaler.calculate(tmp, srcImageData.data, this.scale, this.src.width, this.src.height);
        this.adjustSize();
        var ctx = this.dest.getContext('2d');
        if (!ctx) {
            throw new Error('cannot get CanvasRenderingContext2D from dest');
        }
        var imgData = ctx.createImageData(this.destWidth, this.destHeight);
        DownScaler.float32ToUint8ClampedArray(imgData.data, tmp, this.destWidth, this.destHeight, imgData.width);
        ctx.putImageData(imgData, 0, 0);
        return this.dest;
    };
    DownScaler.prototype.beautifulWorker = function (callback) {
        var _this = this;
        var w = new Worker(DownScaler.createWorkerURL());
        DownScaler.activeWorker = w;
        w.onmessage = function (e) {
            _this.adjustSize();
            var ctx = _this.dest.getContext('2d');
            if (!ctx) {
                throw new Error('cannot get CanvasRenderingContext2D from dest');
            }
            var imgData = ctx.createImageData(_this.destWidth, _this.destHeight);
            DownScaler.copyBuffer(imgData.data, new Uint8Array(e.data.buffer), _this.destWidth, _this.destHeight, imgData.width);
            ctx.putImageData(imgData, 0, 0);
            callback(_this.dest);
        };
        var srcCtx = this.src.getContext('2d');
        if (!srcCtx) {
            throw new Error('cannot get CanvasRenderingContext2D from src');
        }
        var srcImageData = srcCtx.getImageData(0, 0, this.src.width, this.src.height);
        w.postMessage({
            src: srcImageData.data.buffer,
            srcWidth: this.src.width,
            srcHeight: this.src.height,
            scale: this.scale,
            destWidth: this.destWidth,
            destHeight: this.destHeight
        }, [srcImageData.data.buffer]);
    };
    DownScaler.copyBuffer = function (dest, src, srcWidth, srcHeight, destWidth) {
        srcWidth *= 4;
        destWidth *= 4;
        for (var x = void 0, y = 0, sl = 0, dl = 0; y < srcHeight; ++y) {
            sl = srcWidth * y;
            dl = destWidth * y;
            for (x = 0; x < srcWidth; x += 4) {
                dest[dl + x] = src[sl + x];
                dest[dl + x + 1] = src[sl + x + 1];
                dest[dl + x + 2] = src[sl + x + 2];
                dest[dl + x + 3] = src[sl + x + 3];
            }
        }
    };
    DownScaler.createWorkerURL = function () {
        if (DownScaler.workerURL) {
            return DownScaler.workerURL;
        }
        var sourceCode = "\n'use strict';\nvar calculate = " + DownScaler.calculate.toString() + ";\nvar float32ToUint8ClampedArray = " + DownScaler.float32ToUint8ClampedArray.toString() + ";\nonmessage = function(e) {\n    var d = e.data;\n    var tmp = new Float32Array(d.destWidth * d.destHeight << 2);\n    calculate(tmp, new Uint8Array(d.src), d.scale, d.srcWidth, d.srcHeight);\n    var dest = new Uint8ClampedArray(d.destWidth * d.destHeight << 2);\n    float32ToUint8ClampedArray(dest, tmp, d.destWidth, d.destHeight, d.destWidth);\n    postMessage({buffer: dest.buffer}, [dest.buffer]);\n};";
        DownScaler.workerURL = URL.createObjectURL(new Blob([sourceCode], { type: 'text/javascript' }));
        return DownScaler.workerURL;
    };
    DownScaler.revokeWorkerURL = function () {
        if (DownScaler.workerURL) {
            URL.revokeObjectURL(DownScaler.workerURL);
            DownScaler.workerURL = '';
        }
    };
    DownScaler.float32ToUint8ClampedArray = function (dest, src, srcWidth, srcHeight, destWidth) {
        srcWidth *= 4;
        destWidth *= 4;
        for (var ma = void 0, x = void 0, y = 0, sl = 0, dl = 0; y < srcHeight; ++y) {
            sl = srcWidth * y;
            dl = destWidth * y;
            for (x = 0; x < srcWidth; x += 4) {
                ma = 255 / src[sl + x + 3];
                dest[dl + x] = src[sl + x] * ma;
                dest[dl + x + 1] = src[sl + x + 1] * ma;
                dest[dl + x + 2] = src[sl + x + 2] * ma;
                dest[dl + x + 3] = src[sl + x + 3];
            }
        }
    };
    DownScaler.calculate = function (tbuf, sbuf, scale, sw, sh) {
        var tw = 0 | sw * scale;
        var sqScale = scale * scale; // square scale = area of source pixel within target
        var sx = 0, sy = 0, sIndex = 0; // source x,y, index within source array
        var tx = 0, ty = 0, yIndex = 0, tIndex = 0, tIndex2 = 0; // target x,y, x,y index within target array
        var tX = 0, tY = 0; // rounded tx, ty
        var w = 0, nw = 0, wx = 0, nwx = 0, wy = 0, nwy = 0; // weight / next weight x / y
        // weight is weight of current source point within target.
        // next weight is weight of current source point within next target's point.
        var crossX = false; // does scaled px cross its current px right border ?
        var crossY = false; // does scaled px cross its current px bottom border ?
        var sR = 0, sG = 0, sB = 0, sA = 0;
        for (sy = 0; sy < sh; sy++) {
            ty = sy * scale; // y src position within target
            tY = 0 | ty; // rounded : target pixel's y
            yIndex = (tY * tw) << 2; // line index within target array
            crossY = (tY !== (0 | ty + scale));
            if (crossY) {
                wy = (tY + 1 - ty); // weight of point within target pixel
                nwy = (ty + scale - tY - 1); // ... within y+1 target pixel
            }
            for (sx = 0; sx < sw; sx++, sIndex += 4) {
                tx = sx * scale; // x src position within target
                tX = 0 | tx; // rounded : target pixel's x
                tIndex = yIndex + (tX << 2); // target pixel index within target array
                crossX = (tX !== (0 | tx + scale));
                if (crossX) {
                    wx = (tX + 1 - tx); // weight of point within target pixel
                    nwx = (tx + scale - tX - 1); // ... within x+1 target pixel
                }
                sR = sbuf[sIndex]; // retrieving r,g,b for curr src px.
                sG = sbuf[sIndex + 1];
                sB = sbuf[sIndex + 2];
                sA = sbuf[sIndex + 3];
                if (sA === 0) {
                    continue;
                }
                if (sA < 255) {
                    // x * 32897 >> 23 == x / 255
                    sR = (sR * sA * 32897) >> 23;
                    sG = (sG * sA * 32897) >> 23;
                    sB = (sB * sA * 32897) >> 23;
                }
                if (!crossX && !crossY) {
                    // just add components weighted by squared scale.
                    tbuf[tIndex] += sR * sqScale;
                    tbuf[tIndex + 1] += sG * sqScale;
                    tbuf[tIndex + 2] += sB * sqScale;
                    tbuf[tIndex + 3] += sA * sqScale;
                }
                else if (crossX && !crossY) {
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
                }
                else if (crossY && !crossX) {
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
                }
                else {
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
    };
    return DownScaler;
}());
exports.DownScaler = DownScaler;

},{}],4:[function(require,module,exports){
"use strict";
var crc32 = require('./crc32');
(function (FaviewMode) {
    FaviewMode[FaviewMode["ShowLayerTree"] = 0] = "ShowLayerTree";
    FaviewMode[FaviewMode["ShowFaview"] = 1] = "ShowFaview";
    FaviewMode[FaviewMode["ShowFaviewAndReadme"] = 2] = "ShowFaviewAndReadme";
})(exports.FaviewMode || (exports.FaviewMode = {}));
var FaviewMode = exports.FaviewMode;
var JSONBuilder = (function () {
    function JSONBuilder(rootText) {
        this.json_ = [{
                id: 'root',
                text: rootText,
                type: 'root',
                state: {
                    opened: true
                },
                children: []
            }];
    }
    Object.defineProperty(JSONBuilder.prototype, "json", {
        get: function () { return this.json_; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(JSONBuilder.prototype, "root", {
        get: function () { return this.json_[0]; },
        enumerable: true,
        configurable: true
    });
    JSONBuilder.prototype.add = function (name, type, data) {
        var i, j, partName;
        var c = this.json_;
        var nameParts = name.split('/');
        nameParts.unshift(JSONBuilder.encodeName(this.root.text));
        for (i = 0; i < nameParts.length; ++i) {
            partName = JSONBuilder.decodeName(nameParts[i]);
            for (j = 0; j < c.length; ++j) {
                if (c[j].text === partName) {
                    c = c[j].children;
                    j = -1;
                    break;
                }
            }
            if (j !== c.length) {
                continue;
            }
            if (i !== nameParts.length - 1) {
                c.push(JSONBuilder.createNode(partName, 'folder'));
                c = c[c.length - 1].children;
                continue;
            }
            c.push(JSONBuilder.createNode(partName, type, data));
        }
    };
    JSONBuilder.createNode = function (text, type, data) {
        switch (type) {
            case 'item':
                return {
                    text: text,
                    type: type,
                    data: {
                        value: data
                    },
                    children: []
                };
            case 'folder':
                return {
                    text: text,
                    type: type,
                    state: {
                        opened: true
                    },
                    children: []
                };
            case 'filter':
                return {
                    text: text,
                    type: type,
                    data: {
                        value: data
                    },
                    state: {
                        opened: true
                    },
                    children: []
                };
        }
        throw new Error('unknown node type: ' + type);
    };
    JSONBuilder.encodeName = function (s) {
        return s.replace(/[\x00-\x1f\x22\x25\x27\x2f\x5c\x7e\x7f]/g, function (m) {
            return '%' + ('0' + m[0].charCodeAt(0).toString(16)).slice(-2);
        });
    };
    JSONBuilder.decodeName = function (s) {
        return decodeURIComponent(s);
    };
    return JSONBuilder;
}());
function stringToArrayBuffer(s, complete) {
    var fr = new FileReader();
    fr.onload = function (e) { return complete(fr.result); };
    fr.readAsArrayBuffer(new Blob([s]));
}
// https://gist.github.com/boushley/5471599
function arrayBufferToString(ab) {
    var data = new Uint8Array(ab);
    // If we have a BOM skip it
    var s = '', i = 0, c = 0, c2 = 0, c3 = 0;
    if (data.length >= 3 && data[0] === 0xef && data[1] === 0xbb && data[2] === 0xbf) {
        i = 3;
    }
    while (i < data.length) {
        c = data[i];
        if (c < 128) {
            s += String.fromCharCode(c);
            i++;
        }
        else if (c > 191 && c < 224) {
            if (i + 1 >= data.length) {
                throw 'UTF-8 Decode failed. Two byte character was truncated.';
            }
            c2 = data[i + 1];
            s += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
            i += 2;
        }
        else {
            if (i + 2 >= data.length) {
                throw 'UTF-8 Decode failed. Multi byte character was truncated.';
            }
            c2 = data[i + 1];
            c3 = data[i + 2];
            s += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
            i += 3;
        }
    }
    return s;
}
var Favorite = (function () {
    function Favorite(element, defaultRootName, loaded) {
        this.defaultRootName = defaultRootName;
        this.psdHash = '';
        this.faviewMode = 1 /* ShowFaview */;
        this.uniqueId = Date.now().toString() + Math.random().toString().substring(2);
        this.changedTimer = 0;
        this.tree = element;
        this.jq = jQuery(this.tree);
        this.initTree(loaded);
    }
    Object.defineProperty(Favorite.prototype, "rootName", {
        get: function () {
            var root = this.jst.get_node('root');
            if (root && root.text) {
                return root.text;
            }
            return this.defaultRootName;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Favorite.prototype, "json", {
        get: function () {
            return this.jst.get_json();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Favorite.prototype, "pfv", {
        get: function () {
            var _this = this;
            var json = this.json;
            if (json.length !== 1) {
                throw new Error('sorry but favorite tree data is broken');
            }
            var path = [];
            var lines = ['[PSDToolFavorites-v1]'];
            var r = function (children) {
                for (var _i = 0, children_1 = children; _i < children_1.length; _i++) {
                    var item = children_1[_i];
                    path.push(JSONBuilder.encodeName(item.text));
                    switch (item.type) {
                        case 'root':
                            lines.push('root-name/' + path[0]);
                            lines.push('faview-mode/' + _this.faviewMode.toString());
                            lines.push('');
                            path.pop();
                            r(item.children);
                            path.push('');
                            break;
                        case 'folder':
                            if (item.children.length) {
                                r(item.children);
                            }
                            else {
                                lines.push('//' + path.join('/') + '~folder');
                                lines.push('');
                            }
                            break;
                        case 'filter':
                            lines.push('//' + path.join('/') + '~filter');
                            lines.push(item.data.value);
                            lines.push('');
                            r(item.children);
                            break;
                        case 'item':
                            lines.push('//' + path.join('/'));
                            lines.push(item.data.value);
                            lines.push('');
                            break;
                    }
                    path.pop();
                }
            };
            r(json);
            return lines.join('\n');
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Favorite.prototype, "renameNodes", {
        get: function () {
            var nodes = [];
            var r = function (n, rn) {
                for (var _i = 0, n_1 = n; _i < n_1.length; _i++) {
                    var cn = n_1[_i];
                    rn.push({
                        id: cn.id,
                        text: cn.text,
                        originalText: cn.text,
                        children: []
                    });
                    r(cn.children, rn[rn.length - 1].children);
                }
            };
            r(this.json, nodes);
            return nodes;
        },
        enumerable: true,
        configurable: true
    });
    Favorite.prototype.bulkRename = function (nodes) {
        var _this = this;
        var r = function (n, reserve) {
            for (var _i = 0, n_2 = n; _i < n_2.length; _i++) {
                var cn = n_2[_i];
                if (cn.originalText !== cn.text) {
                    _this.jst.rename_node(cn.id, reserve ? '_' : cn.text);
                }
                r(cn.children, reserve);
            }
        };
        r(nodes, true);
        r(nodes, false);
    };
    Favorite.prototype.jstCheck = function (op, node, parent) {
        switch (op) {
            case 'create_node':
                return node.type !== 'root';
            case 'rename_node':
                return true;
            case 'delete_node':
                return node.type !== 'root';
            case 'move_node':
                return node.type !== 'root' && parent.id !== '#' && parent.type !== 'item';
            case 'copy_node':
                return node.type !== 'root' && parent.id !== '#' && parent.type !== 'item';
        }
    };
    Favorite.prototype.clearSelection = function () {
        if (this.jst.get_top_selected().length === 0) {
            return;
        }
        this.jst.deselect_all();
        if (this.onClearSelection) {
            this.onClearSelection();
        }
    };
    Favorite.prototype.get = function (id) {
        return this.jst.get_node(id);
    };
    Favorite.prototype.edit = function (id) {
        var target = id;
        if (id === undefined) {
            target = this.jst.get_top_selected();
        }
        this.jst.edit(target);
    };
    Favorite.prototype.update = function (n) {
        var target;
        if ('id' in n) {
            target = this.jst.get_node(n.id);
        }
        else {
            var selected = this.jst.get_top_selected();
            if (!selected.length) {
                return;
            }
            target = selected[0];
        }
        if ('type' in n) {
            this.jst.set_type(target, n.type);
        }
        if ('data' in n) {
            target.data = n.data;
        }
    };
    Favorite.prototype.getFirstFilter = function (n) {
        for (var _i = 0, _a = this.getParents(n, 'filter'); _i < _a.length; _i++) {
            var p = _a[_i];
            return p.data.value;
        }
        return '';
    };
    Favorite.prototype.getAncestorFilters = function (n) {
        var r = [];
        for (var _i = 0, _a = this.getParents(n, 'filter'); _i < _a.length; _i++) {
            var p = _a[_i];
            r.push(p.data.value);
        }
        return r;
    };
    Favorite.prototype.getParents = function (n, typeFilter) {
        var parents = [];
        for (var p = this.jst.get_node(n.parent); p; p = this.jst.get_node(p.parent)) {
            if (typeFilter === undefined || typeFilter === p.type) {
                parents.push(p);
            }
        }
        return parents;
    };
    Favorite.prototype.remove = function (id) {
        var target = id;
        if (id === undefined) {
            target = this.jst.get_top_selected();
        }
        this.clearSelection();
        try {
            this.jst.delete_node(target);
        }
        catch (e) {
            // workaround that an error happens when deletes node during editing.
            this.jst.delete_node(this.jst.create_node(null, 'dummy', 'last'));
            this.jst.deselect_all();
        }
    };
    Favorite.prototype.addNode = function (type, edit, text, data) {
        var obj;
        switch (type) {
            case 'item':
                if (text === undefined || text === '') {
                    text = 'New Item';
                }
                obj = {
                    text: text,
                    type: type,
                    data: {
                        value: data
                    },
                    children: []
                };
                break;
            case 'folder':
                if (text === undefined || text === '') {
                    text = 'New Folder';
                }
                obj = {
                    text: text,
                    type: type,
                    children: []
                };
                break;
            case 'filter':
                if (text === undefined || text === '') {
                    text = 'New Filter';
                }
                obj = {
                    text: text,
                    type: type,
                    children: []
                };
                break;
            default:
                throw new Error('unsupported object type: ' + type);
        }
        // create node
        var selectedList = this.jst.get_top_selected(true);
        if (selectedList.length === 0) {
            return this.jst.create_node('root', obj, 'last');
        }
        var selected = selectedList[0];
        if (selected.type !== 'item') {
            var n = this.jst.create_node(selected, obj, 'last');
            if (!selected.state.opened) {
                this.jst.open_node(selected, null);
            }
            return n;
        }
        var parent = this.jst.get_node(selected.parent);
        var idx = parent.children.indexOf(selected.id);
        return this.jst.create_node(parent, obj, idx !== -1 ? idx + 1 : 'last');
    };
    Favorite.prototype.add = function (type, edit, text, data) {
        var id = this.addNode(type, edit, text, data);
        this.clearSelection();
        this.jst.select_node(id, true);
        if (edit) {
            this.jst.edit(id);
        }
        return id;
    };
    Favorite.prototype.addFolders = function (names) {
        var ids = [];
        for (var _i = 0, names_1 = names; _i < names_1.length; _i++) {
            var name_1 = names_1[_i];
            ids.push(this.addNode('folder', false, name_1));
        }
        this.clearSelection();
        for (var _a = 0, ids_1 = ids; _a < ids_1.length; _a++) {
            var id = ids_1[_a];
            this.jst.select_node(id, true);
        }
        return ids;
    };
    Favorite.prototype.jstChanged = function () {
        var _this = this;
        if (this.changedTimer) {
            clearTimeout(this.changedTimer);
        }
        this.changedTimer = setTimeout(function () {
            _this.changedTimer = 0;
            if (_this.onModified) {
                _this.onModified();
            }
            _this.updateLocalStorage();
        }, 32);
    };
    Favorite.prototype.jstSelectionChanged = function () {
        var selectedList = this.jst.get_top_selected(true);
        if (selectedList.length === 0) {
            return;
        }
        var selected = selectedList[0];
        if (selected.type !== 'item') {
            if (this.onClearSelection) {
                this.onClearSelection();
            }
            return;
        }
        try {
            if (this.onSelect) {
                this.onSelect(selected);
            }
        }
        catch (e) {
            console.error(e);
            alert(e);
        }
    };
    Favorite.prototype.jstCopyNode = function (e, data) {
        var _this = this;
        var process = function (node, original) {
            var text = _this.suggestUniqueName(node);
            if (node.text !== text) {
                _this.jst.rename_node(node, text);
            }
            switch (node.type) {
                case 'item':
                    node.data = { value: original.data.value };
                    break;
                case 'folder':
                    for (var i = 0; i < node.children.length; ++i) {
                        process(_this.jst.get_node(node.children[i]), _this.jst.get_node(original.children[i]));
                    }
                    break;
                case 'filter':
                    node.data = { value: original.data.value };
                    for (var i = 0; i < node.children.length; ++i) {
                        process(_this.jst.get_node(node.children[i]), _this.jst.get_node(original.children[i]));
                    }
                    break;
            }
        };
        process(data.node, data.original);
    };
    Favorite.prototype.jstMoveNode = function (e, data) {
        var text = this.suggestUniqueName(data.node, data.text);
        if (data.text !== text) {
            this.jst.rename_node(data.node, text);
        }
    };
    Favorite.prototype.jstCreateNode = function (e, data) {
        var text = this.suggestUniqueName(data.node);
        if (data.node.text !== text) {
            this.jst.rename_node(data.node, text);
        }
    };
    Favorite.prototype.jstRenameNode = function (e, data) {
        var text = this.suggestUniqueName(data.node, data.text);
        if (data.text !== text) {
            this.jst.rename_node(data.node, text);
        }
    };
    Favorite.prototype.jstDoubleClick = function (e) {
        var selected = this.jst.get_node(e.target);
        switch (selected.type) {
            case 'item':
            case 'folder':
            case 'filter':
                if (this.onDoubleClick) {
                    this.onDoubleClick(selected);
                }
                break;
            default:
                this.jst.toggle_node(selected);
                break;
        }
    };
    Favorite.prototype.suggestUniqueName = function (node, newText) {
        var n = this.jst.get_node(node);
        var parent = this.jst.get_node(n.parent);
        var nameMap = {};
        for (var _i = 0, _a = parent.children; _i < _a.length; _i++) {
            var pc = _a[_i];
            if (pc === n.id) {
                continue;
            }
            nameMap[this.jst.get_text(pc)] = true;
        }
        if (newText === undefined) {
            newText = n.text;
        }
        if (!(newText in nameMap)) {
            return newText;
        }
        newText += ' ';
        var i = 2;
        while ((newText + i) in nameMap) {
            ++i;
        }
        return newText + i;
    };
    Favorite.prototype.initTree = function (loaded, data) {
        var _this = this;
        this.jq.jstree('destroy');
        this.jq.jstree({
            core: {
                animation: false,
                check_callback: this.jstCheck,
                dblclick_toggle: false,
                themes: {
                    dots: false
                },
                data: data ? data : new JSONBuilder(this.defaultRootName).json
            },
            types: {
                root: {
                    icon: false,
                },
                item: {
                    icon: 'glyphicon glyphicon-picture'
                },
                folder: {
                    icon: 'glyphicon glyphicon-folder-open'
                },
                filter: {
                    icon: 'glyphicon glyphicon-filter'
                }
            },
            plugins: ['types', 'dnd', 'wholerow'],
        });
        this.jst = this.jq.jstree();
        this.jq.on('changed.jstree', function (e) { return _this.jstSelectionChanged(); });
        this.jq.on([
            'set_text.jstree',
            'create_node.jstree',
            'rename_node.jstree',
            'delete_node.jstree',
            'move_node.jstree',
            'copy_node.jstree',
            'cut.jstree',
            'paste.jstree'
        ].join(' '), function (e) { return _this.jstChanged(); });
        this.jq.on('copy_node.jstree', function (e, data) { return _this.jstCopyNode(e, data); });
        this.jq.on('move_node.jstree', function (e, data) { return _this.jstMoveNode(e, data); });
        this.jq.on('create_node.jstree', function (e, data) { return _this.jstCreateNode(e, data); });
        this.jq.on('rename_node.jstree', function (e, data) { return _this.jstRenameNode(e, data); });
        this.jq.on('dblclick.jstree', function (e) { return _this.jstDoubleClick(e); });
        this.jq.on('ready.jstree', function (e) {
            if (loaded) {
                loaded();
            }
        });
    };
    Favorite.prototype.updateLocalStorage = function () {
        var _this = this;
        var pfv = this.pfv;
        stringToArrayBuffer(pfv, function (ab) {
            var pfvs = _this.getPFVListFromLocalStorage();
            var found = false;
            var newUniqueId = 'pfv' + crc32.crc32(ab).toString(16);
            for (var i = 0; i < pfvs.length; ++i) {
                if (pfvs[i].id === _this.uniqueId && pfvs[i].hash === _this.psdHash) {
                    pfvs.splice(i, 1);
                    found = true;
                    continue;
                }
                if (pfvs[i].id === newUniqueId && pfvs[i].hash === _this.psdHash) {
                    pfvs.splice(i, 1);
                }
            }
            if (!found && countEntries(pfv) === 0) {
                return;
            }
            _this.uniqueId = newUniqueId;
            pfvs.push({
                id: _this.uniqueId,
                time: new Date().getTime(),
                hash: _this.psdHash,
                data: pfv
            });
            while (pfvs.length > 8) {
                pfvs.shift();
            }
            localStorage['psdtool_pfv'] = JSON.stringify(pfvs);
        });
    };
    Favorite.prototype.getPFVListFromLocalStorage = function () {
        if (!('psdtool_pfv' in localStorage)) {
            return [];
        }
        return JSON.parse(localStorage['psdtool_pfv']);
    };
    Favorite.prototype.getPFVFromLocalStorage = function (hash) {
        var pfvs = this.getPFVListFromLocalStorage();
        if (!pfvs.length) {
            return null;
        }
        for (var i = pfvs.length - 1; i >= 0; --i) {
            if (pfvs[i].hash === hash) {
                return pfvs[i];
            }
        }
    };
    Favorite.prototype.loadFromArrayBuffer = function (ab) {
        return this.loadFromString(arrayBufferToString(ab), 'pfv' + crc32.crc32(ab).toString(16));
    };
    Favorite.prototype.loadFromString = function (s, uniqueId) {
        var _this = this;
        var load = function (id) {
            var r = _this.stringToNodeTree(s);
            _this.initTree(function () {
                _this.uniqueId = id;
                _this.faviewMode = r.faviewMode;
                if (_this.onLoaded) {
                    _this.onLoaded();
                }
            }, r.root);
        };
        if (uniqueId !== undefined) {
            load(uniqueId);
        }
        else {
            stringToArrayBuffer(s, function (ab) {
                load('pfv' + crc32.crc32(ab).toString(16));
            });
        }
        return true;
    };
    Favorite.prototype.stringToNodeTree = function (s) {
        var lines = s.replace(/\r/g, '').split('\n');
        if (lines.shift() !== '[PSDToolFavorites-v1]') {
            throw new Error('given PFV file does not have a valid header');
        }
        var jb = new JSONBuilder(this.defaultRootName);
        var setting = {
            'root-name': this.defaultRootName,
            'faview-mode': 2 /* ShowFaviewAndReadme */ .toString(),
        };
        var name, type, data = [], first = true, value;
        for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
            var line = lines_1[_i];
            if (line === '') {
                continue;
            }
            if (line.length > 2 && line.substring(0, 2) === '//') {
                if (first) {
                    jb.root.text = setting['root-name'];
                    first = false;
                }
                else {
                    jb.add(name, type, data.join('\n'));
                }
                name = line.substring(2);
                if (name.indexOf('~') !== -1) {
                    data = name.split('~');
                    name = data[0];
                    type = data[1];
                }
                else {
                    type = 'item';
                }
                data = [];
                continue;
            }
            if (first) {
                name = line.substring(0, line.indexOf('/'));
                value = JSONBuilder.decodeName(line.substring(name.length + 1));
                if (value) {
                    setting[name] = value;
                }
            }
            else {
                data.push(line);
            }
        }
        if (first) {
            jb.root.text = setting['root-name'];
        }
        else {
            jb.add(name, type, data.join('\n'));
        }
        var faviewMode;
        var n = parseInt(setting['faview-mode'], 10);
        switch (n) {
            case 0 /* ShowLayerTree */:
            case 1 /* ShowFaview */:
            case 2 /* ShowFaviewAndReadme */:
                faviewMode = n;
                break;
            default:
                faviewMode = 2 /* ShowFaviewAndReadme */;
                break;
        }
        return {
            root: jb.json,
            faviewMode: faviewMode
        };
    };
    return Favorite;
}());
exports.Favorite = Favorite;
function countEntries(pfv) {
    var c = 0;
    var lines = pfv.replace(/\r/g, '').split('\n');
    lines.shift();
    for (var _i = 0, lines_2 = lines; _i < lines_2.length; _i++) {
        var line = lines_2[_i];
        if (line.length > 2 && line.substring(0, 2) === '//') {
            ++c;
        }
    }
    return c;
}
exports.countEntries = countEntries;
var Faview = (function () {
    function Faview(favorite, rootSel, root) {
        var _this = this;
        this.favorite = favorite;
        this.rootSel = rootSel;
        this.root = root;
        this.closed_ = true;
        this.treeRoots = [];
        root.addEventListener('click', function (e) { return _this.click(e); }, false);
        root.addEventListener('change', function (e) { return _this.change(e); }, false);
        root.addEventListener('input', function (e) { return _this.input(e); }, false);
        root.addEventListener('keyup', function (e) { return _this.keyup(e); }, false);
        rootSel.addEventListener('change', function (e) { return _this.change(e); }, false);
        rootSel.addEventListener('keyup', function (e) { return _this.keyup(e); }, false);
    }
    Object.defineProperty(Faview.prototype, "roots", {
        get: function () {
            return this.treeRoots.length;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Faview.prototype, "selectedRootIndex", {
        get: function () {
            return this.rootSel.selectedIndex;
        },
        set: function (n) {
            this.rootSel.selectedIndex = n;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Faview.prototype, "items", {
        get: function () {
            var r = [];
            for (var i = 0; i < this.rootSel.length; ++i) {
                var fsels = [];
                var selects = this.treeRoots[i].getElementsByTagName('select');
                for (var j = 0; j < selects.length; ++j) {
                    var sel = selects[j];
                    if (sel instanceof HTMLSelectElement) {
                        var fsel = {
                            caption: sel.getAttribute('data-caption'),
                            items: [],
                            selectedIndex: sel.selectedIndex
                        };
                        for (var k = 0; k < sel.length; ++k) {
                            var opt_1 = sel.options[k];
                            fsel.items.push({
                                name: opt_1.textContent,
                                value: opt_1.value
                            });
                        }
                        fsels.push(fsel);
                    }
                }
                var opt = this.rootSel.options[i];
                r.push({
                    name: opt.textContent,
                    value: opt.value,
                    selects: fsels
                });
            }
            return r;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Faview.prototype, "closed", {
        get: function () {
            return this.closed_;
        },
        enumerable: true,
        configurable: true
    });
    Faview.prototype.serialize = function () {
        var result = {
            rootSelectedValue: this.rootSel.value,
            items: {}
        };
        for (var i = 0; i < this.treeRoots.length; ++i) {
            var item = {};
            var selects = this.treeRoots[i].getElementsByTagName('select');
            for (var i_1 = 0; i_1 < selects.length; ++i_1) {
                item[selects[i_1].getAttribute('data-id')] = {
                    value: selects[i_1].value,
                    lastMod: parseInt(selects[i_1].getAttribute('data-lastmod'), 10)
                };
            }
            var opt = this.rootSel.options[i];
            if (opt instanceof HTMLOptionElement) {
                result.items[opt.value] = item;
            }
        }
        return result;
    };
    Faview.prototype.deserialize = function (state) {
        for (var i = 0; i < this.rootSel.length; ++i) {
            var opt = this.rootSel.options[i];
            if (opt instanceof HTMLOptionElement && opt.value in state.items) {
                var item = state.items[opt.value];
                var elems = this.treeRoots[i].getElementsByTagName('select');
                for (var i_2 = 0; i_2 < elems.length; ++i_2) {
                    var elem = elems[i_2];
                    if (elem instanceof HTMLSelectElement) {
                        var id = elem.getAttribute('data-id');
                        if (!(id in item)) {
                            continue;
                        }
                        for (var j = 0; j < elem.length; ++j) {
                            var opt_2 = elem.options[j];
                            if (opt_2 instanceof HTMLOptionElement && opt_2.value === item[id].value) {
                                elem.selectedIndex = j;
                                elem.setAttribute('data-lastmod', item[id].lastMod.toString());
                                var range = elem.parentElement.querySelector('input[type=range]');
                                if (range instanceof HTMLInputElement) {
                                    range.value = j.toString();
                                }
                                break;
                            }
                        }
                    }
                }
                if (state.rootSelectedValue === opt.value) {
                    this.rootSel.selectedIndex = i;
                }
            }
        }
    };
    Faview.prototype.rootChanged = function () {
        for (var i = 0; i < this.treeRoots.length; ++i) {
            if (this.rootSel.selectedIndex !== i) {
                this.treeRoots[i].style.display = 'none';
                continue;
            }
            this.treeRoots[i].style.display = 'block';
        }
        if (this.onRootChanged) {
            this.onRootChanged();
        }
    };
    Faview.prototype.changed = function (select) {
        select.setAttribute('data-lastmod', Date.now().toString());
        var range = select.parentElement.querySelector('input[type=range]');
        if (range instanceof HTMLInputElement) {
            range.value = select.selectedIndex.toString();
        }
        if (this.onChange) {
            this.onChange(this.favorite.get(select.value));
        }
    };
    Faview.prototype.keyup = function (e) {
        var target = e.target;
        if (target instanceof HTMLSelectElement) {
            // it is a workaround for Firefox that does not fire change event by keyboard input
            target.blur();
            target.focus();
        }
    };
    Faview.prototype.change = function (e) {
        var target = e.target;
        if (target instanceof HTMLSelectElement) {
            if (target === this.rootSel) {
                this.rootChanged();
                return;
            }
            this.changed(target);
        }
        else if (target instanceof HTMLInputElement && target.type === 'range') {
            var sel = target.parentElement.querySelector('select');
            if (sel instanceof HTMLSelectElement) {
                sel.selectedIndex = parseInt(target.value, 10);
                this.changed(sel);
            }
        }
    };
    Faview.prototype.input = function (e) {
        var target = e.target;
        if (target instanceof HTMLInputElement && target.type === 'range') {
            var sel = target.parentElement.querySelector('select');
            if (sel instanceof HTMLSelectElement) {
                sel.selectedIndex = parseInt(target.value, 10);
                this.changed(sel);
            }
        }
    };
    Faview.prototype.click = function (e) {
        var target = e.target;
        if (target instanceof HTMLButtonElement) {
            var mv = 0;
            if (target.classList.contains('psdtool-faview-prev')) {
                mv = -1;
            }
            else if (target.classList.contains('psdtool-faview-next')) {
                mv = 1;
            }
            if (mv === 0) {
                return;
            }
            var sel = target.parentElement.querySelector('select');
            if (sel instanceof HTMLSelectElement) {
                sel.selectedIndex = (sel.length + sel.selectedIndex + mv) % sel.length;
                sel.focus();
                this.changed(sel);
            }
        }
    };
    Faview.prototype.addNode = function (n, ul) {
        var caption = n.text.replace(/^\*/, '');
        var li = document.createElement('li');
        var span = document.createElement('span');
        span.className = 'glyphicon glyphicon-asterisk';
        li.appendChild(span);
        li.appendChild(document.createTextNode(' ' + caption));
        ul.appendChild(li);
        var sel = document.createElement('select');
        sel.className = 'form-control psdtool-faview-select';
        sel.setAttribute('data-id', n.id);
        sel.setAttribute('data-caption', caption);
        var cul = document.createElement('ul');
        var opt;
        var firstItemId;
        var numItems = 0, numChild = 0;
        for (var _i = 0, _a = n.children; _i < _a.length; _i++) {
            var cn = _a[_i];
            if (typeof cn !== 'string') {
                switch (cn.type) {
                    case 'item':
                        opt = document.createElement('option');
                        opt.textContent = cn.text;
                        opt.value = cn.id;
                        if (++numItems === 1) {
                            firstItemId = cn.id;
                        }
                        sel.appendChild(opt);
                        break;
                    case 'folder':
                    case 'filter':
                        this.addNode(cn, cul);
                        ++numChild;
                        break;
                }
            }
        }
        // show filtered entry only
        if (numItems > 0 && this.favorite.getFirstFilter(this.favorite.get(firstItemId)) !== '') {
            var range = document.createElement('input');
            range.type = 'range';
            range.max = (numItems - 1).toString();
            range.value = '0';
            var prev = document.createElement('button');
            prev.className = 'btn btn-default psdtool-faview-prev';
            prev.innerHTML = '&lt;';
            prev.tabIndex = -1;
            var next = document.createElement('button');
            next.className = 'btn btn-default psdtool-faview-next';
            next.innerHTML = '&gt;';
            next.tabIndex = -1;
            var fs = document.createElement('div');
            fs.className = 'psdtool-faview-select-container';
            if (numItems === 1) {
                prev.disabled = true;
                sel.disabled = true;
                range.disabled = true;
                next.disabled = true;
            }
            fs.appendChild(prev);
            fs.appendChild(sel);
            fs.appendChild(range);
            fs.appendChild(next);
            li.appendChild(fs);
        }
        if (numChild > 0) {
            li.appendChild(cul);
        }
    };
    Faview.prototype.addRoot = function (nodes) {
        var opt;
        for (var _i = 0, nodes_1 = nodes; _i < nodes_1.length; _i++) {
            var n = nodes_1[_i];
            if (n.text.length > 1 && n.text.charAt(0) === '*') {
                opt = document.createElement('option');
                opt.value = n.id;
                opt.textContent = n.text.substring(1);
                this.rootSel.appendChild(opt);
                var ul = document.createElement('ul');
                for (var _a = 0, _b = n.children; _a < _b.length; _a++) {
                    var cn = _b[_a];
                    if (typeof cn !== 'string') {
                        switch (cn.type) {
                            case 'folder':
                            case 'filter':
                                this.addNode(cn, ul);
                        }
                    }
                }
                var li = document.createElement('li');
                li.style.display = 'none';
                li.appendChild(ul);
                this.treeRoots.push(li);
                this.root.appendChild(li);
                var selects = li.getElementsByTagName('select');
                for (var i = 0; i < selects.length; ++i) {
                    selects[i].setAttribute('data-lastmod', (selects.length - i).toString());
                }
            }
            this.addRoot(n.children);
        }
    };
    Faview.prototype.start = function (state) {
        this.treeRoots = [];
        this.rootSel.innerHTML = '';
        this.root.innerHTML = '';
        this.addRoot(this.favorite.json);
        if (state !== undefined) {
            this.deserialize(state);
        }
        if (this.roots > 0) {
            this.rootChanged();
        }
        this.closed_ = false;
    };
    Faview.prototype.refresh = function () {
        this.start(this.serialize());
    };
    Faview.prototype.getActive = function () {
        var selects = this.treeRoots[this.rootSel.selectedIndex].getElementsByTagName('select');
        var items = [];
        for (var i = 0; i < selects.length; ++i) {
            items.push({
                n: this.favorite.get(selects[i].value),
                lastMod: parseInt(selects[i].getAttribute('data-lastmod'), 10)
            });
        }
        items.sort(function (a, b) { return a.lastMod === b.lastMod ? 0
            : a.lastMod < b.lastMod ? -1 : 1; });
        var nodes = [];
        for (var _i = 0, items_1 = items; _i < items_1.length; _i++) {
            var i = items_1[_i];
            nodes.push(i.n);
        }
        return nodes;
    };
    Faview.prototype.close = function () {
        this.treeRoots = [];
        this.rootSel.innerHTML = '';
        this.root.innerHTML = '';
        this.closed_ = true;
    };
    return Faview;
}());
exports.Faview = Faview;

},{"./crc32":2}],5:[function(require,module,exports){
"use strict";
(function (FlipType) {
    FlipType[FlipType["NoFlip"] = 0] = "NoFlip";
    FlipType[FlipType["FlipX"] = 1] = "FlipX";
    FlipType[FlipType["FlipY"] = 2] = "FlipY";
    FlipType[FlipType["FlipXY"] = 3] = "FlipXY";
})(exports.FlipType || (exports.FlipType = {}));
var FlipType = exports.FlipType;
var Node = (function () {
    function Node(input, displayName_, name_, currentPath, indexInSameName, parent) {
        this.input = input;
        this.displayName_ = displayName_;
        this.name_ = name_;
        this.parent = parent;
        this.children = [];
        this.internalName_ = Node.encodeLayerName(this.name, indexInSameName);
        if (currentPath.length) {
            this.fullPath_ = currentPath.join('/') + '/' + this.internalName_;
        }
        else {
            this.fullPath_ = this.internalName_;
        }
    }
    Object.defineProperty(Node.prototype, "checked", {
        get: function () { return this.input.checked; },
        set: function (v) { this.input.checked = v; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Node.prototype, "disabled", {
        get: function () { return this.input.disabled; },
        set: function (v) { this.input.disabled = v; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Node.prototype, "name", {
        get: function () { return this.name_; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Node.prototype, "displayName", {
        get: function () { return this.displayName_.data; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Node.prototype, "internalName", {
        get: function () { return this.internalName_; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Node.prototype, "fullPath", {
        get: function () { return this.fullPath_; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Node.prototype, "isRoot", {
        get: function () { return !this.input; },
        enumerable: true,
        configurable: true
    });
    Node.encodeLayerName = function (s, index) {
        return s.replace(/[\x00-\x1f\x22\x25\x27\x2f\x5c\x7e\x7f]/g, function (m) {
            return '%' + ('0' + m[0].charCodeAt(0).toString(16)).slice(-2);
        }) + (index === 0 ? '' : '\\' + index.toString());
    };
    return Node;
}());
exports.Node = Node;
var LayerTree = (function () {
    function LayerTree(disableExtendedFeature, treeRoot, psdRoot) {
        var _this = this;
        this.disableExtendedFeature = disableExtendedFeature;
        this.treeRoot = treeRoot;
        this.root = new Node(null, null, '', [], 0, null);
        this.nodes = {};
        this.flipX = [];
        this.flipY = [];
        this.flipXY = [];
        this.flip_ = 0 /* NoFlip */;
        var path = [];
        var r = function (ul, n, l, parentSeqID) {
            var indexes = {};
            var founds = {};
            for (var _i = 0, l_1 = l; _i < l_1.length; _i++) {
                var ll = l_1[_i];
                if (ll.Name in founds) {
                    indexes[ll.SeqID] = ++founds[ll.Name];
                }
                else {
                    indexes[ll.SeqID] = founds[ll.Name] = 0;
                }
            }
            for (var i = l.length - 1; i >= 0; --i) {
                var elems = _this.createElements(l[i], parentSeqID);
                var cn = new Node(elems.input, elems.text, l[i].Name, path, indexes[l[i].SeqID], n);
                n.children.push(cn);
                _this.nodes[l[i].SeqID] = cn;
                var cul = document.createElement('ul');
                path.push(cn.internalName);
                r(cul, cn, l[i].Children, l[i].SeqID);
                path.pop();
                cn.li = document.createElement('li');
                if (l[i].Folder) {
                    cn.li.classList.add('psdtool-folder');
                }
                cn.li.appendChild(elems.div);
                cn.li.appendChild(cul);
                ul.appendChild(cn.li);
            }
        };
        r(treeRoot, this.root, psdRoot.Children, -1);
        this.registerClippingGroup(psdRoot.Children);
        if (!this.disableExtendedFeature) {
            this.registerFlippingGroup();
        }
        this.normalize();
        this.flip = this.flip;
    }
    Object.defineProperty(LayerTree.prototype, "text", {
        get: function () {
            var text = [];
            var tab = [];
            var r = function (n) {
                for (var _i = 0, _a = n.children; _i < _a.length; _i++) {
                    var cn = _a[_i];
                    text.push(tab.join('') + cn.name);
                    tab.push('\t');
                    r(cn);
                    tab.pop();
                }
            };
            r(this.root);
            return text.join('\n');
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(LayerTree.prototype, "flip", {
        get: function () { return this.flip_; },
        set: function (v) {
            this.flip_ = v;
            this.treeRoot.classList.remove('psdtool-flip-x', 'psdtool-flip-y', 'psdtool-flip-xy');
            switch (v) {
                case 0 /* NoFlip */:
                    this.doFlip(this.flipX, false);
                    this.doFlip(this.flipY, false);
                    this.doFlip(this.flipXY, false);
                    break;
                case 1 /* FlipX */:
                    this.doFlip(this.flipY, false);
                    this.doFlip(this.flipXY, false);
                    this.doFlip(this.flipX, true);
                    this.treeRoot.classList.add('psdtool-flip-x');
                    break;
                case 2 /* FlipY */:
                    this.doFlip(this.flipXY, false);
                    this.doFlip(this.flipX, false);
                    this.doFlip(this.flipY, true);
                    this.treeRoot.classList.add('psdtool-flip-y');
                    break;
                case 3 /* FlipXY */:
                    this.doFlip(this.flipX, false);
                    this.doFlip(this.flipY, false);
                    this.doFlip(this.flipXY, true);
                    this.treeRoot.classList.add('psdtool-flip-xy');
                    break;
            }
        },
        enumerable: true,
        configurable: true
    });
    LayerTree.prototype.flipSerialize = function (root) {
        var r = function (n, dn) {
            var cdn;
            for (var _i = 0, _a = n.children; _i < _a.length; _i++) {
                var cn = _a[_i];
                dn.children[cn.internalName] = cdn = {
                    checked: cn.checked,
                    children: {}
                };
                r(cn, cdn);
            }
        };
        var result = {
            checked: root.checked,
            children: {},
        };
        r(root, result);
        return result;
    };
    LayerTree.prototype.flipDeserialize = function (root, state) {
        var r = function (n, dn) {
            var cdn;
            for (var _i = 0, _a = n.children; _i < _a.length; _i++) {
                var cn = _a[_i];
                if (!(cn.internalName in dn.children)) {
                    continue;
                }
                cdn = dn.children[cn.internalName];
                cn.checked = cdn.checked;
                r(cn, cdn);
            }
        };
        r(root, state);
    };
    LayerTree.prototype.doFlip = function (flipSet, flip) {
        for (var _i = 0, flipSet_1 = flipSet; _i < flipSet_1.length; _i++) {
            var fs = flipSet_1[_i];
            if (flip && fs.normal.checked) {
                var state = this.flipSerialize(fs.normal);
                this.flipDeserialize(fs.flipped, state);
                fs.flipped.checked = true;
                fs.normal.checked = false;
            }
            else if (!flip && fs.flipped.checked) {
                var state = this.flipSerialize(fs.flipped);
                this.flipDeserialize(fs.normal, state);
                fs.normal.checked = true;
                fs.flipped.checked = false;
            }
        }
    };
    LayerTree.prototype.createElements = function (l, parentSeqID) {
        var name = document.createElement('label');
        var input = document.createElement('input');
        var layerName = l.Name;
        if (!this.disableExtendedFeature && layerName.length > 1) {
            switch (layerName.charAt(0)) {
                case '!':
                    input.className = 'psdtool-layer-visible psdtool-layer-force-visible';
                    input.name = 'l' + l.SeqID;
                    input.type = 'checkbox';
                    input.checked = true;
                    input.disabled = true;
                    input.style.display = 'none';
                    layerName = layerName.substring(1);
                    break;
                case '*':
                    input.className = 'psdtool-layer-visible psdtool-layer-radio';
                    input.name = 'r_' + parentSeqID;
                    input.type = 'radio';
                    input.checked = l.Visible;
                    layerName = layerName.substring(1);
                    break;
            }
        }
        if (!input.name) {
            input.className = 'psdtool-layer-visible';
            input.name = 'l' + l.SeqID;
            input.type = 'checkbox';
            input.checked = l.Visible;
        }
        if (!this.disableExtendedFeature) {
            // trim :flipx :flipy :flipxy
            layerName = this.parseToken(layerName).name;
        }
        input.setAttribute('data-seq', l.SeqID.toString());
        name.appendChild(input);
        if (l.Clipping) {
            var clip = document.createElement('img');
            clip.className = 'psdtool-clipped-mark';
            clip.src = 'img/clipped.svg';
            clip.alt = 'clipped mark';
            name.appendChild(clip);
        }
        if (l.Folder) {
            var icon = document.createElement('span');
            icon.className = 'psdtool-icon glyphicon glyphicon-folder-open';
            icon.setAttribute('aria-hidden', 'true');
            name.appendChild(icon);
        }
        else {
            var thumb = document.createElement('canvas');
            thumb.className = 'psdtool-thumbnail';
            thumb.width = 96;
            thumb.height = 96;
            if (l.Canvas) {
                var w = l.Width, h = l.Height;
                if (w > h) {
                    w = thumb.width;
                    h = thumb.width / l.Width * h;
                }
                else {
                    h = thumb.height;
                    w = thumb.height / l.Height * w;
                }
                var ctx = thumb.getContext('2d');
                if (!ctx) {
                    throw new Error('cannot get CanvasRenderingContext2D for make thumbnail');
                }
                ctx.drawImage(l.Canvas, (thumb.width - w) / 2, (thumb.height - h) / 2, w, h);
            }
            name.appendChild(thumb);
        }
        var text = document.createTextNode(layerName);
        name.appendChild(text);
        var div = document.createElement('div');
        div.className = 'psdtool-layer-name';
        div.appendChild(name);
        return {
            text: text,
            div: div,
            input: input,
        };
    };
    LayerTree.prototype.updateClass = function () {
        function r(n) {
            if (n.checked) {
                n.li.classList.remove('psdtool-hidden');
                if (n.clip) {
                    for (var i = 0; i < n.clip.length; ++i) {
                        n.clip[i].li.classList.remove('psdtool-hidden-by-clipping');
                    }
                }
            }
            else {
                n.li.classList.add('psdtool-hidden');
                if (n.clip) {
                    for (var i = 0; i < n.clip.length; ++i) {
                        n.clip[i].li.classList.add('psdtool-hidden-by-clipping');
                    }
                }
            }
            for (var i = 0; i < n.children.length; ++i) {
                r(n.children[i]);
            }
        }
        for (var i = 0; i < this.root.children.length; ++i) {
            r(this.root.children[i]);
        }
    };
    LayerTree.prototype.registerClippingGroup = function (l) {
        var clip = [];
        var n;
        for (var i = l.length - 1; i >= 0; --i) {
            this.registerClippingGroup(l[i].Children);
            n = this.nodes[l[i].SeqID];
            if (l[i].Clipping) {
                clip.unshift(n);
            }
            else {
                if (clip.length) {
                    for (var j = 0; j < clip.length; ++j) {
                        clip[j].clippedBy = n;
                    }
                    n.clip = clip;
                }
                clip = [];
            }
        }
    };
    LayerTree.prototype.parseToken = function (name) {
        var token = [];
        var p = name.split(':');
        for (var i = p.length - 1; i >= 0; --i) {
            switch (p[i]) {
                case 'flipx':
                case 'flipy':
                case 'flipxy':
                    token.push(p.pop());
                    break;
                default:
                    return { tokens: token, name: p.join(':') };
            }
        }
        throw new Error('cannot parse token from name: ' + name);
    };
    LayerTree.prototype.registerFlippingGroup = function () {
        var _this = this;
        var r = function (n) {
            for (var _i = 0, _a = n.children; _i < _a.length; _i++) {
                var cn = _a[_i];
                r(cn);
                var tokens = _this.parseToken(cn.name);
                var flips = [];
                for (var _b = 0, _c = tokens.tokens; _b < _c.length; _b++) {
                    var tk = _c[_b];
                    switch (tk) {
                        case 'flipx':
                            flips.push(1 /* FlipX */);
                            break;
                        case 'flipy':
                            flips.push(2 /* FlipY */);
                            break;
                        case 'flipxy':
                            flips.push(3 /* FlipXY */);
                            break;
                    }
                }
                if (flips.length === 0) {
                    continue;
                }
                var o = void 0;
                for (var _d = 0, _e = n.children; _d < _e.length; _d++) {
                    var on = _e[_d];
                    if (on.name === tokens.name) {
                        o = on;
                        break;
                    }
                }
                if (!o) {
                    continue;
                }
                for (var _f = 0, flips_1 = flips; _f < flips_1.length; _f++) {
                    var fp = flips_1[_f];
                    switch (fp) {
                        case 1 /* FlipX */:
                            o.li.classList.add('psdtool-item-flip-x-orig');
                            cn.li.classList.add('psdtool-item-flip-x');
                            _this.flipX.push({ normal: o, flipped: cn });
                            break;
                        case 2 /* FlipY */:
                            o.li.classList.add('psdtool-item-flip-y-orig');
                            cn.li.classList.add('psdtool-item-flip-y');
                            _this.flipY.push({ normal: o, flipped: cn });
                            break;
                        case 3 /* FlipXY */:
                            o.li.classList.add('psdtool-item-flip-xy-orig');
                            cn.li.classList.add('psdtool-item-flip-xy');
                            _this.flipXY.push({ normal: o, flipped: cn });
                            break;
                    }
                }
            }
        };
        r(this.root);
    };
    LayerTree.prototype.getAllNode = function () {
        var r = [];
        var node;
        for (var key in this.nodes) {
            if (!this.nodes.hasOwnProperty(key)) {
                continue;
            }
            node = this.nodes[key];
            if (node.checked) {
                r.push(node);
            }
        }
        return r;
    };
    LayerTree.prototype.serialize = function (allLayer) {
        var nodes = this.getAllNode();
        if (!nodes.length) {
            return '';
        }
        if (allLayer) {
            var r = [];
            for (var _i = 0, nodes_1 = nodes; _i < nodes_1.length; _i++) {
                var node = nodes_1[_i];
                r.push('/' + node.fullPath);
            }
            return r.join('\n');
        }
        var i;
        var items = [], pathMap = {};
        for (i = 0; i < nodes.length; ++i) {
            items.push({
                node: nodes[i],
                fullPathSlash: nodes[i].fullPath + '/',
                index: i
            });
            pathMap[nodes[i].fullPath] = true;
        }
        items.sort(function (a, b) {
            return a.fullPathSlash > b.fullPathSlash ? 1 : a.fullPathSlash < b.fullPathSlash ? -1 : 0;
        });
        var j, parts;
        for (i = 0; i < items.length; ++i) {
            // remove hidden layer
            parts = items[i].node.fullPath.split('/');
            for (j = 0; j < parts.length; ++j) {
                if (!pathMap[parts.slice(0, j + 1).join('/')]) {
                    items.splice(i--, 1);
                    j = -1;
                    break;
                }
            }
            // remove duplicated entry
            if (j !== -1 && i > 0 && items[i].fullPathSlash.indexOf(items[i - 1].fullPathSlash) === 0) {
                items.splice(--i, 1);
            }
        }
        items.sort(function (a, b) { return a.index > b.index ? -1 : a.index < b.index ? 1 : 0; });
        parts = [];
        for (var _a = 0, items_1 = items; _a < items_1.length; _a++) {
            var item = items_1[_a];
            parts.push(item.node.fullPath);
        }
        return parts.join('\n');
    };
    LayerTree.prototype.buildDeserializeTree = function (state) {
        var allLayer = state.charAt(0) === '/';
        var root = {
            children: {},
            checked: true,
            allLayer: allLayer
        };
        var j, node, parts;
        var lines = state.replace(/\r/g, '').split('\n');
        for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
            var line = lines_1[_i];
            parts = line.split('/');
            for (j = allLayer ? 1 : 0, node = root; j < parts.length; ++j) {
                if (!(parts[j] in node.children)) {
                    node.children[parts[j]] = {
                        children: {},
                        checked: !allLayer
                    };
                }
                node = node.children[parts[j]];
            }
            if (allLayer) {
                node.checked = true;
            }
        }
        return root;
    };
    LayerTree.prototype.apply = function (dnode, fnode, allLayer) {
        var founds = {};
        var cfnode, cdnode;
        for (var _i = 0, _a = fnode.children; _i < _a.length; _i++) {
            cfnode = _a[_i];
            founds[cfnode.internalName] = true;
            if (dnode) {
                cdnode = dnode.children[cfnode.internalName];
            }
            if (!dnode || !cdnode) {
                cfnode.checked = false;
                if (allLayer) {
                    this.apply(null, cfnode, allLayer);
                }
                continue;
            }
            if (cdnode.checked) {
                cfnode.checked = true;
            }
            this.apply(cdnode, cfnode, allLayer);
        }
    };
    LayerTree.prototype.deserialize = function (state) {
        var old = this.serialize(true);
        try {
            var t = this.buildDeserializeTree(state);
            if (t.allLayer) {
                this.clear();
                this.normalize();
            }
            this.apply(t, this.root, t.allLayer);
            this.flip = this.flip;
        }
        catch (e) {
            this.apply(this.buildDeserializeTree(old), this.root, true);
            this.flip = this.flip;
            throw e;
        }
    };
    LayerTree.prototype.buildFilterTree = function (filter) {
        var root = {
            children: {}
        };
        var node, parts;
        for (var _i = 0, _a = filter.replace(/\r/g, '').split('\n'); _i < _a.length; _i++) {
            var line = _a[_i];
            parts = line.split('/');
            node = root;
            for (var _b = 0, parts_1 = parts; _b < parts_1.length; _b++) {
                var part = parts_1[_b];
                if (!(part in node.children)) {
                    node.children[part] = {
                        children: {}
                    };
                }
                node = node.children[part];
            }
        }
        return root;
    };
    LayerTree.prototype.applyWithFilter = function (dnode, filter, fnode) {
        var founds = {};
        var cfnode, cfilter, cdnode;
        for (var _i = 0, _a = fnode.children; _i < _a.length; _i++) {
            cfnode = _a[_i];
            founds[cfnode.internalName] = true;
            if (filter) {
                cfilter = filter.children[cfnode.internalName];
            }
            if (!filter || !cfilter) {
                continue;
            }
            if (dnode) {
                cdnode = dnode.children[cfnode.internalName];
            }
            if (!dnode || !cdnode) {
                cfnode.checked = false;
                continue;
            }
            if (cdnode.checked) {
                cfnode.checked = true;
            }
            this.applyWithFilter(cdnode, cfilter, cfnode);
        }
    };
    LayerTree.prototype.deserializePartial = function (baseState, overlayState, filter) {
        var old = this.serialize(true);
        try {
            if (baseState !== undefined) {
                if (baseState === '') {
                    this.clear();
                }
                else {
                    var base = this.buildDeserializeTree(baseState);
                    if (base.allLayer) {
                        this.clear();
                        this.normalize();
                    }
                    this.apply(base, this.root, base.allLayer);
                }
            }
            var overlay = this.buildDeserializeTree(overlayState);
            if (overlay.allLayer) {
                throw new Error('cannot use allLayer mode in LayerTree.deserializePartial');
            }
            this.applyWithFilter(overlay, this.buildFilterTree(filter), this.root);
            this.flip = this.flip;
        }
        catch (e) {
            this.apply(this.buildDeserializeTree(old), this.root, true);
            this.flip = this.flip;
            throw e;
        }
    };
    LayerTree.prototype.clear = function () {
        for (var key in this.nodes) {
            if (!this.nodes.hasOwnProperty(key)) {
                continue;
            }
            this.nodes[key].checked = false;
        }
    };
    LayerTree.prototype.normalize = function () {
        // TODO: re-implement
        var ul = document.getElementById('layer-tree');
        if (!ul) {
            throw new Error('#layer-tree not found');
        }
        var elems = ul.querySelectorAll('.psdtool-layer-force-visible');
        for (var i = 0; i < elems.length; ++i) {
            elems[i].checked = true;
        }
        var set = {};
        var radios = ul.querySelectorAll('.psdtool-layer-radio');
        for (var i = 0; i < radios.length; ++i) {
            var radio = radios[i];
            if (!(radio instanceof HTMLInputElement)) {
                throw new Error('found .psdtool-layer-radio that are not HTMLInputElement');
            }
            if (radio.name in set) {
                continue;
            }
            set[radio.name] = true;
            var rinShibuyas = ul.querySelectorAll('.psdtool-layer-radio[name="' + radio.name + '"]:checked');
            if (!rinShibuyas.length) {
                radio.checked = true;
                continue;
            }
        }
    };
    return LayerTree;
}());
exports.LayerTree = LayerTree;
var Filter = (function () {
    function Filter(treeRoot, psdRoot) {
        var _this = this;
        this.root = new Node(null, null, '', [], 0, null);
        this.nodes = {};
        var path = [];
        var r = function (ul, n, l) {
            var indexes = {};
            var founds = {};
            for (var _i = 0, l_2 = l; _i < l_2.length; _i++) {
                var ll = l_2[_i];
                if (ll.Name in founds) {
                    indexes[ll.SeqID] = ++founds[ll.Name];
                }
                else {
                    indexes[ll.SeqID] = founds[ll.Name] = 0;
                }
            }
            for (var i = l.length - 1; i >= 0; --i) {
                var elems = _this.createElements(l[i]);
                var cn = new Node(elems.input, elems.text, l[i].Name, path, indexes[l[i].SeqID], n);
                n.children.push(cn);
                _this.nodes[l[i].SeqID] = cn;
                cn.li = document.createElement('li');
                var cul = document.createElement('ul');
                path.push(cn.internalName);
                r(cul, cn, l[i].Children);
                path.pop();
                cn.li.appendChild(elems.label);
                cn.li.appendChild(cul);
                ul.appendChild(cn.li);
            }
        };
        r(treeRoot, this.root, psdRoot.Children);
    }
    Filter.prototype.createElements = function (l) {
        var input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = true;
        input.setAttribute('data-seq', l.SeqID.toString());
        var text = document.createTextNode(l.Name);
        var label = document.createElement('label');
        label.appendChild(input);
        label.appendChild(text);
        return {
            text: text,
            label: label,
            input: input
        };
    };
    Filter.prototype.getAllNode = function () {
        var r = [];
        var enableNodes = 0;
        var node;
        for (var key in this.nodes) {
            if (!this.nodes.hasOwnProperty(key)) {
                continue;
            }
            node = this.nodes[key];
            if (!node.disabled) {
                ++enableNodes;
                if (node.checked) {
                    r.push(node);
                }
            }
        }
        if (r.length === enableNodes) {
            return [];
        }
        return r;
    };
    Filter.prototype.serialize = function () {
        var nodes = this.getAllNode();
        if (!nodes.length) {
            return '';
        }
        var i;
        var path = [], pathMap = {};
        for (i = 0; i < nodes.length; ++i) {
            path.push({
                node: nodes[i],
                fullPathSlash: nodes[i].fullPath + '/',
                index: i
            });
            pathMap[nodes[i].fullPath] = true;
        }
        path.sort(function (a, b) {
            return a.fullPathSlash > b.fullPathSlash ? 1 : a.fullPathSlash < b.fullPathSlash ? -1 : 0;
        });
        var j, parts;
        for (i = 0; i < path.length; ++i) {
            // remove hidden layer
            parts = path[i].node.fullPath.split('/');
            for (j = 0; j < parts.length; ++j) {
                if (!pathMap[parts.slice(0, j + 1).join('/')]) {
                    path.splice(i--, 1);
                    j = -1;
                    break;
                }
            }
            // remove duplicated entry
            if (j !== -1 && i > 0 && path[i].fullPathSlash.indexOf(path[i - 1].fullPathSlash) === 0) {
                path.splice(--i, 1);
            }
        }
        path.sort(function (a, b) { return a.index > b.index ? -1 : a.index < b.index ? 1 : 0; });
        parts = [];
        for (i = 0; i < path.length; ++i) {
            parts.push(path[i].node.fullPath);
        }
        return parts.join('\n');
    };
    Filter.prototype.buildDeserializeTree = function (state) {
        var root = {
            children: {},
            checked: true
        };
        var node, parts;
        var lines = state.replace(/\r/g, '').split('\n');
        for (var _i = 0, lines_2 = lines; _i < lines_2.length; _i++) {
            var line = lines_2[_i];
            parts = line.split('/');
            node = root;
            for (var _a = 0, parts_2 = parts; _a < parts_2.length; _a++) {
                var part = parts_2[_a];
                if (!(part in node.children)) {
                    node.children[part] = {
                        children: {},
                        checked: true
                    };
                }
                node = node.children[part];
            }
        }
        return root;
    };
    Filter.prototype.apply = function (dnode, fnode, useDisable) {
        var founds = {};
        var cdnode;
        for (var _i = 0, _a = fnode.children; _i < _a.length; _i++) {
            var cfnode = _a[_i];
            if (cfnode.disabled) {
                continue;
            }
            founds[cfnode.internalName] = true;
            if (dnode) {
                cdnode = dnode.children[cfnode.internalName];
            }
            if (!dnode || !cdnode) {
                if (useDisable) {
                    cfnode.disabled = true;
                }
                cfnode.checked = false;
                this.apply(null, cfnode, useDisable);
                continue;
            }
            cfnode.checked = cdnode.checked;
            this.apply(cdnode, cfnode, useDisable);
        }
    };
    Filter.prototype.deserialize = function (state, parents) {
        var old = this.serialize();
        try {
            for (var key in this.nodes) {
                if (!this.nodes.hasOwnProperty(key)) {
                    continue;
                }
                this.nodes[key].disabled = false;
                this.nodes[key].checked = false;
            }
            for (var i = parents.length - 1; i >= 0; --i) {
                this.apply(this.buildDeserializeTree(parents[i]), this.root, true);
            }
            if (state === '') {
                return;
            }
            this.apply(this.buildDeserializeTree(state), this.root, false);
        }
        catch (e) {
            this.apply(this.buildDeserializeTree(old), this.root, false);
            throw e;
        }
    };
    return Filter;
}());
exports.Filter = Filter;

},{}],6:[function(require,module,exports){
// lz4-ts @license BSD-3-Clause / Copyright (c) 2015, Pierre Curto / 2016, oov. All rights reserved.
/**
 * Copyright (c) 2015, Pierre Curto
 * Copyright (c) 2016, oov
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * * Redistributions of source code must retain the above copyright notice, this
 *   list of conditions and the following disclaimer.
 *
 * * Redistributions in binary form must reproduce the above copyright notice,
 *   this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 *
 * * Neither the name of xxHash nor the names of its
 *   contributors may be used to endorse or promote products derived from
 *   this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
"use strict";
var errInvalidSource = new Error('invalid source');
var errShortBuffer = new Error('short buffer');
// The following constants are used to setup the compression algorithm.
var minMatch = 4; // the minimum size of the match sequence size (4 bytes)
var winSizeLog = 16; // LZ4 64Kb window size limit
var winSize = 1 << winSizeLog;
var winMask = winSize - 1; // 64Kb window of previous data for dependent blocks
// hashSizeLog determines the size of the hash table used to quickly find a previous match position.
// Its value influences the compression speed and memory usage, the lower the faster,
// but at the expense of the compression ratio.
// 16 seems to be the best compromise.
var hashSizeLog = 16;
var hashSize = 1 << hashSizeLog;
var hashShift = (minMatch * 8) - hashSizeLog;
var mfLimit = 8 + minMatch; // The last match cannot start within the last 12 bytes.
var skipStrength = 6; // variable step for fast scan
var hasher = 2654435761 | 0; // prime number used to hash minMatch
// https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Math/imul#Polyfill
function imulPolyfill(a, b) {
    var ah = (a >>> 16) & 0xffff;
    var al = a & 0xffff;
    var bh = (b >>> 16) & 0xffff;
    var bl = b & 0xffff;
    // the shift by 0 fixes the sign on the high part
    // the final |0 converts the unsigned value into a signed value
    return al * bl + (((ah * bl + al * bh) << 16) >>> 0) | 0;
}
;
var imul = Math.imul ? Math.imul : imulPolyfill;
function getUint32(a, i) {
    return (a[i + 3]) | (a[i + 2] << 8) | (a[i + 1] << 16) | (a[i] << 24);
}
function copy(dest, src, di, si, len) {
    for (var i = 0; i < len; ++i) {
        dest[di++] = src[si++];
    }
}
function calcUncompressedLen(src) {
    var srcBuf = new Uint8Array(src);
    var sn = srcBuf.length;
    if (sn === 0) {
        return 0;
    }
    for (var si = 0, di = 0;;) {
        // literals and match lengths (token)
        var lLen = srcBuf[si] >> 4;
        var mLen = srcBuf[si] & 0xf;
        if (++si === sn) {
            throw errInvalidSource;
        }
        // literals
        if (lLen > 0) {
            if (lLen === 0xf) {
                while (srcBuf[si] === 0xff) {
                    lLen += 0xff;
                    if (++si === sn) {
                        throw errInvalidSource;
                    }
                }
                lLen += srcBuf[si];
                if (++si === sn) {
                    throw errInvalidSource;
                }
            }
            di += lLen;
            si += lLen;
            if (si >= sn) {
                return di;
            }
        }
        si += 2;
        if (si >= sn) {
            throw errInvalidSource;
        }
        var offset = srcBuf[si - 2] | (srcBuf[si - 1] << 8);
        if (di - offset < 0 || offset === 0) {
            throw errInvalidSource;
        }
        // match
        if (mLen === 0xf) {
            while (srcBuf[si] === 0xff) {
                mLen += 0xff;
                if (++si === sn) {
                    throw errInvalidSource;
                }
            }
            mLen += srcBuf[si];
            if (++si === sn) {
                throw errInvalidSource;
            }
        }
        // minimum match length is 4
        mLen += 4;
        // copy the match (NB. match is at least 4 bytes long)
        for (; mLen >= offset; mLen -= offset) {
            di += offset;
        }
        di += mLen;
    }
}
exports.calcUncompressedLen = calcUncompressedLen;
function uncompressBlock(src, dst) {
    var srcBuf = new Uint8Array(src);
    var destBuf = new Uint8Array(dst);
    var sn = srcBuf.length;
    var dn = destBuf.length;
    if (sn === 0) {
        return 0;
    }
    for (var si = 0, di = 0;;) {
        // literals and match lengths (token)
        var lLen = srcBuf[si] >> 4;
        var mLen = srcBuf[si] & 0xf;
        if (++si === sn) {
            throw errInvalidSource;
        }
        // literals
        if (lLen > 0) {
            if (lLen === 0xf) {
                while (srcBuf[si] === 0xff) {
                    lLen += 0xff;
                    if (++si === sn) {
                        throw errInvalidSource;
                    }
                }
                lLen += srcBuf[si];
                if (++si === sn) {
                    throw errInvalidSource;
                }
            }
            if (dn - di < lLen || si + lLen > sn) {
                throw errShortBuffer;
            }
            copy(destBuf, srcBuf, di, si, lLen);
            di += lLen;
            si += lLen;
            if (si >= sn) {
                return di;
            }
        }
        si += 2;
        if (si >= sn) {
            throw errInvalidSource;
        }
        var offset = srcBuf[si - 2] | (srcBuf[si - 1] << 8);
        if (di - offset < 0 || offset === 0) {
            throw errInvalidSource;
        }
        // match
        if (mLen === 0xf) {
            while (srcBuf[si] === 0xff) {
                mLen += 0xff;
                if (++si === sn) {
                    throw errInvalidSource;
                }
            }
            mLen += srcBuf[si];
            if (++si === sn) {
                throw errInvalidSource;
            }
        }
        // minimum match length is 4
        mLen += 4;
        if (dn - di <= mLen) {
            throw errShortBuffer;
        }
        // copy the match (NB. match is at least 4 bytes long)
        for (; mLen >= offset; mLen -= offset) {
            copy(destBuf, destBuf, di, di - offset, offset);
            di += offset;
        }
        copy(destBuf, destBuf, di, di - offset, mLen);
        di += mLen;
    }
}
exports.uncompressBlock = uncompressBlock;
function compressBlockBound(n) {
    return n + (n / 255 | 0) + 16;
}
exports.compressBlockBound = compressBlockBound;
function compressBlock(src, dst, soffset) {
    var srcBuf = new Uint8Array(src);
    var destBuf = new Uint8Array(dst);
    var sn = srcBuf.length - mfLimit;
    var dn = destBuf.length;
    if (sn <= 0 || dn === 0 || soffset >= sn) {
        return 0;
    }
    var si = 0, di = 0;
    // fast scan strategy:
    // we only need a hash table to store the last sequences (4 bytes)
    var hashTable = new Uint32Array(hashSize);
    // Initialise the hash table with the first 64Kb of the input buffer
    // (used when compressing dependent blocks)
    while (si < soffset) {
        var h = imul(getUint32(srcBuf, si), hasher) >>> hashShift;
        hashTable[h] = ++si;
    }
    var anchor = si;
    var fma = 1 << skipStrength;
    while (si < sn - minMatch) {
        // hash the next 4 bytes (sequence)...
        var h = imul(getUint32(srcBuf, si), hasher) >>> hashShift;
        // -1 to separate existing entries from new ones
        var ref = hashTable[h] - 1;
        // ...and store the position of the hash in the hash table (+1 to compensate the -1 upon saving)
        hashTable[h] = si + 1;
        // no need to check the last 3 bytes in the first literal 4 bytes as
        // this guarantees that the next match, if any, is compressed with
        // a lower size, since to have some compression we must have:
        // ll+ml-overlap > 1 + (ll-15)/255 + (ml-4-15)/255 + 2 (uncompressed size>compressed size)
        // => ll+ml>3+2*overlap => ll+ml>= 4+2*overlap
        // and by definition we do have:
        // ll >= 1, ml >= 4
        // => ll+ml >= 5
        // => so overlap must be 0
        // the sequence is new, out of bound (64kb) or not valid: try next sequence
        if (ref < 0 ||
            (si - ref) >> winSizeLog > 0 ||
            srcBuf[ref] !== srcBuf[si] ||
            srcBuf[ref + 1] !== srcBuf[si + 1] ||
            srcBuf[ref + 2] !== srcBuf[si + 2] ||
            srcBuf[ref + 3] !== srcBuf[si + 3]) {
            // variable step: improves performance on non-compressible data
            si += fma >> skipStrength;
            ++fma;
            continue;
        }
        // match found
        fma = 1 << skipStrength;
        var lLen_1 = si - anchor;
        var offset = si - ref;
        // encode match length part 1
        si += minMatch;
        var mLen = si; // match length has minMatch already
        while (si <= sn && srcBuf[si] === srcBuf[si - offset]) {
            si++;
        }
        mLen = si - mLen;
        if (mLen < 0xf) {
            destBuf[di] = mLen;
        }
        else {
            destBuf[di] = 0xf;
        }
        // encode literals length
        if (lLen_1 < 0xf) {
            destBuf[di] |= lLen_1 << 4;
        }
        else {
            destBuf[di] |= 0xf0;
            if (++di === dn) {
                throw errShortBuffer;
            }
            var l = lLen_1 - 0xf;
            for (; l >= 0xff; l -= 0xff) {
                destBuf[di] = 0xff;
                if (++di === dn) {
                    throw errShortBuffer;
                }
            }
            destBuf[di] = l & 0xff;
        }
        if (++di === dn) {
            throw errShortBuffer;
        }
        // literals
        if (di + lLen_1 >= dn) {
            throw errShortBuffer;
        }
        copy(destBuf, srcBuf, di, anchor, lLen_1);
        di += lLen_1;
        anchor = si;
        // encode offset
        di += 2;
        if (di >= dn) {
            throw errShortBuffer;
        }
        destBuf[di - 2] = offset;
        destBuf[di - 1] = offset >> 8;
        // encode match length part 2
        if (mLen >= 0xf) {
            for (mLen -= 0xf; mLen >= 0xff; mLen -= 0xff) {
                destBuf[di] = 0xff;
                if (++di === dn) {
                    throw errShortBuffer;
                }
            }
            destBuf[di] = mLen;
            if (++di === dn) {
                throw errShortBuffer;
            }
        }
    }
    if (anchor === 0) {
        // incompressible
        return 0;
    }
    // last literals
    var lLen = srcBuf.length - anchor;
    if (lLen < 0xf) {
        destBuf[di] = lLen << 4;
    }
    else {
        destBuf[di] = 0xf0;
        if (++di === dn) {
            throw errShortBuffer;
        }
        for (lLen -= 0xf; lLen >= 0xff; lLen -= 0xff) {
            destBuf[di] = 0xff;
            if (++di === dn) {
                throw errShortBuffer;
            }
        }
        destBuf[di] = lLen;
    }
    if (++di === dn) {
        throw errShortBuffer;
    }
    // write literals
    var lastLen = srcBuf.length - anchor;
    var n = di + lastLen;
    if (n > dn) {
        throw errShortBuffer;
    }
    else if (n >= sn) {
        // incompressible
        return 0;
    }
    copy(destBuf, srcBuf, di, anchor, lastLen);
    di += lastLen;
    return di;
}
exports.compressBlock = compressBlock;
function compressBlockHC(src, dst, soffset) {
    var srcBuf = new Uint8Array(src);
    var destBuf = new Uint8Array(dst);
    var sn = srcBuf.length - mfLimit;
    var dn = destBuf.length;
    if (sn <= 0 || dn === 0 || soffset >= sn) {
        return 0;
    }
    var si = 0, di = 0;
    // Hash Chain strategy:
    // we need a hash table and a chain table
    // the chain table cannot contain more entries than the window size (64Kb entries)
    var hashTable = new Uint32Array(hashSize);
    var chainTable = new Uint32Array(winSize);
    // Initialise the hash table with the first 64Kb of the input buffer
    // (used when compressing dependent blocks)
    while (si < soffset) {
        var h = imul(getUint32(srcBuf, si), hasher) >>> hashShift;
        chainTable[si & winMask] = hashTable[h];
        hashTable[h] = ++si;
    }
    var anchor = si;
    while (si < sn - minMatch) {
        // hash the next 4 bytes (sequence)...
        var h = imul(getUint32(srcBuf, si), hasher) >>> hashShift;
        // follow the chain until out of window and give the longest match
        var mLen = 0;
        var offset = 0;
        for (var next = hashTable[h] - 1; next > 0 && next > si - winSize; next = chainTable[next & winMask] - 1) {
            // the first (mLen==0) or next byte (mLen>=minMatch) at current match length must match to improve on the match length
            if (srcBuf[next + mLen] === srcBuf[si + mLen]) {
                for (var ml = 0;; ++ml) {
                    if (srcBuf[next + ml] !== srcBuf[si + ml] || si + ml > sn) {
                        // found a longer match, keep its position and length
                        if (mLen < ml && ml >= minMatch) {
                            mLen = ml;
                            offset = si - next;
                        }
                        break;
                    }
                }
            }
        }
        chainTable[si & winMask] = hashTable[h];
        hashTable[h] = si + 1;
        // no match found
        if (mLen === 0) {
            ++si;
            continue;
        }
        // match found
        // update hash/chain tables with overlaping bytes:
        // si already hashed, add everything from si+1 up to the match length
        for (var si2 = si + 1, ml = si + mLen; si2 < ml;) {
            var h_1 = imul(getUint32(srcBuf, si2), hasher) >>> hashShift;
            chainTable[si2 & winMask] = hashTable[h_1];
            hashTable[h_1] = ++si2;
        }
        var lLen_2 = si - anchor;
        si += mLen;
        mLen -= minMatch; // match length does not include minMatch
        if (mLen < 0xf) {
            destBuf[di] = mLen;
        }
        else {
            destBuf[di] = 0xf;
        }
        // encode literals length
        if (lLen_2 < 0xf) {
            destBuf[di] |= lLen_2 << 4;
        }
        else {
            destBuf[di] |= 0xf0;
            if (++di === dn) {
                throw errShortBuffer;
            }
            var l = lLen_2 - 0xf;
            for (; l >= 0xff; l -= 0xff) {
                destBuf[di] = 0xff;
                if (++di === dn) {
                    throw errShortBuffer;
                }
            }
            destBuf[di] = l & 0xff;
        }
        if (++di === dn) {
            throw errShortBuffer;
        }
        // literals
        if (di + lLen_2 >= dn) {
            throw errShortBuffer;
        }
        copy(destBuf, srcBuf, di, anchor, lLen_2);
        di += lLen_2;
        anchor = si;
        // encode offset
        di += 2;
        if (di >= dn) {
            throw errShortBuffer;
        }
        destBuf[di - 2] = offset;
        destBuf[di - 1] = offset >> 8;
        // encode match length part 2
        if (mLen >= 0xf) {
            for (mLen -= 0xf; mLen >= 0xff; mLen -= 0xff) {
                destBuf[di] = 0xff;
                if (++di === dn) {
                    throw errShortBuffer;
                }
            }
            destBuf[di] = mLen;
            if (++di === dn) {
                throw errShortBuffer;
            }
        }
    }
    if (anchor === 0) {
        // incompressible
        return 0;
    }
    // last literals
    var lLen = srcBuf.length - anchor;
    if (lLen < 0xf) {
        destBuf[di] = lLen << 4;
    }
    else {
        destBuf[di] = 0xf0;
        if (++di === dn) {
            throw errShortBuffer;
        }
        for (lLen -= 0xf; lLen >= 0xff; lLen -= 0xff) {
            destBuf[di] = 0xff;
            if (++di === dn) {
                throw errShortBuffer;
            }
        }
        destBuf[di] = lLen;
    }
    if (++di === dn) {
        throw errShortBuffer;
    }
    // write literals
    var lastLen = srcBuf.length - anchor;
    var n = di + lastLen;
    if (n > dn) {
        throw errShortBuffer;
    }
    else if (n >= sn) {
        // incompressible
        return 0;
    }
    copy(destBuf, srcBuf, di, anchor, lastLen);
    di += lastLen;
    return di;
}
exports.compressBlockHC = compressBlockHC;

},{}],7:[function(require,module,exports){
"use strict";
var renderer = require('./renderer');
var favorite = require('./favorite');
var layertree = require('./layertree');
var tileder = require('./tileder');
var zipper = require('./zipper');
var primar = require('./primar');
function getElementById(doc, id) {
    var elem = doc.getElementById(id);
    if (!elem) {
        throw new Error('#' + id + ' not found');
    }
    return elem;
}
var ProgressDialog = (function () {
    function ProgressDialog(title, text) {
        this.bar = getElementById(document, 'progress-dialog-progress-bar');
        this.text = document.createTextNode('');
        var label = getElementById(document, 'progress-dialog-label');
        label.innerHTML = '';
        label.appendChild(document.createTextNode(title));
        var caption = getElementById(document, 'progress-dialog-progress-caption');
        caption.innerHTML = '';
        caption.appendChild(this.text);
        this.update(0, text);
        this.dialog = jQuery('#progress-dialog');
        if (!this.dialog.data('bs.modal')) {
            this.dialog.modal();
        }
        else {
            this.dialog.modal('show');
        }
    }
    ProgressDialog.prototype.close = function () {
        this.dialog.modal('hide');
    };
    ProgressDialog.prototype.update = function (progress, text) {
        var p = Math.min(100, Math.max(0, progress * 100));
        this.bar.style.width = p + '%';
        this.bar.setAttribute('aria-valuenow', p.toFixed(0) + '%');
        this.text.data = p.toFixed(0) + '% ' + text;
    };
    return ProgressDialog;
}());
var FilterDialog = (function () {
    function FilterDialog(favorite) {
        this.favorite = favorite;
    }
    FilterDialog.prototype.init = function () {
        var _this = this;
        {
            var filterTree = getElementById(document, 'filter-tree');
            if (filterTree instanceof HTMLUListElement) {
                this.treeRoot = filterTree;
            }
            else {
                throw new Error('#filter-tree is not an UL element');
            }
        }
        this.treeRoot.innerHTML = '';
        this.treeRoot.addEventListener('click', function (e) {
            var inp = e.target;
            if (inp instanceof HTMLInputElement) {
                var li = inp.parentElement;
                while (!(li instanceof HTMLLIElement)) {
                    li = li.parentElement;
                }
                var checked = inp.checked;
                var inputs = li.querySelectorAll('input');
                for (var i = 0; i < inputs.length; ++i) {
                    var inp_1 = inputs[i];
                    if (inp_1 instanceof HTMLInputElement) {
                        inp_1.checked = checked;
                    }
                }
                if (checked) {
                    for (var parent_1 = li.parentElement; parent_1 !== _this.treeRoot; parent_1 = parent_1.parentElement) {
                        if (parent_1 instanceof HTMLLIElement) {
                            var inp_2 = parent_1.querySelector('input');
                            if (inp_2 instanceof HTMLInputElement) {
                                inp_2.checked = true;
                            }
                        }
                    }
                }
                _this.updateClass();
                _this.update();
            }
        }, false);
        {
            var useFilter = getElementById(document, 'use-filter');
            if (useFilter instanceof HTMLInputElement) {
                this.useFilter = useFilter;
            }
            else {
                throw new Error('#filter-tree is not an INPUT element');
            }
        }
        this.useFilter.addEventListener('click', function (e) {
            _this.updateClass();
            _this.update();
        }, false);
        {
            var dialog = getElementById(document, 'filter-dialog');
            if (dialog instanceof HTMLDivElement) {
                this.dialog = dialog;
            }
            else {
                throw new Error('#filter-dialog is not an DIV element');
            }
        }
        jQuery(this.dialog).on('shown.bs.modal', function (e) {
            var filters = _this.favorite.getAncestorFilters(_this.node);
            if (_this.node.type === 'filter') {
                _this.useFilter.checked = true;
                _this.root.deserialize(_this.node.data ? _this.node.data.value : '', filters);
            }
            else {
                _this.useFilter.checked = false;
                _this.root.deserialize('', filters);
            }
            _this.updateClass();
        });
    };
    FilterDialog.prototype.load = function (psd) {
        if (!this.treeRoot) {
            this.init();
        }
        this.root = new layertree.Filter(this.treeRoot, psd);
    };
    FilterDialog.prototype.updateClass = function () {
        if (this.useFilter.checked) {
            this.treeRoot.classList.remove('disabled');
        }
        else {
            this.treeRoot.classList.add('disabled');
        }
        var inputs = this.treeRoot.querySelectorAll('input');
        for (var i = 0, elem = void 0, li = void 0; i < inputs.length; ++i) {
            elem = inputs[i];
            if (elem instanceof HTMLInputElement) {
                li = elem.parentElement;
                while (li && li.tagName !== 'LI') {
                    li = li.parentElement;
                }
                if (elem.disabled) {
                    li.classList.add('disabled');
                }
                else {
                    li.classList.remove('disabled');
                }
                if (elem.checked) {
                    li.classList.add('checked');
                }
                else {
                    li.classList.remove('checked');
                }
            }
        }
    };
    FilterDialog.prototype.update = function () {
        if (this.useFilter.checked) {
            var s = this.root.serialize();
            if (s) {
                if (this.onUpdate) {
                    this.onUpdate(this.node.id || '', 'filter', s);
                }
                return;
            }
        }
        if (this.onUpdate) {
            this.onUpdate(this.node.id || '', 'folder', '');
        }
    };
    FilterDialog.prototype.show = function (n) {
        this.node = n;
        var dialog = jQuery(this.dialog);
        if (!dialog.data('bs.modal')) {
            dialog.modal();
        }
        else {
            dialog.modal('show');
        }
    };
    return FilterDialog;
}());
var FaviewSettingDialog = (function () {
    function FaviewSettingDialog(favorite) {
        var _this = this;
        this.favorite = favorite;
        {
            var faviewMode = getElementById(document, 'faview-mode');
            if (faviewMode instanceof HTMLSelectElement) {
                this.faviewMode = faviewMode;
            }
            else {
                throw new Error('#faview-mode is not a SELECT element');
            }
        }
        this.faviewMode.addEventListener('change', function (e) { return _this.update(); });
        {
            var dialog = getElementById(document, 'faview-setting-dialog');
            if (dialog instanceof HTMLDivElement) {
                this.dialog = dialog;
            }
            else {
                throw new Error('#faview-setting-dialog is not an DIV element');
            }
        }
        jQuery(this.dialog).on('shown.bs.modal', function (e) {
            _this.faviewMode.selectedIndex = _this.favorite.faviewMode;
        });
    }
    FaviewSettingDialog.prototype.update = function () {
        this.favorite.faviewMode = this.faviewMode.selectedIndex;
        if (this.onUpdate) {
            this.onUpdate();
        }
    };
    return FaviewSettingDialog;
}());
var Main = (function () {
    function Main() {
        this.sideBodyScrollPos = {};
    }
    Main.prototype.init = function () {
        var _this = this;
        Main.initDropZone('dropzone', function (files) {
            var i, ext;
            for (i = 0; i < files.length; ++i) {
                ext = files[i].name.substring(files[i].name.length - 4).toLowerCase();
                if (ext === '.pfv') {
                    _this.droppedPFV = files[i];
                    break;
                }
            }
            for (i = 0; i < files.length; ++i) {
                ext = files[i].name.substring(files[i].name.length - 4).toLowerCase();
                if (ext !== '.pfv') {
                    _this.loadAndParse(files[i]);
                    return;
                }
            }
        });
        this.initUI();
        getElementById(document, 'samplefile').addEventListener('click', function (e) {
            return _this.loadAndParse(getElementById(document, 'samplefile').getAttribute('data-filename'));
        }, false);
        window.addEventListener('resize', function (e) { return _this.resized(); }, false);
        window.addEventListener('hashchange', function (e) { return _this.hashchanged(); }, false);
        this.hashchanged();
        var elems = document.querySelectorAll('.psdtool-loading');
        for (var i = 0; i < elems.length; ++i) {
            elems[i].classList.add('psdtool-loaded');
            elems[i].classList.remove('psdtool-loading');
        }
    };
    Main.prototype.hashchanged = function () {
        var hashData = decodeURIComponent(location.hash.substring(1));
        if (hashData.substring(0, 5) === 'load:') {
            this.loadAndParse(hashData.substring(5));
        }
    };
    Main.prototype.resized = function () {
        var mainContainer = getElementById(document, 'main-container');
        var miscUi = getElementById(document, 'misc-ui');
        var previewContainer = getElementById(document, 'preview-container');
        var old = previewContainer.style.display;
        previewContainer.style.display = 'none';
        previewContainer.style.width = mainContainer.clientWidth + 'px';
        previewContainer.style.height = (mainContainer.clientHeight - miscUi.offsetHeight) + 'px';
        previewContainer.style.display = old;
        var sideContainer = getElementById(document, 'side-container');
        var sideHead = getElementById(document, 'side-head');
        var sideBody = getElementById(document, 'side-body');
        old = sideBody.style.display;
        sideBody.style.display = 'none';
        sideBody.style.width = sideContainer.clientWidth + 'px';
        sideBody.style.height = (sideContainer.clientHeight - sideHead.offsetHeight) + 'px';
        sideBody.style.display = old;
        var toolbars = document.querySelectorAll('.psdtool-tab-toolbar');
        for (var i = 0; i < toolbars.length; ++i) {
            var elem = toolbars[i];
            if (elem instanceof HTMLElement) {
                var p = elem.parentElement;
                while (!p.classList.contains('psdtool-tab-pane') && p) {
                    p = p.parentElement;
                }
                if (p) {
                    p.style.paddingTop = elem.clientHeight + 'px';
                }
            }
        }
    };
    Main.prototype.loadAndParse = function (input) {
        var _this = this;
        var fileOpenUi = getElementById(document, 'file-open-ui');
        var errorReportUi = getElementById(document, 'error-report-ui');
        var main = getElementById(document, 'main');
        fileOpenUi.style.display = 'block';
        errorReportUi.style.display = 'none';
        main.style.display = 'none';
        Mousetrap.pause();
        var errorMessageContainer = getElementById(document, 'error-message');
        var errorMessage = document.createTextNode('');
        errorMessageContainer.innerHTML = '';
        errorMessageContainer.appendChild(errorMessage);
        var prog = new ProgressDialog('Loading...', 'Getting ready...');
        Main.loadAsBlob(function (p) { return prog.update(p, 'Receiving file...'); }, input)
            .then(function (o) {
            return _this.parse(function (p) { return prog.update(p, 'Loading file...'); }, o);
        })
            .then(function () {
            prog.close();
            fileOpenUi.style.display = 'none';
            errorReportUi.style.display = 'none';
            main.style.display = 'block';
            Mousetrap.unpause();
            _this.resized();
        }, function (e) {
            prog.close();
            fileOpenUi.style.display = 'block';
            errorReportUi.style.display = 'block';
            main.style.display = 'none';
            Mousetrap.pause();
            errorMessage.data = e.toString();
            console.error(e);
        });
    };
    Main.prototype.parse = function (progress, obj) {
        var _this = this;
        var deferred = m.deferred();
        PSD.parseWorker(obj.buffer, progress, function (psd) {
            try {
                _this.psdRoot = psd;
                _this.loadLayerTree(psd);
                _this.filterDialog.load(psd);
                _this.loadRenderer(psd);
                _this.maxPixels.value = (_this.optionAutoTrim.checked ? _this.renderer.Height : _this.renderer.CanvasHeight).toString();
                _this.seqDlPrefix.value = obj.name;
                _this.seqDlNum.value = '0';
                var readmeButtons = document.querySelectorAll('.psdtool-show-readme');
                for (var i = 0, elem = void 0; i < readmeButtons.length; ++i) {
                    elem = readmeButtons[i];
                    if (elem instanceof HTMLElement) {
                        if (psd.Readme !== '') {
                            elem.classList.remove('hidden');
                        }
                        else {
                            elem.classList.add('hidden');
                        }
                    }
                }
                getElementById(document, 'readme').textContent = psd.Readme;
                //  TODO: error handling
                _this.favorite.psdHash = psd.Hash;
                if (_this.droppedPFV) {
                    var fr_1 = new FileReader();
                    fr_1.onload = function () {
                        _this.favorite.loadFromArrayBuffer(fr_1.result);
                    };
                    fr_1.readAsArrayBuffer(_this.droppedPFV);
                }
                else {
                    var pfvData = _this.favorite.getPFVFromLocalStorage(psd.Hash);
                    if (pfvData && pfvData.time / 1000 > psd.PFVModDate) {
                        _this.favorite.loadFromString(pfvData.data, pfvData.id);
                    }
                    else if (psd.PFV) {
                        _this.favorite.loadFromString(psd.PFV);
                    }
                }
                _this.redraw();
                deferred.resolve(true);
            }
            catch (e) {
                deferred.reject(e);
            }
        }, function (error) { return deferred.reject(error); });
        return deferred.promise;
    };
    Main.prototype.pfvOnDrop = function (files) {
        var _this = this;
        this.leaveReaderMode();
        var i, ext;
        var _loop_1 = function() {
            ext = files[i].name.substring(files[i].name.length - 4).toLowerCase();
            if (ext === '.pfv') {
                // TODO: error handling
                var fr_2 = new FileReader();
                fr_2.onload = function (e) {
                    if (_this.favorite.loadFromArrayBuffer(fr_2.result)) {
                        jQuery('#import-dialog').modal('hide');
                    }
                };
                fr_2.readAsArrayBuffer(files[i]);
                return { value: void 0 };
            }
        };
        for (i = 0; i < files.length; ++i) {
            var state_1 = _loop_1();
            if (typeof state_1 === "object") return state_1.value;
        }
    };
    Main.prototype.initFavoriteUI = function () {
        var _this = this;
        this.favorite = new favorite.Favorite(getElementById(document, 'favorite-tree'), getElementById(document, 'favorite-tree').getAttribute('data-root-name'));
        this.favorite.onModified = function () {
            _this.needRefreshFaview = true;
        };
        this.favorite.onLoaded = function () {
            _this.startFaview();
            switch (_this.favorite.faviewMode) {
                case 0 /* ShowLayerTree */:
                    _this.toggleTreeFaview(false);
                    break;
                case 1 /* ShowFaview */:
                    if (!_this.faview.closed) {
                        _this.toggleTreeFaview(true);
                    }
                    break;
                case 2 /* ShowFaviewAndReadme */:
                    if (!_this.faview.closed) {
                        _this.toggleTreeFaview(true);
                        if (_this.psdRoot.Readme !== '') {
                            jQuery('#readme-dialog').modal('show');
                        }
                    }
                    break;
            }
        };
        this.favorite.onClearSelection = function () { return _this.leaveReaderMode(); };
        this.favorite.onSelect = function (item) {
            if (item.type !== 'item') {
                _this.leaveReaderMode();
                return;
            }
            try {
                _this.enterReaderMode(item.data.value, _this.favorite.getFirstFilter(item), item.text + '.png');
            }
            catch (e) {
                console.error(e);
                alert(e);
            }
        };
        this.favorite.onDoubleClick = function (item) {
            try {
                switch (item.type) {
                    case 'item':
                        _this.leaveReaderMode(item.data.value, _this.favorite.getFirstFilter(item));
                        break;
                    case 'folder':
                    case 'filter':
                        _this.filterDialog.show(item);
                        break;
                }
            }
            catch (e) {
                console.error(e);
                alert(e);
            }
        };
        this.filterDialog = new FilterDialog(this.favorite);
        this.filterDialog.onUpdate = function (id, type, data) {
            _this.favorite.update({ id: id, type: type, data: { value: data } });
            _this.favorite.updateLocalStorage();
            _this.needRefreshFaview = true;
        };
        jQuery('button[data-psdtool-tree-add-item]').on('click', function (e) {
            _this.leaveReaderMode();
            _this.favorite.add('item', true, '', _this.layerRoot.serialize(false));
        });
        Mousetrap.bind('mod+b', function (e) {
            e.preventDefault();
            var text = _this.lastCheckedNode ? _this.lastCheckedNode.displayName : 'New Item';
            text = prompt(document.querySelector('button[data-psdtool-tree-add-item]').getAttribute('data-caption'), text);
            if (text === null) {
                return;
            }
            _this.leaveReaderMode();
            _this.favorite.add('item', false, text, _this.layerRoot.serialize(false));
        });
        jQuery('button[data-psdtool-tree-add-folder]').on('click', function (e) {
            _this.favorite.add('folder', true);
        });
        Mousetrap.bind('mod+d', function (e) {
            e.preventDefault();
            var text = prompt(document.querySelector('button[data-psdtool-tree-add-folder]').getAttribute('data-caption'), 'New Folder');
            if (text === null) {
                return;
            }
            _this.favorite.clearSelection();
            _this.favorite.add('folder', false, text);
        });
        jQuery('button[data-psdtool-tree-rename]').on('click', function (e) { return _this.favorite.edit(); });
        Mousetrap.bind('f2', function (e) {
            e.preventDefault();
            _this.favorite.edit();
        });
        jQuery('button[data-psdtool-tree-remove]').on('click', function (e) { return _this.favorite.remove(); });
        Mousetrap.bind('shift+mod+g', function (e) {
            var target = e.target;
            if (target instanceof HTMLElement && target.classList.contains('psdtool-layer-visible')) {
                e.preventDefault();
                if (!target.classList.contains('psdtool-layer-radio')) {
                    return;
                }
                if (target instanceof HTMLInputElement) {
                    var old = _this.layerRoot.serialize(true);
                    var created = [];
                    var n = void 0;
                    var elems = document.querySelectorAll('input[name="' + target.name + '"].psdtool-layer-radio');
                    for (var i = 0; i < elems.length; ++i) {
                        n = _this.layerRoot.nodes[parseInt(elems[i].getAttribute('data-seq'), 10)];
                        if (n.li.classList.contains('psdtool-item-flip-x') ||
                            n.li.classList.contains('psdtool-item-flip-y') ||
                            n.li.classList.contains('psdtool-item-flip-xy')) {
                            continue;
                        }
                        n.checked = true;
                        _this.favorite.add('item', false, n.displayName, _this.layerRoot.serialize(false));
                        created.push(n.displayName);
                    }
                    _this.layerRoot.deserialize(old);
                    _this.redraw();
                    alert(created.length + ' favorite item(s) has been added.\n\n' + created.join('\n'));
                }
            }
        });
        Main.initDropZone('pfv-dropzone', function (files) { return _this.pfvOnDrop(files); });
        Main.initDropZone('pfv-dropzone2', function (files) { return _this.pfvOnDrop(files); });
        jQuery('#import-dialog').on('shown.bs.modal', function (e) {
            // build the recent list
            var recents = getElementById(document, 'pfv-recents');
            recents.innerHTML = '';
            var btn;
            var pfvs = _this.favorite.getPFVListFromLocalStorage();
            for (var i = pfvs.length - 1; i >= 0; --i) {
                btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'list-group-item';
                if (pfvs[i].hash === _this.psdRoot.Hash) {
                    btn.className += ' list-group-item-info';
                }
                btn.setAttribute('data-dismiss', 'modal');
                (function (btn, data, uniqueId) {
                    btn.addEventListener('click', function (e) {
                        _this.leaveReaderMode();
                        // TODO: error handling
                        _this.favorite.loadFromString(data, uniqueId);
                    }, false);
                })(btn, pfvs[i].data, pfvs[i].id);
                btn.appendChild(document.createTextNode(favorite.countEntries(pfvs[i].data) +
                    ' item(s) / Created at ' +
                    Main.formateDate(new Date(pfvs[i].time))));
                recents.appendChild(btn);
            }
        });
        jQuery('#bulk-create-folder-dialog').on('shown.bs.modal', function (e) { return _this.bulkCreateFolderTextarea.focus(); });
        var e = getElementById(document, 'bulk-create-folder-textarea');
        if (e instanceof HTMLTextAreaElement) {
            this.bulkCreateFolderTextarea = e;
        }
        else {
            throw new Error('element not found: #bulk-create-folder-textarea');
        }
        getElementById(document, 'bulk-create-folder').addEventListener('click', function (e) {
            var folders = [];
            for (var _i = 0, _a = _this.bulkCreateFolderTextarea.value.replace(/\r/g, '').split('\n'); _i < _a.length; _i++) {
                var line = _a[_i];
                line = line.trim();
                if (line === '') {
                    continue;
                }
                folders.push(line);
            }
            _this.favorite.addFolders(folders);
            _this.bulkCreateFolderTextarea.value = '';
        }, false);
        jQuery('#bulk-rename-dialog').on('shown.bs.modal', function (e) {
            var r = function (ul, nodes) {
                var cul;
                var li;
                var input;
                for (var _i = 0, nodes_1 = nodes; _i < nodes_1.length; _i++) {
                    var n = nodes_1[_i];
                    input = document.createElement('input');
                    input.className = 'form-control';
                    input.value = n.text;
                    (function (input, n) {
                        input.onblur = function (e) { n.text = input.value.trim(); };
                    })(input, n);
                    li = document.createElement('li');
                    li.appendChild(input);
                    cul = document.createElement('ul');
                    li.appendChild(cul);
                    r(cul, n.children);
                    ul.appendChild(li);
                }
            };
            var elem = getElementById(document, 'bulk-rename-tree');
            _this.bulkRenameData = _this.favorite.renameNodes;
            elem.innerHTML = '';
            r(elem, _this.bulkRenameData);
        });
        getElementById(document, 'bulk-rename').addEventListener('click', function (e) {
            // auto numbering
            var digits = 1;
            {
                var elem = getElementById(document, 'rename-digits');
                if (elem instanceof HTMLSelectElement) {
                    digits = parseInt(elem.value, 10);
                }
            }
            var n = 0;
            {
                var elem = getElementById(document, 'rename-start-number');
                if (elem instanceof HTMLInputElement) {
                    n = parseInt(elem.value, 10);
                }
            }
            var elems = getElementById(document, 'bulk-rename-tree').querySelectorAll('input');
            for (var i = 0; i < elems.length; ++i) {
                var elem = elems[i];
                if (elem instanceof HTMLInputElement && elem.value === '') {
                    elem.value = ('0000' + n.toString()).slice(-digits);
                    elem.onblur(null);
                    ++n;
                }
            }
            _this.favorite.bulkRename(_this.bulkRenameData);
        }, false);
        getElementById(document, 'export-favorites-pfv').addEventListener('click', function (e) {
            saveAs(new Blob([_this.favorite.pfv], {
                type: 'text/plain'
            }), Main.cleanForFilename(_this.favorite.rootName) + '.pfv');
        }, false);
        getElementById(document, 'export-favorites-zip').addEventListener('click', function (e) {
            _this.exportZIP(false);
        }, false);
        getElementById(document, 'export-favorites-zip-filter-solo').addEventListener('click', function (e) {
            _this.exportZIP(true);
        }, false);
        var faviewExports = document.querySelectorAll('[data-export-faview]');
        for (var i = 0; i < faviewExports.length; ++i) {
            (function (elem) {
                elem.addEventListener('click', function (e) {
                    if (elem.getAttribute('data-export-faview') === 'prima') {
                        _this.exportFaviewPRIMA();
                        return;
                    }
                    _this.exportFaview(elem.getAttribute('data-export-faview') === 'standard', elem.getAttribute('data-structure') === 'flat');
                });
            })(faviewExports[i]);
        }
        getElementById(document, 'export-tiled').addEventListener('click', function (e) {
            var namingRule = getElementById(document, 'tiled-export-naming-rule');
            if (!(namingRule instanceof HTMLSelectElement)) {
                throw new Error('#tiled-export-naming-rule is not SELECT');
            }
            var format = getElementById(document, 'tiled-export-format');
            if (!(format instanceof HTMLSelectElement)) {
                throw new Error('#tiled-export-format is not SELECT');
            }
            var usetsx = getElementById(document, 'tiled-export-usetsx');
            if (!(usetsx instanceof HTMLSelectElement)) {
                throw new Error('#tiled-export-usetsx is not SELECT');
            }
            var compress = getElementById(document, 'tiled-export-compress');
            if (!(compress instanceof HTMLSelectElement)) {
                throw new Error('#tiled-export-compress is not SELECT');
            }
            var nr = namingRule.value.split(',');
            var fmt = format.value.split(',');
            var tsx = usetsx.value === 'yes';
            var cmp = compress.value === 'deflate';
            if (nr.length !== 2 || fmt.length !== 2) {
                throw new Error('tiled export form data is invalid');
            }
            _this.exportFaviewTiled(nr[0], nr[1] === 'flat', fmt[0], fmt[1], cmp, tsx);
        }, false);
        getElementById(document, 'export-layer-structure').addEventListener('click', function (e) {
            saveAs(new Blob([_this.layerRoot.text], {
                type: 'text/plain'
            }), 'layer.txt');
        }, false);
        var faviewToggleButtons = document.querySelectorAll('.psdtool-toggle-tree-faview');
        for (var i = 0; i < faviewToggleButtons.length; ++i) {
            faviewToggleButtons[i].addEventListener('click', function (e) { return _this.toggleTreeFaview(); }, false);
        }
        this.faviewSettingDialog = new FaviewSettingDialog(this.favorite);
        this.faviewSettingDialog.onUpdate = function () { return _this.favorite.updateLocalStorage(); };
    };
    Main.prototype.toggleTreeFaview = function (forceActiveFaview) {
        var pane = getElementById(document, 'layer-tree-pane');
        if (forceActiveFaview === undefined) {
            forceActiveFaview = !pane.classList.contains('faview-active');
        }
        if (forceActiveFaview) {
            pane.classList.add('faview-active');
            this.faviewOnRootChanged();
        }
        else {
            pane.classList.remove('faview-active');
        }
    };
    Main.prototype.startFaview = function () {
        var _this = this;
        this.resized();
        if (!this.faview) {
            var rootSel = void 0;
            var root = void 0;
            {
                var elem = getElementById(document, 'faview-root-node');
                if (elem instanceof HTMLSelectElement) {
                    rootSel = elem;
                }
                else {
                    throw new Error('element not found: #faview-root-node');
                }
            }
            {
                var elem = getElementById(document, 'faview-tree');
                if (elem instanceof HTMLUListElement) {
                    root = elem;
                }
                else {
                    throw new Error('element not found: #faview-tree');
                }
            }
            this.faview = new favorite.Faview(this.favorite, rootSel, root);
            this.faview.onRootChanged = function () { return _this.faviewOnRootChanged(); };
            this.faview.onChange = function (node) { return _this.faviewOnChange(node); };
        }
        getElementById(document, 'layer-tree-toolbar').classList.remove('hidden');
        this.faview.start();
        this.needRefreshFaview = false;
        if (this.faview.roots === 0) {
            this.endFaview();
        }
        else {
            this.resized();
        }
    };
    Main.prototype.refreshFaview = function () {
        if (!this.faview || this.faview.closed) {
            this.startFaview();
        }
        if (!this.needRefreshFaview) {
            return;
        }
        this.faview.refresh();
        this.needRefreshFaview = false;
        if (this.faview.roots === 0) {
            this.endFaview();
        }
    };
    Main.prototype.faviewOnRootChanged = function () {
        this.leaveReaderMode();
        for (var _i = 0, _a = this.faview.getActive(); _i < _a.length; _i++) {
            var n = _a[_i];
            this.layerRoot.deserializePartial(undefined, n.data.value, this.favorite.getFirstFilter(n));
        }
        this.redraw();
    };
    Main.prototype.faviewOnChange = function (node) {
        this.leaveReaderMode(node.data.value, this.favorite.getFirstFilter(node));
    };
    Main.prototype.endFaview = function () {
        getElementById(document, 'layer-tree-toolbar').classList.add('hidden');
        this.toggleTreeFaview(false);
        this.resized();
        this.faview.close();
    };
    Main.prototype.exportZIP = function (filterSolo) {
        var _this = this;
        var parents = [];
        var path = [], files = [];
        var r = function (children) {
            for (var _i = 0, children_1 = children; _i < children_1.length; _i++) {
                var item = children_1[_i];
                path.push(Main.cleanForFilename(item.text.replace(/^\*/, '')));
                switch (item.type) {
                    case 'root':
                        path.pop();
                        r(item.children);
                        path.push('');
                        break;
                    case 'folder':
                        parents.unshift(item);
                        r(item.children);
                        parents.shift();
                        break;
                    case 'filter':
                        parents.unshift(item);
                        r(item.children);
                        parents.shift();
                        break;
                    case 'item':
                        var filter = void 0;
                        for (var _a = 0, parents_1 = parents; _a < parents_1.length; _a++) {
                            var p = parents_1[_a];
                            if (p.type === 'filter') {
                                filter = p.data.value;
                                break;
                            }
                        }
                        if (filter) {
                            files.push({
                                name: path.join('\\') + '.png',
                                value: item.data.value,
                                filter: filter
                            });
                        }
                        else {
                            files.push({
                                name: path.join('\\') + '.png',
                                value: item.data.value
                            });
                        }
                        break;
                    default:
                        throw new Error('unknown item type: ' + item.type);
                }
                path.pop();
            }
        };
        var json = this.favorite.json;
        r(json);
        var backup = this.layerRoot.serialize(true);
        var z = new zipper.Zipper();
        var prog = new ProgressDialog('Exporting...', '');
        var aborted = false;
        var errorHandler = function (readableMessage, err) {
            z.dispose(function (err) { return undefined; });
            console.error(err);
            if (!aborted) {
                alert(readableMessage + ': ' + err);
            }
            prog.close();
        };
        // it is needed to avoid alert storm when reload during exporting.
        window.addEventListener('unload', function () { aborted = true; }, false);
        var added = 0;
        var addedHandler = function () {
            if (++added < files.length + 1) {
                prog.update(added / (files.length + 1), added === 1 ? 'drawing...' : '(' + added + '/' + files.length + ') ' + files[added - 1].name);
                return;
            }
            _this.layerRoot.deserialize(backup);
            prog.update(1, 'building a zip...');
            z.generate(function (blob) {
                prog.close();
                saveAs(blob, Main.cleanForFilename(_this.favorite.rootName) + '.zip');
                z.dispose(function (err) { return undefined; });
            }, function (e) { return errorHandler('cannot create a zip archive', e); });
        };
        z.init(function () {
            z.addCompress('favorites.pfv', new Blob([_this.favorite.pfv], { type: 'text/plain; charset=utf-8' }), addedHandler, function (e) { return errorHandler('cannot write pfv to a zip archive', e); });
            var i = 0;
            var process = function () {
                if ('filter' in files[i]) {
                    _this.layerRoot.deserializePartial(filterSolo ? '' : backup, files[i].value, files[i].filter);
                }
                else {
                    _this.layerRoot.deserialize(files[i].value);
                }
                _this.render(function (progress, canvas) {
                    if (progress !== 1) {
                        return;
                    }
                    Main.canvasToBlob(canvas).then(function (blob) {
                        z.add(files[i].name, blob, addedHandler, function (e) { return errorHandler('cannot write png to a zip archive', e); });
                        if (++i < files.length) {
                            setTimeout(process, 0);
                        }
                    });
                });
            };
            process();
        }, function (e) { return errorHandler('cannot create a zip archive', e); });
    };
    Main.prototype.exportFaview = function (includeItemCaption, flatten) {
        var _this = this;
        var z = new zipper.Zipper();
        var prog = new ProgressDialog('Exporting...', '');
        var aborted = false;
        var errorHandler = function (readableMessage, err) {
            z.dispose(function (err) { return undefined; });
            prog.close();
            console.error(err);
            if (!aborted) {
                alert(readableMessage + ': ' + err);
            }
        };
        // it is needed to avoid alert storm when reload during exporting.
        window.addEventListener('unload', function () { aborted = true; }, false);
        z.init(function () {
            _this.enumerateFaview(function (path, image, index, total, next) {
                var name = path.map(function (e, i) {
                    return Main.cleanForFilename((i && includeItemCaption ? e.caption + '-' : '') + e.name);
                }).join(flatten ? '_' : '\\') + '.png';
                Main.canvasToBlob(image).then(function (blob) {
                    z.add(name, blob, next, function (e) { return errorHandler('cannot write png to a zip archive', e); });
                });
                prog.update(index / total, name);
            }, function () {
                prog.update(1, 'building a zip...');
                z.generate(function (blob) {
                    saveAs(blob, 'simple-view.zip');
                    z.dispose(function (err) { return undefined; });
                    prog.close();
                }, function (e) { return errorHandler('cannot create a zip archive', e); });
            });
        }, function (e) { return errorHandler('cannot create a zip archive', e); });
    };
    Main.prototype.exportFaviewTiled = function (namingStyle, flatten, fileFormat, tileFormat, compress, useTSX) {
        var _this = this;
        var ext;
        switch (fileFormat) {
            case 'tmx':
                ext = 'tmx';
                break;
            case 'json':
                ext = 'json';
                break;
            case 'js':
                ext = 'js';
                break;
            case 'raw':
                switch (tileFormat) {
                    case 'csv':
                        ext = 'csv';
                        break;
                    case 'bin':
                        ext = 'bin';
                        break;
                }
                break;
        }
        var z = new zipper.Zipper(), td = new tileder.Tileder();
        var prog = new ProgressDialog('Exporting...', '');
        var aborted = false;
        var errorHandler = function (readableMessage, err) {
            z.dispose(function (err) { return undefined; });
            prog.close();
            console.error(err);
            if (!aborted) {
                alert(readableMessage + ': ' + err);
            }
        };
        // it is needed to avoid alert storm when reload during exporting.
        window.addEventListener('unload', function () { aborted = true; }, false);
        var queue = 0, finished = 0, completed = false;
        var processed = function () {
            ++finished;
            if (!completed || finished !== queue) {
                return;
            }
            prog.update(1, 'building a zip...');
            z.generate(function (blob) {
                saveAs(blob, 'tiled.zip');
                z.dispose(function (err) { return undefined; });
                prog.close();
            }, function (e) { return errorHandler('cannot create a zip archive', e); });
        };
        z.init(function () {
            _this.enumerateFaview(function (path, image, index, total, next) {
                var name = path.map(function (e, depth) {
                    switch (namingStyle) {
                        case 'standard':
                            return Main.cleanForFilename((depth ? e.caption + '-' : '') + e.name);
                        case 'compact':
                            return Main.cleanForFilename(e.name);
                        case 'index':
                            return e.index;
                    }
                }).join(flatten ? '_' : '\\');
                prog.update((index / total) / 2, name);
                td.add(name, image, next);
            }, function () {
                td.finish(tileFormat === 'binz', function (tsx, progress) {
                    ++queue;
                    Main.canvasToBlob(tsx.getImage(document)).then(function (blob) {
                        z.add(tsx.filename + ".png", blob, function () {
                            prog.update(1 / 2, tsx.filename + ".png");
                            processed();
                            if (useTSX) {
                                ++queue;
                                z.addCompress(tsx.filename + ".tsx", new Blob([tsx.export()], { type: 'text/xml; charset=utf-8' }), function () {
                                    prog.update(1 / 2, tsx.filename + ".tsx");
                                    processed();
                                }, function (e) { return errorHandler('cannot write tsx to a zip archive', e); });
                            }
                        }, function (e) { return errorHandler('cannot write png to a zip archive', e); });
                    });
                }, function (image, progress) {
                    var f = compress ? z.addCompress : z.add;
                    f = f.bind(z);
                    ++queue;
                    f(image.name + "." + ext, image.export(fileFormat, tileFormat, useTSX), function () {
                        prog.update(progress / 2 + 1 / 2, image.name + "." + ext);
                        processed();
                    }, function (e) { return errorHandler('cannot write file to a zip archive', e); });
                }, function () {
                    ++queue;
                    completed = true;
                    processed();
                });
            });
            // make faview.json / faview.js
            var faviewData = {
                format: ext,
                flatten: flatten,
                namingStyle: namingStyle,
                roots: _this.faview.items.map(function (root) {
                    return {
                        name: root.name,
                        captions: root.selects.map(function (sel) { return Main.cleanForFilename(sel.caption); }),
                        selects: root.selects.map(function (sel) { return sel.items.map(function (item) { return Main.cleanForFilename(item.name); }); })
                    };
                })
            };
            if (fileFormat === 'js') {
                ++queue;
                z.addCompress('faview.js', new Blob(["onFaviewLoaded(", JSON.stringify(faviewData), ');'], { type: 'text/javascript; charset=utf-8' }), function () { return processed(); }, function (e) { return errorHandler("cannot write faview.js to a zip archive", e); });
                ++queue;
                z.addCompress('viewer.html', new Blob([tileder.getViewer()], { type: 'text/html; charset=utf-8' }), function () { return processed(); }, function (e) { return errorHandler("cannot write viewer.html to a zip archive", e); });
            }
            else {
                ++queue;
                z.addCompress('faview.json', new Blob([JSON.stringify(faviewData)], { type: 'application/json; charset=utf-8' }), function () { return processed(); }, function (e) { return errorHandler("cannot write faview.json to a zip archive", e); });
            }
        }, function (e) { return errorHandler('cannot create a zip archive', e); });
    };
    Main.prototype.exportFaviewPRIMA = function () {
        var z = new primar.Primar(), td = new tileder.Tileder();
        var prog = new ProgressDialog('Exporting...', '');
        // make faview.json
        var faviewData = {
            width: 0,
            height: 0,
            tileSize: 16,
            roots: this.faview.items.map(function (root) {
                return {
                    name: root.name,
                    captions: root.selects.map(function (sel) { return Main.cleanForFilename(sel.caption); }),
                    selects: root.selects.map(function (sel) { return sel.items.map(function (item) { return Main.cleanForFilename(item.name); }); })
                };
            })
        };
        var queue = 0, finished = 0, completed = false;
        var processed = function () {
            ++finished;
            if (!completed || finished !== queue) {
                return;
            }
            prog.update(1, 'building a file...');
            var blob = z.generate(faviewData);
            saveAs(blob, 'tiled.prima');
            prog.close();
        };
        var first = true;
        this.enumerateFaview(function (path, image, index, total, next) {
            if (first) {
                faviewData.width = image.width;
                faviewData.height = image.height;
                first = false;
            }
            prog.update(index / total, index + "/" + total);
            td.add('', image, next);
        }, function () {
            td.finish(false, function (tsx, progress) {
                ++queue;
                Main.canvasToBlob(tsx.getImage(document)).then(function (blob) {
                    z.addImage(blob);
                    processed();
                });
            }, function (image, progress) {
                z.addMap(image.data);
            }, function () {
                ++queue;
                completed = true;
                processed();
            });
        });
    };
    Main.prototype.enumerateFaview = function (item, complete) {
        var _this = this;
        this.refreshFaview();
        var items = this.faview.items;
        var total = 0;
        for (var _i = 0, items_1 = items; _i < items_1.length; _i++) {
            var item_1 = items_1[_i];
            if (!item_1.selects.length) {
                continue;
            }
            var n = 1;
            for (var _a = 0, _b = item_1.selects; _a < _b.length; _a++) {
                var select = _b[_a];
                n *= select.items.length;
            }
            total += n;
        }
        if (!total) {
            return;
        }
        var backup = this.layerRoot.serialize(true);
        var added = 0;
        var sels;
        var path = [];
        var nextItemSet = function (depth, index, complete) {
            var sel = sels[depth];
            var selItem = sel.items[index];
            path.push({ caption: sel.caption, name: selItem.name, index: index });
            var fav = _this.favorite.get(selItem.value);
            _this.layerRoot.deserializePartial(undefined, fav.data ? fav.data.value : '', _this.favorite.getFirstFilter(fav));
            var nextItem = function () {
                path.pop();
                if (index < sel.items.length - 1) {
                    nextItemSet(depth, index + 1, complete);
                }
                else {
                    complete();
                }
            };
            if (depth < sels.length - 1) {
                if (sels[depth + 1].items.length) {
                    nextItemSet(depth + 1, 0, nextItem);
                }
                else {
                    nextItem();
                }
            }
            else {
                _this.render(function (progress, canvas) {
                    if (progress !== 1) {
                        return;
                    }
                    item(path, canvas, ++added, total, nextItem);
                });
            }
        };
        var nextRoot = function (index, complete) {
            var selItem = items[index];
            path.push({ caption: 'root', name: selItem.name, index: index });
            sels = selItem.selects;
            var nextRootItem = function () {
                path.pop();
                if (++index >= items.length) {
                    complete();
                }
                else {
                    nextRoot(index, complete);
                }
            };
            if (sels.length && sels[0].items.length) {
                nextItemSet(0, 0, nextRootItem);
            }
            else {
                nextRootItem();
            }
        };
        nextRoot(0, function () {
            _this.layerRoot.deserialize(backup);
            complete();
        });
    };
    Main.prototype.initUI = function () {
        var _this = this;
        this.optionAutoTrim = Main.getInputElement('#option-auto-trim');
        this.optionSafeMode = Main.getInputElement('#option-safe-mode');
        // save and restore scroll position of side-body on each tab.
        var toolbars = document.querySelectorAll('.psdtool-tab-toolbar');
        this.sideBody = getElementById(document, 'side-body');
        this.sideBody.addEventListener('scroll', function (e) {
            var pos = _this.sideBody.scrollTop + 'px';
            for (var i = 0; i < toolbars.length; ++i) {
                var elem_1 = toolbars[i];
                if (elem_1 instanceof HTMLElement) {
                    elem_1.style.top = pos;
                }
            }
        }, false);
        this.sideBodyScrollPos = {};
        jQuery('a[data-toggle="tab"]').on('hide.bs.tab', function (e) {
            var tab = e.target.getAttribute('href');
            _this.sideBodyScrollPos[tab] = {
                left: _this.sideBody.scrollLeft,
                top: _this.sideBody.scrollTop
            };
        }).on('shown.bs.tab', function (e) {
            var tab = e.target.getAttribute('href');
            if (tab in _this.sideBodyScrollPos) {
                _this.sideBody.scrollLeft = _this.sideBodyScrollPos[tab].left;
                _this.sideBody.scrollTop = _this.sideBodyScrollPos[tab].top;
            }
            _this.resized();
        });
        jQuery('a[data-toggle="tab"][href="#layer-tree-pane"]').on('show.bs.tab', function (e) {
            _this.leaveReaderMode();
            _this.refreshFaview();
        });
        this.initFavoriteUI();
        this.previewBackground = getElementById(document, 'preview-background');
        var elem = getElementById(document, 'preview');
        if (elem instanceof HTMLCanvasElement) {
            this.previewCanvas = elem;
        }
        else {
            throw new Error('element not found: #preview');
        }
        this.previewCanvas.addEventListener('dragstart', function (e) {
            var s = _this.previewCanvas.toDataURL();
            var name = _this.previewCanvas.getAttribute('data-filename');
            if (name) {
                var p = s.indexOf(';');
                s = s.substring(0, p) + ';filename=' + encodeURIComponent(name) + s.substring(p);
            }
            e.dataTransfer.setData('text/uri-list', s);
            e.dataTransfer.setData('text/plain', s);
        }, false);
        jQuery('#main').on('splitpaneresize', function (e) { return _this.resized(); }).splitPane();
        {
            var elem_2 = getElementById(document, 'flip-x');
            if (elem_2 instanceof HTMLInputElement) {
                this.flipX = elem_2;
            }
            jQuery(this.flipX).on('change', function (e) { return _this.redraw(); });
        }
        {
            var elem_3 = getElementById(document, 'flip-y');
            if (elem_3 instanceof HTMLInputElement) {
                this.flipY = elem_3;
            }
            jQuery(this.flipY).on('change', function (e) { return _this.redraw(); });
        }
        {
            var elem_4 = getElementById(document, 'fixed-side');
            if (elem_4 instanceof HTMLSelectElement) {
                this.fixedSide = elem_4;
            }
            else {
                throw new Error('element not found: #fixed-side');
            }
            this.fixedSide.addEventListener('change', function (e) { return _this.redraw(); }, false);
        }
        var lastPx;
        this.maxPixels = Main.getInputElement('#max-pixels');
        this.maxPixels.addEventListener('blur', function (e) {
            var v = Main.normalizeNumber(_this.maxPixels.value);
            if (v === lastPx) {
                return;
            }
            lastPx = v;
            _this.maxPixels.value = v;
            _this.redraw();
        }, false);
        {
            this.seqDlPrefix = Main.getInputElement('#seq-dl-prefix');
            this.seqDlNum = Main.getInputElement('#seq-dl-num');
            var elem_5 = getElementById(document, 'seq-dl');
            if (elem_5 instanceof HTMLButtonElement) {
                this.seqDl = elem_5;
            }
            else {
                throw new Error('element not found: #seq-dl');
            }
            this.seqDl.addEventListener('click', function (e) {
                var prefix = _this.seqDlPrefix.value;
                if (_this.seqDlNum.value === '') {
                    _this.save(prefix + '.png');
                    return;
                }
                var num = parseInt(Main.normalizeNumber(_this.seqDlNum.value), 10);
                if (num < 0) {
                    num = 0;
                }
                _this.save(prefix + ('0000' + num).slice(-4) + '.png');
                _this.seqDlNum.value = (num + 1).toString();
            }, false);
        }
        Mousetrap.pause();
    };
    Main.prototype.redraw = function () {
        var _this = this;
        this.seqDl.disabled = true;
        this.render(function (progress, canvas) {
            _this.previewBackground.style.width = canvas.width + 'px';
            _this.previewBackground.style.height = canvas.height + 'px';
            _this.seqDl.disabled = progress !== 1;
            _this.previewCanvas.draggable = progress === 1;
            setTimeout(function () {
                _this.previewCanvas.width = canvas.width;
                _this.previewCanvas.height = canvas.height;
                _this.previewCanvas.getContext('2d').drawImage(canvas, 0, 0);
            }, 0);
        });
        this.layerRoot.updateClass();
    };
    Main.prototype.save = function (filename) {
        Main.canvasToBlob(this.previewCanvas).then(function (blob) {
            saveAs(blob, filename);
        });
    };
    Main.prototype.loadRenderer = function (psd) {
        this.renderer = new renderer.Renderer(psd);
        var lNodes = this.layerRoot.nodes;
        var rNodes = this.renderer.nodes;
        for (var key in rNodes) {
            if (!rNodes.hasOwnProperty(key)) {
                continue;
            }
            (function (r, l) {
                r.getVisibleState = function () { return l.checked; };
            })(rNodes[key], lNodes[key]);
        }
    };
    Main.prototype.render = function (callback) {
        var autoTrim = this.optionAutoTrim.checked;
        var w = autoTrim ? this.renderer.Width : this.renderer.CanvasWidth;
        var h = autoTrim ? this.renderer.Height : this.renderer.CanvasHeight;
        var px = parseInt(this.maxPixels.value, 10);
        var scale = 1;
        switch (this.fixedSide.value) {
            case 'w':
                if (w > px) {
                    scale = px / w;
                }
                break;
            case 'h':
                if (h > px) {
                    scale = px / h;
                }
                break;
        }
        if (w * scale < 1 || h * scale < 1) {
            if (w > h) {
                scale = 1 / h;
            }
            else {
                scale = 1 / w;
            }
        }
        var ltf;
        var rf;
        if (this.flipX.checked) {
            if (this.flipY.checked) {
                ltf = 3 /* FlipXY */;
                rf = 3 /* FlipXY */;
            }
            else {
                ltf = 1 /* FlipX */;
                rf = 1 /* FlipX */;
            }
        }
        else {
            if (this.flipY.checked) {
                ltf = 2 /* FlipY */;
                rf = 2 /* FlipY */;
            }
            else {
                ltf = 0 /* NoFlip */;
                rf = 0 /* NoFlip */;
            }
        }
        if (this.layerRoot.flip !== ltf) {
            this.layerRoot.flip = ltf;
        }
        this.renderer.render(scale, autoTrim, rf, callback);
    };
    Main.prototype.initLayerTree = function () {
        var _this = this;
        {
            var layerTree = getElementById(document, 'layer-tree');
            if (layerTree instanceof HTMLUListElement) {
                this.layerTree = layerTree;
            }
            else {
                throw new Error('#layer-tree is not an UL element');
            }
        }
        this.layerTree.innerHTML = '';
        this.layerTree.addEventListener('click', function (e) {
            var target = e.target;
            if (target instanceof HTMLInputElement && target.classList.contains('psdtool-layer-visible')) {
                var n = _this.layerRoot.nodes[parseInt(target.getAttribute('data-seq') || '0', 10)];
                if (target.checked) {
                    _this.lastCheckedNode = n;
                }
                for (var p = n.parent; !p.isRoot; p = p.parent) {
                    p.checked = true;
                }
                if (n.clippedBy) {
                    n.clippedBy.checked = true;
                }
                _this.redraw();
            }
        }, false);
    };
    Main.prototype.loadLayerTree = function (psd) {
        if (!this.layerTree) {
            this.initLayerTree();
        }
        this.layerRoot = new layertree.LayerTree(this.optionSafeMode.checked, this.layerTree, psd);
    };
    Main.prototype.enterReaderMode = function (state, filter, filename) {
        if (!this.previewBackground.classList.contains('reader')) {
            this.previewBackground.classList.add('reader');
            this.normalModeState = this.layerRoot.serialize(true);
        }
        if (!filter) {
            this.layerRoot.deserialize(state);
        }
        else {
            this.layerRoot.deserializePartial(this.normalModeState, state, filter);
        }
        if (filename) {
            this.previewCanvas.setAttribute('data-filename', filename);
        }
        this.redraw();
    };
    Main.prototype.leaveReaderMode = function (state, filter) {
        if (this.previewBackground.classList.contains('reader')) {
            this.previewBackground.classList.remove('reader');
        }
        if (state) {
            this.previewCanvas.removeAttribute('data-filename');
            if (!filter) {
                this.layerRoot.deserialize(state);
            }
            else {
                if (this.normalModeState) {
                    this.layerRoot.deserializePartial(this.normalModeState, state, filter);
                }
                else {
                    this.layerRoot.deserializePartial(undefined, state, filter);
                }
            }
        }
        else if (this.normalModeState) {
            this.previewCanvas.removeAttribute('data-filename');
            this.layerRoot.deserialize(this.normalModeState);
        }
        else {
            return;
        }
        this.redraw();
        this.normalModeState = null;
    };
    // static --------------------------------
    Main.getInputElement = function (query) {
        var elem = document.querySelector(query);
        if (elem instanceof HTMLInputElement) {
            return elem;
        }
        throw new Error('element not found ' + query);
    };
    Main.cleanForFilename = function (f) {
        return f.replace(/[\x00-\x1f\x22\x2a\x2f\x3a\x3c\x3e\x3f\x7c\x7f]+/g, '_');
    };
    Main.formateDate = function (d) {
        var s = d.getFullYear() + '-';
        s += ('0' + (d.getMonth() + 1)).slice(-2) + '-';
        s += ('0' + d.getDate()).slice(-2) + ' ';
        s += ('0' + d.getHours()).slice(-2) + ':';
        s += ('0' + d.getMinutes()).slice(-2) + ':';
        s += ('0' + d.getSeconds()).slice(-2);
        return s;
    };
    Main.extractFilePrefixFromUrl = function (url) {
        url = url.replace(/#[^#]*$/, '');
        url = url.replace(/\?[^?]*$/, '');
        url = url.replace(/^.*?([^\/]+)$/, '$1');
        url = url.replace(/\..*$/i, '') + '_';
        return url;
    };
    Main.initDropZone = function (dropZoneId, loader) {
        var dz = getElementById(document, dropZoneId);
        dz.addEventListener('dragenter', function (e) {
            dz.classList.add('psdtool-drop-active');
            e.preventDefault();
            e.stopPropagation();
            return false;
        }, false);
        dz.addEventListener('dragover', function (e) {
            dz.classList.add('psdtool-drop-active');
            e.preventDefault();
            e.stopPropagation();
            return false;
        }, false);
        dz.addEventListener('dragleave', function (e) {
            dz.classList.remove('psdtool-drop-active');
            e.preventDefault();
            e.stopPropagation();
            return false;
        }, false);
        dz.addEventListener('drop', function (e) {
            dz.classList.remove('psdtool-drop-active');
            if (e.dataTransfer.files.length > 0) {
                loader(e.dataTransfer.files);
            }
            e.preventDefault();
            e.stopPropagation();
            return false;
        }, false);
        var f = dz.querySelector('input[type=file]');
        if (f instanceof HTMLInputElement) {
            var file_1 = f;
            f.addEventListener('change', function (e) {
                loader(file_1.files);
                file_1.value = null;
            }, false);
        }
    };
    Main.canvasToBlob = function (canvas) {
        return new Promise(function (resolve) {
            if (HTMLCanvasElement.prototype.toBlob) {
                canvas.toBlob(function (blob) { return resolve(blob); });
                return;
            }
            var bin = atob(canvas.toDataURL().split(',')[1]);
            var buf = new Uint8Array(bin.length);
            for (var i = 0, len = bin.length; i < len; ++i) {
                buf[i] = bin.charCodeAt(i);
            }
            resolve(new Blob([buf], { type: 'image/png' }));
        });
    };
    Main.normalizeNumber = function (s) {
        return s.replace(/[\uff10-\uff19]/g, function (m) {
            return (m[0].charCodeAt(0) - 0xff10).toString();
        });
    };
    Main.loadAsBlobCrossDomain = function (progress, url) {
        var deferred = m.deferred();
        if (location.protocol === 'https:' && url.substring(0, 5) === 'http:') {
            setTimeout(function () { return deferred.reject(new Error('cannot access to the insecure content from HTTPS.')); }, 0);
            return deferred.promise;
        }
        var ifr = document.createElement('iframe');
        var port;
        var timer = setTimeout(function () {
            port.onmessage = null;
            document.body.removeChild(ifr);
            deferred.reject(new Error('something went wrong'));
        }, 20000);
        ifr.setAttribute('sandbox', 'allow-scripts allow-same-origin');
        ifr.onload = function (e) {
            var msgCh = new MessageChannel();
            port = msgCh.port1;
            port.onmessage = function (e) {
                if (timer) {
                    clearTimeout(timer);
                    timer = 0;
                }
                if (!e.data || !e.data.type) {
                    return;
                }
                switch (e.data.type) {
                    case 'complete':
                        document.body.removeChild(ifr);
                        if (!e.data.data) {
                            deferred.reject(new Error('something went wrong'));
                            return;
                        }
                        progress(1);
                        deferred.resolve({
                            buffer: e.data.data,
                            name: e.data.name ? e.data.name : Main.extractFilePrefixFromUrl(url)
                        });
                        return;
                    case 'error':
                        document.body.removeChild(ifr);
                        deferred.reject(new Error(e.data.message ? e.data.message : 'could not receive data'));
                        return;
                    case 'progress':
                        if (('loaded' in e.data) && ('total' in e.data)) {
                            progress(e.data.loaded / e.data.total);
                        }
                        return;
                }
            };
            ifr.contentWindow.postMessage(location.protocol, url.replace(/^([^:]+:\/\/[^\/]+).*$/, '$1'), [msgCh.port2]);
        };
        ifr.src = url;
        ifr.style.display = 'none';
        document.body.appendChild(ifr);
        return deferred.promise;
    };
    Main.loadAsBlobFromString = function (progress, url) {
        if (url.substring(0, 3) === 'xd:') {
            return this.loadAsBlobCrossDomain(progress, url.substring(3));
        }
        var deferred = m.deferred();
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url);
        xhr.responseType = 'blob';
        xhr.onload = function (e) {
            progress(1);
            if (xhr.status === 200) {
                deferred.resolve({
                    buffer: xhr.response,
                    name: Main.extractFilePrefixFromUrl(url)
                });
                return;
            }
            deferred.reject(new Error(xhr.status + ' ' + xhr.statusText));
        };
        xhr.onerror = function (e) {
            console.error(e);
            deferred.reject(new Error('could not receive data'));
        };
        xhr.onprogress = function (e) { return progress(e.loaded / e.total); };
        xhr.send(null);
        return deferred.promise;
    };
    Main.loadAsBlob = function (progress, file_or_url) {
        if (file_or_url instanceof File) {
            var file_2 = file_or_url;
            var deferred_1 = m.deferred();
            setTimeout(function () {
                deferred_1.resolve({
                    buffer: file_2,
                    name: file_2.name.replace(/\..*$/i, '') + '_'
                });
            }, 0);
            return deferred_1.promise;
        }
        else {
            return this.loadAsBlobFromString(progress, file_or_url);
        }
    };
    return Main;
}());
exports.Main = Main;
(function () {
    var originalStopCallback = Mousetrap.prototype.stopCallback;
    Mousetrap.prototype.stopCallback = function (e, element, combo) {
        if (!this.paused) {
            if (element.classList.contains('psdtool-layer-visible') || element.classList.contains('psdtool-faview-select')) {
                return false;
            }
        }
        return originalStopCallback.call(this, e, element, combo);
    };
    Mousetrap.init();
})();
var main = new Main();
document.addEventListener('DOMContentLoaded', function (e) { return main.init(); }, false);

},{"./favorite":4,"./layertree":5,"./primar":8,"./renderer":9,"./tileder":10,"./zipper":11}],8:[function(require,module,exports){
"use strict";
var lz4 = require('./lz4/src/lz4');
function copy(dest, src, di, si, len) {
    for (var i = 0; i < len; ++i) {
        dest[di++] = src[si++];
    }
}
function fillZero(dest, di, len) {
    for (var i = 0; i < len; ++i) {
        dest[di++] = 0;
    }
}
var Primar = (function () {
    function Primar() {
        this.images = [];
        this.blocks = [];
        this.buffer = new Uint8Array(1024 * 1024);
        this.compBuf = new Uint8Array(lz4.compressBlockBound(this.buffer.length));
        this.used = 0;
    }
    Primar.prototype.addImage = function (blob) {
        this.images.push(blob);
    };
    Primar.prototype.addMap = function (ab) {
        var src = new Uint8Array(ab);
        if (this.buffer.length - this.used >= src.length) {
            copy(this.buffer, src, this.used, 0, src.length);
            this.used += src.length;
        }
        else {
            var alen = this.buffer.length - this.used;
            copy(this.buffer, src, this.used, 0, alen);
            {
                var written = lz4.compressBlockHC(this.buffer.buffer, this.compBuf.buffer, 0);
                var block = new Uint8Array(written + 4);
                new DataView(block.buffer).setUint32(0, written, true);
                copy(block, this.compBuf, 4, 0, written);
                this.blocks.push(block.buffer);
            }
            this.used = src.length - alen;
            copy(this.buffer, src, 0, alen, this.used);
        }
    };
    Primar.prototype.finishMap = function () {
        if (this.used === 0) {
            return;
        }
        fillZero(this.buffer, this.used, this.buffer.length - this.used);
        var written = lz4.compressBlockHC(this.buffer.buffer, this.compBuf.buffer, 0);
        var block = new Uint8Array(written + 4);
        new DataView(block.buffer).setUint32(0, written, true);
        copy(block, this.compBuf, 4, 0, written);
        this.blocks.push(block.buffer);
        this.used = 0;
    };
    Primar.prototype.generate = function (structure) {
        var archive = [];
        {
            var blob = new Blob([JSON.stringify(structure)], { type: 'application/json; charset=utf-8' });
            var header_1 = new ArrayBuffer(8);
            var dv_1 = new DataView(header_1);
            dv_1.setUint32(0, 0x184d2a50, true);
            dv_1.setUint32(4, blob.size, true);
            archive.push(header_1, blob);
        }
        for (var _i = 0, _a = this.images; _i < _a.length; _i++) {
            var image = _a[_i];
            var header_2 = new ArrayBuffer(8);
            var dv_2 = new DataView(header_2);
            dv_2.setUint32(0, 0x184d2a51, true);
            dv_2.setUint32(4, image.size, true);
            archive.push(header_2, image);
        }
        var header = new ArrayBuffer(7);
        var dv = new DataView(header);
        dv.setUint32(0, 0x184d2204, true);
        dv.setUint8(4, 0x60);
        dv.setUint8(5, 0x60);
        dv.setUint8(6, 0x51);
        archive.push(header);
        this.finishMap();
        Array.prototype.push.apply(archive, this.blocks);
        archive.push(new ArrayBuffer(4));
        return new Blob(archive, { type: 'application/octet-binary' });
    };
    return Primar;
}());
exports.Primar = Primar;

},{"./lz4/src/lz4":6}],9:[function(require,module,exports){
"use strict";
var blend = require('./blend/blend');
var downscaler = require('./downscaler');
(function (FlipType) {
    FlipType[FlipType["NoFlip"] = 0] = "NoFlip";
    FlipType[FlipType["FlipX"] = 1] = "FlipX";
    FlipType[FlipType["FlipY"] = 2] = "FlipY";
    FlipType[FlipType["FlipXY"] = 3] = "FlipXY";
})(exports.FlipType || (exports.FlipType = {}));
var FlipType = exports.FlipType;
var Node = (function () {
    function Node(layer, parent) {
        var _this = this;
        this.layer = layer;
        this.parent = parent;
        this.getVisibleState = function () { return _this.layer.Visible; };
        this.state = '';
        this.nextState = '';
        this.children = [];
        if (!layer) {
            this.id = -1;
            return;
        }
        this.id = layer.SeqID;
        var w = layer.Width, h = layer.Height;
        if (w * h <= 0) {
            return;
        }
        this.buffer = document.createElement('canvas');
        this.buffer.width = w;
        this.buffer.height = h;
    }
    Object.defineProperty(Node.prototype, "visible", {
        get: function () { return this.getVisibleState(); },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Node.prototype, "stateHash", {
        get: function () { return Node.calcHash(this.state).toString(16); },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Node.prototype, "nextStateHash", {
        get: function () { return Node.calcHash(this.nextState).toString(16); },
        enumerable: true,
        configurable: true
    });
    // http://stackoverflow.com/a/7616484
    Node.calcHash = function (s) {
        if (s.length === 0) {
            return 0;
        }
        var hash = 0, chr;
        for (var i = 0; i < s.length; ++i) {
            chr = s.charCodeAt(i);
            hash = ((hash << 5) - hash) + chr;
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    };
    return Node;
}());
exports.Node = Node;
var Renderer = (function () {
    function Renderer(psd) {
        this.psd = psd;
        this.canvas = document.createElement('canvas');
        this.root = new Node(undefined, undefined);
        this.nodes = {};
        this.buildTree(this.root, psd);
        this.root.buffer = document.createElement('canvas');
        this.root.buffer.width = psd.Width;
        this.root.buffer.height = psd.Height;
        this.registerClippingGroup(this.root);
    }
    Renderer.prototype.draw = function (ctx, src, x, y, opacity, blendMode) {
        switch (blendMode) {
            case 'clear':
            case 'copy':
            case 'destination':
            case 'source-over':
            case 'destination-over':
            case 'source-in':
            case 'destination-in':
            case 'source-out':
            case 'destination-out':
            case 'source-atop':
            case 'destination-atop':
            case 'xor':
                ctx.globalAlpha = opacity;
                ctx.globalCompositeOperation = blendMode;
                ctx.drawImage(src, x, y);
                return;
        }
        blend.blend(ctx.canvas, src, x, y, src.width, src.height, opacity, blendMode);
        return;
    };
    Renderer.prototype.clear = function (ctx) {
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    };
    Object.defineProperty(Renderer.prototype, "Width", {
        get: function () { return this.psd.Width; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Renderer.prototype, "Height", {
        get: function () { return this.psd.Height; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Renderer.prototype, "CanvasWidth", {
        get: function () { return this.psd.CanvasWidth; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Renderer.prototype, "CanvasHeight", {
        get: function () { return this.psd.CanvasHeight; },
        enumerable: true,
        configurable: true
    });
    Renderer.prototype.buildTree = function (n, layer) {
        var nc;
        for (var _i = 0, _a = layer.Children; _i < _a.length; _i++) {
            var lc = _a[_i];
            nc = new Node(lc, n);
            this.buildTree(nc, lc);
            n.children.push(nc);
            this.nodes[nc.id] = nc;
        }
    };
    Renderer.prototype.registerClippingGroup = function (n) {
        var clip = [];
        for (var nc = void 0, i = n.children.length - 1; i >= 0; --i) {
            nc = n.children[i];
            this.registerClippingGroup(nc);
            if (nc.layer.Clipping) {
                clip.unshift(nc);
            }
            else {
                if (clip.length) {
                    for (var _i = 0, clip_1 = clip; _i < clip_1.length; _i++) {
                        var c = clip_1[_i];
                        c.clippedBy = nc;
                    }
                    nc.clippingBuffer = document.createElement('canvas');
                    nc.clippingBuffer.width = nc.layer.Width;
                    nc.clippingBuffer.height = nc.layer.Height;
                    nc.clip = clip;
                }
                clip = [];
            }
        }
    };
    Renderer.prototype.render = function (scale, autoTrim, flip, callback) {
        var _this = this;
        var s = Date.now();
        this.root.nextState = '';
        for (var _i = 0, _a = this.root.children; _i < _a.length; _i++) {
            var cn = _a[_i];
            if (!cn.layer.Clipping || cn.layer.BlendMode === 'pass-through') {
                if (this.calculateNextState(cn, cn.layer.Opacity / 255, cn.layer.BlendMode)) {
                    this.root.nextState += cn.nextStateHash + '+';
                }
            }
        }
        var bb = this.root.buffer;
        if (this.root.state !== this.root.nextState) {
            var bbctx = bb.getContext('2d');
            this.clear(bbctx);
            for (var _b = 0, _c = this.root.children; _b < _c.length; _b++) {
                var cn = _c[_b];
                if (!cn.layer.Clipping || cn.layer.BlendMode === 'pass-through') {
                    this.drawLayer(bbctx, cn, -this.psd.X, -this.psd.Y, cn.layer.Opacity / 255, cn.layer.BlendMode);
                }
            }
            this.root.state = this.root.nextState;
        }
        console.log('rendering: ' + (Date.now() - s));
        s = Date.now();
        this.downScale(bb, scale, function (progress, c) {
            console.log('scaling: ' + (Date.now() - s) + '(phase:' + progress + ')');
            var w = autoTrim ? _this.psd.Width : _this.psd.CanvasWidth;
            var h = autoTrim ? _this.psd.Height : _this.psd.CanvasHeight;
            var canvas = _this.canvas;
            canvas.width = 0 | w * scale;
            canvas.height = 0 | h * scale;
            var ctx = canvas.getContext('2d');
            if (!ctx) {
                throw new Error('cannot get CanvasRenderingContext2D');
            }
            _this.clear(ctx);
            ctx.save();
            switch (flip) {
                case 1 /* FlipX */:
                    ctx.translate(canvas.width, 0);
                    ctx.scale(-1, 1);
                    break;
                case 2 /* FlipY */:
                    ctx.translate(0, canvas.height);
                    ctx.scale(1, -1);
                    break;
                case 3 /* FlipXY */:
                    ctx.translate(canvas.width, canvas.height);
                    ctx.scale(-1, -1);
                    break;
            }
            ctx.drawImage(c, autoTrim ? 0 : 0 | _this.psd.X * scale, autoTrim ? 0 : 0 | _this.psd.Y * scale);
            ctx.restore();
            callback(progress, canvas);
        });
    };
    Renderer.prototype.downScale = function (src, scale, callback) {
        if (scale === 1) {
            callback(1, src);
            return;
        }
        var ds = new downscaler.DownScaler(src, scale);
        callback(0, ds.fast());
        setTimeout(function () { return ds.beautifulWorker(function (canvas) { return callback(1, canvas); }); }, 0);
    };
    Renderer.prototype.calculateNextState = function (n, opacity, blendMode) {
        if (!n.visible || opacity === 0) {
            return false;
        }
        n.nextState = '';
        if (n.layer.Children.length) {
            if (blendMode === 'pass-through') {
                n.nextState += n.parent.nextStateHash + '+';
            }
            for (var i = 0, child = void 0; i < n.layer.Children.length; ++i) {
                child = n.layer.Children[i];
                if (!child.Clipping || child.BlendMode === 'pass-through') {
                    if (this.calculateNextState(n.children[i], child.Opacity / 255, child.BlendMode)) {
                        n.nextState += n.children[i].nextStateHash + '+';
                    }
                }
            }
        }
        else if (n.layer.Canvas) {
            n.nextState = n.id.toString();
        }
        if (n.layer.Mask) {
            n.nextState += '|lm';
        }
        if (!n.clip || blendMode === 'pass-through') {
            return true;
        }
        n.nextState += '|cm' + (n.layer.BlendClippedElements ? '1' : '0') + ':';
        if (n.layer.BlendClippedElements) {
            for (var i = 0, cn = void 0; i < n.clip.length; ++i) {
                cn = n.clip[i];
                if (this.calculateNextState(n.clip[i], cn.layer.Opacity / 255, cn.layer.BlendMode)) {
                    n.nextState += n.clip[i].nextStateHash + '+';
                }
            }
            return true;
        }
        // we cannot cache in this mode
        n.nextState += Date.now() + '_' + Math.random() + ':';
        for (var _i = 0, _a = n.clip; _i < _a.length; _i++) {
            var cn = _a[_i];
            if (this.calculateNextState(cn, 1, 'source-over')) {
                n.nextState += cn.nextStateHash + '+';
            }
        }
        return true;
    };
    Renderer.prototype.drawLayer = function (ctx, n, x, y, opacity, blendMode) {
        if (!n.visible || opacity === 0 || (!n.children.length && !n.layer.Canvas)) {
            return false;
        }
        var bb = n.buffer;
        if (n.state === n.nextState) {
            if (blendMode === 'pass-through') {
                // ctx.globalAlpha = 1;
                // ctx.globalCompositeOperation = 'source-over';
                // ctx.clearRect(x + n.layer.X, y + n.layer.Y, bb.width, bb.height);
                this.draw(ctx, bb, x + n.layer.X, y + n.layer.Y, 1, 'source-over');
            }
            else {
                this.draw(ctx, bb, x + n.layer.X, y + n.layer.Y, opacity, blendMode);
            }
            return true;
        }
        var bbctx = bb.getContext('2d');
        if (!bbctx) {
            throw new Error('cannot get CanvasRenderingContext2D for BackBuffer');
        }
        this.clear(bbctx);
        if (n.children.length) {
            if (blendMode === 'pass-through') {
                this.draw(bbctx, n.parent.buffer, -x - n.layer.X, -y - n.layer.Y, 1, 'source-over');
                for (var _i = 0, _a = n.children; _i < _a.length; _i++) {
                    var cn = _a[_i];
                    if (!cn.layer.Clipping || cn.layer.BlendMode === 'pass-through') {
                        this.drawLayer(bbctx, cn, -n.layer.X, -n.layer.Y, cn.layer.Opacity * opacity / 255, cn.layer.BlendMode);
                    }
                }
            }
            else {
                for (var _b = 0, _c = n.children; _b < _c.length; _b++) {
                    var cn = _c[_b];
                    if (!cn.layer.Clipping || cn.layer.BlendMode === 'pass-through') {
                        this.drawLayer(bbctx, cn, -n.layer.X, -n.layer.Y, cn.layer.Opacity / 255, cn.layer.BlendMode);
                    }
                }
            }
        }
        else if (n.layer.Canvas) {
            this.draw(bbctx, n.layer.Canvas, 0, 0, 1, 'source-over');
        }
        if (n.layer.Mask) {
            this.draw(bbctx, n.layer.Mask, n.layer.MaskX - n.layer.X, n.layer.MaskY - n.layer.Y, 1, n.layer.MaskDefaultColor ? 'destination-out' : 'destination-in');
        }
        if (!n.clip || blendMode === 'pass-through') {
            if (blendMode === 'pass-through') {
                // ctx.globalAlpha = 1;
                // ctx.globalCompositeOperation = 'source-over';
                // ctx.clearRect(x + n.layer.X, y + n.layer.Y, bb.width, bb.height);
                this.draw(ctx, bb, x + n.layer.X, y + n.layer.Y, 1, 'source-over');
            }
            else {
                this.draw(ctx, bb, x + n.layer.X, y + n.layer.Y, opacity, blendMode);
            }
            n.state = n.nextState;
            return true;
        }
        var cbb = n.clippingBuffer;
        var cbbctx = cbb.getContext('2d');
        if (!cbbctx) {
            throw new Error('cannot get CanvasRenderingContext2D for ClipBackBuffer');
        }
        if (n.layer.BlendClippedElements) {
            this.draw(cbbctx, bb, 0, 0, 1, 'copy-opaque');
            for (var _d = 0, _e = n.clip; _d < _e.length; _d++) {
                var cn = _e[_d];
                if (cn.layer.Clipping && cn.layer.BlendMode !== 'pass-through') {
                    this.drawLayer(cbbctx, cn, -n.layer.X, -n.layer.Y, cn.layer.Opacity / 255, cn.layer.BlendMode);
                }
            }
            this.draw(cbbctx, bb, 0, 0, 1, 'copy-alpha');
            // swap buffer for next time
            n.clippingBuffer = bb;
            n.buffer = cbb;
            if (blendMode === 'pass-through') {
                // ctx.globalAlpha = 1;
                // ctx.globalCompositeOperation = 'source-over';
                // ctx.clearRect(x + n.layer.X, y + n.layer.Y, cbb.width, cbb.height);
                this.draw(ctx, cbb, x + n.layer.X, y + n.layer.Y, 1, 'source-over');
            }
            else {
                this.draw(ctx, cbb, x + n.layer.X, y + n.layer.Y, opacity, blendMode);
            }
            n.state = n.nextState;
            return true;
        }
        // this is minor code path.
        // it is only used when "Blend Clipped Layers as Group" is unchecked in Photoshop's Layer Style dialog.
        // TODO: pass-through support
        this.draw(ctx, bb, x + n.layer.X, y + n.layer.Y, opacity, blendMode);
        this.clear(cbbctx);
        for (var _f = 0, _g = n.clip; _f < _g.length; _f++) {
            var cn = _g[_f];
            if (!this.drawLayer(cbbctx, cn, -n.layer.X, -n.layer.Y, 1, 'source-over')) {
                continue;
            }
            this.draw(cbbctx, bb, 0, 0, 1, 'destination-in');
            this.draw(ctx, cbb, x + n.layer.X, y + n.layer.Y, cn.layer.Opacity / 255, cn.layer.BlendMode);
            this.clear(cbbctx);
        }
        n.state = n.nextState;
        return true;
    };
    return Renderer;
}());
exports.Renderer = Renderer;

},{"./blend/blend":1,"./downscaler":3}],10:[function(require,module,exports){
'use strict';
var crc32 = require('./crc32');
var Image = (function () {
    function Image(data, tileSet) {
        this.index = data.index;
        this.name = data.name;
        this.width = data.width;
        this.height = data.height;
        this.originalWidth = data.originalWidth;
        this.originalHeight = data.originalHeight;
        this.tileWidth = data.tileWidth;
        this.tileHeight = data.tileHeight;
        this.data = data.data;
        this.deflated = data.deflated;
        this.tileSet = tileSet;
    }
    Image.prototype.export = function (fileFormat, tileFormat, useTSX) {
        if (this.deflated && tileFormat !== 'binz') {
            throw new Error("cannot export by '" + tileFormat + "' when have the compressed data");
        }
        if (!this.deflated && tileFormat === 'binz') {
            throw new Error("cannot export by '" + tileFormat + "' when have the uncompressed data");
        }
        switch (fileFormat) {
            case 'tmx':
                return this.exportTMX(tileFormat, useTSX);
            case 'json':
                return this.exportJSON(tileFormat, useTSX);
            case 'js':
                return this.exportJS(tileFormat, useTSX);
            case 'raw':
                return this.exportRaw(tileFormat);
        }
        throw new Error('unknown file format: ' + fileFormat);
    };
    Image.prototype.exportRaw = function (tileFormat) {
        switch (tileFormat) {
            case 'csv':
                return new Blob([int32ArrayToCSV(new Int32Array(this.data), this.width, '\n')], { type: 'text/csv; charset=utf-8' });
            case 'bin':
                return new Blob([this.data], { type: 'application/octet-binary' });
            default:
                throw new Error('unknown tile format: ' + tileFormat);
        }
    };
    Image.prototype.exportJSON = function (tileFormat, useTSX) {
        var ts = [];
        var path = new Array(this.name.split('\\').length).join('..\\');
        for (var i = 0; i < this.tileSet.length; ++i) {
            if (useTSX) {
                ts.push(this.tileSet[i].getTileSetReference(path));
            }
            else {
                ts.push(this.tileSet[i].getTileSet(path));
            }
        }
        var o = {
            width: this.width,
            height: this.height,
            tilewidth: this.tileWidth,
            tileheight: this.tileHeight,
            nextobjectid: 1,
            orientation: 'orthogonal',
            renderorder: 'right-down',
            version: 1,
            propertytypes: {
                originalwidth: 'int',
                originalheight: 'int'
            },
            properties: {
                originalwidth: this.originalWidth,
                originalheight: this.originalHeight
            },
            tilesets: ts,
            layers: [{
                    height: this.height,
                    name: this.name,
                    opacity: 1,
                    type: 'tilelayer',
                    visible: true,
                    width: this.width,
                    x: 0,
                    y: 0
                }]
        };
        switch (tileFormat) {
            case 'csv':
                o.layers[0].data = Array.prototype.slice.call(new Int32Array(this.data));
                break;
            case 'bin':
                o.layers[0].encoding = 'base64';
                o.layers[0].data = arrayBufferToString(Base64.encode(this.data));
                break;
            case 'binz':
                o.layers[0].encoding = 'base64';
                o.layers[0].compression = 'zlib';
                o.layers[0].data = arrayBufferToString(Base64.encode(this.data));
                break;
            default:
                throw new Error('unknown tile format: ' + tileFormat);
        }
        return new Blob([JSON.stringify(o)], { type: 'application/json; charset=utf-8' });
    };
    Image.prototype.exportJS = function (tileFormat, useTSX) {
        return new Blob(["(function(name,data){\n if(typeof onTileMapLoaded === 'undefined') {\n  if(typeof TileMaps === 'undefined') TileMaps = {};\n  TileMaps[name] = data;\n } else {\n  onTileMapLoaded(name, data);\n }})(",
            JSON.stringify(this.name), ", ", this.exportJSON(tileFormat, useTSX), ');'], { type: 'text/javascript; charset=utf-8' });
    };
    Image.prototype.exportTMX = function (tileFormat, useTSX) {
        var xml = [
            "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n",
            "<map version=\"1.0\" orientation=\"orthogonal\" renderorder=\"right-down\"",
            (" width=\"" + this.width + "\" height=\"" + this.height + "\""),
            (" tilewidth=\"" + this.tileWidth + "\" tileheight=\"" + this.tileHeight + "\" nextobjectid=\"1\">\n"),
            "\t<properties>\n",
            ("\t\t<property name=\"originalWidth\" type=\"int\" value=\"" + this.originalWidth + "\"/>\n"),
            ("\t\t<property name=\"originalHeight\" type=\"int\" value=\"" + this.originalHeight + "\"/>\n"),
            "\t</properties>\n"
        ];
        var path = new Array(this.name.split('\\').length).join('..\\');
        for (var i = 0; i < this.tileSet.length; ++i) {
            if (useTSX) {
                xml.push("\t" + this.tileSet[i].getTileSetReferenceTag(path) + "\n");
            }
            else {
                xml.push("\t" + this.tileSet[i].getTileSetTag(path) + "\n");
            }
        }
        xml.push("\t<layer name=\"" + this.name + "\" width=\"" + this.width + "\" height=\"" + this.height + "\">\n");
        switch (tileFormat) {
            case 'csv':
                xml.push("\t\t<data encoding=\"csv\">\n");
                xml.push(int32ArrayToCSV(new Int32Array(this.data), this.width, ',\n'));
                break;
            case 'xml':
                xml.push("\t\t<data>\n");
                xml.push(int32ArrayToXML(new Int32Array(this.data), '\t\t\t', '\n'));
                break;
            case 'bin':
                xml.push("\t\t<data encoding=\"base64\">\n\t\t\t");
                xml.push(Base64.encode(this.data));
                break;
            case 'binz':
                xml.push("\t\t<data encoding=\"base64\" compression=\"zlib\">\n\t\t\t");
                xml.push(Base64.encode(this.data));
                break;
            default:
                throw new Error('unknown tile format: ' + tileFormat);
        }
        xml.push("\n\t\t</data>\n\t</layer>\n</map>");
        return new Blob(xml, { type: 'text/xml; charset=utf-8' });
    };
    return Image;
}());
exports.Image = Image;
var Tsx = (function () {
    function Tsx(data, gid, filename) {
        this.tileWidth = data.tileWidth;
        this.tileHeight = data.tileHeight;
        this.tileCount = data.tileCount;
        this.columns = data.columns;
        this.width = data.width;
        this.height = data.height;
        this.data = data.data;
        this.gid = gid;
        this.filename = filename;
    }
    Tsx.prototype.getImage = function (doc) {
        var src = new Uint8Array(this.data);
        var imageSize = Math.sqrt(src.length >> 2);
        var image = doc.createElement('canvas');
        image.width = imageSize;
        image.height = imageSize;
        var ctx = image.getContext('2d');
        if (!ctx) {
            throw new Error('cannot get CanvasRenderingContext2D');
        }
        var imageData = ctx.createImageData(imageSize, imageSize);
        var dest = imageData.data, sw = imageSize * 4, dw = imageData.width * 4;
        for (var y = 0; y < imageSize; ++y) {
            var sx = y * sw, dx = y * dw;
            for (var x = 0; x < sw; ++x) {
                dest[dx + x] = src[sx + x];
            }
        }
        ctx.putImageData(imageData, 0, 0);
        return image;
    };
    Tsx.prototype.export = function () {
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<tileset name=\"" + this.filename + "\" tilewidth=\"" + this.tileWidth + "\" tileheight=\"" + this.tileHeight + "\" tilecount=\"" + this.tileCount + "\" columns=\"" + this.columns + "\">\n   <image source=\"" + this.filename + ".png\" width=\"" + this.width + "\" height=\"" + this.height + "\"/>\n</tileset>";
    };
    Tsx.prototype.getTileSetReferenceTag = function (path) {
        return "<tileset firstgid=\"" + this.gid + "\" source=\"" + path + this.filename + ".tsx\"/>";
    };
    Tsx.prototype.getTileSetTag = function (path) {
        return ("<tileset firstgid=\"" + this.gid + "\" name=\"" + this.filename + "\"") +
            (" tilewidth=\"" + this.tileWidth + "\" tileheight=\"" + this.tileHeight + "\"") +
            (" tilecount=\"" + this.tileCount + "\" columns=\"" + this.columns + "\">") +
            ("<image source=\"" + path + this.filename + ".png\" width=\"" + this.width + "\" height=\"" + this.height + "\"/>") +
            "</tileset>";
    };
    Tsx.prototype.getTileSetReference = function (path) {
        return {
            firstgid: this.gid,
            source: path + this.filename + '.tsx'
        };
    };
    Tsx.prototype.getTileSet = function (path) {
        return {
            columns: this.columns,
            firstgid: this.gid,
            image: path + this.filename + '.png',
            imageheight: this.height,
            imagewidth: this.width,
            margin: 0,
            name: this.filename,
            spacing: 0,
            tilecount: this.tileCount,
            tileheight: this.tileHeight,
            tilewidth: this.tileWidth
        };
    };
    return Tsx;
}());
exports.Tsx = Tsx;
function int32ArrayToXML(a, prefix, postfix) {
    var r = new Array(a.length);
    for (var i = 0; i < a.length; ++i) {
        r[i] = "<tile gid=\"" + a[i].toString() + "\"/>";
    }
    return prefix + r.join(prefix + postfix) + postfix;
}
function int32ArrayToCSV(a, width, sep) {
    var r = new Array(a.length - (a.length / (width - 1)) | 0);
    for (var i = 0, j = 0, n = 0; i < a.length; ++i, ++j, ++n) {
        if (n + 1 === width && i + 1 < a.length) {
            r[j] = a[i].toString() + sep + a[++i].toString();
            n = 0;
            continue;
        }
        r[j] = a[i].toString();
    }
    return r.join(',');
}
var Tileder = (function () {
    function Tileder() {
        this._tileSize = 16;
        this._chopper = [];
        this._tile = new Map();
        this._images = [];
        this.numWorkers = 4;
        this.queueMax = 3;
        this.index = 0;
        for (var i = 0; i < this.numWorkers; ++i) {
            this._chopper.push(new Chopper());
        }
    }
    Tileder.prototype._waitReadyChopper = function (waits, found) {
        var _this = this;
        var find = function () {
            for (var i = 0; i < _this._chopper.length; ++i) {
                if (_this._chopper[i].tasks <= waits) {
                    found(_this._chopper[i]);
                    return;
                }
            }
            setTimeout(function () { return find(); }, 100);
        };
        find();
    };
    Tileder.prototype._add = function (index, name, buffer, width, height) {
        var _this = this;
        return new Promise(function (resolve) {
            _this._waitReadyChopper(_this.queueMax, function (chopper) {
                chopper.chop(index, name, buffer, width, height, _this._tileSize, function (data, tile) {
                    tile.forEach(function (v, hash) {
                        if (!_this._tile.has(hash)) {
                            _this._tile.set(hash, v);
                        }
                    });
                    _this._images.push(data);
                });
                resolve();
            });
        });
    };
    Tileder.prototype.add = function (name, image, next) {
        var ctx;
        if (image instanceof HTMLImageElement) {
            var cvs = document.createElement('canvas');
            cvs.width = image.width;
            cvs.height = image.height;
            ctx = cvs.getContext('2d');
            if (ctx) {
                ctx.drawImage(image, 0, 0);
            }
        }
        else {
            ctx = image.getContext('2d');
        }
        if (!ctx) {
            throw new Error('cannot get CanvasRenderingContext2D');
        }
        var imgData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
        this._add(this.index++, name, imgData.data.buffer, image.width, image.height).then(next);
    };
    Tileder.prototype.finish = function (compressMap, tsxCallback, imageCallback, complete) {
        var tileSet = [];
        var gid = 1;
        Builder.build(compressMap, this._tile, this._images, this._tileSize, function (tsx, index, total) {
            var o = new Tsx(tsx, gid, index.toString());
            tileSet.push(o);
            gid += tsx.tileCount;
            tsxCallback(o, index / total);
        }, function (image, index, total) {
            var o = new Image(image, tileSet);
            imageCallback(o, index / total);
        }, complete);
    };
    return Tileder;
}());
exports.Tileder = Tileder;
var Chopper = (function () {
    function Chopper() {
        var _this = this;
        this.worker = new Worker(Chopper.createWorkerURL());
        this._callbacks = [];
        this.worker.onmessage = function (e) {
            var callback = _this._callbacks.shift();
            if (callback) {
                callback(e.data.data, e.data.tile);
            }
        };
    }
    Chopper.prototype.chop = function (index, name, buffer, width, height, tileSize, success) {
        this._callbacks.push(success);
        this.worker.postMessage({
            index: index, name: name, buffer: buffer, width: width, height: height, tileSize: tileSize
        }, [buffer]);
    };
    Object.defineProperty(Chopper.prototype, "tasks", {
        get: function () { return this._callbacks.length; },
        enumerable: true,
        configurable: true
    });
    Chopper._chop = function (index, name, b, w, h, tileSize, crc32) {
        var buffers = [];
        var tile = new Map();
        var tileSize4 = tileSize << 2;
        var ab = new Uint8ClampedArray(b);
        var buf = new Uint8Array(4 * tileSize * tileSize);
        var bwf = Math.floor(w / tileSize), bhf = Math.floor(h / tileSize);
        var bwc = Math.ceil(w / tileSize), bhc = Math.ceil(h / tileSize);
        var restw = w - bwf * tileSize, resth = h - bwf * tileSize;
        var imageHash = new Uint32Array(bwc * bhc);
        for (var by = 0; by < bhf; ++by) {
            var sy = by * tileSize;
            for (var bx = 0; bx < bwf; ++bx) {
                for (var y = 0; y < tileSize; ++y) {
                    var sx = ((sy + y) * w + bx * tileSize) * 4;
                    var dx = y * tileSize * 4;
                    for (var x = 0; x < tileSize; ++x) {
                        buf[dx++] = ab[sx++];
                        buf[dx++] = ab[sx++];
                        buf[dx++] = ab[sx++];
                        buf[dx++] = ab[sx++];
                    }
                }
                var hash = crc32(buf.buffer);
                if (!tile.has(hash)) {
                    var bb = buf.slice().buffer;
                    buffers.push(bb);
                    tile.set(hash, { h: hash, p: by * 1000000 + bx, b: bb });
                }
                imageHash[by * bwc + bx] = hash;
            }
        }
        if (restw) {
            buf.fill(0);
            for (var by = 0; by < bhf; ++by) {
                var sy = by * tileSize;
                for (var y = 0; y < tileSize; ++y) {
                    var sx = ((sy + y) * w + bwf * tileSize) * 4;
                    var dx = y * tileSize4;
                    for (var x = 0; x < restw; ++x) {
                        buf[dx++] = ab[sx++];
                        buf[dx++] = ab[sx++];
                        buf[dx++] = ab[sx++];
                        buf[dx++] = ab[sx++];
                    }
                }
                var hash = crc32(buf.buffer);
                if (!tile.has(hash)) {
                    var bb = buf.slice().buffer;
                    buffers.push(bb);
                    tile.set(hash, { h: hash, p: by * 1000000 + bwf, b: bb });
                }
                imageHash[by * bwc + bwf] = hash;
            }
        }
        if (resth) {
            buf.fill(0);
            var sy = bhf * tileSize;
            for (var bx = 0; bx < bwf; ++bx) {
                for (var y = 0; y < resth; ++y) {
                    var sx = ((sy + y) * w + bx * tileSize) * 4;
                    var dx = y * tileSize4;
                    for (var x = 0; x < tileSize; ++x) {
                        buf[dx++] = ab[sx++];
                        buf[dx++] = ab[sx++];
                        buf[dx++] = ab[sx++];
                        buf[dx++] = ab[sx++];
                    }
                }
                var hash = crc32(buf.buffer);
                if (!tile.has(hash)) {
                    var bb = buf.slice().buffer;
                    buffers.push(bb);
                    tile.set(hash, { h: hash, p: bhf * 1000000 + bx, b: bb });
                }
                imageHash[bhf * bwc + bx] = hash;
            }
        }
        if (restw && resth) {
            buf.fill(0);
            var sy = bhf * tileSize;
            for (var y = 0; y < resth; ++y) {
                var sx = ((sy + y) * w + bwf * tileSize) * 4;
                var dx = y * tileSize4;
                for (var x = 0; x < restw; ++x) {
                    buf[dx++] = ab[sx++];
                    buf[dx++] = ab[sx++];
                    buf[dx++] = ab[sx++];
                    buf[dx++] = ab[sx++];
                }
            }
            var hash = crc32(buf.buffer);
            if (!tile.has(hash)) {
                var bb = buf.slice().buffer;
                buffers.push(bb);
                tile.set(hash, { h: hash, p: bhf * 1000000 + bwf, b: bb });
            }
            imageHash[bhf * bwc + bwf] = hash;
        }
        buffers.push(imageHash.buffer);
        return [{
                index: index,
                name: name,
                width: bwc,
                height: bhc,
                originalWidth: w,
                originalHeight: h,
                tileWidth: tileSize,
                tileHeight: tileSize,
                data: imageHash.buffer,
                deflated: false
            }, tile, buffers];
    };
    Chopper.createWorkerURL = function () {
        if (Chopper.workerURL) {
            return Chopper.workerURL;
        }
        Chopper.workerURL = URL.createObjectURL(new Blob([("\n'use strict';\nvar crcTable = new Uint32Array(" + JSON.stringify(Array.from(new Int32Array(crc32.getCRCTable().buffer))) + ");\nvar crc32 = " + crc32.crc32.toString() + ";\nvar chop = " + Chopper._chop.toString() + ";\nonmessage = function(e){\n    var d = e.data;\n    var ret = chop(d.index, d.name, d.buffer, d.width, d.height, d.tileSize, crc32);\n    postMessage({data: ret[0], tile: ret[1]}, ret[2]);\n};")], { type: 'text/javascript' }));
        return Chopper.workerURL;
    };
    return Chopper;
}());
var Builder = (function () {
    function Builder() {
    }
    Builder.build = function (compressMap, tile, images, tileSize, tsx, image, complete) {
        var w = new Worker(Builder.createWorkerURL());
        w.onmessage = function (e) {
            var d = e.data;
            if (d.image) {
                image(d.image, d.index, d.total);
                if (d.index === d.total - 1) {
                    complete();
                }
            }
            else {
                tsx(d.tsx, d.index, d.total);
            }
        };
        var buffers = [];
        tile.forEach(function (v) {
            buffers.push(v.b);
        });
        for (var _i = 0, images_1 = images; _i < images_1.length; _i++) {
            var image_1 = images_1[_i];
            buffers.push(image_1.data);
        }
        w.postMessage({ compressMap: compressMap, tile: tile, images: images, tileSize: tileSize }, buffers);
    };
    Builder._finish = function (compressMap, tile, images, tileSize, buildTsx, calcImageSize, compress, tsxCallback, imageCallback) {
        var map = buildTsx(tile, tileSize, tsxCallback, calcImageSize);
        images.sort(function (a, b) {
            return a.index === b.index ? 0 : a.index < b.index ? -1 : 1;
        });
        for (var i = 0; i < images.length; ++i) {
            var image = images[i];
            var d = new Uint32Array(image.data);
            for (var j = 0; j < d.length; ++j) {
                d[j] = map.get(d[j]) + 1;
            }
            if (compressMap) {
                image.data = compress(new Uint8Array(image.data)).buffer;
                image.deflated = true;
            }
            imageCallback(image, i, images.length);
        }
    };
    Builder._calcImageSize = function (tileSize, n) {
        var x = n * tileSize * tileSize;
        for (var p = 64; p <= 1024; p += p) {
            if (x <= p * p) {
                return p;
            }
        }
        return 1024;
    };
    Builder._buildTsx = function (tile, tileSize, tsxCallback, calcImageSize) {
        var a = [];
        tile.forEach(function (v) { return a.push(v); });
        var aLen = a.length;
        a.sort(function (a, b) {
            return a.p === b.p ? 0 : a.p < b.p ? -1 : 1;
        });
        var aPos = 0, numTsxes = 0;
        while (aPos < aLen) {
            var bLen = calcImageSize(tileSize, aLen - aPos) >> 4;
            aPos += bLen * bLen;
            ++numTsxes;
        }
        aPos = 0;
        var map = new Map();
        for (var i = 0; i < numTsxes; ++i) {
            var size = calcImageSize(tileSize, aLen - aPos), size4 = size * 4, columns = size / tileSize;
            var image = new Uint8Array(size * size4);
            var bLen = size >> 4;
            for (var by = 0; by < bLen && aPos < aLen; ++by) {
                var dy = by * tileSize;
                for (var bx = 0; bx < bLen && aPos < aLen; ++bx) {
                    var src = a[aPos], srcBuf = new Uint8Array(src.b);
                    for (var y = 0; y < tileSize; ++y) {
                        var dx = ((dy + y) * size + bx * tileSize) * 4;
                        var sx = y * tileSize * 4;
                        for (var x = 0; x < tileSize; ++x) {
                            image[dx++] = srcBuf[sx++];
                            image[dx++] = srcBuf[sx++];
                            image[dx++] = srcBuf[sx++];
                            image[dx++] = srcBuf[sx++];
                        }
                    }
                    map.set(src.h, aPos++);
                }
            }
            tsxCallback({
                tileWidth: tileSize,
                tileHeight: tileSize,
                tileCount: columns * columns,
                columns: columns,
                width: size,
                height: size,
                data: image.buffer
            }, i, numTsxes);
        }
        return map;
    };
    Builder.createWorkerURL = function () {
        if (Builder.workerURL) {
            return Builder.workerURL;
        }
        Builder.workerURL = URL.createObjectURL(new Blob([("\n'use strict';\nimportScripts('https://cdnjs.cloudflare.com/ajax/libs/pako/1.0.3/pako_deflate.min.js');\nvar calcImageSize = " + Builder._calcImageSize.toString() + ";\nvar buildTsx = " + Builder._buildTsx.toString() + ";\nvar compress = function(a){ return pako.deflate(a); };\nvar finish = " + Builder._finish.toString() + ";\nonmessage = function(e){\n    var d = e.data;\n    var ret = finish(\n        d.compressMap,\n        d.tile,\n        d.images,\n        d.tileSize,\n        buildTsx,\n        calcImageSize,\n        compress,\n        function(tsx, index, total){\n            postMessage({tsx: tsx, index: index, total: total}, [tsx.data]);\n        },\n        function(image, index, total){\n            postMessage({image: image, index: index, total: total}, [image.data]);\n        }\n    );\n};")], { type: 'text/javascript' }));
        return Builder.workerURL;
    };
    return Builder;
}());
function getViewer() {
    return "<!DOCTYPE html>\n<meta charset=\"utf-8\">\n<title>Tiled Viewer</title>\n<style>\nbody{margin:0}\n#ui,#view{float:left}\n#selects{padding:0 0.5em}\n#selects li{padding:0;margin:0 0 1em 0;list-style:none}\n#selects select,input[type=range]{display:block;margin: 2px 0;min-width:192px}\n#view{background-image: url(data:image/gif;base64,R0lGODlhYABgAKEBAMzMzP///////////yH/C05FVFNDQVBFMi4wAwEAAAAh+QQACgD/ACwAAAAAYABgAAAC/oxvoKuIzNyBSyYKbMDZcv15GDiKFHmaELqqkVvBjdxJoV3iqd7yrx8DzoQ1x82YQ+6UPebPGYQOpcVH0rrENrVPbtQ7BVcnV3LWvEV31V922D2+cM7ydH19b+ff+/im3MeC90dHaGc4eCQmqIfYqAjHyOc4CRlII+lnSakJyJkJiilKFEo6SlWKerq4Gtl6aRqrqiHLWut6Czu7a8uL66vbK/w7HEx8bJz8+bqc2wz8XByNPK28ee2JXah9yJ2YDb4dPvctbt49Xo5+rt7+mP7OHr9O714Jfy+fXz9v36n/j98+f6mkeeuHcGDCgASZHVQI0U9Bag8ZLpxoDZ/F+ogYq3ms2BGkQ40hSY4EWBLlSYEbW6Zk+bKhM5EzycFcKRMaTZ0ma6r0eRNoToM9ef40GhTpUIpFiR51mhTq0oxPqcW8iBOrUK1KuUr1yrQq1ahhyY6d+rFpWbQ7v3LM+nZr3K5zxbRdC/Zs3rRi+Zr1y1at3rp4CQ92CRexXMV0Gbt1XBjy4auGad2dnJiyZMB7L3Ou7Dm04M+bRfc1/Rd14NOjVXfW6Bp069msa6emfdv26ty8d/t+rRt4b+G/ZQevrDl55uWLlTdn3th5dOiPpVenHtl6duyYn3tvHLs07uLij5cfbhz9efLau0//fh3+dvnu47+HVgAAIfkEAQoAAgAsAAAAAGAAYAAAAv4MjhfLm9naQ5FNVc3NembAXeC3kZ75hGUlqie7Ri0K0ZSNwa8cS731cwQ7KdxIV0TWlDdmjrfzRYFTYZW4hCa1WenW26V+xWHr2FzGNrlrcJv8RsfVT3cdfpfn6Uf2fjPj1Gc3iFeod8jncqZotJgW6JcYSfg4R2lo+TeEiag5yRl61dko+HnqmGqqKom6+trKWimbSetpWxor46rbOwv761sLPCx8S3xsnBvMXNyc/LzsPA1NLV2Nfa1Nyi3K2D3qDSl+Sb4Zjv7tAa6ePu5eDn/eTv9eH38/b7+Pz6/fD/CfQFDyCOYz6A9hQIUDeUVjl9ChNYgLJWbrxDCjxf1t5jTiotjwY8eNID0i41iQ5EiRKVkeVNnyZEmYL11GtFkRJ4iZOk0q4ylzZdCYP4UWJfrQaFKkE5U2ZXrRaVSoKGsOtXoU6zOfS7U+9ToVbNWbV8lmNdsV7Ve1YdmOzVkW7lm5aemutdsW79udUvdyvRsybuC5g+sWBvw372HFif3SdAuUcOPIhif3pYzYomWqmBk/1tvZcc/Pi0UL3iw2tOrLrDm3Tv0acuyApiWTRi3btW7Yu3Pz/u07OOjZpVf3Hn68OHHccZgrT+48+u3po6ufpn7dum3tlbFvzw7+u/juOmuTD39+fGbu69G3V++ZfXz38+Gbf58+/4ICACH5BAEKAAMALAAAAABgAGAAAAL+TICJxqza2kvRTVDNxXnnc31eF5KTWFajxKlptMIve5oPWru5vNO3DQFShAtii/fTJZFBZZM5dEahRWmVevQ9tVPu1Zu19MRLMK5M3qa76287rJm9z+r42I7G10F3ft6/F2NmRMemxyE4R7hoBQdo+Oh2KBnpmDhpKYdZSHlZyZnZ5zmq+cmIBZp6Otio2rqq+CqLCrtZazrLSpsbu+urG+f62wtMbGzLizysXMx8jLsM3Sz9TCpaav2XHYjdff2t7R0Ozk0OuX0uXj7Ovu6eHoTeqQ7fXv8+b55vv48fyv/Pn7Bp8gLeO9gPocGEDBc6HFiNXkOIzipSs1iQ4sX8jYkm3sr4UeLDkPpGJuMoUiPIkyujtSSYkiRAlTFZ1nR5E2ZJmjtlFnkZsadNoTiJ6pzpUyFPpEOZFnV6VGBSj02lVlU61eRTq1ux8qLaFWxUr2G1jhUbFGparmfNriXbdinbt2gx5qTr1q5RvHLhrtGrFvBcwX4J10W513BexIEZD3ZcGPJhoIr7Tr5bOavlxUAvJ5bMGTPozaQ1m77quTHl0afLlkYd+vPq2aJpm8sM+7Xr1nF58/WNe3du4KyHGxeOvPdx5cl/Lwehm7l0582DT7dO/Xrx6tu121ZdO7xs8eDHm7eHPX337OzVf3/8PnL81PDJ1z9/X20BACH5BAEKAAMALAAAAABgAGAAAAL+jIGJxqza2kvRTVDPzeHi7HEhuJGTWFajmkar20qxdZoP/LG1ftuQTwEuhDlcj/dDBpVDZlG2MyalS2rT+qQdsagodPudhqvjazmr8WrFa3Lb/EZ3ZmlwvGuvs/VuPtwv93KGtzenBkjYZ5i3WCh45wPplPjXqPiISEQZSGdZienJeRi6Wap5OonKpTrIKrmaGgs72ypbS/t6q5vLm2nbS+rqizuse9kJmoy8PKrczMzoHA3tSH38jD2dXb19rf3NDe4dTj5u/mmN3q0uzl7ufi7aLv9ODyxdb/pbfJ9OH6+PWLB9AwXiAyis4C5+DBX2W/cPnsSIFAMudNjw4ET7iw/ncSyGkKDGiglHfsSI0mRJfydVimS5EmJLmC9lxvR4M1/OkAZp9rRZs4nLnziD6jTK8+JQpT6ZAiV6FGrSjlGdFpW6cWdWpFuxkuT6ldbUjE2pjk1ZluxTq1XNdmV7dqnbsHDfzp259q5WunrB4r0apq/Xv23VAhZcl6/hwmjzLo6btvHhx3YpK5bMWK5lwpAdK+w8GTPozJE1i658+rLp1aVbe2b92nVo2LNlk469DbHuzXs5o6Z9uzZu4cSDGx+N/Lft5KqXKx9+3Axz382hT++N3W/2wdsTU//efXdq8NrLczfvPad44NfRr3devXj78/TTu+fNoAAAIfkEAQoAAwAsAAAAAGAAYAAAAv6MA6l5javcgVE+ai/MlNkOcJ2IfaNZSiC5oa16wqmzugt725X80rE/a9QMOV4R2BP+lMHJ0tkkPqVRzZGZhGapW+sOedWGuWOvx/jFlofgtNhNhptDunPbrpaz8/h3P/43h6M3JVhHhxa454d418j3yDioWLgIGHnJAjmJaZjYaenpyEl6WPp5Omq6isqq2gr7KrvpShtrOytZq3vLm5u5C9wr/CuKe+yLTIy7VulcFRr93CUNPd1snU19TaiNve3dDT7+XS5uThmeTn7evo4Oyv3uHq9ezz6ff/+tbJz8vwygv4AEBxqshm8fvVT9EMJjKNDhwmAH5SnUB7GgRPyMFDde/Jixor2QbB52tEgS5cmRKxOmZDlMpMuWJmN6fDnTpkqdMIvdpDmRZ06fO5E0LHq0Z9KhS2sSVRoRaVSoGqVWpSrTadOgT5lO9XoVbFauWzlywan1a9qwa8ea7dr2p9C4Vt2CBPq27N25ZNX2ZfvXLtrAco36zXt4L1zCdQvrHYwYcGTBeBU/rgzZcuLMnDF75ju5MF2sjjd/Xhy6sWrSq8WWlqwZdmfQsSnTno269mvbhmWfvnz7t+ngxHPjBm5cuO/iyJsPT878ufPl0DUcl46d+nTe23d7bz3aNXjGrMuLNx8+Pfnz7Pll5/7+O/r16lPPt9+eawEAIfkEAQoAAwAsAAAAAGAAYAAAAv6MDal5HbvcgUoiCuzDGmfrdRw4SiFJiSkKqS0bwZXM0J9ZOie+8q8fA86ENeJNl2vskD3m7+cMRofTYvWoTE60l2bWuwV3oV9y2DyWltVndpq6hrflb2vcPsfXsXn+3uW2ISaIRhi4dOdnSLeo16iI2AfIGPlnM+lY+YgJybV5CcpzxUkaOmqaWGqkerqKKvlq6TrbWpsa+0l7qwvLK2vbC/y7K5xbrInsmTy4XNh8qFziHM1MPV2Nfa0Nnc29TWntLQ7eTf6dGW4+jl7Oft7ZDv/OSlwfbD98r5/Pb4zvv0/QsXTu1skzSC/gM3UMCzY8+DBhv4UOK0K0KBHgRPyCFztmpOgRF8iPHEnGMzkvDUqEIku2PPkypS+NNEfGZDnTZk6XO2H2lDnQZ1Cg/3QOxXk0IoqkGG8q/Ym0KE+mIaE+pbryqlShW4kqnNo16leuY71uJHvWbC61RsNqLSs2bdyaYOG+lXuXLlq9bOvibWoVMFangt0Wtnv47ODAVRc7NtwYctbEfOe2RRwZ8+TMfzlXznu58+bRhD3v6Ls39GfKqlv7XW36tevUsmvTvo06t2XbukHz3o1ldm/Wv33jBj489nHjyUkzdv5Yc2nokqdbfx6q+fXoordXxw6eO2zq0sN/Fy8cuXrm64kvd38NfXH47ZVrN1++VQEAIfkEAQoAAwAsAAAAAGAAYAAAAv6MD6l5Hbscgkw+CuylGmfrdZjIgaNZSiEKkS0bwYobq6edOiv+8rV+A+YaO2HP+CMGlcNJ01BkHqVJ59RahZ6em6uWG8XOZBXf2FxGntVp6trdFse/3m7W/pZ/0Ht2H/6nR5NHdxdWSIg3pxiIuHjIOPi4JEjWGGkpeQnJSem46YnJp0maaWozeupXmtq6qgrI+uoaC1tJezurW4v7Kcu7mws8LFzsa3vcKxqczLxM3Az9bDwdTb0CFtqZzV237a0d3m0oDj6e+E1+PrkO2v57Xa5uTj9vjy6P/45c3Z+uXw/gPXYBJyn7R3Cgu4ILFcKzBtFfvoQCK1K82NBiRvqMDyXuOzhxo8iOCEfyK0kyZMqPzrAxXPnypEqZLKWhpBkTZM14OyPe1Jmz5UygDnEWJaoR5lGhPSUi5Wg0aVSoT01WVSr16lSrTIPaHNp16demP8NmNUsVLdexMcmCZSuWp1e5cX2+pXsWbl68afX25bsWMNa/dt0anlsYsUdwWhurHRw4cd3Fk8v6jUx5r2TNmQl3xmxZ8FbIpEeb1nq48t3NnkOzBr36c2nHl2c/Pn2btmjdr23Xxv0bVe7hwYnvNt4b+PHizJc7T85btnLoyKVHd239dmrO2LvH9r699ffx4WGX9/08e3Pq69WnB6+403Xy8emr3lcAACH5BAEKAAMALAAAAABgAGAAAAL+jB+gq4jM3IFLGtosBjbhvoGfNkohSYkpCqktG8GVnJmlc9qr/vKxPwPWcLdHcXK8JD07YtP4REaVU2bPeYVmpVtq1/rDhrVjbmSZEwfVQ/La3Ta/5XFv2T7H18F5/j4Nx0EjKETIZhjocueHSNeo98io2AfoOPmHlllVCXkZySk56DkqWlpIemp6iLqqoZr4ahnbORuaetuKC6sry0vra5srvDvcW/x7HEy8bMyM7KzcLP08HU19bZ0Nuq3Z0r3IvflNOY4pfv4Vnl7+yc4KrQ7uXhtPji5/b7+eb77vj/9PH8CBAgv2I3jQYLtN9OYBq5cw4sKAEt9VgzgRYUb4hRaxYeyozWGyjw35baxYkuLJlSBJPhQJ7wPMizM91gxpsuVNlyN3+syZUqNOoC+J9jQaEylNpTaZ4lTZMihHqSiLQqXKEuvQq1aFav3adWrYqke5lvU6NmvarWjPil3102xSuUvpNrX7tO1cvXX53vWb9+1ewX0J/zUcmOxgxYUZH/4D1q3jxGolV158uXHmx5sps0XME/PnyaE1j+5cmvPp1aLiAk7tObJo2aZpq7Ydey1u2Lxdg/ZNGjhq4VF1G7fM+vhs5bWZ33aeG/lu4tOd9rZOHfp1qNmla+++3Lv48OSbjzdf/vl59emjt9/+GvzF6ng/FgAAOw==)}\n</style>\n<div id=\"ui\">\n  <div id=\"root\"></div>\n  <ul id=\"selects\"></ul>\n</div>\n<canvas id=\"view\"></canvas>\n<script>\nvar tileMapLoadedCallbacks = {};\nfunction onTileMapLoaded(name, data) {\n  if (!(name in tileMapLoadedCallbacks)) {\n    return;\n  }\n  tileMapLoadedCallbacks[name](data);\n  delete tileMapLoadedCallbacks[name];\n}\nfunction loadTileMap(url, callback){\n  var m = url.match(/\\..+$/);\n  switch (m && m[0]) {\n  case '.json':\n    var xhr = new XMLHttpRequest();\n    xhr.open('GET', url, true);\n    xhr.onload = function(e) {\n      callback(JSON.parse(this.response));\n    };\n    xhr.send();\n    return;\n  case '.js':\n    tileMapLoadedCallbacks[url.replace(/\\//g, '\\\\').replace(/\\..+$/, '')] = callback;\n    var sc = document.createElement('script');\n    sc.src = url;\n    document.body.appendChild(sc);\n    setTimeout(function(){\n      document.body.removeChild(sc);\n    }, 0);\n    return;\n  }\n  throw new Error('unsupported filetype: '+url);\n}\nfunction decodeData(layer){\n  if (!('encoding' in layer)) {\n    return layer.data;\n  }\n  switch (layer.encoding) {\n  case 'base64':\n    var ab = base64ToArrayBuffer(layer.data);\n    if ('compression' in layer) {\n      switch (layer.compression) {\n      case 'zlib':\n        ab = pako.inflate(ab).buffer;\n        break;\n      default:\n        throw new Error('unsupported compression: '+layer.compression);\n      }\n    }\n    var i32a = new Int32Array(ab), r = new Array(i32a.length);\n    for (var i = 0; i < i32a.length; ++i) {\n      r[i] = i32a[i];\n    }\n    return r;\n  default:\n    throw new Error('unsupported encoding: '+layer.encoding);\n  }\n}\nfunction base64ToArrayBuffer(s){\n  var bin = atob(s), u8a = new Uint8Array(bin.length);\n  for (var i = 0; i < bin.length; ++i) {\n    u8a[i] = bin.charCodeAt(i);\n  }\n  return u8a.buffer;\n}\nvar selectId = 0;\nfunction createSelect(caption, items, onChange){\n  var id = 'sel' + (++selectId);\n\n  var label = document.createElement('label');\n  label.textContent = caption;\n  label.htmlFor = id;\n\n  var sel = document.createElement('select');\n  sel.id = id;\n  items.map(function(item, index){\n    var opt = document.createElement('option');\n    opt.textContent = item;\n    opt.value = item;\n    sel.appendChild(opt);\n  });\n\n  var slider = document.createElement('input');\n  slider.type = 'range';\n  slider.max = items.length-1;\n  slider.value = 0;\n\n  sel.addEventListener('change', function(e){\n    slider.value = sel.selectedIndex;\n    onChange(e);\n  }, false);\n  slider.addEventListener('input', function(e){\n    sel.selectedIndex = slider.value;\n    var ev = document.createEvent(\"HTMLEvents\");\n    ev.initEvent(\"change\", false, true);\n    sel.dispatchEvent(ev);\n  }, false);\n\n  var li = document.createElement('li');\n  li.appendChild(label);\n  li.appendChild(sel);\n  li.appendChild(slider);\n  return li;\n}\nfunction updateSelects(faview, rootIndex) {\n  var elem = document.getElementById('selects');\n  elem.innerHTML = '';\n  function changed(){\n    updateCanvas(faview, document.getElementById('view'));\n  }\n  var root = faview.roots[rootIndex];\n  root.selects.map(function(sel, i){\n    elem.appendChild(createSelect(root.captions[i], sel, changed));\n  });\n}\nfunction buildName(flatten, namingStyle, ext) {\n  var items = [], sels = document.querySelectorAll('select');\n  for (var i = 0; i < sels.length; ++i){\n    switch (namingStyle) {\n    case 'standard':\n      items.push(\n        (i ? document.querySelector(\"label[for='\"+sels[i].id+\"']\").textContent+'-' : '')+\n        sels[i].options[sels[i].selectedIndex].value\n      );\n      break;\n    case 'compact':\n      items.push(sels[i].options[sels[i].selectedIndex].value);\n      break;\n    case 'index':\n      items.push(sels[i].selectedIndex);\n      break;\n    }\n  }\n  return items.join(flatten ? '_' : '/') + '.' + ext;\n}\nfunction renderCanvas(tiled, canvas, images, layer){\n  var tsx = tiled.tilesets, tw = tiled.tilewidth, th = tiled.tileheight;\n  canvas.width = tiled.properties.originalwidth;\n  canvas.height = tiled.properties.originalheight;\n  var ctx = canvas.getContext('2d');\n  var dx = 0, dy = 0, data = decodeData(layer);\n  for (var i = 0; i < data.length; ++i) {\n    var d = data[i]-1, img = 0;\n    while(d >= tsx[img].tilecount) {\n      d -= tsx[img++].tilecount;\n    }\n    var sx = d % tsx[img].columns, sy = (d - sx) / tsx[img].columns;\n    ctx.drawImage(images[img], sx * tw, sy * th, tw, th, dx * tw, dy * th, tw, th);\n    if (++dx == layer.width) {\n      dx = 0;\n      ++dy;\n    }\n  }\n}\nfunction updateCanvas(faview, canvas){\n  var path = buildName(faview.flatten, faview.namingStyle, faview.format);\n  loadTileMap(path, function(tiled){\n    var images, loading = 0;\n    function loaded(){\n      if (--loading) return;\n      tiled.layers.map(function(layer){\n        renderCanvas(tiled, canvas, images, layer);\n      });\n    }\n    images = tiled.tilesets.map(function(tsx){\n      ++loading;\n      var img = new Image();\n      img.src = path.replace(/[^\\/]+$/, '') + tsx.image.replace(/\\\\/g, '/');\n      img.onload = loaded;\n      return img;\n    });\n  });\n}\nfunction onFaviewLoaded(faview){\n  var sel = document.createElement('select');\n  faview.roots.map(function(root){\n    var opt = document.createElement('option');\n    opt.textContent = root.name;\n    opt.value = root.name;\n    sel.appendChild(opt);\n  });\n  sel.addEventListener('change', function(e){\n    updateSelects(faview, e.currentTarget.selectedIndex);\n  }, false);\n  if (faview.roots.length <= 1) {\n    sel.style.display = 'none';\n  }\n  document.getElementById('root').appendChild(sel);\n  updateSelects(faview, 0);\n  updateCanvas(faview, document.getElementById('view'));\n}\n</script>\n<script>\n/* pako 1.0.3 nodeca/pako */\n!function(e){if(\"object\"==typeof exports&&\"undefined\"!=typeof module)module.exports=e();else if(\"function\"==typeof define&&define.amd)define([],e);else{var t;t=\"undefined\"!=typeof window?window:\"undefined\"!=typeof global?global:\"undefined\"!=typeof self?self:this,t.pako=e()}}(function(){return function e(t,i,n){function a(o,s){if(!i[o]){if(!t[o]){var f=\"function\"==typeof require&&require;if(!s&&f)return f(o,!0);if(r)return r(o,!0);var l=new Error(\"Cannot find module '\"+o+\"'\");throw l.code=\"MODULE_NOT_FOUND\",l}var d=i[o]={exports:{}};t[o][0].call(d.exports,function(e){var i=t[o][1][e];return a(i?i:e)},d,d.exports,e,t,i,n)}return i[o].exports}for(var r=\"function\"==typeof require&&require,o=0;o<n.length;o++)a(n[o]);return a}({1:[function(e,t,i){\"use strict\";var n=\"undefined\"!=typeof Uint8Array&&\"undefined\"!=typeof Uint16Array&&\"undefined\"!=typeof Int32Array;i.assign=function(e){for(var t=Array.prototype.slice.call(arguments,1);t.length;){var i=t.shift();if(i){if(\"object\"!=typeof i)throw new TypeError(i+\"must be non-object\");for(var n in i)i.hasOwnProperty(n)&&(e[n]=i[n])}}return e},i.shrinkBuf=function(e,t){return e.length===t?e:e.subarray?e.subarray(0,t):(e.length=t,e)};var a={arraySet:function(e,t,i,n,a){if(t.subarray&&e.subarray)return void e.set(t.subarray(i,i+n),a);for(var r=0;r<n;r++)e[a+r]=t[i+r]},flattenChunks:function(e){var t,i,n,a,r,o;for(n=0,t=0,i=e.length;t<i;t++)n+=e[t].length;for(o=new Uint8Array(n),a=0,t=0,i=e.length;t<i;t++)r=e[t],o.set(r,a),a+=r.length;return o}},r={arraySet:function(e,t,i,n,a){for(var r=0;r<n;r++)e[a+r]=t[i+r]},flattenChunks:function(e){return[].concat.apply([],e)}};i.setTyped=function(e){e?(i.Buf8=Uint8Array,i.Buf16=Uint16Array,i.Buf32=Int32Array,i.assign(i,a)):(i.Buf8=Array,i.Buf16=Array,i.Buf32=Array,i.assign(i,r))},i.setTyped(n)},{}],2:[function(e,t,i){\"use strict\";function n(e,t){if(t<65537&&(e.subarray&&o||!e.subarray&&r))return String.fromCharCode.apply(null,a.shrinkBuf(e,t));for(var i=\"\",n=0;n<t;n++)i+=String.fromCharCode(e[n]);return i}var a=e(\"./common\"),r=!0,o=!0;try{String.fromCharCode.apply(null,[0])}catch(e){r=!1}try{String.fromCharCode.apply(null,new Uint8Array(1))}catch(e){o=!1}for(var s=new a.Buf8(256),f=0;f<256;f++)s[f]=f>=252?6:f>=248?5:f>=240?4:f>=224?3:f>=192?2:1;s[254]=s[254]=1,i.string2buf=function(e){var t,i,n,r,o,s=e.length,f=0;for(r=0;r<s;r++)i=e.charCodeAt(r),55296===(64512&i)&&r+1<s&&(n=e.charCodeAt(r+1),56320===(64512&n)&&(i=65536+(i-55296<<10)+(n-56320),r++)),f+=i<128?1:i<2048?2:i<65536?3:4;for(t=new a.Buf8(f),o=0,r=0;o<f;r++)i=e.charCodeAt(r),55296===(64512&i)&&r+1<s&&(n=e.charCodeAt(r+1),56320===(64512&n)&&(i=65536+(i-55296<<10)+(n-56320),r++)),i<128?t[o++]=i:i<2048?(t[o++]=192|i>>>6,t[o++]=128|63&i):i<65536?(t[o++]=224|i>>>12,t[o++]=128|i>>>6&63,t[o++]=128|63&i):(t[o++]=240|i>>>18,t[o++]=128|i>>>12&63,t[o++]=128|i>>>6&63,t[o++]=128|63&i);return t},i.buf2binstring=function(e){return n(e,e.length)},i.binstring2buf=function(e){for(var t=new a.Buf8(e.length),i=0,n=t.length;i<n;i++)t[i]=e.charCodeAt(i);return t},i.buf2string=function(e,t){var i,a,r,o,f=t||e.length,l=new Array(2*f);for(a=0,i=0;i<f;)if(r=e[i++],r<128)l[a++]=r;else if(o=s[r],o>4)l[a++]=65533,i+=o-1;else{for(r&=2===o?31:3===o?15:7;o>1&&i<f;)r=r<<6|63&e[i++],o--;o>1?l[a++]=65533:r<65536?l[a++]=r:(r-=65536,l[a++]=55296|r>>10&1023,l[a++]=56320|1023&r)}return n(l,a)},i.utf8border=function(e,t){var i;for(t=t||e.length,t>e.length&&(t=e.length),i=t-1;i>=0&&128===(192&e[i]);)i--;return i<0?t:0===i?t:i+s[e[i]]>t?i:t}},{\"./common\":1}],3:[function(e,t,i){\"use strict\";function n(e,t,i,n){for(var a=65535&e|0,r=e>>>16&65535|0,o=0;0!==i;){o=i>2e3?2e3:i,i-=o;do a=a+t[n++]|0,r=r+a|0;while(--o);a%=65521,r%=65521}return a|r<<16|0}t.exports=n},{}],4:[function(e,t,i){\"use strict\";t.exports={Z_NO_FLUSH:0,Z_PARTIAL_FLUSH:1,Z_SYNC_FLUSH:2,Z_FULL_FLUSH:3,Z_FINISH:4,Z_BLOCK:5,Z_TREES:6,Z_OK:0,Z_STREAM_END:1,Z_NEED_DICT:2,Z_ERRNO:-1,Z_STREAM_ERROR:-2,Z_DATA_ERROR:-3,Z_BUF_ERROR:-5,Z_NO_COMPRESSION:0,Z_BEST_SPEED:1,Z_BEST_COMPRESSION:9,Z_DEFAULT_COMPRESSION:-1,Z_FILTERED:1,Z_HUFFMAN_ONLY:2,Z_RLE:3,Z_FIXED:4,Z_DEFAULT_STRATEGY:0,Z_BINARY:0,Z_TEXT:1,Z_UNKNOWN:2,Z_DEFLATED:8}},{}],5:[function(e,t,i){\"use strict\";function n(){for(var e,t=[],i=0;i<256;i++){e=i;for(var n=0;n<8;n++)e=1&e?3988292384^e>>>1:e>>>1;t[i]=e}return t}function a(e,t,i,n){var a=r,o=n+i;e^=-1;for(var s=n;s<o;s++)e=e>>>8^a[255&(e^t[s])];return e^-1}var r=n();t.exports=a},{}],6:[function(e,t,i){\"use strict\";function n(){this.text=0,this.time=0,this.xflags=0,this.os=0,this.extra=null,this.extra_len=0,this.name=\"\",this.comment=\"\",this.hcrc=0,this.done=!1}t.exports=n},{}],7:[function(e,t,i){\"use strict\";var n=30,a=12;t.exports=function(e,t){var i,r,o,s,f,l,d,u,c,h,b,w,m,k,_,g,v,p,x,y,S,E,B,Z,A;i=e.state,r=e.next_in,Z=e.input,o=r+(e.avail_in-5),s=e.next_out,A=e.output,f=s-(t-e.avail_out),l=s+(e.avail_out-257),d=i.dmax,u=i.wsize,c=i.whave,h=i.wnext,b=i.window,w=i.hold,m=i.bits,k=i.lencode,_=i.distcode,g=(1<<i.lenbits)-1,v=(1<<i.distbits)-1;e:do{m<15&&(w+=Z[r++]<<m,m+=8,w+=Z[r++]<<m,m+=8),p=k[w&g];t:for(;;){if(x=p>>>24,w>>>=x,m-=x,x=p>>>16&255,0===x)A[s++]=65535&p;else{if(!(16&x)){if(0===(64&x)){p=k[(65535&p)+(w&(1<<x)-1)];continue t}if(32&x){i.mode=a;break e}e.msg=\"invalid literal/length code\",i.mode=n;break e}y=65535&p,x&=15,x&&(m<x&&(w+=Z[r++]<<m,m+=8),y+=w&(1<<x)-1,w>>>=x,m-=x),m<15&&(w+=Z[r++]<<m,m+=8,w+=Z[r++]<<m,m+=8),p=_[w&v];i:for(;;){if(x=p>>>24,w>>>=x,m-=x,x=p>>>16&255,!(16&x)){if(0===(64&x)){p=_[(65535&p)+(w&(1<<x)-1)];continue i}e.msg=\"invalid distance code\",i.mode=n;break e}if(S=65535&p,x&=15,m<x&&(w+=Z[r++]<<m,m+=8,m<x&&(w+=Z[r++]<<m,m+=8)),S+=w&(1<<x)-1,S>d){e.msg=\"invalid distance too far back\",i.mode=n;break e}if(w>>>=x,m-=x,x=s-f,S>x){if(x=S-x,x>c&&i.sane){e.msg=\"invalid distance too far back\",i.mode=n;break e}if(E=0,B=b,0===h){if(E+=u-x,x<y){y-=x;do A[s++]=b[E++];while(--x);E=s-S,B=A}}else if(h<x){if(E+=u+h-x,x-=h,x<y){y-=x;do A[s++]=b[E++];while(--x);if(E=0,h<y){x=h,y-=x;do A[s++]=b[E++];while(--x);E=s-S,B=A}}}else if(E+=h-x,x<y){y-=x;do A[s++]=b[E++];while(--x);E=s-S,B=A}for(;y>2;)A[s++]=B[E++],A[s++]=B[E++],A[s++]=B[E++],y-=3;y&&(A[s++]=B[E++],y>1&&(A[s++]=B[E++]))}else{E=s-S;do A[s++]=A[E++],A[s++]=A[E++],A[s++]=A[E++],y-=3;while(y>2);y&&(A[s++]=A[E++],y>1&&(A[s++]=A[E++]))}break}}break}}while(r<o&&s<l);y=m>>3,r-=y,m-=y<<3,w&=(1<<m)-1,e.next_in=r,e.next_out=s,e.avail_in=r<o?5+(o-r):5-(r-o),e.avail_out=s<l?257+(l-s):257-(s-l),i.hold=w,i.bits=m}},{}],8:[function(e,t,i){\"use strict\";function n(e){return(e>>>24&255)+(e>>>8&65280)+((65280&e)<<8)+((255&e)<<24)}function a(){this.mode=0,this.last=!1,this.wrap=0,this.havedict=!1,this.flags=0,this.dmax=0,this.check=0,this.total=0,this.head=null,this.wbits=0,this.wsize=0,this.whave=0,this.wnext=0,this.window=null,this.hold=0,this.bits=0,this.length=0,this.offset=0,this.extra=0,this.lencode=null,this.distcode=null,this.lenbits=0,this.distbits=0,this.ncode=0,this.nlen=0,this.ndist=0,this.have=0,this.next=null,this.lens=new _.Buf16(320),this.work=new _.Buf16(288),this.lendyn=null,this.distdyn=null,this.sane=0,this.back=0,this.was=0}function r(e){var t;return e&&e.state?(t=e.state,e.total_in=e.total_out=t.total=0,e.msg=\"\",t.wrap&&(e.adler=1&t.wrap),t.mode=D,t.last=0,t.havedict=0,t.dmax=32768,t.head=null,t.hold=0,t.bits=0,t.lencode=t.lendyn=new _.Buf32(we),t.distcode=t.distdyn=new _.Buf32(me),t.sane=1,t.back=-1,z):C}function o(e){var t;return e&&e.state?(t=e.state,t.wsize=0,t.whave=0,t.wnext=0,r(e)):C}function s(e,t){var i,n;return e&&e.state?(n=e.state,t<0?(i=0,t=-t):(i=(t>>4)+1,t<48&&(t&=15)),t&&(t<8||t>15)?C:(null!==n.window&&n.wbits!==t&&(n.window=null),n.wrap=i,n.wbits=t,o(e))):C}function f(e,t){var i,n;return e?(n=new a,e.state=n,n.window=null,i=s(e,t),i!==z&&(e.state=null),i):C}function l(e){return f(e,_e)}function d(e){if(ge){var t;for(m=new _.Buf32(512),k=new _.Buf32(32),t=0;t<144;)e.lens[t++]=8;for(;t<256;)e.lens[t++]=9;for(;t<280;)e.lens[t++]=7;for(;t<288;)e.lens[t++]=8;for(x(S,e.lens,0,288,m,0,e.work,{bits:9}),t=0;t<32;)e.lens[t++]=5;x(E,e.lens,0,32,k,0,e.work,{bits:5}),ge=!1}e.lencode=m,e.lenbits=9,e.distcode=k,e.distbits=5}function u(e,t,i,n){var a,r=e.state;return null===r.window&&(r.wsize=1<<r.wbits,r.wnext=0,r.whave=0,r.window=new _.Buf8(r.wsize)),n>=r.wsize?(_.arraySet(r.window,t,i-r.wsize,r.wsize,0),r.wnext=0,r.whave=r.wsize):(a=r.wsize-r.wnext,a>n&&(a=n),_.arraySet(r.window,t,i-n,a,r.wnext),n-=a,n?(_.arraySet(r.window,t,i-n,n,0),r.wnext=n,r.whave=r.wsize):(r.wnext+=a,r.wnext===r.wsize&&(r.wnext=0),r.whave<r.wsize&&(r.whave+=a))),0}function c(e,t){var i,a,r,o,s,f,l,c,h,b,w,m,k,we,me,ke,_e,ge,ve,pe,xe,ye,Se,Ee,Be=0,Ze=new _.Buf8(4),Ae=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];if(!e||!e.state||!e.output||!e.input&&0!==e.avail_in)return C;i=e.state,i.mode===X&&(i.mode=W),s=e.next_out,r=e.output,l=e.avail_out,o=e.next_in,a=e.input,f=e.avail_in,c=i.hold,h=i.bits,b=f,w=l,ye=z;e:for(;;)switch(i.mode){case D:if(0===i.wrap){i.mode=W;break}for(;h<16;){if(0===f)break e;f--,c+=a[o++]<<h,h+=8}if(2&i.wrap&&35615===c){i.check=0,Ze[0]=255&c,Ze[1]=c>>>8&255,i.check=v(i.check,Ze,2,0),c=0,h=0,i.mode=F;break}if(i.flags=0,i.head&&(i.head.done=!1),!(1&i.wrap)||(((255&c)<<8)+(c>>8))%31){e.msg=\"incorrect header check\",i.mode=ce;break}if((15&c)!==U){e.msg=\"unknown compression method\",i.mode=ce;break}if(c>>>=4,h-=4,xe=(15&c)+8,0===i.wbits)i.wbits=xe;else if(xe>i.wbits){e.msg=\"invalid window size\",i.mode=ce;break}i.dmax=1<<xe,e.adler=i.check=1,i.mode=512&c?q:X,c=0,h=0;break;case F:for(;h<16;){if(0===f)break e;f--,c+=a[o++]<<h,h+=8}if(i.flags=c,(255&i.flags)!==U){e.msg=\"unknown compression method\",i.mode=ce;break}if(57344&i.flags){e.msg=\"unknown header flags set\",i.mode=ce;break}i.head&&(i.head.text=c>>8&1),512&i.flags&&(Ze[0]=255&c,Ze[1]=c>>>8&255,i.check=v(i.check,Ze,2,0)),c=0,h=0,i.mode=L;case L:for(;h<32;){if(0===f)break e;f--,c+=a[o++]<<h,h+=8}i.head&&(i.head.time=c),512&i.flags&&(Ze[0]=255&c,Ze[1]=c>>>8&255,Ze[2]=c>>>16&255,Ze[3]=c>>>24&255,i.check=v(i.check,Ze,4,0)),c=0,h=0,i.mode=H;case H:for(;h<16;){if(0===f)break e;f--,c+=a[o++]<<h,h+=8}i.head&&(i.head.xflags=255&c,i.head.os=c>>8),512&i.flags&&(Ze[0]=255&c,Ze[1]=c>>>8&255,i.check=v(i.check,Ze,2,0)),c=0,h=0,i.mode=M;case M:if(1024&i.flags){for(;h<16;){if(0===f)break e;f--,c+=a[o++]<<h,h+=8}i.length=c,i.head&&(i.head.extra_len=c),512&i.flags&&(Ze[0]=255&c,Ze[1]=c>>>8&255,i.check=v(i.check,Ze,2,0)),c=0,h=0}else i.head&&(i.head.extra=null);i.mode=j;case j:if(1024&i.flags&&(m=i.length,m>f&&(m=f),m&&(i.head&&(xe=i.head.extra_len-i.length,i.head.extra||(i.head.extra=new Array(i.head.extra_len)),_.arraySet(i.head.extra,a,o,m,xe)),512&i.flags&&(i.check=v(i.check,a,m,o)),f-=m,o+=m,i.length-=m),i.length))break e;i.length=0,i.mode=K;case K:if(2048&i.flags){if(0===f)break e;m=0;do xe=a[o+m++],i.head&&xe&&i.length<65536&&(i.head.name+=String.fromCharCode(xe));while(xe&&m<f);if(512&i.flags&&(i.check=v(i.check,a,m,o)),f-=m,o+=m,xe)break e}else i.head&&(i.head.name=null);i.length=0,i.mode=P;case P:if(4096&i.flags){if(0===f)break e;m=0;do xe=a[o+m++],i.head&&xe&&i.length<65536&&(i.head.comment+=String.fromCharCode(xe));while(xe&&m<f);if(512&i.flags&&(i.check=v(i.check,a,m,o)),f-=m,o+=m,xe)break e}else i.head&&(i.head.comment=null);i.mode=Y;case Y:if(512&i.flags){for(;h<16;){if(0===f)break e;f--,c+=a[o++]<<h,h+=8}if(c!==(65535&i.check)){e.msg=\"header crc mismatch\",i.mode=ce;break}c=0,h=0}i.head&&(i.head.hcrc=i.flags>>9&1,i.head.done=!0),e.adler=i.check=0,i.mode=X;break;case q:for(;h<32;){if(0===f)break e;f--,c+=a[o++]<<h,h+=8}e.adler=i.check=n(c),c=0,h=0,i.mode=G;case G:if(0===i.havedict)return e.next_out=s,e.avail_out=l,e.next_in=o,e.avail_in=f,i.hold=c,i.bits=h,N;e.adler=i.check=1,i.mode=X;case X:if(t===Z||t===A)break e;case W:if(i.last){c>>>=7&h,h-=7&h,i.mode=le;break}for(;h<3;){if(0===f)break e;f--,c+=a[o++]<<h,h+=8}switch(i.last=1&c,c>>>=1,h-=1,3&c){case 0:i.mode=J;break;case 1:if(d(i),i.mode=ie,t===A){c>>>=2,h-=2;break e}break;case 2:i.mode=$;break;case 3:e.msg=\"invalid block type\",i.mode=ce}c>>>=2,h-=2;break;case J:for(c>>>=7&h,h-=7&h;h<32;){if(0===f)break e;f--,c+=a[o++]<<h,h+=8}if((65535&c)!==(c>>>16^65535)){e.msg=\"invalid stored block lengths\",i.mode=ce;break}if(i.length=65535&c,c=0,h=0,i.mode=Q,t===A)break e;case Q:i.mode=V;case V:if(m=i.length){if(m>f&&(m=f),m>l&&(m=l),0===m)break e;_.arraySet(r,a,o,m,s),f-=m,o+=m,l-=m,s+=m,i.length-=m;break}i.mode=X;break;case $:for(;h<14;){if(0===f)break e;f--,c+=a[o++]<<h,h+=8}if(i.nlen=(31&c)+257,c>>>=5,h-=5,i.ndist=(31&c)+1,c>>>=5,h-=5,i.ncode=(15&c)+4,c>>>=4,h-=4,i.nlen>286||i.ndist>30){e.msg=\"too many length or distance symbols\",i.mode=ce;break}i.have=0,i.mode=ee;case ee:for(;i.have<i.ncode;){for(;h<3;){if(0===f)break e;f--,c+=a[o++]<<h,h+=8}i.lens[Ae[i.have++]]=7&c,c>>>=3,h-=3}for(;i.have<19;)i.lens[Ae[i.have++]]=0;if(i.lencode=i.lendyn,i.lenbits=7,Se={bits:i.lenbits},ye=x(y,i.lens,0,19,i.lencode,0,i.work,Se),i.lenbits=Se.bits,ye){e.msg=\"invalid code lengths set\",i.mode=ce;break}i.have=0,i.mode=te;case te:for(;i.have<i.nlen+i.ndist;){for(;Be=i.lencode[c&(1<<i.lenbits)-1],me=Be>>>24,ke=Be>>>16&255,_e=65535&Be,!(me<=h);){if(0===f)break e;f--,c+=a[o++]<<h,h+=8}if(_e<16)c>>>=me,h-=me,i.lens[i.have++]=_e;else{if(16===_e){for(Ee=me+2;h<Ee;){if(0===f)break e;f--,c+=a[o++]<<h,h+=8}if(c>>>=me,h-=me,0===i.have){e.msg=\"invalid bit length repeat\",i.mode=ce;break}xe=i.lens[i.have-1],m=3+(3&c),c>>>=2,h-=2}else if(17===_e){for(Ee=me+3;h<Ee;){if(0===f)break e;f--,c+=a[o++]<<h,h+=8}c>>>=me,h-=me,xe=0,m=3+(7&c),c>>>=3,h-=3}else{for(Ee=me+7;h<Ee;){if(0===f)break e;f--,c+=a[o++]<<h,h+=8}c>>>=me,h-=me,xe=0,m=11+(127&c),c>>>=7,h-=7}if(i.have+m>i.nlen+i.ndist){e.msg=\"invalid bit length repeat\",i.mode=ce;break}for(;m--;)i.lens[i.have++]=xe}}if(i.mode===ce)break;if(0===i.lens[256]){e.msg=\"invalid code -- missing end-of-block\",i.mode=ce;break}if(i.lenbits=9,Se={bits:i.lenbits},ye=x(S,i.lens,0,i.nlen,i.lencode,0,i.work,Se),i.lenbits=Se.bits,ye){e.msg=\"invalid literal/lengths set\",i.mode=ce;break}if(i.distbits=6,i.distcode=i.distdyn,Se={bits:i.distbits},ye=x(E,i.lens,i.nlen,i.ndist,i.distcode,0,i.work,Se),i.distbits=Se.bits,ye){e.msg=\"invalid distances set\",i.mode=ce;break}if(i.mode=ie,t===A)break e;case ie:i.mode=ne;case ne:if(f>=6&&l>=258){e.next_out=s,e.avail_out=l,e.next_in=o,e.avail_in=f,i.hold=c,i.bits=h,p(e,w),s=e.next_out,r=e.output,l=e.avail_out,o=e.next_in,a=e.input,f=e.avail_in,c=i.hold,h=i.bits,i.mode===X&&(i.back=-1);break}for(i.back=0;Be=i.lencode[c&(1<<i.lenbits)-1],me=Be>>>24,ke=Be>>>16&255,_e=65535&Be,!(me<=h);){if(0===f)break e;f--,c+=a[o++]<<h,h+=8}if(ke&&0===(240&ke)){for(ge=me,ve=ke,pe=_e;Be=i.lencode[pe+((c&(1<<ge+ve)-1)>>ge)],me=Be>>>24,ke=Be>>>16&255,_e=65535&Be,!(ge+me<=h);){if(0===f)break e;f--,c+=a[o++]<<h,h+=8}c>>>=ge,h-=ge,i.back+=ge}if(c>>>=me,h-=me,i.back+=me,i.length=_e,0===ke){i.mode=fe;break}if(32&ke){i.back=-1,i.mode=X;break}if(64&ke){e.msg=\"invalid literal/length code\",i.mode=ce;break}i.extra=15&ke,i.mode=ae;case ae:if(i.extra){for(Ee=i.extra;h<Ee;){if(0===f)break e;f--,c+=a[o++]<<h,h+=8}i.length+=c&(1<<i.extra)-1,c>>>=i.extra,h-=i.extra,i.back+=i.extra}i.was=i.length,i.mode=re;case re:for(;Be=i.distcode[c&(1<<i.distbits)-1],me=Be>>>24,ke=Be>>>16&255,_e=65535&Be,!(me<=h);){if(0===f)break e;f--,c+=a[o++]<<h,h+=8}if(0===(240&ke)){for(ge=me,ve=ke,pe=_e;Be=i.distcode[pe+((c&(1<<ge+ve)-1)>>ge)],me=Be>>>24,ke=Be>>>16&255,_e=65535&Be,!(ge+me<=h);){if(0===f)break e;f--,c+=a[o++]<<h,h+=8}c>>>=ge,h-=ge,i.back+=ge}if(c>>>=me,h-=me,i.back+=me,64&ke){e.msg=\"invalid distance code\",i.mode=ce;break}i.offset=_e,i.extra=15&ke,i.mode=oe;case oe:if(i.extra){for(Ee=i.extra;h<Ee;){if(0===f)break e;f--,c+=a[o++]<<h,h+=8}i.offset+=c&(1<<i.extra)-1,c>>>=i.extra,h-=i.extra,i.back+=i.extra}if(i.offset>i.dmax){e.msg=\"invalid distance too far back\",i.mode=ce;break}i.mode=se;case se:if(0===l)break e;if(m=w-l,i.offset>m){if(m=i.offset-m,m>i.whave&&i.sane){e.msg=\"invalid distance too far back\",i.mode=ce;break}m>i.wnext?(m-=i.wnext,k=i.wsize-m):k=i.wnext-m,m>i.length&&(m=i.length),we=i.window}else we=r,k=s-i.offset,m=i.length;m>l&&(m=l),l-=m,i.length-=m;do r[s++]=we[k++];while(--m);0===i.length&&(i.mode=ne);break;case fe:if(0===l)break e;r[s++]=i.length,l--,i.mode=ne;break;case le:if(i.wrap){for(;h<32;){if(0===f)break e;f--,c|=a[o++]<<h,h+=8}if(w-=l,e.total_out+=w,i.total+=w,w&&(e.adler=i.check=i.flags?v(i.check,r,w,s-w):g(i.check,r,w,s-w)),w=l,(i.flags?c:n(c))!==i.check){e.msg=\"incorrect data check\",i.mode=ce;break}c=0,h=0}i.mode=de;case de:if(i.wrap&&i.flags){for(;h<32;){if(0===f)break e;f--,c+=a[o++]<<h,h+=8}if(c!==(4294967295&i.total)){e.msg=\"incorrect length check\",i.mode=ce;break}c=0,h=0}i.mode=ue;case ue:ye=R;break e;case ce:ye=O;break e;case he:return I;case be:default:return C}return e.next_out=s,e.avail_out=l,e.next_in=o,e.avail_in=f,i.hold=c,i.bits=h,(i.wsize||w!==e.avail_out&&i.mode<ce&&(i.mode<le||t!==B))&&u(e,e.output,e.next_out,w-e.avail_out)?(i.mode=he,I):(b-=e.avail_in,w-=e.avail_out,e.total_in+=b,e.total_out+=w,i.total+=w,i.wrap&&w&&(e.adler=i.check=i.flags?v(i.check,r,w,e.next_out-w):g(i.check,r,w,e.next_out-w)),e.data_type=i.bits+(i.last?64:0)+(i.mode===X?128:0)+(i.mode===ie||i.mode===Q?256:0),(0===b&&0===w||t===B)&&ye===z&&(ye=T),ye)}function h(e){if(!e||!e.state)return C;var t=e.state;return t.window&&(t.window=null),e.state=null,z}function b(e,t){var i;return e&&e.state?(i=e.state,0===(2&i.wrap)?C:(i.head=t,t.done=!1,z)):C}function w(e,t){var i,n,a,r=t.length;return e&&e.state?(i=e.state,0!==i.wrap&&i.mode!==G?C:i.mode===G&&(n=1,n=g(n,t,r,0),n!==i.check)?O:(a=u(e,t,r,r))?(i.mode=he,I):(i.havedict=1,z)):C}var m,k,_=e(\"../utils/common\"),g=e(\"./adler32\"),v=e(\"./crc32\"),p=e(\"./inffast\"),x=e(\"./inftrees\"),y=0,S=1,E=2,B=4,Z=5,A=6,z=0,R=1,N=2,C=-2,O=-3,I=-4,T=-5,U=8,D=1,F=2,L=3,H=4,M=5,j=6,K=7,P=8,Y=9,q=10,G=11,X=12,W=13,J=14,Q=15,V=16,$=17,ee=18,te=19,ie=20,ne=21,ae=22,re=23,oe=24,se=25,fe=26,le=27,de=28,ue=29,ce=30,he=31,be=32,we=852,me=592,ke=15,_e=ke,ge=!0;i.inflateReset=o,i.inflateReset2=s,i.inflateResetKeep=r,i.inflateInit=l,i.inflateInit2=f,i.inflate=c,i.inflateEnd=h,i.inflateGetHeader=b,i.inflateSetDictionary=w,i.inflateInfo=\"pako inflate (from Nodeca project)\"},{\"../utils/common\":1,\"./adler32\":3,\"./crc32\":5,\"./inffast\":7,\"./inftrees\":9}],9:[function(e,t,i){\"use strict\";var n=e(\"../utils/common\"),a=15,r=852,o=592,s=0,f=1,l=2,d=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,0,0],u=[16,16,16,16,16,16,16,16,17,17,17,17,18,18,18,18,19,19,19,19,20,20,20,20,21,21,21,21,16,72,78],c=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577,0,0],h=[16,16,16,16,17,17,18,18,19,19,20,20,21,21,22,22,23,23,24,24,25,25,26,26,27,27,28,28,29,29,64,64];t.exports=function(e,t,i,b,w,m,k,_){var g,v,p,x,y,S,E,B,Z,A=_.bits,z=0,R=0,N=0,C=0,O=0,I=0,T=0,U=0,D=0,F=0,L=null,H=0,M=new n.Buf16(a+1),j=new n.Buf16(a+1),K=null,P=0;for(z=0;z<=a;z++)M[z]=0;for(R=0;R<b;R++)M[t[i+R]]++;for(O=A,C=a;C>=1&&0===M[C];C--);if(O>C&&(O=C),0===C)return w[m++]=20971520,w[m++]=20971520,_.bits=1,0;for(N=1;N<C&&0===M[N];N++);for(O<N&&(O=N),U=1,z=1;z<=a;z++)if(U<<=1,U-=M[z],U<0)return-1;if(U>0&&(e===s||1!==C))return-1;for(j[1]=0,z=1;z<a;z++)j[z+1]=j[z]+M[z];for(R=0;R<b;R++)0!==t[i+R]&&(k[j[t[i+R]]++]=R);if(e===s?(L=K=k,S=19):e===f?(L=d,H-=257,K=u,P-=257,S=256):(L=c,K=h,S=-1),F=0,R=0,z=N,y=m,I=O,T=0,p=-1,D=1<<O,x=D-1,e===f&&D>r||e===l&&D>o)return 1;for(var Y=0;;){Y++,E=z-T,k[R]<S?(B=0,Z=k[R]):k[R]>S?(B=K[P+k[R]],Z=L[H+k[R]]):(B=96,Z=0),g=1<<z-T,v=1<<I,N=v;do v-=g,w[y+(F>>T)+v]=E<<24|B<<16|Z|0;while(0!==v);for(g=1<<z-1;F&g;)g>>=1;if(0!==g?(F&=g-1,F+=g):F=0,R++,0===--M[z]){if(z===C)break;z=t[i+k[R]]}if(z>O&&(F&x)!==p){for(0===T&&(T=O),y+=N,I=z-T,U=1<<I;I+T<C&&(U-=M[I+T],!(U<=0));)I++,U<<=1;if(D+=1<<I,e===f&&D>r||e===l&&D>o)return 1;p=F&x,w[p]=O<<24|I<<16|y-m|0}}return 0!==F&&(w[y+F]=z-T<<24|64<<16|0),_.bits=O,0}},{\"../utils/common\":1}],10:[function(e,t,i){\"use strict\";t.exports={2:\"need dictionary\",1:\"stream end\",0:\"\",\"-1\":\"file error\",\"-2\":\"stream error\",\"-3\":\"data error\",\"-4\":\"insufficient memory\",\"-5\":\"buffer error\",\"-6\":\"incompatible version\"}},{}],11:[function(e,t,i){\"use strict\";function n(){this.input=null,this.next_in=0,this.avail_in=0,this.total_in=0,this.output=null,this.next_out=0,this.avail_out=0,this.total_out=0,this.msg=\"\",this.state=null,this.data_type=2,this.adler=0}t.exports=n},{}],\"/lib/inflate.js\":[function(e,t,i){\"use strict\";function n(e){if(!(this instanceof n))return new n(e);this.options=s.assign({chunkSize:16384,windowBits:0,to:\"\"},e||{});var t=this.options;t.raw&&t.windowBits>=0&&t.windowBits<16&&(t.windowBits=-t.windowBits,0===t.windowBits&&(t.windowBits=-15)),!(t.windowBits>=0&&t.windowBits<16)||e&&e.windowBits||(t.windowBits+=32),t.windowBits>15&&t.windowBits<48&&0===(15&t.windowBits)&&(t.windowBits|=15),this.err=0,this.msg=\"\",this.ended=!1,this.chunks=[],this.strm=new u,this.strm.avail_out=0;var i=o.inflateInit2(this.strm,t.windowBits);if(i!==l.Z_OK)throw new Error(d[i]);this.header=new c,o.inflateGetHeader(this.strm,this.header)}function a(e,t){var i=new n(t);if(i.push(e,!0),i.err)throw i.msg;return i.result}function r(e,t){return t=t||{},t.raw=!0,a(e,t)}var o=e(\"./zlib/inflate\"),s=e(\"./utils/common\"),f=e(\"./utils/strings\"),l=e(\"./zlib/constants\"),d=e(\"./zlib/messages\"),u=e(\"./zlib/zstream\"),c=e(\"./zlib/gzheader\"),h=Object.prototype.toString;n.prototype.push=function(e,t){var i,n,a,r,d,u,c=this.strm,b=this.options.chunkSize,w=this.options.dictionary,m=!1;if(this.ended)return!1;n=t===~~t?t:t===!0?l.Z_FINISH:l.Z_NO_FLUSH,\"string\"==typeof e?c.input=f.binstring2buf(e):\"[object ArrayBuffer]\"===h.call(e)?c.input=new Uint8Array(e):c.input=e,c.next_in=0,c.avail_in=c.input.length;do{if(0===c.avail_out&&(c.output=new s.Buf8(b),c.next_out=0,c.avail_out=b),i=o.inflate(c,l.Z_NO_FLUSH),i===l.Z_NEED_DICT&&w&&(u=\"string\"==typeof w?f.string2buf(w):\"[object ArrayBuffer]\"===h.call(w)?new Uint8Array(w):w,i=o.inflateSetDictionary(this.strm,u)),i===l.Z_BUF_ERROR&&m===!0&&(i=l.Z_OK,m=!1),i!==l.Z_STREAM_END&&i!==l.Z_OK)return this.onEnd(i),this.ended=!0,!1;c.next_out&&(0!==c.avail_out&&i!==l.Z_STREAM_END&&(0!==c.avail_in||n!==l.Z_FINISH&&n!==l.Z_SYNC_FLUSH)||(\"string\"===this.options.to?(a=f.utf8border(c.output,c.next_out),r=c.next_out-a,d=f.buf2string(c.output,a),c.next_out=r,c.avail_out=b-r,r&&s.arraySet(c.output,c.output,a,r,0),this.onData(d)):this.onData(s.shrinkBuf(c.output,c.next_out)))),0===c.avail_in&&0===c.avail_out&&(m=!0)}while((c.avail_in>0||0===c.avail_out)&&i!==l.Z_STREAM_END);return i===l.Z_STREAM_END&&(n=l.Z_FINISH),n===l.Z_FINISH?(i=o.inflateEnd(this.strm),this.onEnd(i),this.ended=!0,i===l.Z_OK):n!==l.Z_SYNC_FLUSH||(this.onEnd(l.Z_OK),c.avail_out=0,!0)},n.prototype.onData=function(e){this.chunks.push(e)},n.prototype.onEnd=function(e){e===l.Z_OK&&(\"string\"===this.options.to?this.result=this.chunks.join(\"\"):this.result=s.flattenChunks(this.chunks)),this.chunks=[],this.err=e,this.msg=this.strm.msg},i.Inflate=n,i.inflate=a,i.inflateRaw=r,i.ungzip=a},{\"./utils/common\":1,\"./utils/strings\":2,\"./zlib/constants\":4,\"./zlib/gzheader\":6,\"./zlib/inflate\":8,\"./zlib/messages\":10,\"./zlib/zstream\":11}]},{},[])(\"/lib/inflate.js\")});\n</script>\n<script src=\"faview.js\"></script>";
}
exports.getViewer = getViewer;
// https://gist.github.com/boushley/5471599
function arrayBufferToString(ab) {
    var data = new Uint8Array(ab);
    // If we have a BOM skip it
    var s = '', i = 0, c = 0, c2 = 0, c3 = 0;
    if (data.length >= 3 && data[0] === 0xef && data[1] === 0xbb && data[2] === 0xbf) {
        i = 3;
    }
    while (i < data.length) {
        c = data[i];
        if (c < 128) {
            s += String.fromCharCode(c);
            i++;
        }
        else if (c > 191 && c < 224) {
            if (i + 1 >= data.length) {
                throw 'UTF-8 Decode failed. Two byte character was truncated.';
            }
            c2 = data[i + 1];
            s += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
            i += 2;
        }
        else {
            if (i + 2 >= data.length) {
                throw 'UTF-8 Decode failed. Multi byte character was truncated.';
            }
            c2 = data[i + 1];
            c3 = data[i + 2];
            s += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
            i += 3;
        }
    }
    return s;
}
var Base64 = (function () {
    function Base64() {
    }
    Base64.encode = function (input) {
        var bytes = new Uint8Array(input);
        var byteLength = bytes.byteLength;
        var byteRemainder = byteLength % 3;
        var mainLength = byteLength - byteRemainder;
        var table = Base64.table;
        var base64 = new Uint8Array(mainLength / 3 * 4 + (byteRemainder ? 4 : 0));
        var chunk;
        // Main loop deals with bytes in chunks of 3
        var p = -1;
        for (var i = 0; i < mainLength; i = i + 3) {
            // Combine the three bytes into a single integer
            chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
            // Use bitmasks to extract 6-bit segments from the triplet
            // and convert the raw binary segments to the appropriate ASCII encoding
            base64[++p] = table[(chunk & 16515072) >> 18]; // 16515072 = (2^6 - 1) << 18
            base64[++p] = table[(chunk & 258048) >> 12]; // 258048   = (2^6 - 1) << 12
            base64[++p] = table[(chunk & 4032) >> 6]; // 4032     = (2^6 - 1) << 6
            base64[++p] = table[chunk & 63]; // 63       = 2^6 - 1
        }
        // Deal with the remaining bytes and padding
        if (byteRemainder === 1) {
            chunk = bytes[mainLength];
            base64[++p] = table[(chunk & 252) >> 2]; // 252 = (2^6 - 1) << 2
            base64[++p] = table[(chunk & 3) << 4]; // 3   = 2^2 - 1
            base64[++p] = 0x3d;
            base64[++p] = 0x3d;
        }
        else if (byteRemainder === 2) {
            chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1];
            base64[++p] = table[(chunk & 64512) >> 10]; // 64512 = (2^6 - 1) << 10
            base64[++p] = table[(chunk & 1008) >> 4]; // 1008  = (2^6 - 1) << 4
            base64[++p] = table[(chunk & 15) << 2]; // 15    = 2^4 - 1
            base64[++p] = 0x3d;
        }
        return base64.buffer;
    };
    // Based on https://gist.github.com/jonleighton/958841
    Base64.table = new Uint8Array([
        // A-Z
        0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48,
        0x49, 0x4a, 0x4b, 0x4c, 0x4d, 0x4e, 0x4f, 0x50,
        0x51, 0x52, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x5a,
        // a-z
        0x61, 0x62, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68,
        0x69, 0x6a, 0x6b, 0x6c, 0x6d, 0x6e, 0x6f, 0x70,
        0x71, 0x72, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7a,
        // 0-9
        0x30, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39,
        // + /
        0x2b, 0x2f
    ]);
    return Base64;
}());

},{"./crc32":2}],11:[function(require,module,exports){
"use strict";
var crc32 = require('./crc32');
var databaseName = 'zipper';
var fileStoreName = 'file';
var Zipper = (function () {
    function Zipper() {
        this.id = Date.now().toString() + Math.random().toString().substring(2);
        this.fileInfos = [];
    }
    Zipper.prototype.init = function (success, error) {
        var _this = this;
        var req = indexedDB.open(databaseName, 2);
        req.onupgradeneeded = function (e) {
            var db = req.result;
            if (db instanceof IDBDatabase) {
                try {
                    db.deleteObjectStore(fileStoreName);
                }
                catch (e) {
                }
                db.createObjectStore(fileStoreName);
                return;
            }
            throw new Error('req.result is not IDBDatabase');
        };
        req.onerror = function (e) { return error(e); };
        req.onsuccess = function (e) {
            var db = req.result;
            if (db instanceof IDBDatabase) {
                _this.db = db;
                _this.gc(function (err) { return undefined; });
                success();
                return;
            }
            throw new Error('req.result is not IDBDatabase');
        };
    };
    Zipper.prototype.dispose = function (error) {
        this.db.onerror = error;
        var tx = this.db.transaction(fileStoreName, 'readwrite');
        tx.onerror = error;
        var os = tx.objectStore(fileStoreName);
        this.remove(os, this.id, error);
        this.gc(function (err) { return undefined; });
    };
    Zipper.prototype.gc = function (error) {
        var _this = this;
        if (!this.db) {
            return;
        }
        this.db.onerror = error;
        var tx = this.db.transaction(fileStoreName, 'readwrite');
        tx.onerror = error;
        var os = tx.objectStore(fileStoreName);
        var req = os.openCursor(IDBKeyRange.bound('meta_', 'meta`', false, true));
        var d = new Date().getTime() - 60 * 1000;
        req.onsuccess = function (e) {
            var cursor = req.result;
            if (!cursor) {
                return;
            }
            if (cursor instanceof IDBCursorWithValue) {
                if (cursor.value.lastMod.getTime() < d) {
                    var key = cursor.key;
                    if (typeof key === 'string') {
                        _this.remove(os, key.split('_')[1], error);
                    }
                }
                cursor.continue();
                return;
            }
        };
        req.onerror = error;
    };
    Zipper.gc = function () {
        new Zipper().init(function () { return undefined; }, function (err) { return undefined; });
    };
    Zipper.prototype.remove = function (os, id, error) {
        if (!this.db) {
            return;
        }
        var req = os.delete(IDBKeyRange.bound('body_' + id + '_', 'body_' + id + '`', false, true));
        req.onsuccess = function (e) {
            os.delete('meta_' + id);
        };
    };
    Zipper.prototype.add = function (name, blob, complete, error) {
        this.addCore(name, blob, false, complete, error);
    };
    Zipper.prototype.addCompress = function (name, blob, complete, error) {
        this.addCore(name, blob, true, complete, error);
    };
    Zipper.prototype.addCore = function (name, blob, compress, complete, error) {
        var _this = this;
        if (!this.db) {
            return;
        }
        var index = this.fileInfos.length;
        var fi = new FileInfo(name, blob, compress, function (compressed) {
            _this.db.onerror = error;
            var tx = _this.db.transaction(fileStoreName, 'readwrite');
            tx.onerror = error;
            var os = tx.objectStore(fileStoreName);
            os.put({ lastMod: new Date() }, 'meta_' + _this.id);
            var req = os.put(new Blob([compressed], { type: 'application/octet-binary' }), 'body_' + _this.id + '_' + index);
            req.onsuccess = function (e) { return complete(); };
            req.onerror = error;
        }, error);
        this.fileInfos.push(fi);
    };
    Zipper.prototype.generate = function (complete, error) {
        var _this = this;
        if (!this.db) {
            throw new Error('Zipper is already disposed');
        }
        this.db.onerror = error;
        var tx = this.db.transaction(fileStoreName, 'readwrite');
        tx.onerror = error;
        var os = tx.objectStore(fileStoreName);
        os.put({ lastMod: new Date() }, 'meta_' + this.id);
        this.receiveFiles(function (blobs) {
            var size = Zip.endOfCentralDirectorySize;
            _this.fileInfos.forEach(function (fi) {
                size += fi.localFileHeaderSize + fi.compressedFileSize + fi.centralDirectoryRecordSize;
            });
            if (size > 0xffffffff || _this.fileInfos.length > 0xffff) {
                complete(_this.makeZIP64(blobs));
            }
            else {
                complete(_this.makeZIP(blobs));
            }
        }, error);
    };
    Zipper.prototype.receiveFiles = function (success, error) {
        var _this = this;
        var reqs = this.fileInfos.length;
        var blobs = new Array(this.fileInfos.length);
        this.db.onerror = error;
        var tx = this.db.transaction(fileStoreName, 'readonly');
        tx.onerror = error;
        var os = tx.objectStore(fileStoreName);
        this.fileInfos.forEach(function (fi, i) {
            var req = os.get('body_' + _this.id + '_' + i);
            req.onsuccess = function (e) {
                var result = req.result;
                if (result instanceof Blob) {
                    blobs[i] = result;
                    if (!--reqs) {
                        success(blobs);
                    }
                }
            };
            req.onerror = error;
        });
    };
    Zipper.prototype.makeZIP = function (fileBodies) {
        var zip = [];
        this.fileInfos.forEach(function (fi, i) {
            zip.push(fi.toLocalFileHeader(), fileBodies[i]);
        });
        var pos = 0, cdrSize = 0;
        this.fileInfos.forEach(function (fi) {
            zip.push(fi.toCentralDirectoryRecord(pos));
            pos += fi.compressedFileSize + fi.localFileHeaderSize;
            cdrSize += fi.centralDirectoryRecordSize;
        });
        zip.push(Zip.buildEndOfCentralDirectory(this.fileInfos.length, cdrSize, pos));
        return new Blob(zip, { type: 'application/zip' });
    };
    Zipper.prototype.makeZIP64 = function (fileBodies) {
        var zip = [];
        var pos = 0;
        this.fileInfos.forEach(function (fi, i) {
            zip.push(fi.toLocalFileHeader64(pos), fileBodies[i]);
            pos += fi.compressedFileSize + fi.localFileHeaderSize64;
        });
        pos = 0;
        var cdrSize = 0;
        this.fileInfos.forEach(function (fi) {
            zip.push(fi.toCentralDirectoryRecord64(pos));
            pos += fi.compressedFileSize + fi.localFileHeaderSize64;
            cdrSize += fi.centralDirectoryRecordSize64;
        });
        zip.push(Zip64.buildEndOfCentralDirectory(this.fileInfos.length, cdrSize, pos));
        return new Blob(zip, { type: 'application/zip' });
    };
    return Zipper;
}());
exports.Zipper = Zipper;
var FileInfo = (function () {
    function FileInfo(name, data, compress, complete, error) {
        var _this = this;
        this.date = new Date();
        var reqs = 2;
        this.size = data.size;
        this.compressedSize = data.size;
        if (compress) {
            this.compressionMethod = 8; // deflate
            ++reqs;
        }
        else {
            this.compressionMethod = 0; // stored
        }
        var ab;
        var fr = new FileReader();
        fr.onload = function (e) {
            var result = fr.result;
            if (result instanceof ArrayBuffer) {
                ab = result;
                _this.crc = crc32.crc32(result);
                if (!--reqs) {
                    complete(ab);
                    return;
                }
                if (compress) {
                    Zip.deflate(result, function (compressed) {
                        ab = compressed;
                        _this.compressedSize = compressed.byteLength;
                        if (!--reqs) {
                            complete(ab);
                        }
                    });
                }
            }
        };
        fr.onerror = function (e) { return error(fr.error); };
        fr.readAsArrayBuffer(data);
        var nr = new FileReader();
        nr.onload = function (e) {
            var result = nr.result;
            if (result instanceof ArrayBuffer) {
                _this.name = result;
                if (!--reqs) {
                    complete(ab);
                }
            }
        };
        nr.onerror = function (e) { return error(nr.error); };
        nr.readAsArrayBuffer(new Blob([name]));
    }
    Object.defineProperty(FileInfo.prototype, "fileSize", {
        get: function () {
            return this.size;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(FileInfo.prototype, "compressedFileSize", {
        get: function () {
            return this.compressedSize;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(FileInfo.prototype, "localFileHeaderSize", {
        get: function () {
            return Zip.calcLocalFileHeaderSize(this.name);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(FileInfo.prototype, "localFileHeaderSize64", {
        get: function () {
            return Zip64.calcLocalFileHeaderSize(this.name);
        },
        enumerable: true,
        configurable: true
    });
    FileInfo.prototype.toLocalFileHeader = function () {
        return Zip.buildLocalFileHeader(this.name, this.crc, this.date, this.compressionMethod, this.size, this.compressedSize);
    };
    FileInfo.prototype.toLocalFileHeader64 = function (lfhOffset) {
        return Zip64.buildLocalFileHeader(this.name, this.crc, this.date, this.compressionMethod, this.size, this.compressedSize, lfhOffset);
    };
    Object.defineProperty(FileInfo.prototype, "centralDirectoryRecordSize", {
        get: function () {
            return Zip.calcCentralDirectoryRecordSize(this.name);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(FileInfo.prototype, "centralDirectoryRecordSize64", {
        get: function () {
            return Zip64.calcCentralDirectoryRecordSize(this.name);
        },
        enumerable: true,
        configurable: true
    });
    FileInfo.prototype.toCentralDirectoryRecord = function (lfhOffset) {
        return Zip.buildCentralDirectoryRecord(this.name, this.crc, this.date, this.compressionMethod, this.size, this.compressedSize, lfhOffset);
    };
    FileInfo.prototype.toCentralDirectoryRecord64 = function (lfhOffset) {
        return Zip64.buildCentralDirectoryRecord(this.name, this.crc, this.date, this.compressionMethod, this.size, this.compressedSize, lfhOffset);
    };
    return FileInfo;
}());
// Reference: http://www.onicos.com/staff/iz/formats/zip.html
var Zip = (function () {
    function Zip() {
    }
    Zip.calcLocalFileHeaderSize = function (name) {
        return 30 + name.byteLength + 9 + name.byteLength;
    };
    Zip.buildLocalFileHeader = function (name, crc, lastMod, compressionMethod, fileSize, compressedSize) {
        var d = Zip.formatDate(lastMod);
        var lfh = new ArrayBuffer(30), extraField = new ArrayBuffer(9);
        var v = new DataView(lfh);
        // Local file header signature
        v.setUint32(0, 0x04034b50, true);
        // Version needed to extract
        v.setUint16(4, 0x000a, true);
        // General purpose bit flag
        // 0x0800 = the file name is encoded with UTF-8
        v.setUint16(6, 0x0800, true);
        // Compression method
        // 0 = stored (no compression)
        v.setUint16(8, compressionMethod, true);
        // Last mod file time
        v.setUint16(10, d & 0xffff, true);
        // Last mod file date
        v.setUint16(12, (d >>> 16) & 0xffff, true);
        // CRC-32
        v.setUint32(14, crc, true);
        // Compressed size
        v.setUint32(18, compressedSize, true);
        // Uncompressed size
        v.setUint32(22, fileSize, true);
        // Filename length
        v.setUint16(26, name.byteLength, true);
        // Extra field length
        // https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT
        // 4.6.9 -Info-ZIP Unicode Path Extra Field (0x7075):
        // Value         Size        Description
        // -----         ----        -----------
        // 0x7075        Short       tag for this extra block type ("up")
        // TSize         Short       total data size for this block
        // Version       1 byte      version of this extra field, currently 1
        // NameCRC32     4 bytes     File Name Field CRC32 Checksum
        // UnicodeName   Variable    UTF-8 version of the entry File Name
        v.setUint16(28, extraField.byteLength + name.byteLength, true);
        v = new DataView(extraField);
        // Tag for this extra block type
        v.setUint16(0, 0x7075, true);
        // TSize
        v.setUint16(2, 5 + name.byteLength, true);
        // Version
        v.setUint8(4, 0x01);
        // NameCRC32
        v.setUint32(5, crc32.crc32(name), true);
        return new Blob([lfh, name, extraField, name]);
    };
    Zip.calcCentralDirectoryRecordSize = function (name) {
        return 46 + name.byteLength + 9 + name.byteLength;
    };
    Zip.buildCentralDirectoryRecord = function (name, crc, lastMod, compressionMethod, fileSize, compressedSize, lfhOffset) {
        var d = Zip.formatDate(lastMod);
        var cdr = new ArrayBuffer(46), extraField = new ArrayBuffer(9);
        var v = new DataView(cdr);
        // Central file header signature
        v.setUint32(0, 0x02014b50, true);
        // Version made by
        v.setUint16(4, 0x0014, true);
        // Version needed to extract
        v.setUint16(6, 0x000a, true);
        // General purpose bit flag
        // 0x0800 = the file name is encoded with UTF-8
        v.setUint16(8, 0x0800, true);
        // Compression method
        // 0 = stored (no compression)
        v.setUint16(10, compressionMethod, true);
        // Last mod file time
        v.setUint16(12, d & 0xffff, true);
        // Last mod file date
        v.setUint16(14, (d >>> 16) & 0xffff, true);
        // CRC-32
        v.setUint32(16, crc, true);
        // Compressed size
        v.setUint32(20, compressedSize, true);
        // Uncompressed size
        v.setUint32(24, fileSize, true);
        // Filename length
        v.setUint16(28, name.byteLength, true);
        // Extra field length
        v.setUint16(30, extraField.byteLength + name.byteLength, true);
        // File comment length
        v.setUint16(32, 0, true);
        // Disk number start
        v.setUint16(34, 0, true);
        // Internal file attributes
        v.setUint16(36, 0, true);
        // External file attributes
        v.setUint32(38, 0, true);
        // Relative offset of local header
        v.setUint32(42, lfhOffset, true);
        v = new DataView(extraField);
        // Tag for this extra block type
        v.setUint16(0, 0x7075, true);
        // TSize
        v.setUint16(2, 5 + name.byteLength, true);
        // Version
        v.setUint8(4, 0x01);
        // NameCRC32
        v.setUint32(5, crc32.crc32(name), true);
        return new Blob([cdr, name, extraField, name]);
    };
    Zip.formatDate = function (d) {
        if (!d) {
            d = new Date();
        }
        var date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
        var time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() / 2);
        return (date << 16) | time; // YYYYYYYm mmmddddd HHHHHMMM MMMSSSSS
    };
    Object.defineProperty(Zip, "endOfCentralDirectorySize", {
        get: function () {
            return 22;
        },
        enumerable: true,
        configurable: true
    });
    Zip.buildEndOfCentralDirectory = function (files, cdrSize, cdrOffset) {
        var eoc = new ArrayBuffer(22);
        var v = new DataView(eoc);
        // End of central dir signature
        v.setUint32(0, 0x06054b50, true);
        // Number of this disk
        v.setUint16(4, 0, true);
        // Number of the disk with the start of the central directory
        v.setUint16(6, 0, true);
        // Total number of entries in the central dir on this disk
        v.setUint16(8, files, true);
        // Total number of entries in the central dir
        v.setUint16(10, files, true);
        // Size of the central directory
        v.setUint32(12, cdrSize, true);
        // Offset of start of central directory with respect to the starting disk number
        v.setUint32(16, cdrOffset, true);
        // zipfile comment length
        v.setUint16(20, 0, true);
        return new Blob([eoc]);
    };
    Zip.deflate = function (b, callback) {
        if (!Zip.worker) {
            Zip.worker = new Worker(Zip.createWorkerURL());
            Zip.worker.onmessage = function (e) {
                var f = Zip.compressQueue.shift();
                if (f) {
                    f(e.data);
                }
            };
        }
        Zip.compressQueue.push(callback);
        Zip.worker.postMessage(b, [b]);
    };
    Zip.createWorkerURL = function () {
        if (Zip.workerURL) {
            return Zip.workerURL;
        }
        Zip.workerURL = URL.createObjectURL(new Blob(["\n'use strict';\nimportScripts('https://cdnjs.cloudflare.com/ajax/libs/pako/1.0.3/pako_deflate.min.js');\nonmessage = function(e){\n   var b = pako.deflateRaw(e.data).buffer;\n   postMessage(b, [b]);\n}\n"], { type: 'text/javascript' }));
        return Zip.workerURL;
    };
    Zip.compressQueue = [];
    return Zip;
}());
var Zip64 = (function () {
    function Zip64() {
    }
    Zip64.calcLocalFileHeaderSize = function (name) {
        return 30 + name.byteLength + 32 + 9 + name.byteLength;
    };
    Zip64.buildLocalFileHeader = function (name, crc, lastMod, compressionMethod, fileSize, compressedSize, lfhOffset) {
        var d = Zip64.formatDate(lastMod);
        var lfh = new ArrayBuffer(30), extraFieldZip64 = new ArrayBuffer(32), extraFieldName = new ArrayBuffer(9);
        var v = new DataView(lfh);
        // Local file header signature
        v.setUint32(0, 0x04034b50, true);
        // Version needed to extract
        v.setUint16(4, 0x002d, true);
        // General purpose bit flag
        // 0x0800 = the file name is encoded with UTF-8
        v.setUint16(6, 0x0800, true);
        // Compression method
        // 0 = stored (no compression)
        v.setUint16(8, compressionMethod, true);
        // Last mod file time
        v.setUint16(10, d & 0xffff, true);
        // Last mod file date
        v.setUint16(12, (d >>> 16) & 0xffff, true);
        // CRC-32
        v.setUint32(14, crc, true);
        // Compressed size
        v.setUint32(18, 0xffffffff, true);
        // Uncompressed size
        v.setUint32(22, 0xffffffff, true);
        // Filename length
        v.setUint16(26, name.byteLength, true);
        // Extra field length
        // https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT
        v.setUint16(28, extraFieldZip64.byteLength + extraFieldName.byteLength + name.byteLength, true);
        // 4.5.3 -Zip64 Extended Information Extra Field (0x0001):
        // Value      Size       Description
        // -----      ----       -----------
        // 0x0001     2 bytes    Tag for this "extra" block type
        // Size       2 bytes    Size of this "extra" block
        // Original
        // Size       8 bytes    Original uncompressed file size
        // Compressed
        // Size       8 bytes    Size of compressed data
        // Relative Header
        // Offset     8 bytes    Offset of local header record
        // Disk Start
        // Number     4 bytes    Number of the disk on which
        //                       this file starts
        v = new DataView(extraFieldZip64);
        // Tag for this extra block type
        v.setUint16(0, 0x0001, true);
        // Size
        v.setUint16(2, 28, true);
        // Original Size
        Zip64.setUint64(v, 4, fileSize);
        // Compressed Size
        Zip64.setUint64(v, 12, compressedSize);
        // Relative Header Offset
        Zip64.setUint64(v, 20, lfhOffset);
        // Disk Start Number
        v.setUint32(28, 0);
        // 4.6.9 -Info-ZIP Unicode Path Extra Field (0x7075):
        // Value         Size        Description
        // -----         ----        -----------
        // 0x7075        Short       tag for this extra block type ("up")
        // TSize         Short       total data size for this block
        // Version       1 byte      version of this extra field, currently 1
        // NameCRC32     4 bytes     File Name Field CRC32 Checksum
        // UnicodeName   Variable    UTF-8 version of the entry File Name
        v = new DataView(extraFieldName);
        // Tag for this extra block type
        v.setUint16(0, 0x7075, true);
        // TSize
        v.setUint16(2, 5 + name.byteLength, true);
        // Version
        v.setUint8(4, 0x01);
        // NameCRC32
        v.setUint32(5, crc32.crc32(name), true);
        return new Blob([lfh, name, extraFieldZip64, extraFieldName, name]);
    };
    Zip64.calcCentralDirectoryRecordSize = function (name) {
        return 46 + name.byteLength + 32 + 9 + name.byteLength;
    };
    Zip64.buildCentralDirectoryRecord = function (name, crc, lastMod, compressionMethod, fileSize, compressedSize, lfhOffset) {
        var d = Zip64.formatDate(lastMod);
        var cdr = new ArrayBuffer(46), extraFieldZip64 = new ArrayBuffer(32), extraFieldName = new ArrayBuffer(9);
        var v = new DataView(cdr);
        // Central file header signature
        v.setUint32(0, 0x02014b50, true);
        // Version made by
        v.setUint16(4, 0x002d, true);
        // Version needed to extract
        v.setUint16(6, 0x002d, true);
        // General purpose bit flag
        // 0x0800 = the file name is encoded with UTF-8
        v.setUint16(8, 0x0800, true);
        // Compression method
        // 0 = stored (no compression)
        v.setUint16(10, compressionMethod, true);
        // Last mod file time
        v.setUint16(12, d & 0xffff, true);
        // Last mod file date
        v.setUint16(14, (d >>> 16) & 0xffff, true);
        // CRC-32
        v.setUint32(16, crc, true);
        // Compressed size
        v.setUint32(20, 0xffffffff, true);
        // Uncompressed size
        v.setUint32(24, 0xffffffff, true);
        // Filename length
        v.setUint16(28, name.byteLength, true);
        // Extra field length
        v.setUint16(30, extraFieldZip64.byteLength + extraFieldName.byteLength + name.byteLength, true);
        // File comment length
        v.setUint16(32, 0, true);
        // Disk number start
        v.setUint16(34, 0xffff, true);
        // Internal file attributes
        v.setUint16(36, 0, true);
        // External file attributes
        v.setUint32(38, 0, true);
        // Relative offset of local header
        v.setUint32(42, 0xffffffff, true);
        v = new DataView(extraFieldZip64);
        // Tag for this extra block type
        v.setUint16(0, 0x0001, true);
        // Size
        v.setUint16(2, 28, true);
        // Original Size
        Zip64.setUint64(v, 4, fileSize);
        // Compressed Size
        Zip64.setUint64(v, 12, compressedSize);
        // Relative Header Offset
        Zip64.setUint64(v, 20, lfhOffset);
        // Disk Start Number
        v.setUint32(28, 0);
        v = new DataView(extraFieldName);
        // Tag for this extra block type
        v.setUint16(0, 0x7075, true);
        // TSize
        v.setUint16(2, 5 + name.byteLength, true);
        // Version
        v.setUint8(4, 0x01);
        // NameCRC32
        v.setUint32(5, crc32.crc32(name), true);
        return new Blob([cdr, name, extraFieldZip64, extraFieldName, name]);
    };
    Zip64.formatDate = function (d) {
        if (!d) {
            d = new Date();
        }
        var date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
        var time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() / 2);
        return (date << 16) | time; // YYYYYYYm mmmddddd HHHHHMMM MMMSSSSS
    };
    Object.defineProperty(Zip64, "endOfCentralDirectorySize", {
        get: function () {
            return 22 + 56 + 20;
        },
        enumerable: true,
        configurable: true
    });
    Zip64.buildEndOfCentralDirectory = function (files, cdrSize, cdrOffset) {
        var eoc = new ArrayBuffer(22), eoc64 = new ArrayBuffer(56), eocl64 = new ArrayBuffer(20);
        var v = new DataView(eoc64);
        // zip64 end of central dir signature
        v.setUint32(0, 0x06064b50, true);
        // size of zip64 end of central directory record
        Zip64.setUint64(v, 4, eoc64.byteLength + eocl64.byteLength + eoc.byteLength - 12);
        // version made by
        v.setUint16(12, 0x002d, true);
        // version needed to extract
        v.setUint16(14, 0x002d, true);
        // number of this disk
        v.setUint32(16, 0, true);
        // number of the disk with the start of the central directory
        v.setUint32(20, 0, true);
        // total number of entries in the central directory on this disk
        Zip64.setUint64(v, 24, files);
        // total number of entries in the central directory
        Zip64.setUint64(v, 32, files);
        // size of the central directory
        Zip64.setUint64(v, 40, cdrSize);
        // offset of start of central directory with respect to the starting disk number
        Zip64.setUint64(v, 48, cdrOffset);
        v = new DataView(eocl64);
        // zip64 end of central dir locator signature
        v.setUint32(0, 0x07064b50, true);
        // number of the disk with the start of the zip64 end of central directory
        v.setUint32(4, 0, true);
        // relative offset of the zip64 end of central directory record
        Zip64.setUint64(v, 8, cdrOffset + cdrSize);
        // total number of disks
        v.setUint32(16, 1, true);
        v = new DataView(eoc);
        // End of central dir signature
        v.setUint32(0, 0x06054b50, true);
        // Number of this disk
        v.setUint16(4, 0xffff, true);
        // Number of the disk with the start of the central directory
        v.setUint16(6, 0xffff, true);
        // Total number of entries in the central dir on this disk
        v.setUint16(8, 0xffff, true);
        // Total number of entries in the central dir
        v.setUint16(10, 0xffff, true);
        // Size of the central directory
        v.setUint32(12, 0xffffffff, true);
        // Offset of start of central directory with respect to the starting disk number
        v.setUint32(16, 0xffffffff, true);
        // zipfile comment length
        v.setUint16(20, 0, true);
        return new Blob([eoc64, eocl64, eoc]);
    };
    Zip64.setUint64 = function (v, offset, value) {
        v.setUint32(offset, value & 0xffffffff, true);
        v.setUint32(offset + 4, Math.floor(value / 0x100000000), true);
    };
    return Zip64;
}());
Zipper.gc();

},{"./crc32":2}]},{},[7]);
