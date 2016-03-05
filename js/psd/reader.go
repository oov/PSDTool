package main

import (
	"errors"
	"hash"
	"io"
)

type byteSliceReader struct {
	Buf []byte
	pos int
}

func (r *byteSliceReader) Size() int64 {
	return int64(len(r.Buf))
}

func (r *byteSliceReader) Read(p []byte) (int, error) {
	if r.pos >= len(r.Buf) {
		return 0, io.EOF
	}
	l := copy(p, r.Buf[r.pos:])
	if l == 0 {
		return 0, io.EOF
	}
	r.pos += l
	return l, nil
}

func (r *byteSliceReader) ReadAt(p []byte, off int64) (n int, err error) {
	if off < 0 {
		return 0, errors.New("byteSliceReader.ReadAt: negative offset")
	}
	if off >= int64(len(r.Buf)) {
		return 0, io.EOF
	}
	l := copy(p, r.Buf[off:])
	if l == 0 {
		return 0, io.EOF
	}
	return l, nil
}

type genericProgressReader struct {
	R        io.Reader
	Hash     hash.Hash
	Progress func(float64)
	pos      int
	size     int
}

func (r *genericProgressReader) Read(p []byte) (int, error) {
	l, err := r.R.Read(p)
	if err != nil {
		return l, err
	}
	if r.Hash != nil {
		r.Hash.Write(p[:l])
	}
	if r.Progress != nil && (r.pos & ^0x3ffff != (r.pos+l) & ^0x3ffff) {
		r.Progress(float64(r.pos+l) / float64(r.size))
	}
	r.pos += l
	return l, err
}

func (r *genericProgressReader) Sum() []byte {
	if r.Hash != nil {
		return r.Hash.Sum(nil)
	}
	return nil
}
