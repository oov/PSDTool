// +build js

package main

import (
	"archive/zip"
	"bytes"
	"errors"
	"io"
	"io/ioutil"

	"github.com/gopherjs/gopherjs/js"
)

func zipFileOpenFast(originlReader io.ReaderAt, zf *zip.File, sizeLimit uint64) (io.ReadCloser, error) {
	if zf.UncompressedSize64 > sizeLimit {
		return zf.Open()
	}
	off, err := zf.DataOffset()
	if err != nil {
		return nil, err
	}
	buf := make([]byte, zf.CompressedSize64)
	_, err = originlReader.ReadAt(buf, off)
	if err != nil {
		return nil, err
	}

	buf = js.Global.Get("$github.com/oov/psdtool/js/psd$").Call("inflate", buf).Interface().([]byte)
	if buf == nil {
		return nil, errors.New("psd: error occurred in inflate")
	}

	return ioutil.NopCloser(bytes.NewReader(buf)), nil
}
