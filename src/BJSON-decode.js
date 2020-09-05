const K = require('kcore')

require('./BJSON-core.js')
require('./BJSON-constants.js')

const BJSON_DECODE_LOGS_LEVEL = 0

function _throwCorruptedData(ext = {})
{
  throw new K.Error({errorCode: 'corruptedData', ext: ext})
}

// ----------------------------------------------------------------------------
//
//     Low-level functions to read raw machine types from input buffer.
//
// ----------------------------------------------------------------------------

function _checkInputBufferSpace(numberOfExtraBytesNeeded, decodeCtx)
{
  const numberOfBytesRemaining = decodeCtx.inData.length - decodeCtx.inDataIdx

  if (numberOfBytesRemaining < numberOfExtraBytesNeeded)
  {
    _throwCorruptedData({
      reason: 'unexpectedEndOfInputBuffer',
      offset: decodeCtx.inDataIdx,
      bytesRemaining: numberOfBytesRemaining,
      bytesNeeded: numberOfExtraBytesNeeded
    })
  }
}

function _popRaw_BYTE(decodeCtx)
{
  _checkInputBufferSpace(1, decodeCtx)

  const rv = decodeCtx.inData.readUInt8(decodeCtx.inDataIdx)

  if (BJSON_DECODE_LOGS_LEVEL > 0)
  {
    K.BJSON._debugLog('read byte', rv, 'from offset', decodeCtx.inDataIdx)
  }

  decodeCtx.inDataIdx++

  return rv
}

function _popRaw_WORD(decodeCtx)
{
  _checkInputBufferSpace(2, decodeCtx)

  const rv = decodeCtx.inData.readUInt16LE(decodeCtx.inDataIdx)

  if (BJSON_DECODE_LOGS_LEVEL > 0)
  {
    K.BJSON._debugLog('read word', rv, 'from offset', decodeCtx.inDataIdx)
  }

  decodeCtx.inDataIdx += 2

  return rv
}

function _popRaw_DWORD(decodeCtx)
{
  _checkInputBufferSpace(4, decodeCtx)

  const rv = decodeCtx.inData.readUInt32LE(decodeCtx.inDataIdx)

  if (BJSON_DECODE_LOGS_LEVEL > 0)
  {
    K.BJSON._debugLog('read word', rv, 'from offset', decodeCtx.inDataIdx)
  }

  decodeCtx.inDataIdx += 4

  return rv
}

function _popRaw_QWORD(decodeCtx)
{
  // 64-bit integers are not supported in JS.
  K.Error.throwNotImplemented('_popRaw_QWORD')
}

function _popRaw_FLOAT32(decodeCtx)
{
  _checkInputBufferSpace(4, decodeCtx)

  const rv = decodeCtx.inData.readFloatLE(decodeCtx.inDataIdx)

  if (BJSON_DECODE_LOGS_LEVEL > 0)
  {
    K.BJSON._debugLog('read float32', rv, 'from offset', decodeCtx.inDataIdx)
  }

  decodeCtx.inDataIdx += 4

  return rv
}

function _popRaw_FLOAT64(decodeCtx)
{
  _checkInputBufferSpace(8, decodeCtx)

  const rv = decodeCtx.inData.readDoubleLE(decodeCtx.inDataIdx)

  if (BJSON_DECODE_LOGS_LEVEL > 0)
  {
    K.BJSON._debugLog('read float64', rv, 'from offset', decodeCtx.inDataIdx)
  }

  decodeCtx.inDataIdx += 8

  return rv
}

// --------------------------------------------------------------------------
//
//  Middle-level functions to decode (read) abstract JS data types
//  from input buffer.
//
// --------------------------------------------------------------------------

function _decodeInCtx_stringBody(bodyByteSize, decodeCtx)
{
  _checkInputBufferSpace(bodyByteSize, decodeCtx)

  const startIdx = decodeCtx.inDataIdx
  const endIdx   = startIdx + bodyByteSize
  const rv       = decodeCtx.inData.toString('utf8', startIdx, endIdx)

  if (BJSON_DECODE_LOGS_LEVEL > 0)
  {
    K.BJSON._debugLog(
      'read',
      bodyByteSize,
      'bytes of utf8 string from offset',
      decodeCtx.inDataIdx)
  }

  decodeCtx.inDataIdx += bodyByteSize

  return rv
}

function _decodeInCtx_binaryBody(bodyByteSize, decodeCtx)
{
  K.BJSON._checkInputBufferSpace(bodyByteSize, decodeCtx)

  const startIdx = decodeCtx.inDataIdx

  let rv = new ArrayBuffer(bodyByteSize)

  for (let idx = 0; idx < bodyByteSize; idx++)
  {
    rv[idx] = decodeCtx.inData[startIdx + idx]
  }

  if (BJSON_DECODE_LOGS_LEVEL > 0)
  {
    K.BJSON._debugLog(
      'read',
      bodyByteSize,
      'bytes of binary blob from offset',
      decodeCtx.inDataIdx)
  }

  decodeCtx.inDataIdx += bodyByteSize

  return rv
}

