// +build js

package main

import (
	"fmt"

	"github.com/gopherjs/gopherjs/js"
	"github.com/gopherjs/jsbuiltin"
	"github.com/oov/psd"
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
		canvasMap := map[int][2]*js.Object{}
		root, err := parse(r, func(prog float64) {
			progress.Invoke(prog)
		}, func(seqID int, l *psd.Layer) {
			var canvas, mask *js.Object
			if l.HasImage() && !l.Rect.Empty() {
				var a []byte
				if ach, ok := l.Channel[-1]; ok {
					a = ach.Data
				}
				canvas = createImageCanvas(
					l.Rect.Dx(),
					l.Rect.Dy(),
					l.Channel[0].Data,
					l.Channel[1].Data,
					l.Channel[2].Data,
					a,
				)
			}
			if m, ok := l.Channel[-2]; ok && l.Mask.Enabled() && !l.Mask.Rect.Empty() {
				mask = createMaskCanvas(l.Mask.Rect.Dx(), l.Mask.Rect.Dy(), m.Data, l.Mask.DefaultColor)
			}
			canvasMap[seqID] = [2]*js.Object{canvas, mask}
		})
		if err != nil {
			failed.Invoke(err.Error())
			return
		}
		mapCanvasGo(canvasMap, root)
		complete.Invoke(root)
	}()
}

func mapCanvasGo(canvasMap map[int][2]*js.Object, root *root) {
	var r func([]layer)
	r = func(children []layer) {
		for i := range children {
			child := &children[i]
			if data, ok := canvasMap[child.SeqID]; ok {
				child.Canvas = data[0]
				child.Mask = data[1]
			}
			r(child.Children)
		}
	}
	r(root.Children)
}

func mapCanvasJS(canvasMap map[int][2]*js.Object, root *js.Object) {
	var r func(*js.Object)
	r = func(l *js.Object) {
		children := l.Get("Children")
		ln := children.Length()
		for i := 0; i < ln; i++ {
			child := children.Index(i)
			if data, ok := canvasMap[child.Get("SeqID").Int()]; ok {
				child.Set("Canvas", data[0])
				child.Set("Mask", data[1])
			}
			r(child)
		}
	}
	r(root)
}

func parsePSDInWorker(in *js.Object, progress *js.Object, complete *js.Object, failed *js.Object) {
	script := js.Global.Get("document").Call("getElementById", "psdgo")
	if !script.Bool() {
		panic("id=psdgo not found")
	}
	worker := js.Global.Get("Worker").New(script.Get("src"))
	script.Set("psdgo", worker)
	canvasMap := map[int][2]*js.Object{}
	worker.Set("onmessage", func(e *js.Object) {
		data := e.Get("data")
		switch data.Get("type").String() {
		case "makeCanvas":
			var canvas, mask *js.Object
			if w, h := data.Get("w").Int(), data.Get("h").Int(); w*h > 0 {
				r := js.Global.Get("Uint8Array").New(data.Get("r")).Interface().([]byte)
				g := js.Global.Get("Uint8Array").New(data.Get("g")).Interface().([]byte)
				b := js.Global.Get("Uint8Array").New(data.Get("b")).Interface().([]byte)
				var a []byte
				if aab := data.Get("a"); aab.Bool() {
					a = js.Global.Get("Uint8Array").New(aab).Interface().([]byte)
				}
				canvas = createImageCanvas(w, h, r, g, b, a)
			}
			if m := data.Get("m"); m.Bool() {
				mask = createMaskCanvas(
					data.Get("mw").Int(), data.Get("mh").Int(),
					js.Global.Get("Uint8Array").New(m).Interface().([]byte),
					data.Get("mc").Int(),
				)
			}
			canvasMap[data.Get("id").Int()] = [2]*js.Object{canvas, mask}
		case "progress":
			progress.Invoke(data.Get("progress"))
		case "error":
			failed.Invoke(data.Get("error"))
		case "complete":
			root := data.Get("root")
			mapCanvasJS(canvasMap, root)
			complete.Invoke(root)
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
					"progress": progress,
				})
			}, func(seqID int, l *psd.Layer) {
				dataMap := js.M{"type": "makeCanvas", "id": seqID}
				transferable := js.S{}
				if l.HasImage() && !l.Rect.Empty() {
					dataMap["w"] = l.Rect.Dx()
					dataMap["h"] = l.Rect.Dy()
					r := js.NewArrayBuffer(l.Channel[0].Data)
					g := js.NewArrayBuffer(l.Channel[1].Data)
					b := js.NewArrayBuffer(l.Channel[2].Data)
					dataMap["r"] = r
					dataMap["g"] = g
					dataMap["b"] = b
					if a, ok := l.Channel[-1]; ok {
						dataMap["a"] = js.NewArrayBuffer(a.Data)
						transferable = append(transferable, r, g, b, dataMap["a"])
					} else {
						transferable = append(transferable, r, g, b)
					}
				}
				if mask, ok := l.Channel[-2]; ok && l.Mask.Enabled() && !l.Mask.Rect.Empty() {
					dataMap["mw"] = l.Mask.Rect.Dx()
					dataMap["mh"] = l.Mask.Rect.Dy()
					dataMap["m"] = js.NewArrayBuffer(mask.Data)
					transferable = append(transferable, dataMap["m"])
					dataMap["mc"] = l.Mask.DefaultColor
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
