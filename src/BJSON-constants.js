/*
 * Copyright (c) 2017,2020 by Kemu Studio (visit ke.mu)
 *
 * Author(s): Sylwester Wysocki <sw@ke.mu>,
 *            Roman Pietrzak <rp@ke.mu>
 *
 * This file is a part of the KEMU Binary JSON library.
 * See http://bjson.org for more.
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */

const K = require('kcore')
require('./BJSON-core.js')

// datasize postfixes used to create final datatype by combaining
// DATATYPE_XXX_BASE + DATASIZE_XXX parts.
// For example code for 32 bit positive integer can calculated with below
// formula:
// DATATYPE_POSITIVE_INTEGER32 = DATATYPE_POSITIVE_INTEGER_BASE + DATASIZE_DWORD
K.BJSON.DATASIZE_BYTE  = 0
K.BJSON.DATASIZE_WORD  = 1
K.BJSON.DATASIZE_DWORD = 2
K.BJSON.DATASIZE_QWORD = 3

// primitive values:
// There are "zero" values, one byte sized:
K.BJSON.DATATYPE_NULL          = 0 // null
K.BJSON.DATATYPE_ZERO_OR_FALSE = 1 // numeric zero, or boolean false
K.BJSON.DATATYPE_EMPTY_STRING  = 2 // empty string
K.BJSON.DATATYPE_ONE_OR_TRUE   = 3 // boolean true (may be also a numeric one)

// positive_integer:
K.BJSON.DATATYPE_POSITIVE_INTEGER_BASE = 4
K.BJSON.DATATYPE_POSITIVE_INTEGER8     = 4
K.BJSON.DATATYPE_POSITIVE_INTEGER16    = 5
K.BJSON.DATATYPE_POSITIVE_INTEGER32    = 6
K.BJSON.DATATYPE_POSITIVE_INTEGER64    = 7

// negative_integer:
// they are in positive form, not mod2
K.BJSON.DATATYPE_NEGATIVE_INTEGER_BASE  = 8
K.BJSON.DATATYPE_NEGATIVE_INTEGER8      = 8
K.BJSON.DATATYPE_NEGATIVE_INTEGER16     = 9
K.BJSON.DATATYPE_NEGATIVE_INTEGER32     = 10
K.BJSON.DATATYPE_NEGATIVE_INTEGER64     = 11

// float:
K.BJSON.DATATYPE_FLOAT32_OBSOLETE = 12 // Obsolete: don't use in new code
K.BJSON.DATATYPE_FLOAT64_OBSOLETE = 13 // Obsolete: don't use in new code
K.BJSON.DATATYPE_FLOAT32          = 14
K.BJSON.DATATYPE_FLOAT64          = 15

// utf8_string:
// default coding is utf-8
// the string MUST NOT have null-termination code
// string cannot have any "zero" bytes to avoid null-termination finishing the string before its real length
K.BJSON.DATATYPE_STRING_BASE = 16 // 16, size[uint8], utf8_data[size*byte] - a short string up to 255 bytes
K.BJSON.DATATYPE_STRING8     = 16 // 16, size[uint8], utf8_data[size*byte] - a short string up to 255 bytes
K.BJSON.DATATYPE_STRING16    = 17 // 17, size[uint16], utf8_data[size*byte] - a string of up to 64k bytes
K.BJSON.DATATYPE_STRING32    = 18 // 18, size[uint32], utf8_data[size*byte] - a long string, 64K to 4GB
K.BJSON.DATATYPE_STRING64    = 19 // 19, size[uint64], utf8_data[size*byte] - a very long string, which probably wont be even used for now

// binary:
// binary data of specified length.
// This is not fully JSON transcodable, as the JSON has no native support for binary data.
K.BJSON.DATATYPE_BINARY_BASE = 20 // 20, size[uint8], binary_data[size*byte]
K.BJSON.DATATYPE_BINARY8     = 20 // 20, size[uint8], binary_data[size*byte]
K.BJSON.DATATYPE_BINARY16    = 21 // 21, size[uint16], binary_data[size*byte]
K.BJSON.DATATYPE_BINARY32    = 22 // 22, size[uint32], binary_data[size*byte]
K.BJSON.DATATYPE_BINARY64    = 23 // 23, size[uint64], binary_data[size*byte]

// array:
// in JSON represented as array [item0, item1, item2, ...]
K.BJSON.DATATYPE_ARRAY_BASE = 32 // 32, size[uint8], item0, item1, item2, ...
K.BJSON.DATATYPE_ARRAY8     = 32 // 32, size[uint8], item0, item1, item2, ...
K.BJSON.DATATYPE_ARRAY16    = 33 // 33, size[uint16], item0, item1, item2, ...
K.BJSON.DATATYPE_ARRAY32    = 34 // 34, size[uint32], item0, item1, item2, ...
K.BJSON.DATATYPE_ARRAY64    = 35 // 35, size[uint64], item0, item1, item2, ...

// map of key -> value:
// in JSON represented as object {key0:value0, key1:value1, ...}
// For JSON compatibility keys shall be utf8_string.
// However implementation may ignore that (use any other type as keys, even mixing types) if the JSON-compatibility is not a requirement.
// Keys should be unique.
K.BJSON.DATATYPE_MAP_BASE = 36 // 36, size[uint8], key0, value0, key1, value1, ...
K.BJSON.DATATYPE_MAP8     = 36 // 36, size[uint8], key0, value0, key1, value1, ...
K.BJSON.DATATYPE_MAP16    = 37 // 37, size[uint16], key0, value0, key1, value1, ...
K.BJSON.DATATYPE_MAP32    = 38 // 38, size[uint32], key0, value0, key1, value1, ...
K.BJSON.DATATYPE_MAP64    = 39 // 39, size[uint64], key0, value0, key1, value1, ...

// strict primitives:
// Strict primitives should be:
// - used, when implementation (language) supports it,
// - always implemented by the decoder (even if the decoding will loose the type),
// - implemented by the encoder if possible,
K.BJSON.DATATYPE_STRICT_FALSE        = 24
K.BJSON.DATATYPE_STRICT_TRUE         = 25
K.BJSON.DATATYPE_STRICT_INTEGER_ZERO = 26
K.BJSON.DATATYPE_STRICT_INTEGER_ONE  = 27
