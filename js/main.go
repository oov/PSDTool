//go:generate gopherjs build -m -o psdtool.js

package main

import (
	"errors"
	"image"
	"image/color"
	"io"
	"log"
	"time"

	"github.com/gopherjs/gopherjs/js"
	"github.com/oov/psd"
	"golang.org/x/text/encoding/japanese"
)

type root struct {
	Width      int
	Height     int
	RealX      int
	RealY      int
	RealWidth  int
	RealHeight int
	Buffer     *js.Object
	Child      []layer
	processed  int
	progress   func(l *layer)
	realRect   image.Rectangle
}

type layer struct {
	Name                  string
	BlendMode             string
	Opacity               uint8
	Clipping              bool
	BlendClippedElements  bool
	TransparencyProtected bool
	Visible               bool
	X                     int
	Y                     int
	Canvas                *js.Object
	MaskX                 int
	MaskY                 int
	MaskCanvas            *js.Object
	MaskDefaultColor      int
	Buffer                *js.Object
	Folder                bool
	FolderOpen            bool
	Child                 []layer
	psdLayer              *psd.Layer
	width                 int
	height                int
}

func main() {
	// psd.Debug = log.New(os.Stdout, "psd: ", log.Lshortfile)
	js.Global.Set("parsePSD", parsePSD)
}

func arrayBufferToByteSlice(a *js.Object) []byte {
	return js.Global.Get("Uint8Array").New(a).Interface().([]byte)
}

func (r *root) buildLayer(l *layer) error {
	var err error

	if l.psdLayer.Name == l.psdLayer.MBCSName {
		if l.Name, err = japanese.ShiftJIS.NewDecoder().String(l.psdLayer.MBCSName); err != nil {
			l.Name = l.psdLayer.MBCSName
		}
	} else {
		l.Name = l.psdLayer.Name
	}
	l.BlendMode = l.psdLayer.BlendMode.String()
	l.Opacity = l.psdLayer.Opacity
	l.Clipping = l.psdLayer.Clipping
	l.BlendClippedElements = l.psdLayer.BlendClippedElements
	l.Visible = l.psdLayer.Visible()
	l.Folder = l.psdLayer.Folder()
	l.FolderOpen = l.psdLayer.FolderIsOpen()

	if l.psdLayer.HasImage() && l.psdLayer.Rect.Dx()*l.psdLayer.Rect.Dy() > 0 {
		if l.Canvas, err = createImageCanvas(l.psdLayer); err != nil {
			return err
		}
		r.realRect = r.realRect.Union(l.psdLayer.Rect)
	}
	if _, ok := l.psdLayer.Channel[-2]; ok && l.psdLayer.Mask.Enabled() && l.psdLayer.Mask.Rect.Dx()*l.psdLayer.Mask.Rect.Dy() > 0 {
		if l.MaskCanvas, err = createMaskCanvas(l.psdLayer); err != nil {
			return err
		}
		l.MaskX = l.psdLayer.Mask.Rect.Min.X
		l.MaskY = l.psdLayer.Mask.Rect.Min.Y
		l.MaskDefaultColor = l.psdLayer.Mask.DefaultColor
	}

	r.processed++
	r.progress(l)

	rect := l.psdLayer.Rect
	for i := range l.psdLayer.Layer {
		l.Child = append(l.Child, layer{psdLayer: &l.psdLayer.Layer[i]})
		if err = r.buildLayer(&l.Child[i]); err != nil {
			return err
		}
		rect = rect.Union(image.Rect(
			l.Child[i].X,
			l.Child[i].Y,
			l.Child[i].X+l.Child[i].width,
			l.Child[i].Y+l.Child[i].height,
		))
	}
	l.X = rect.Min.X
	l.Y = rect.Min.Y
	l.width = rect.Dx()
	l.height = rect.Dy()
	l.Buffer = createCanvas(l.width, l.height)

	return nil
}

func countLayers(l []psd.Layer) int {
	r := len(l)
	for i := range l {
		r += countLayers(l[i].Layer)
	}
	return r
}

func (r *root) Build(img *psd.PSD, progress func(processed, total int, l *layer)) {
	numLayers := countLayers(img.Layer)
	r.Width = img.Config.Rect.Dx()
	r.Height = img.Config.Rect.Dy()
	r.progress = func(l *layer) { progress(r.processed, numLayers, l) }
	for i := range img.Layer {
		r.Child = append(r.Child, layer{psdLayer: &img.Layer[i]})
		r.buildLayer(&r.Child[i])
	}
	r.RealX = r.realRect.Min.X
	r.RealY = r.realRect.Min.Y
	r.RealWidth = r.realRect.Dx()
	r.RealHeight = r.realRect.Dy()
	r.Buffer = createCanvas(r.RealWidth, r.RealHeight)
}

