// +build js

package main

import (
	"errors"
	"io"

	"github.com/gopherjs/gopherjs/js"
	"github.com/gopherjs/jsbuiltin"
)

func arrayBufferToByteSlice(ab *js.Object) []byte {
	return js.Global.Get("Uint8Array").New(ab).Interface().([]byte)
}

type blobReader struct {
	blob       *js.Object
	fileReader *js.Object
	pos        int
	size       int
	ch         chan *js.Object
}

func newBlobReader(in *js.Object) *blobReader {
	r := &blobReader{
		blob: in,
		size: in.Get("size").Int(),
	}
	if js.Global.Get("FileReaderSync").Bool() {
		r.fileReader = js.Global.Get("FileReaderSync").New()
	} else {
		r.fileReader = js.Global.Get("FileReader").New()
		r.ch = make(chan *js.Object)
		r.fileReader.Set("onload", r.onLoad)
	}
	return r
}

func (r *blobReader) onLoad(e *js.Object) {
	r.ch <- r.fileReader.Get("result")
}

func (r *blobReader) Size() int64 {
	return int64(r.size)
}

func (r *blobReader) read(p []byte, pos int) (int, error) {
	blob := r.blob.Call("slice", pos, pos+len(p))
	var ab *js.Object
	if r.ch != nil {
		r.fileReader.Call("readAsArrayBuffer", blob)
		ab = <-r.ch
	} else {
		ab = r.fileReader.Call("readAsArrayBuffer", blob)
	}
	return copy(p, arrayBufferToByteSlice(ab)), nil
}

func (r *blobReader) Read(p []byte) (int, error) {
	read, err := r.ReadAt(p, int64(r.pos))
	if err == nil || err == io.EOF {
		r.pos += read
	}
	return read, err
}

func (r *blobReader) ReadAt(p []byte, off int64) (n int, err error) {
	if off < 0 {
		return 0, errors.New("blobReader.ReadAt: negative offset")
	}
	if off >= int64(r.size) {
		return 0, io.EOF
	}
	if len(p) == 0 {
		return 0, nil
	}
	pos := int(off)
	read := len(p)
	if r.size-pos < read {
		read = r.size - pos
	}
	l, err := r.read(p[:read], pos)
	if err != nil {
		return 0, err
	}
	if l == 0 {
		return 0, io.EOF
	}
	return l, nil
}

type readerAt interface {
	io.Reader
	io.ReaderAt
	Size() int64
}

func newReaderFromJSObject(in *js.Object) (readerAt, error) {
	if jsbuiltin.InstanceOf(in, js.Global.Get("ArrayBuffer")) {
		return &byteSliceReader{Buf: arrayBufferToByteSlice(in)}, nil
	}
	if jsbuiltin.InstanceOf(in, js.Global.Get("Blob")) {
		return newBlobReader(in), nil
	}
	return nil, errors.New("unsupported input type: " + jsbuiltin.TypeOf(in))
}