function _decodeInCtx_arrayBody(bodyByteSize, decodeCtx)
{
  _checkInputBufferSpace(bodyByteSize, decodeCtx)

  let rv = []

  const startIdx = decodeCtx.inDataIdx
  const endIdx   = startIdx + bodyByteSize

  while (decodeCtx.inDataIdx < endIdx)
  {
    rv.push(_decodeInCtx(decodeCtx))
  }

  if (decodeCtx.inDataIdx != endIdx)
  {
    // Inconsistent data, don't go on anymore.
    _throwCorruptedData({
      reason: 'inconsistentData',
      offset: decodeCtx.inDataIdx,
      lastDataType: 'array',
      endIdxDeclared: endIdx,
      endIdxFound: decodeCtx.outDataSize
    })
  }

  if (BJSON_DECODE_LOGS_LEVEL > 0)
  {
    K.BJSON._debugLog('read', rv.length, 'items from offset', startIdx)
  }

  return rv
}

function _decodeInCtx_mapBody(bodyByteSize, decodeCtx)
{
  _checkInputBufferSpace(bodyByteSize, decodeCtx)

  let rv    = {}
  let key   = null
  let value = null
  let cnt   = 0

  const startIdx = decodeCtx.inDataIdx
  const endIdx   = startIdx + bodyByteSize

  while (decodeCtx.inDataIdx < endIdx)
  {
    key   = _decodeInCtx(decodeCtx)
    value = _decodeInCtx(decodeCtx)
    rv[key] = value
    cnt++
  }

  if (decodeCtx.inDataIdx != endIdx)
  {
    // Inconsistent data, don't go on anymore.
    _throwCorruptedData({
      reason: 'inconsistentData',
      offset: decodeCtx.inDataIdx,
      lastDataType: 'map',
      endIdxDeclared: endIdx,
      endIdxFound: decodeCtx.outDataSize
    })
  }

  if (BJSON_DECODE_LOGS_LEVEL > 0)
  {
    K.BJSON._debugLog('read', cnt, '{key->value} pairs from offset', startIdx)
  }

  return rv
}

