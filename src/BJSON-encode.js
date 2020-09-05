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
require('./BJSON-constants.js')

const BJSON_ENCODE_LOGS_LEVEL = 0

// ----------------------------------------------------------------------------
//
//     Low-level functions to write raw machine types into output buffer.
//
// ----------------------------------------------------------------------------

function _prepareOutDataBuffer(numberOfExtraBytesNeeded, encodeCtx) {
  if (encodeCtx.outDataCapacity - encodeCtx.outDataSize < numberOfExtraBytesNeeded) {
    // Not enough space - resize buffer.
    const oldOutData          = encodeCtx.outData
    encodeCtx.outDataCapacity = Math.max(encodeCtx.outDataCapacity * 2, encodeCtx.outDataCapacity + numberOfExtraBytesNeeded)
    encodeCtx.outData         = Buffer.alloc(encodeCtx.outDataCapacity)

    oldOutData.copy(encodeCtx.outData, 0, 0, encodeCtx.outDataSize)

    if (BJSON_ENCODE_LOGS_LEVEL > 0) {
      K.BJSON._debugLog('resized outData buffer to', encodeCtx.outDataCapacity)
    }
  }
}

function _putRaw_BYTE(value8, encodeCtx) {
  if (BJSON_ENCODE_LOGS_LEVEL > 0) {
    K.BJSON._debugLog(
      'going to put byte',
      value8,
      'at offset',
      encodeCtx.outDataSize)
  }

  _prepareOutDataBuffer(1, encodeCtx)
  encodeCtx.outData.writeUInt8(value8, encodeCtx.outDataSize)
  encodeCtx.outDataSize++
}

function _putRaw_WORD(value16, encodeCtx) {
  if (BJSON_ENCODE_LOGS_LEVEL > 0) {
    K.BJSON._debugLog(
      'going to put word',
      value16,
      'at offset',
      encodeCtx.outDataSize)
  }

  _prepareOutDataBuffer(2, encodeCtx)
  encodeCtx.outData.writeUInt16LE(value16, encodeCtx.outDataSize)
  encodeCtx.outDataSize += 2
}

function _putRaw_DWORD(value32, encodeCtx) {
  if (BJSON_ENCODE_LOGS_LEVEL > 0) {
    K.BJSON._debugLog(
      'going to put double word',
      value32,
      'at offset',
      encodeCtx.outDataSize)
  }

  _prepareOutDataBuffer(4, encodeCtx)
  encodeCtx.outData.writeUInt32LE(value32, encodeCtx.outDataSize)
  encodeCtx.outDataSize += 4
}

function _putRaw_QWORD(value64, encodeCtx) {
  // 64-bit integers are not supported in JS.
  K.Error.throwNotImplemented('_putRaw_QWORD')
}

function _putRaw_FLOAT64(value64, encodeCtx) {
  if (BJSON_ENCODE_LOGS_LEVEL > 0) {
    K.BJSON._debugLog(
      'going to put double float64',
      value64,
      'at offset',
      encodeCtx.outDataSize)
  }

  _prepareOutDataBuffer(8, encodeCtx)
  encodeCtx.outData.writeDoubleLE(value64, encodeCtx.outDataSize)
  encodeCtx.outDataSize += 8
}

function _setOutDataPointer(offset, encodeCtx) {
  // Avoid moving pointer out of the buffer.
  const numberOfExtraBytesNeeded = offset - encodeCtx.outDataCapacity + 1

  if (numberOfExtraBytesNeeded > 0) {
    _prepareOutDataBuffer(numberOfExtraBytesNeeded, encodeCtx)
  }

  // Move pointer.
  encodeCtx.outDataSize = offset

  if (BJSON_ENCODE_LOGS_LEVEL > 0) {
    K.BJSON._debugLog('moved outData pointer to', offset)
  }
}

function _outDataCopy(dstOffset, srcOffset, byteLen, encodeCtx) {
  if (BJSON_ENCODE_LOGS_LEVEL > 0) {
    K.BJSON._debugLog(
      'going to copy',
      byteLen,
      'outData bytes from',
      srcOffset,
      'to',
      dstOffset)
  }

  encodeCtx.outData.copy(
    encodeCtx.outData,
    dstOffset,
    srcOffset,
    srcOffset + byteLen)
}

// --------------------------------------------------------------------------
//
//  Middle-level functions to encode (serialize) abstract JS data types
//  into output buffer.
//
// --------------------------------------------------------------------------

