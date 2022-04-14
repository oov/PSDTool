//go:generate env GOOS=linux gopherjs build -m -o ../../js/psd.min.js

package main

import (
	"archive/zip"
	"bufio"
	"crypto/md5"
	"errors"
	"fmt"
	"image"
	"io"
	"io/ioutil"
	"log"
	"strings"
	"time"
	"unicode/utf16"

	"github.com/oov/psd"
	"golang.org/x/text/encoding/japanese"
)

type root struct {
	X        int
	Y        int
	Width    int
	Height   int
	Children []layer

	CanvasWidth  int
	CanvasHeight int
	Hash         string
	PFV          string
	PFVModDate   int64
	Readme       string

	psdImg           *psd.PSD
	realRect         image.Rectangle
	layerNameCharset string
}

type layer struct {
	SeqID int
	Name  string

	Folder     bool
	FolderOpen bool

	Visible   bool
	BlendMode string
	Opacity   int // 0-255
	Clipping  bool

	BlendClippedElements bool

	X      int
	Y      int
	Width  int
	Height int
	Canvas interface{}

	MaskX            int
	MaskY            int
	MaskWidth        int
	MaskHeight       int
	MaskDefaultColor int // 0 or 255
	Mask             interface{}

	Children []layer

	psdLayer *psd.Layer
}

func (r *root) buildLayer(l *layer) error {
	var err error

	l.SeqID = l.psdLayer.SeqID

	if l.psdLayer.UnicodeName == "" && l.psdLayer.MBCSName != "" {
		switch r.detectLayerNameCharset() {
		case "ISO-2022-JP":
			l.Name, err = japanese.ISO2022JP.NewDecoder().String(l.psdLayer.MBCSName)
		case "EUC-JP":
			l.Name, err = japanese.EUCJP.NewDecoder().String(l.psdLayer.MBCSName)
		case "Shift_JIS":
			l.Name, err = japanese.ShiftJIS.NewDecoder().String(l.psdLayer.MBCSName)
		default:
			l.Name, err = l.psdLayer.MBCSName, nil
		}
	} else {
		l.Name = l.psdLayer.UnicodeName
	}
	if l.psdLayer.Folder() {
		l.BlendMode = l.psdLayer.SectionDividerSetting.BlendMode.String()
	} else {
		if l.psdLayer.BlendMode == psd.BlendModePassThrough {
			log.Printf("NOTICE: In '%s' layer, blend mode 'pass-through' which is unsupported mode in image layer has been replaced by 'normal'.", l.Name)
			l.psdLayer.BlendMode = psd.BlendModeNormal
		}
		l.BlendMode = l.psdLayer.BlendMode.String()
	}
	l.Opacity = int(l.psdLayer.Opacity)
	l.Clipping = l.psdLayer.Clipping
	l.BlendClippedElements = l.psdLayer.BlendClippedElements
	l.Visible = l.psdLayer.Visible()
	l.Folder = l.psdLayer.Folder()
	l.FolderOpen = l.psdLayer.FolderIsOpen()

	l.MaskX = l.psdLayer.Mask.Rect.Min.X
	l.MaskY = l.psdLayer.Mask.Rect.Min.Y
	l.MaskWidth = l.psdLayer.Mask.Rect.Dx()
	l.MaskHeight = l.psdLayer.Mask.Rect.Dy()
	l.MaskDefaultColor = l.psdLayer.Mask.DefaultColor

	r.realRect = r.realRect.Union(l.psdLayer.Rect)

	rect := l.psdLayer.Rect
	for i := range l.psdLayer.Layer {
		l.Children = append(l.Children, layer{psdLayer: &l.psdLayer.Layer[i]})
		if err = r.buildLayer(&l.Children[i]); err != nil {
			return err
		}
		rect = rect.Union(image.Rect(
			l.Children[i].X,
			l.Children[i].Y,
			l.Children[i].X+l.Children[i].Width,
			l.Children[i].Y+l.Children[i].Height,
		))
	}
	l.X = rect.Min.X
	l.Y = rect.Min.Y
	l.Width = rect.Dx()
	l.Height = rect.Dy()
	return nil
}

