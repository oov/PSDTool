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

func parsePSD(in *js.Object, progress *js.Object, complete *js.Object, failed *js.Object, makeCanvas *js.Object, makeMaskCanvas *js.Object) {
	go func() {
		r, err := newReaderFromJSObject(in)
		if err != nil {
			failed.Invoke(err.Error())
			return
		}
		next := time.Now()
		canvasMap := js.M{}
		root, err := parse(r, func(prog float64) {
			if now := time.Now(); now.After(next) {
				progress.Invoke(prog)
				time.Sleep(1) // anti-freeze
				next = now.Add(100 * time.Millisecond)
			}
		}, func(l *layer) {
			if l.r != nil && l.g != nil && l.b != nil {
				canvasMap[fmt.Sprintf("l%d", l.SeqID)] = makeCanvas.Invoke(l.psdLayer.Rect.Dx(), l.psdLayer.Rect.Dy(), l.r, l.g, l.b, l.a)
			}
			if l.mask != nil {
				canvasMap[fmt.Sprintf("m%d", l.SeqID)] = makeMaskCanvas.Invoke(l.MaskWidth, l.MaskHeight, l.mask, l.MaskDefaultColor)
			}
		})
		if err != nil {
			failed.Invoke(err.Error())
			return
		}
		complete.Invoke(root, canvasMap)
	}()
}

func parsePSDInWorker(in *js.Object, progress *js.Object, complete *js.Object, failed *js.Object, makeCanvas *js.Object, makeMaskCanvas *js.Object) {
	script := js.Global.Get("document").Call("getElementById", "psdgo")
	if !script.Bool() {
		panic("id=psdgo not found")
	}
	worker := js.Global.Get("Worker").New(script.Get("src"))
	canvasMap := js.M{}
	worker.Set("onmessage", func(e *js.Object) {
		data := e.Get("data")
		switch data.Get("type").String() {
		case "makeCanvas":
			seqID := data.Get("id").String()
			r := data.Get("r")
			g := data.Get("g")
			b := data.Get("b")
			a := data.Get("a")
			if r.Bool() && g.Bool() && b.Bool() {
				if a.Bool() {
					canvasMap["l"+seqID] = makeCanvas.Invoke(
						data.Get("w"), data.Get("h"),
						js.Global.Get("Uint8Array").New(r),
						js.Global.Get("Uint8Array").New(g),
						js.Global.Get("Uint8Array").New(b),
						js.Global.Get("Uint8Array").New(a),
					)
				} else {
					canvasMap["l"+seqID] = makeCanvas.Invoke(
						data.Get("w"), data.Get("h"),
						js.Global.Get("Uint8Array").New(r),
						js.Global.Get("Uint8Array").New(g),
						js.Global.Get("Uint8Array").New(b),
					)
				}
			}
			m := data.Get("m")
			if m.Bool() {
				canvasMap["m"+seqID] = makeMaskCanvas.Invoke(
					data.Get("mw"), data.Get("mh"),
					js.Global.Get("Uint8Array").New(m),
					data.Get("mc"),
				)
			}
		case "progress":
			progress.Invoke(data.Get("progress"))
		case "error":
			failed.Invoke(data.Get("error"))
		case "complete":
			complete.Invoke(data.Get("root"), canvasMap)
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
			next := time.Now()
			root, err := parse(r, func(progress float64) {
				if now := time.Now(); now.After(next) {
					js.Global.Call("postMessage", js.M{
						"type":     "progress",
						"progress": progress,
					})
					next = now.Add(100 * time.Millisecond)
				}
			}, func(l *layer) {
				dataMap := js.M{"type": "makeCanvas", "id": l.SeqID}
				transferable := js.S{}
				if l.r != nil && l.g != nil && l.b != nil {
					dataMap["w"] = l.psdLayer.Rect.Dx()
					dataMap["h"] = l.psdLayer.Rect.Dy()
					dataMap["r"] = js.NewArrayBuffer(l.r)
					transferable = append(transferable, dataMap["r"])
					dataMap["g"] = js.NewArrayBuffer(l.g)
					transferable = append(transferable, dataMap["g"])
					dataMap["b"] = js.NewArrayBuffer(l.b)
					transferable = append(transferable, dataMap["b"])
					if l.a != nil {
						dataMap["a"] = js.NewArrayBuffer(l.a)
						transferable = append(transferable, dataMap["a"])
					}
				}
				if l.mask != nil {
					dataMap["mw"] = l.MaskWidth
					dataMap["mh"] = l.MaskHeight
					dataMap["m"] = js.NewArrayBuffer(l.mask)
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