function _encodeInCtx_Null(encodeCtx) {
  _putRaw_BYTE(K.BJSON.DATATYPE_NULL, encodeCtx)
}

function _encodeInCtx_Boolean(value, encodeCtx) {
  if (value) {
    _putRaw_BYTE(K.BJSON.DATATYPE_STRICT_TRUE, encodeCtx)
  } else {
    _putRaw_BYTE(K.BJSON.DATATYPE_STRICT_FALSE, encodeCtx)
  }
}

function _encodeInCtx_SizedDataType(dataTypeBase, size, encodeCtx) {
  if (size < 0) {
    throw new K.Error({errorCode: 'negativeSize', ext: {size: size}})
  } else if (size <= 0xff) {
    // Compact to single byte (uint8).
    _putRaw_BYTE(dataTypeBase + K.BJSON.DATASIZE_BYTE, encodeCtx)
    _putRaw_BYTE(size, encodeCtx)
  } else if (size <= 0xffff) {
    // Compact to single word (uint16).
    _putRaw_BYTE(dataTypeBase + K.BJSON.DATASIZE_WORD, encodeCtx)
    _putRaw_WORD(size, encodeCtx)
  } else if (size <= 0xffffffff) {
    // Compact to double word (uint32).
    _putRaw_BYTE(dataTypeBase + K.BJSON.DATASIZE_DWORD, encodeCtx)
    _putRaw_DWORD(size, encodeCtx)
  } else {
    // Last try - use quad word (uint64).
    _putRaw_BYTE(dataTypeBase + K.BJSON.DATASIZE_QWORD, encodeCtx)
    _putRaw_QWORD(size, encodeCtx)
  }
}

function _encodeInCtx_Number(value, encodeCtx) {
  if (((value % 1) == 0) && Math.abs(value) <= 0xffffffff) {
    // Integer number.
    if (value == 0) {
      // Strict integer zero.
      _putRaw_BYTE(K.BJSON.DATATYPE_STRICT_INTEGER_ZERO, encodeCtx)
    } else if (value == 1) {
      // Strict integer one.
      _putRaw_BYTE(K.BJSON.DATATYPE_STRICT_INTEGER_ONE, encodeCtx)
    } else if (value < 0) {
      // Negative integer.
      _encodeInCtx_SizedDataType(
        K.BJSON.DATATYPE_NEGATIVE_INTEGER_BASE,
        -value,
        encodeCtx)
    } else {
      // Positive integer.
      _encodeInCtx_SizedDataType(
        K.BJSON.DATATYPE_POSITIVE_INTEGER_BASE,
        value,
        encodeCtx)
    }
  } else {
    // Float or integer breaking the 32-bit limit (uint32).
    // Because javascript stores all numbers as 64-bit floats, there is no
    // way to encode 64-bit integers.
    _putRaw_BYTE(K.BJSON.DATATYPE_FLOAT64, encodeCtx)
    _putRaw_FLOAT64(value, encodeCtx)
  }
}

function _encodeInCtx_String(value, encodeCtx) {
  if (value == '') {
    // Special case - empty string.
    _putRaw_BYTE(K.BJSON.DATATYPE_EMPTY_STRING, encodeCtx)
  } else {
    // Calculate number of bytes needed to encode input string as utf8.
    const stringBufferSize = Buffer.byteLength(value, 'utf8')

    // String header:
    // DATATYPE_STRINGxx <byte-size>
    _encodeInCtx_SizedDataType(
      K.BJSON.DATATYPE_STRING_BASE,
      stringBufferSize,
      encodeCtx)

    // String body (utf8 *WITHOUT* zero terminator).
    if (BJSON_ENCODE_LOGS_LEVEL > 0) {
      K.BJSON._debugLog(
        'going to put',
        stringBufferSize,
        'bytes of utf8 string at offset',
        encodeCtx.outDataSize)
    }

    _prepareOutDataBuffer(stringBufferSize, encodeCtx)
    encodeCtx.outData.write(value, encodeCtx.outDataSize, 'utf8')
    encodeCtx.outDataSize += stringBufferSize
  }
}

function _encodeInCtx_ArrayBody(arrayObject, encodeCtx) {
  // Encode array body:
  // <item0>, <item1>, <item2>, ...
  for (let idx = 0; idx < arrayObject.length; idx++) {
    _encodeInCtx(arrayObject[idx], encodeCtx)
  }
}

function _encodeInCtx_MapBody(mapObject, encodeCtx) {
  // Map body:
  // <key0>, <value0>, <key1>, <value1>, ...
  for (let key in mapObject) {
    _encodeInCtx(key, encodeCtx)
    _encodeInCtx(mapObject[key], encodeCtx)
  }
}

