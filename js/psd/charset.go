// This code is based on the_platinum_searcher.
// https://github.com/monochromegane/the_platinum_searcher
// The MIT License (MIT) Copyright (c) [2014] [the_platinum_searcher]

package main

const (
	charsetBINARY    = "Binary"
	charsetASCII     = "ASCII"
	charsetUTF8      = "UTF-8"
	charsetEUCJP     = "EUC-JP"
	charsetShiftJIS  = "Shift_JIS"
	charsetISO2022JP = "ISO-2022-JP"
)

func identifyCharset(bs []byte) string {

	var (
		suspiciousBytes = 0
		likelyUtf8      = 0
		likelyEucjp     = 0
		likelyShiftjis  = 0
		likelyIso2022jp = 0
	)

	var length = len(bs)
	if length == 0 {
		return charsetASCII
	}

	if length >= 3 && bs[0] == 0xEF && bs[1] == 0xBB && bs[2] == 0xBF {
		// UTF-8 BOM. This isn't binary.
		return charsetUTF8
	}

	if length >= 5 && bs[0] == 0x25 && bs[1] == 0x50 && bs[2] == 0x44 && bs[3] == 0x46 && bs[4] == 0x2D {
		/*  %PDF-. This is binary. */
		return charsetBINARY
	}

	for i := 0; i < length; i++ {
		if bs[i] == 0x00 {
			/* NULL char. It's binary */
			return charsetBINARY
		} else if (bs[i] < 7 || bs[i] > 14) && (bs[i] < 32 || bs[i] > 127) {
			/* UTF-8 detection */
			if bs[i] > 193 && bs[i] < 224 && i+1 < length {
				i++
				if bs[i] > 127 && bs[i] < 192 {
					likelyUtf8++
					continue
				}

			} else if bs[i] > 223 && bs[i] < 240 && i+2 < length {
				i++
				if bs[i] > 127 && bs[i] < 192 && bs[i+1] > 127 && bs[i+1] < 192 {
					i++
					likelyUtf8++
					continue
				}
			}

			/* EUC-JP detection */
			if bs[i] == 142 && i+1 < length {
				i++
				if bs[i] > 160 && bs[i] < 224 {
					likelyEucjp++
					continue
				}
			} else if bs[i] > 160 && bs[i] < 255 && i+1 < length {
				i++
				if bs[i] > 160 && bs[i] < 255 {
					likelyEucjp++
					continue
				}
			}

			/* Shift-JIS detection */
			if bs[i] > 160 && bs[i] < 224 {
				likelyShiftjis++
				continue
			} else if ((bs[i] > 128 && bs[i] < 160) || (bs[i] > 223 && bs[i] < 240)) && i+1 < length {
				i++
				if (bs[i] > 63 && bs[i] < 127) || (bs[i] > 127 && bs[i] < 253) {
					likelyShiftjis++
					continue
				}
			}

			/* ISO-2022-JP detection */
			if bs[i] == 27 && i+2 < length {
				i++
				switch bs[i] {
				case 36:
					i++
					if bs[i] == 64 || bs[i] == 66 || bs[i] == 68 {
						likelyIso2022jp++
						continue
					}
				case 40:
					i++
					if bs[i] == 66 || bs[i] == 73 || bs[i] == 74 {
						likelyIso2022jp++
						continue
					}
				}
			}

			suspiciousBytes++
			if suspiciousBytes*2 > length {
				return charsetBINARY
			}

		}
	}

	if suspiciousBytes*2 > length {
		return charsetBINARY
	}

	// fmt.Printf("Detected points[utf8/eucjp/shiftjis] is %d/%d/%d.\n", likelyUtf8, likelyEucjp, likelyShiftjis)

	if likelyUtf8 == 0 && likelyEucjp == 0 && likelyShiftjis == 0 && likelyIso2022jp == 0 {
		return charsetASCII
	} else if likelyUtf8 >= likelyEucjp && likelyUtf8 >= likelyShiftjis && likelyUtf8 >= likelyIso2022jp {
		return charsetUTF8
	} else if likelyEucjp >= likelyUtf8 && likelyEucjp >= likelyShiftjis && likelyEucjp >= likelyIso2022jp {
		return charsetEUCJP
	} else if likelyShiftjis >= likelyUtf8 && likelyShiftjis >= likelyEucjp && likelyShiftjis >= likelyIso2022jp {
		return charsetShiftJIS
	} else if likelyIso2022jp >= likelyUtf8 && likelyIso2022jp >= likelyEucjp && likelyIso2022jp >= likelyShiftjis {
		return charsetISO2022JP
	}

	return charsetASCII
}
