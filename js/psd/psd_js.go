//go:generate gopherjs build -m

package main

import (
	"fmt"
	"time"

	"github.com/gopherjs/gopherjs/js"
	"github.com/gopherjs/jsbuiltin"
)

func main() {
	// psd.Debug = log.New(os.Stdout, "psd: ", log.Lshortfile)
	if js.Global.Get("importScripts").Bool() {
		workerMain()
	} else {
		mainMain()
	}
}

func parsePSD(in *js.Object, progress *js.Object, complete *js.Object, failed *js.Object) {
	go func() {
		defer func() {
			if err := recover(); err != nil {
				failed.Invoke(fmt.Sprint("uncaught exception occurred on during parsing PSD: ", err))
			}
		}()
		r, err := newReaderFromJSObject(in)
		if err != nil {
			failed.Invoke(err.Error())
			return
		}
		next := time.Now()
		root, err := parse(r, func(prog float64) {
			if now := time.Now(); now.After(next) {
				progress.Invoke(prog * 0.5)
				time.Sleep(0) // anti-freeze
				next = now.Add(100 * time.Millisecond)
			}
		}, func(p float64, l *layer) {
			if l.psdLayer.HasImage() && l.psdLayer.Rect.Dx()*l.psdLayer.Rect.Dy() > 0 {
				var a []byte
				if ach, ok := l.psdLayer.Channel[-1]; ok {
					a = ach.Data
				}
				l.Canvas = createImageCanvas(
					l.psdLayer.Rect.Dx(),
					l.psdLayer.Rect.Dy(),
					l.psdLayer.Channel[0].Data,
					l.psdLayer.Channel[1].Data,
					l.psdLayer.Channel[2].Data,
					a,
				)
			}
			if mask, ok := l.psdLayer.Channel[-2]; ok && l.psdLayer.Mask.Enabled() && l.MaskWidth*l.MaskHeight > 0 {
				l.Mask = createMaskCanvas(l.MaskWidth, l.MaskHeight, mask.Data, l.MaskDefaultColor)
			}
			progress.Invoke(0.5 + p*0.5)
			time.Sleep(0) // anti-freeze
		})
		if err != nil {
			failed.Invoke(err.Error())
			return
		}
		complete.Invoke(root)
	}()
}

func mapCanvas(canvasMap map[string]*js.Object, layer *js.Object, progress func(p float64), complete func()) {
	cur, total := 0, len(canvasMap)
	var r func(*js.Object)
	r = func(l *js.Object) {
		children := l.Get("Children")
		ln := children.Length()
		for i := 0; i < ln; i++ {
			child := children.Index(i)
			seqID := child.Get("SeqID").String()
			if data, ok := canvasMap[seqID]; ok {
				if w, h := data.Get("w").Int(), data.Get("h").Int(); w*h > 0 {
					r := js.Global.Get("Uint8Array").New(data.Get("r")).Interface().([]byte)
					g := js.Global.Get("Uint8Array").New(data.Get("g")).Interface().([]byte)
					b := js.Global.Get("Uint8Array").New(data.Get("b")).Interface().([]byte)
					var a []byte
					if aab := data.Get("a"); aab.Bool() {
						a = js.Global.Get("Uint8Array").New(aab).Interface().([]byte)
					}
					child.Set("Canvas", createImageCanvas(w, h, r, g, b, a))
				}
				if m := data.Get("m"); m.Bool() {
					child.Set("Mask", createMaskCanvas(
						data.Get("mw").Int(), data.Get("mh").Int(),
						js.Global.Get("Uint8Array").New(m).Interface().([]byte),
						data.Get("mc").Int(),
					))
				}
				cur++
				progress(float64(cur) / float64(total))
				time.Sleep(0) // anti-freeze
			}
			r(child)
		}
	}
	r(layer)
	complete()
}