func (r *root) detectLayerNameCharsetRecursive(l *psd.Layer) []string {
	var s []string
	for i := range l.Layer {
		s = append(s, l.Layer[i].MBCSName)
		if len(l.Layer[i].Layer) > 0 {
			s = append(s, r.detectLayerNameCharsetRecursive(&l.Layer[i])...)
		}
	}
	return s
}

func (r *root) detectLayerNameCharset() string {
	if r.layerNameCharset != "" {
		return r.layerNameCharset
	}

	var s []string
	for i := range r.psdImg.Layer {
		s = append(s, r.psdImg.Layer[i].MBCSName)
		if len(r.psdImg.Layer[i].Layer) > 0 {
			s = append(s, r.detectLayerNameCharsetRecursive(&r.psdImg.Layer[i])...)
		}
	}
	if len(s) > 0 {
		r.layerNameCharset = identifyCharset([]byte(strings.Join(s, "")))
	} else {
		r.layerNameCharset = "ASCII"
	}
	return r.layerNameCharset
}

func (r *root) Build(img *psd.PSD) error {
	r.psdImg = img
	r.CanvasWidth = img.Config.Rect.Dx()
	r.CanvasHeight = img.Config.Rect.Dy()
	for i := range img.Layer {
		r.Children = append(r.Children, layer{psdLayer: &img.Layer[i]})
		if err := r.buildLayer(&r.Children[i]); err != nil {
			return err
		}
	}
	r.realRect = r.realRect.Intersect(image.Rect(0, 0, r.CanvasWidth, r.CanvasHeight))
	r.X = r.realRect.Min.X
	r.Y = r.realRect.Min.Y
	r.Width = r.realRect.Dx()
	r.Height = r.realRect.Dy()
	return nil
}

func utf16ToUTF8(b []byte) (string, error) {
	buf := make([]uint16, len(b)/2)
	var isLE bool
	if len(b) >= 2 {
		// Strip BOM if it exists.
		if b[0] == 0xff && b[1] == 0xfe {
			isLE = true
			b = b[2:]
			buf = buf[1:]
		} else if b[0] == 0xfe && b[1] == 0xff {
			b = b[2:]
			buf = buf[1:]
		}
	}
	if isLE {
		for i := range buf {
			bi := i << 1
			buf[i] = uint16(b[bi]) | uint16(b[bi+1])<<8
		}
	} else {
		for i := range buf {
			bi := i << 1
			buf[i] = uint16(b[bi+1]) | uint16(b[bi])<<8
		}
	}
	return string(utf16.Decode(buf)), nil
}

func stripUTF8BOM(b []byte) (string, error) {
	if len(b) >= 3 && b[0] == 0xef && b[1] == 0xbb && b[2] == 0xbf {
		return string(b[3:]), nil
	}
	return string(b), nil
}

func readTextFile(r io.Reader) (string, error) {
	b, err := ioutil.ReadAll(r)
	if err != nil {
		return "", err
	}

	switch identifyCharset(b) {
	case "UTF-8":
		return stripUTF8BOM(b)
	case "UTF-16":
		return utf16ToUTF8(b)
	case "ISO-2022-JP":
		b, err = japanese.ISO2022JP.NewDecoder().Bytes(b)
	case "EUC-JP":
		b, err = japanese.EUCJP.NewDecoder().Bytes(b)
	case "Shift_JIS":
		b, err = japanese.ShiftJIS.NewDecoder().Bytes(b)
	}
	if err != nil {
		return "", err
	}
	return string(b), nil
}

