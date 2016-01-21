//go:generate gopherjs build -m -o psdtool.js

package main

import (
	"bytes"
	"fmt"
	"image/color"
	"io"
	"log"
	"time"

	"github.com/gopherjs/gopherjs/js"
	"github.com/oov/psd"
)

type root struct {
	Width  int
	Height int
	Layer  []layer
}

type layer struct {
	Name                  string
	BlendMode             string
	Opacity               uint8
	Clipping              bool
	TransparencyProtected bool
	Visible               bool
	X                     int
	Y                     int
	Width                 int
	Height                int
	Folder                bool
	FolderOpen            bool
	Canvas                *js.Object
	Layer                 []layer
	psdLayer              *psd.Layer
}

func main() {
	js.Global.Set("parsePSD", parsePSD)
	// js.Global.Set("exportZIP", exportZIP)
}

func arrayBufferToByteSlice(a *js.Object) []byte {
	return js.Global.Get("Uint8Array").New(a).Interface().([]byte)
}

func buildLayer(l *layer) error {
	var err error

	l.Name = l.psdLayer.Name
	l.BlendMode = l.psdLayer.BlendMode.String()
	l.Opacity = l.psdLayer.Opacity
	l.Clipping = l.psdLayer.Clipping != 0
	l.TransparencyProtected = l.psdLayer.TransparencyProtected()
	l.Visible = l.psdLayer.Visible()
	l.X = l.psdLayer.Rect.Min.X
	l.Y = l.psdLayer.Rect.Min.Y
	l.Width = l.psdLayer.Rect.Dx()
	l.Height = l.psdLayer.Rect.Dy()
	l.Folder = l.psdLayer.Folder()
	l.FolderOpen = l.psdLayer.FolderIsOpen()

	if l.psdLayer.HasImage() {
		if l.Canvas, err = createCanvas(l.psdLayer); err != nil {
			return err
		}
	}
	for i := range l.psdLayer.Layer {
		l.Layer = append(l.Layer, layer{psdLayer: &l.psdLayer.Layer[i]})
		if err = buildLayer(&l.Layer[i]); err != nil {
			return err
		}
	}
	return nil
}

func createCanvas(l *psd.Layer) (*js.Object, error) {
	if l.Picker.ColorModel() != color.NRGBAModel {
		return nil, fmt.Errorf("Unsupported color mode")
	}

	w, h := l.Rect.Dx(), l.Rect.Dy()
	cvs := js.Global.Get("document").Call("createElement", "canvas")
	cvs.Set("width", w)
	cvs.Set("height", h)
	ctx := cvs.Call("getContext", "2d")
	imgData := ctx.Call("createImageData", w, h)
	data := imgData.Get("data")

	var ofsd, ofss, x, y, sx, dx int
	r, g, b := l.Channel[0], l.Channel[1], l.Channel[2]
	rp, gp, bp := r.Data, g.Data, b.Data
	if a, ok := l.Channel[-1]; ok {
		ap := a.Data
		for y = 0; y < h; y++ {
			ofss = y * w
			ofsd = ofss << 2
			for x = 0; x < w; x++ {
				sx, dx = ofss+x, ofsd+x<<2
				data.SetIndex(dx+0, rp[sx])
				data.SetIndex(dx+1, gp[sx])
				data.SetIndex(dx+2, bp[sx])
				data.SetIndex(dx+3, ap[sx])
			}
		}
	} else {
		for y = 0; y < h; y++ {
			ofss = y * w
			ofsd = ofss << 2
			for x = 0; x < w; x++ {
				sx, dx = ofss+x, ofsd+x<<2
				data.SetIndex(dx+0, rp[sx])
				data.SetIndex(dx+1, gp[sx])
				data.SetIndex(dx+2, bp[sx])
				data.SetIndex(dx+3, 0xff)
			}
		}
	}
	ctx.Call("putImageData", imgData, 0, 0)
	return cvs, nil
}

func extractLayer(l *layer) {
	if l.psdLayer.HasImage() {
		js.Global.Get("document").Get("body").Call("appendChild", l.Canvas)
	}
	for i := range l.Layer {
		extractLayer(&l.Layer[i])
	}
}

func parse(r io.Reader) (*root, error) {
	s := time.Now().UnixNano()
	psdImg, _, err := psd.Decode(r)
	if err != nil {
		return nil, err
	}
	e := time.Now().UnixNano()
	log.Println("Decode PSD Structure:", (e-s)/1e6)

	if psdImg.Config.ColorMode != psd.ColorModeRGB {
		return nil, fmt.Errorf("Unsupported color mode")
	}

	s = time.Now().UnixNano()
	var l root
	l.Width = psdImg.Config.Rect.Dx()
	l.Height = psdImg.Config.Rect.Dy()
	for i := range psdImg.Layer {
		l.Layer = append(l.Layer, layer{psdLayer: &psdImg.Layer[i]})
		buildLayer(&l.Layer[i])
	}
	e = time.Now().UnixNano()
	log.Println("Build Canvas:", (e-s)/1e6)
	return &l, nil
}

func parsePSD(in *js.Object) *root {
	root, err := parse(bytes.NewBuffer(arrayBufferToByteSlice(in)))
	if err != nil {
		panic(err)
	}
	return root
}

/*
func buildZIP(w *zip.Writer, f string, l *layer) error {
	for i, ll := range l.Layer {
		buildZIP(w, fmt.Sprintf("%s_%02d-%s", f, i, ll.psdLayer.Name), &ll)
	}
	if !l.psdLayer.HasImage() {
		return nil
	}
	imgBase64 := l.Canvas.Call("toDataURL", "image/png").Call("substring", 22).String()
	b, err := base64.StdEncoding.DecodeString(imgBase64)
	if err != nil {
		return err
	}
	filename := fmt.Sprintf("%s.png", f)
	o, err := w.CreateHeader(&zip.FileHeader{Name: filename, Method: zip.Store, Flags: 0x800})
	if err != nil {
		return err
	}
	_, err = o.Write(b)
	return err
}

func exportZIP(in *js.Object) *js.Object {
	root, err := parse(bytes.NewBuffer(arrayBufferToByteSlice(in)))
	if err != nil {
		panic(err)
	}

	buf := &bytes.Buffer{}
	w := zip.NewWriter(buf)
	s := time.Now().UnixNano()
	for i, l := range root.Layer {
		buildZIP(w, fmt.Sprintf("%02d-%s", i, l.psdLayer.Name), &l)
	}
	e := time.Now().UnixNano()
	log.Println("Build ZIP:", (e-s)/1e6)
	if err = w.Close(); err != nil {
		panic(err)
	}
	return js.NewArrayBuffer(buf.Bytes())
}
*/