function _decodeInCtx(decodeCtx)
{
  let outData      = null
  let bodyByteSize = 0

  const dataType = _popRaw_BYTE(decodeCtx)

  switch(dataType)
  {
    //
    // Basic primitives.
    //

    case K.BJSON.DATATYPE_NULL:          {outData = null; break}
    case K.BJSON.DATATYPE_ZERO_OR_FALSE: {outData = 0; break}
    case K.BJSON.DATATYPE_ONE_OR_TRUE:   {outData = 1; break}
    case K.BJSON.DATATYPE_EMPTY_STRING:  {outData = ''; break}

    //
    // Strict primitives.
    //

    case K.BJSON.DATATYPE_STRICT_FALSE:        {outData = false; break}
    case K.BJSON.DATATYPE_STRICT_TRUE:         {outData = true; break}
    case K.BJSON.DATATYPE_STRICT_INTEGER_ZERO: {outData = 0; break}
    case K.BJSON.DATATYPE_STRICT_INTEGER_ONE:  {outData = 1; break}

    //
    // Positive integers.
    //

    case K.BJSON.DATATYPE_POSITIVE_INTEGER8:  {outData = _popRaw_BYTE(decodeCtx); break}
    case K.BJSON.DATATYPE_POSITIVE_INTEGER16: {outData = _popRaw_WORD(decodeCtx); break}
    case K.BJSON.DATATYPE_POSITIVE_INTEGER32: {outData = _popRaw_DWORD(decodeCtx); break}
    case K.BJSON.DATATYPE_POSITIVE_INTEGER64: {outData = _popRaw_QWORD(decodeCtx); break}

    //
    // Negative integers.
    //

    case K.BJSON.DATATYPE_NEGATIVE_INTEGER8:  {outData = -_popRaw_BYTE(decodeCtx); break}
    case K.BJSON.DATATYPE_NEGATIVE_INTEGER16: {outData = -_popRaw_WORD(decodeCtx); break}
    case K.BJSON.DATATYPE_NEGATIVE_INTEGER32: {outData = -_popRaw_DWORD(decodeCtx); break}
    case K.BJSON.DATATYPE_NEGATIVE_INTEGER64: {outData = -_popRaw_QWORD(decodeCtx); break}

    //
    // Floating point numbers.
    //

    case K.BJSON.DATATYPE_FLOAT32_OBSOLETE:
    case K.BJSON.DATATYPE_FLOAT32:
    {
      outData = _popRaw_FLOAT32(decodeCtx);
      break
    }

    case K.BJSON.DATATYPE_FLOAT64_OBSOLETE:
    case K.BJSON.DATATYPE_FLOAT64:
    {
      outData = _popRaw_FLOAT64(decodeCtx);
      break
    }

    //
    // utf8 strings.
    //

    case K.BJSON.DATATYPE_STRING8:
    {
      bodyByteSize = _popRaw_BYTE(decodeCtx)
      outData      = _decodeInCtx_stringBody(bodyByteSize, decodeCtx)
      break
    }

    case K.BJSON.DATATYPE_STRING16:
    {
      bodyByteSize = _popRaw_WORD(decodeCtx)
      outData      = _decodeInCtx_stringBody(bodyByteSize, decodeCtx)
      break
    }

    case K.BJSON.DATATYPE_STRING32:
    {
      bodyByteSize = _popRaw_DWORD(decodeCtx)
      outData      = _decodeInCtx_stringBody(bodyByteSize, decodeCtx)
      break
    }

    case K.BJSON.DATATYPE_STRING64:
    {
      bodyByteSize = _popRaw_QWORD(decodeCtx)
      outData      = _decodeInCtx_stringBody(bodyByteSize, decodeCtx)
      break
    }

    //
    // Binary blobs.
    //

    case K.BJSON.DATATYPE_BINARY8:
    {
      bodyByteSize = _popRaw_BYTE(decodeCtx)
      outData      = _decodeInCtx_binaryBody(bodyByteSize, decodeCtx)
      break
    }

    case K.BJSON.DATATYPE_BINARY16:
    {
      bodyByteSize = _popRaw_WORD(decodeCtx)
      outData      = _decodeInCtx_binaryBody(bodyByteSize, decodeCtx)
      break
    }

    case K.BJSON.DATATYPE_BINARY32:
    {
      bodyByteSize = _popRaw_DWORD(decodeCtx)
      outData      = _decodeInCtx_binaryBody(bodyByteSize, decodeCtx)
      break
    }

    case K.BJSON.DATATYPE_BINARY64:
    {
      bodyByteSize = _popRaw_QWORD(decodeCtx)
      outData      = _decodeInCtx_binaryBody(bodyByteSize, decodeCtx)
      break
    }

    //
    // Arrays.
    //

    case K.BJSON.DATATYPE_ARRAY8:
    {
      bodyByteSize = _popRaw_BYTE(decodeCtx)
      outData      = _decodeInCtx_arrayBody(bodyByteSize, decodeCtx)
      break
    }

    case K.BJSON.DATATYPE_ARRAY16:
    {
      bodyByteSize = _popRaw_WORD(decodeCtx)
      outData      = _decodeInCtx_arrayBody(bodyByteSize, decodeCtx)
      break
    }

    case K.BJSON.DATATYPE_ARRAY32:
    {
      bodyByteSize = _popRaw_DWORD(decodeCtx)
      outData      = _decodeInCtx_arrayBody(bodyByteSize, decodeCtx)
      break
    }

    case K.BJSON.DATATYPE_ARRAY64:
    {
      bodyByteSize = _popRaw_QWORD(decodeCtx)
      outData      = _decodeInCtx_arrayBody(bodyByteSize, decodeCtx)
      break
    }

    //
    // Map of key -> value.
    //

    case K.BJSON.DATATYPE_MAP8:
    {
      bodyByteSize = _popRaw_BYTE(decodeCtx)
      outData      = _decodeInCtx_mapBody(bodyByteSize, decodeCtx)
      break
    }

    case K.BJSON.DATATYPE_MAP16:
    {
      bodyByteSize = _popRaw_WORD(decodeCtx)
      outData      = _decodeInCtx_mapBody(bodyByteSize, decodeCtx)
      break
    }

    case K.BJSON.DATATYPE_MAP32:
    {
      bodyByteSize = _popRaw_DWORD(decodeCtx)
      outData      = _decodeInCtx_mapBody(bodyByteSize, decodeCtx)
      break
    }

    case K.BJSON.DATATYPE_MAP64:
    {
      bodyByteSize = _popRaw_QWORD(decodeCtx)
      outData      = _decodeInCtx_mapBody(bodyByteSize, decodeCtx)
      break
    }

    default:
    {
      _throwCorruptedData({
        reason: 'unexpectedDataType',
        dataType: dataType
      })
    }
  }

  return outData
}

// --------------------------------------------------------------------------
//
//                                Public API
//
// --------------------------------------------------------------------------

function decode(buffer, callerCtx = {})
{
  let outJson = null

  if (buffer.length == 0)
  {
    // Error, empty buffer passed.
    _throwCorruptedData({
      reason: 'emptyInput'
    })
  }
  else
  {
    // Input buffer looks ok at first glance. Go on.
    let decodeCtx = K.Object.deepClone(callerCtx)

    decodeCtx.inData    = buffer
    decodeCtx.inDataIdx = 0
    outJson = _decodeInCtx(decodeCtx)

    // Check do all bytes processed.
    const remainingBytes = decodeCtx.inData.length - decodeCtx.inDataIdx

    if (remainingBytes > 0)
    {
      // Inconsistent data error - don't go anymore.
      _throwCorruptedData({
        reason: 'remainingBytes',
        offset: decodeCtx.inDataIdx,
        bytesRemaining: remainingBytes,
      })
    }
  }

  return outJson
}

//
// Export public functions.
//

K.BJSON.decode = decode