function _encodeInCtx_ArrayOrMap(value, encodeCtx) {
  // We don't know data size yet, so we reserve room for
  // pesimistic 32-bit size scenario. We'll compact it at the
  // last step if possible.
  const headerOffset = encodeCtx.outDataSize
  const bodyOffset   = headerOffset + 5
  let dataTypeBase   = null

  _setOutDataPointer(bodyOffset, encodeCtx)

  // Encode map/array body.
  if (value instanceof Array) {
    _encodeInCtx_ArrayBody(value, encodeCtx)
    dataTypeBase = K.BJSON.DATATYPE_ARRAY_BASE
  } else {
    _encodeInCtx_MapBody(value, encodeCtx)
    dataTypeBase = K.BJSON.DATATYPE_MAP_BASE
  }

  const bodyByteLen = encodeCtx.outDataSize - bodyOffset

  // Encode array header containing body size in bytes:
  // DATATYPE_ARRAY_BASExx <byte-size>
  _setOutDataPointer(headerOffset, encodeCtx)

  _encodeInCtx_SizedDataType(
    dataTypeBase,
    bodyByteLen,
    encodeCtx)

  const headerByteLen = encodeCtx.outDataSize - headerOffset

  //
  // Move body backward if header is less than 32-bit.
  //

  const newBodyOffset = headerOffset + headerByteLen

  if (headerByteLen < 4) {
    _outDataCopy(newBodyOffset, bodyOffset, bodyByteLen, encodeCtx)
  }

  _setOutDataPointer(headerOffset + headerByteLen + bodyByteLen, encodeCtx)
}

function _encodeInCtx_Binary(arrayBufferObject, encodeCtx) {
  const byteLen = arrayBufferObject.byteLength

  // Binary blob header:
  // K.BJSON.DATATYPE_BINARYxx <byte-size>
  _encodeInCtx_SizedDataType(
    K.BJSON.DATATYPE_BINARY_BASE,
    byteLen,
    encodeCtx)

  // Binary blob data - raw bytes go here.
  const srcBuffer   = Buffer.from(arrayBufferObject)
  const dstBuffer   = encodeCtx.outData
  const dstIdxStart = encodeCtx.outDataSize
  const srcIdxStart = 0
  const srcIdxEnd   = byteLen

  _prepareOutDataBuffer(byteLen, encodeCtx)

  srcBuffer.copy(dstBuffer, dstIdxStart, srcIdxStart, srcIdxEnd)

  encodeCtx.outDataSize += byteLen
}

function _encodeInCtx_Object(value, encodeCtx) {
  // Dispatch object type.
  if (value instanceof ArrayBuffer) {
    // Typed array - encode as DATATYPE_BINARYxx type.
    _encodeInCtx_Binary(value, encodeCtx)
  } else if (value != null) {
    // Array - encode as DATATYPE_ARRAYxx type.
    // Map   - encode as DATATYPE_MAPxx type.
    _encodeInCtx_ArrayOrMap(value, encodeCtx)
  } else {
    // Null - encode as DATATYPE_NULL.
    _encodeInCtx_Null(encodeCtx)
  }
}

function _encodeInCtx(inData, encodeCtx) {
  // Dispatch input data type to proper encodeXxx() function.
  switch(typeof inData) {
    case 'object': {_encodeInCtx_Object(inData, encodeCtx); break}
    case 'number': {_encodeInCtx_Number(inData, encodeCtx); break}
    case 'boolean': {_encodeInCtx_Boolean(inData, encodeCtx); break}
    case 'string': {_encodeInCtx_String(inData, encodeCtx); break}

    default:
    {
      throw new K.Error({
        errorCode: 'unknownDataType',
        ext: {
          dataType: typeof inData
        }
      })
    }
  }
}

// --------------------------------------------------------------------------
//
//                                Public API
//
// --------------------------------------------------------------------------

function encode(object, callerCtx = {}) {
  let encodeCtx = K.Object.deepClone(callerCtx)

  encodeCtx.outDataCapacity = 1024
  encodeCtx.outDataSize     = 0
  encodeCtx.outData         = Buffer.alloc(encodeCtx.outDataCapacity)

  _encodeInCtx(object, encodeCtx)

  let rv = encodeCtx.outData.slice(0, encodeCtx.outDataSize)

  return rv
}

//
// Export public functions.
//

K.BJSON.encode = encode
module.exports = encode