func createImageCanvas(l *psd.Layer) (*js.Object, error) {
	if l.Picker.ColorModel() != color.NRGBAModel {
		return nil, errors.New("Unsupported color mode")
	}

	sw, sh := l.Rect.Dx(), l.Rect.Dy()
	cvs := createCanvas(sw, sh)
	ctx := cvs.Call("getContext", "2d")
	imgData := ctx.Call("createImageData", sw, sh)
	dw := imgData.Get("width").Int()
	data := imgData.Get("data")

	var ofsd, ofss, x, y, sx, dx int
	r, g, b := l.Channel[0], l.Channel[1], l.Channel[2]
	rp, gp, bp := r.Data, g.Data, b.Data
	if a, ok := l.Channel[-1]; ok {
		ap := a.Data
		for y = 0; y < sh; y++ {
			ofss, ofsd = y*sw, y*dw<<2
			for x = 0; x < sw; x++ {
				sx, dx = ofss+x, ofsd+x<<2
				data.SetIndex(dx+0, rp[sx])
				data.SetIndex(dx+1, gp[sx])
				data.SetIndex(dx+2, bp[sx])
				data.SetIndex(dx+3, ap[sx])
			}
		}
	} else {
		for y = 0; y < sh; y++ {
			ofss, ofsd = y*sw, y*dw<<2
			for x = 0; x < sw; x++ {
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

func createMaskCanvas(l *psd.Layer) (*js.Object, error) {
	m, ok := l.Channel[-2]
	if !ok {
		return nil, nil
	}

	sw, sh := l.Mask.Rect.Dx(), l.Mask.Rect.Dy()
	cvs := createCanvas(sw, sh)
	ctx := cvs.Call("getContext", "2d")
	imgData := ctx.Call("createImageData", sw, sh)
	dw := imgData.Get("width").Int()
	data := imgData.Get("data")

	var ofsd, ofss, x, y, sx, dx int
	mp := m.Data
	if l.Mask.DefaultColor == 0 {
		for y = 0; y < sh; y++ {
			ofss, ofsd = y*sw, y*dw<<2
			for x = 0; x < sw; x++ {
				sx, dx = ofss+x, ofsd+x<<2
				data.SetIndex(dx+3, mp[sx])
			}
		}
	} else {
		for y = 0; y < sh; y++ {
			ofss, ofsd = y*sw, y*dw<<2
			for x = 0; x < sw; x++ {
				sx, dx = ofss+x, ofsd+x<<2
				data.SetIndex(dx+3, 255-mp[sx])
			}
		}
	}
	ctx.Call("putImageData", imgData, 0, 0)
	return cvs, nil
}

func createCanvas(width, height int) *js.Object {
	cvs := js.Global.Get("document").Call("createElement", "canvas")
	cvs.Set("width", width)
	cvs.Set("height", height)
	return cvs
}

type progressReader struct {
	Buf      []byte
	Progress func(float64)
	pos      int
}

func (r *progressReader) Read(p []byte) (int, error) {
	l := copy(p, r.Buf[r.pos:])
	if l == 0 {
		return 0, io.EOF
	}
	if r.pos & ^0x3ffff != (r.pos+l) & ^0x3ffff {
		r.Progress(float64(r.pos+l) / float64(len(r.Buf)))
	}
	r.pos += l
	return l, nil
}

func parse(b []byte, progress func(phase int, progress float64, l *layer)) (*root, error) {
	s := time.Now().UnixNano()
	psdImg, _, err := psd.Decode(&progressReader{
		Buf:      b,
		Progress: func(p float64) { progress(0, p, nil) },
	}, &psd.DecodeOptions{
		SkipMergedImage: true,
	})
	if err != nil {
		return nil, err
	}
	e := time.Now().UnixNano()
	progress(0, 1, nil)
	log.Println("Decode PSD Structure:", (e-s)/1e6)

	if psdImg.Config.ColorMode != psd.ColorModeRGB {
		return nil, errors.New("Unsupported color mode")
	}

	s = time.Now().UnixNano()
	var r root
	r.Build(psdImg, func(processed, total int, l *layer) {
		progress(1, float64(processed)/float64(total), l)
	})
	e = time.Now().UnixNano()
	log.Println("Build Canvas:", (e-s)/1e6)
	return &r, nil
}

func parsePSD(in *js.Object, progress *js.Object, complete *js.Object, failed *js.Object) {
	go func() {
		next := time.Now()
		root, err := parse(arrayBufferToByteSlice(in), func(phase int, prog float64, l *layer) {
			if now := time.Now(); now.After(next) {
				progress.Invoke(phase, prog, l)
				time.Sleep(1) // anti-freeze
				next = now.Add(100 * time.Millisecond)
			}
		})
		if err != nil {
			failed.Invoke(err.Error())
			return
		}
		complete.Invoke(root)
	}()
}
