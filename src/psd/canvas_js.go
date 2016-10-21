// +build js

package main

import "github.com/gopherjs/gopherjs/js"

func createImageCanvasContext(w int, h int, r []byte, g []byte, b []byte, a []byte) *js.Object {
	cvs := js.Global.Get("document").Call("createElement", "canvas")
	cvs.Set("width", w)
	cvs.Set("height", h)
	ctx := cvs.Call("getContext", "2d")
	imgData := ctx.Call("createImageData", w, h)
	dw := imgData.Get("width").Int()
	data := imgData.Get("data")

	var ofsd, ofss, x, y, sx, dx int
	if a != nil {
		for y = 0; y < h; y++ {
			ofss, ofsd = y*w, y*dw<<2
			for x = 0; x < w; x++ {
				sx, dx = ofss+x, ofsd+x<<2
				data.SetIndex(dx+0, r[sx])
				data.SetIndex(dx+1, g[sx])
				data.SetIndex(dx+2, b[sx])
				data.SetIndex(dx+3, a[sx])
			}
		}
	} else {
		for y = 0; y < h; y++ {
			ofss, ofsd = y*w, y*dw<<2
			for x = 0; x < w; x++ {
				sx, dx = ofss+x, ofsd+x<<2
				data.SetIndex(dx+0, r[sx])
				data.SetIndex(dx+1, g[sx])
				data.SetIndex(dx+2, b[sx])
				data.SetIndex(dx+3, 0xff)
			}
		}
	}
	ctx.Call("putImageData", imgData, 0, 0)
	return ctx
}

func createMaskCanvasContext(w int, h int, mask []byte, defaultColor int) *js.Object {
	cvs := js.Global.Get("document").Call("createElement", "canvas")
	cvs.Set("width", w)
	cvs.Set("height", h)
	ctx := cvs.Call("getContext", "2d")
	imgData := ctx.Call("createImageData", w, h)
	dw := imgData.Get("width").Int() << 2
	data := imgData.Get("data")

	var ofsd, ofss, x, y int
	if defaultColor == 0 {
		for y = 0; y < h; y++ {
			ofss, ofsd = y*w, y*dw
			for x = 0; x < w; x++ {
				data.SetIndex(ofsd+x<<2+3, mask[ofss+x])
			}
		}
	} else {
		for y = 0; y < h; y++ {
			ofss, ofsd = y*w, y*dw
			for x = 0; x < w; x++ {
				data.SetIndex(ofsd+x<<2+3, 255-mask[ofss+x])
			}
		}
	}
	ctx.Call("putImageData", imgData, 0, 0)
	return ctx
}