func parsePSDInWorker(in *js.Object, progress *js.Object, complete *js.Object, failed *js.Object) {
	script := js.Global.Get("document").Call("getElementById", "psdgo")
	if !script.Bool() {
		panic("id=psdgo not found")
	}
	worker := js.Global.Get("Worker").New(script.Get("src"))
	canvasMap := make(map[string]*js.Object)
	worker.Set("onmessage", func(e *js.Object) {
		data := e.Get("data")
		switch data.Get("type").String() {
		case "makeCanvas":
			canvasMap[data.Get("id").String()] = data
		case "progress":
			progress.Invoke(data.Get("progress"))
		case "error":
			failed.Invoke(data.Get("error"))
		case "complete":
			root := data.Get("root")
			go mapCanvas(canvasMap, root, func(p float64) {
				progress.Invoke(0.5 + p*0.5)
			}, func() {
				complete.Invoke(root)
			})
		}
	})
	if jsbuiltin.InstanceOf(in, js.Global.Get("ArrayBuffer")) {
		worker.Call("postMessage", js.M{
			"input": in,
		}, js.S{in})
	} else {
		worker.Call("postMessage", js.M{"input": in})
	}
}

func mainMain() {
	js.Global.Set("PSD", js.M{
		"parse":       parsePSD,
		"parseWorker": parsePSDInWorker,
	})
}

func workerMain() {
	js.Global.Set("onmessage", func(e *js.Object) {
		data := e.Get("data")
		input := data.Get("input")
		r, err := newReaderFromJSObject(input)
		if err != nil {
			js.Global.Call("postMessage", js.M{"type": "error", "error": err.Error()})
			return
		}
		go func() {
			defer func() {
				if err := recover(); err != nil {
					js.Global.Call("postMessage", js.M{"type": "error", "error": fmt.Sprint("uncaught exception occurred on during parsing PSD: ", err)})
				}
			}()
			root, err := parse(r, func(progress float64) {
				js.Global.Call("postMessage", js.M{
					"type":     "progress",
					"progress": progress * 0.5,
				})
			}, func(p float64, l *layer) {
				dataMap := js.M{"type": "makeCanvas", "progress": 0.5 + p*0.5, "id": l.SeqID}
				transferable := js.S{}
				if l.psdLayer.HasImage() && l.psdLayer.Rect.Dx()*l.psdLayer.Rect.Dy() > 0 {
					dataMap["w"] = l.psdLayer.Rect.Dx()
					dataMap["h"] = l.psdLayer.Rect.Dy()
					r := js.NewArrayBuffer(l.psdLayer.Channel[0].Data)
					g := js.NewArrayBuffer(l.psdLayer.Channel[1].Data)
					b := js.NewArrayBuffer(l.psdLayer.Channel[2].Data)
					dataMap["r"] = r
					dataMap["g"] = g
					dataMap["b"] = b
					if a, ok := l.psdLayer.Channel[-1]; ok {
						dataMap["a"] = js.NewArrayBuffer(a.Data)
						transferable = append(transferable, r, g, b, dataMap["a"])
					} else {
						transferable = append(transferable, r, g, b)
					}
				}
				if _, ok := l.psdLayer.Channel[-2]; ok && l.psdLayer.Mask.Enabled() && l.MaskWidth*l.MaskHeight > 0 {
					dataMap["mw"] = l.MaskWidth
					dataMap["mh"] = l.MaskHeight
					dataMap["m"] = js.NewArrayBuffer(l.psdLayer.Channel[-2].Data)
					transferable = append(transferable, dataMap["m"])
					dataMap["mc"] = l.MaskDefaultColor
				}
				if len(transferable) > 0 {
					js.Global.Call("postMessage", dataMap, transferable)
				}
			})
			if err != nil {
				js.Global.Call("postMessage", js.M{"type": "error", "error": err.Error()})
				return
			}
			js.Global.Call("postMessage", js.M{
				"type": "complete",
				"root": root,
			})
		}()
	})
}
