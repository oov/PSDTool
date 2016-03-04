package main

import (
	"errors"
	"hash"
	"io"
)

type progressReader struct {
	Buf      []byte
	Hash     hash.Hash
	Progress func(float64)
	pos      int
}

func (r *progressReader) Read(p []byte) (int, error) {
	l := copy(p, r.Buf[r.pos:])
	if l == 0 {
		return 0, io.EOF
	}
	if r.Hash != nil {
		r.Hash.Write(p[:l])
	}
	if r.Progress != nil && (r.pos & ^0x3ffff != (r.pos+l) & ^0x3ffff) {
		r.Progress(float64(r.pos+l) / float64(len(r.Buf)))
	}
	r.pos += l
	return l, nil
}

func (r *progressReader) ReadAt(p []byte, off int64) (n int, err error) {
	if off < 0 {
		return 0, errors.New("progressReader.ReadAt: negative offset")
	}
	if off >= int64(len(r.Buf)) {
		return 0, io.EOF
	}
	r.pos = int(off)
	return r.Read(p)
}

func (r *progressReader) Sum() []byte {
	if r.Hash != nil {
		return r.Hash.Sum(nil)
	}
	return nil
}

type genericProgressReader struct {
	R        io.Reader
	Hash     hash.Hash
	Progress func(float64)
	pos      int64
	ln       int64
}

func (r *genericProgressReader) Read(p []byte) (int, error) {
	l, err := r.R.Read(p)
	if err != nil {
		return l, err
	}
	if r.Hash != nil {
		r.Hash.Write(p[:l])
	}
	l64 := int64(l)
	if r.Progress != nil && (r.pos & ^0x3ffff != (r.pos+l64) & ^0x3ffff) {
		r.Progress(float64(r.pos+l64) / float64(r.ln))
	}
	r.pos += l64
	return l, err
}

func (r *genericProgressReader) Sum() []byte {
	if r.Hash != nil {
		return r.Hash.Sum(nil)
	}
	return nil
}