func parse(rd readerAt, progress func(progress float64), makeCanvas func(seqID int, layer *psd.Layer)) (*root, error) {
	var r root
	s := time.Now().UnixNano()

	if rd.Size() < 4 {
		return nil, errors.New("unsupported file type")
	}
	var head [4]byte
	if _, err := rd.ReadAt(head[:], 0); err != nil {
		return nil, err
	}
	var psdReader *genericProgressReader
	switch string(head[:]) {
	case "PK\x03\x04": // zip archive
		zr, err := zip.NewReader(rd, rd.Size())
		if err != nil {
			return nil, err
		}
		var psdf, pfvf, txtf *zip.File
		for _, f := range zr.File {
			if len(f.Name) <= 4 {
				continue
			}
			if psdf == nil && strings.ToLower(f.Name[len(f.Name)-4:]) == ".psd" {
				psdf = f
				continue
			}
			if psdf == nil && strings.ToLower(f.Name[len(f.Name)-4:]) == ".psb" {
				psdf = f
				continue
			}
			if pfvf == nil && strings.ToLower(f.Name[len(f.Name)-4:]) == ".pfv" {
				pfvf = f
				continue
			}
			if txtf == nil && strings.ToLower(f.Name[len(f.Name)-4:]) == ".txt" {
				txtf = f
				continue
			}
		}
		if psdf == nil {
			return nil, errors.New("psd file is not found from given zip archive")
		}

		if pfvf != nil {
			var pfvr io.ReadCloser
			pfvr, err = pfvf.Open()
			if err != nil {
				return nil, err
			}
			defer pfvr.Close()
			r.PFVModDate = pfvf.ModTime().Unix()
			r.PFV, err = readTextFile(pfvr)
			if err != nil {
				return nil, err
			}
		}

		if txtf != nil {
			var txtr io.ReadCloser
			txtr, err = txtf.Open()
			if err != nil {
				return nil, err
			}
			defer txtr.Close()
			r.Readme, err = readTextFile(txtr)
			if err != nil {
				return nil, err
			}
		}

		rc, err := zipFileOpenFast(rd, psdf, 1024*1024*100)
		if err != nil {
			return nil, err
		}
		defer rc.Close()
		psdReader = &genericProgressReader{
			R:        rc,
			Hash:     md5.New(),
			Progress: progress,
			size:     int(psdf.UncompressedSize64),
		}
	case "7z\xbc\xaf": // 7z archive
		return nil, errors.New("7z archive is not supported")
	case "8BPS": // psd file
		psdReader = &genericProgressReader{
			R:        bufio.NewReaderSize(rd, 1024*1024*2),
			Hash:     md5.New(),
			Progress: progress,
			size:     int(rd.Size()),
		}
		break
	default:
		return nil, errors.New("unsupported file type")
	}
	var options psd.DecodeOptions
	options = psd.DecodeOptions{
		LayerImageLoaded: func(layer *psd.Layer, index int, total int) {
			makeCanvas(index, layer)
			layer.Picker = nil
			layer.Channel = nil
			options.SkipMergedImage = true
		},
		SkipMergedImage: false,
	}
	psdImg, _, err := psd.Decode(psdReader, &options)
	if err != nil {
		return nil, err
	}
	if len(psdImg.Layer) == 0 {
		// couldn't find the layer in this image.
		// So Add the merged image as a layer.
		psdImg.Layer = append(psdImg.Layer, psd.Layer{
			SeqID:               1,
			Name:                "Layer Not Found",
			UnicodeName:         "Layer Not Found",
			MBCSName:            "Layer Not Found",
			Rect:                psdImg.Config.Rect,
			Channel:             psdImg.Channel,
			BlendMode:           psd.BlendModeNormal,
			Opacity:             255,
			Flags:               0,
			Picker:              psdImg.Picker,
			AdditionalLayerInfo: psdImg.AdditinalLayerInfo,
			Layer:               []psd.Layer{},
		})
		makeCanvas(1, &psdImg.Layer[0])
	}
	e := time.Now().UnixNano()
	progress(1)
	log.Println("decode PSD structure:", (e-s)/1e6)

	if psdImg.Config.ColorMode != psd.ColorModeRGB {
		return nil, errors.New("Unsupported color mode")
	}

	s = time.Now().UnixNano()
	r.Hash = fmt.Sprintf("%x", psdReader.Sum())
	if err = r.Build(psdImg); err != nil {
		return nil, err
	}
	e = time.Now().UnixNano()
	log.Println("build layer tree:", (e-s)/1e6)
	return &r, nil
}
