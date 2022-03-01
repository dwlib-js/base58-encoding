import {
  BigInt,
  Map,
  MapGet,
  MapHas,
  MapSet,
  MathCeil,
  MathFloor,
  MathLog,
  ObjectDefineProperties,
  RangeError,
  ReflectDefineProperty,
  StringFromCharCode,
  StringCharCodeAt,
  Symbol,
  SymbolHasInstance,
  SymbolToStringTag,
  TypeError,
  TypedArrayLength,
  Uint8Array
} from '@dwlib/primordials';
import IsObject from '@dwlib/abstract/IsObject';
import IsBuffer from '@dwlib/abstract/IsBuffer';
import IsUint8Array from '@dwlib/abstract/IsUint8Array';
import IsString from '@dwlib/abstract/IsString';
import ToString from '@dwlib/abstract/ToString';
import ToIntegerOrInfinity from '@dwlib/abstract/ToIntegerOrInfinity';
import ToBigInt from '@dwlib/abstract/ToBigInt';
import {
  DefineSlots,
  GetSlot,
  HasSlot
} from '@dwlib/internal-slots';
import {
  encode as UTF8Encode,
  decode as UTF8Decode
} from '@dwlib/utf8';

const FACTOR = MathLog(256) / MathLog(58);
const INVERSE_FACTOR = MathLog(58) / MathLog(256);

const $Alphabet = Symbol('[[Alphabet]]');
const $AlphabetLookup = Symbol('[[AlphabetLookup]]');
const $BaseMap = Symbol('[[BaseMap]]');
const $BaseMapLookup = Symbol('[[BaseMapLookup]]');

const IsBase58CharCode = charCode => (
  charCode >= 0x31 && charCode <= 0x39 ||
  charCode >= 0x41 && charCode <= 0x4e ||
  charCode >= 0x50 && charCode <= 0x5a ||
  charCode >= 0x61 && charCode <= 0x7a
);

const GetCapacity = length => MathCeil(length * FACTOR);

const GetInverseCapacity = length => MathCeil(length * INVERSE_FACTOR);

const IsBase58Encoding = argument => IsObject(argument) && HasSlot(argument, $Alphabet);

const RequireThis = argument => {
  if (!IsBase58Encoding(argument)) {
    throw new TypeError('`this` is not an instance of Base58Encoding');
  }
}

const RequireBuffer = argument => {
  if (!IsBuffer(argument)) {
    throw new TypeError('`buffer` is not an instance of ArrayBuffer or ArrayBufferView');
  }
}

const Encode = (target, string) => {
  const length = string.length;
  if (!length) {
    return '';
  }
  const alphabet = GetSlot(target, $Alphabet);
  let leadingZeros = 0;
  while (leadingZeros < length && string[leadingZeros] === '\0') {
    leadingZeros++;
  }
  const capacity = GetCapacity(length - leadingZeros);
  const bytes = new Uint8Array(capacity);
  const lastIndex = capacity - 1;
  let offset = lastIndex;
  for (let i = leadingZeros; i < length; i++) {
    let carry = StringCharCodeAt(string, i);
    if (carry > 0xff) {
      throw new RangeError('Invalid ASCII encoding');
    }
    let index = lastIndex;
    while (carry || index >= offset) {
      carry += bytes[index] << 8;
      bytes[index] = carry % 58;
      carry = (carry / 58) | 0;
      index--;
    }
    offset = ++index;
  }
  let result = '';
  if (leadingZeros) {
    const zeroChar = alphabet[0];
    while (--leadingZeros >= 0) {
      result += zeroChar;
    }
  }
  while (offset < capacity) {
    const charIndex = bytes[offset++];
    result += alphabet[charIndex];
  }
  return result;
}

const EncodeToBytes = (target, string) => {
  const length = string.length;
  if (!length) {
    return new Uint8Array(0);
  }
  const baseMap = GetSlot(target, $BaseMap);
  let leadingZeros = 0;
  while (leadingZeros < length && string[leadingZeros] === '\0') {
    leadingZeros++;
  }
  const capacity = GetCapacity(length - leadingZeros);
  const bytes = new Uint8Array(capacity);
  const lastIndex = capacity - 1;
  let offset = lastIndex;
  for (let i = leadingZeros; i < length; i++) {
    let carry = StringCharCodeAt(string, i);
    if (carry > 0xff) {
      throw new RangeError('Invalid ASCII encoding');
    }
    let index = lastIndex;
    while (carry || index >= offset) {
      carry += bytes[index] << 8;
      bytes[index] = carry % 58;
      carry = (carry / 58) | 0;
      index--;
    }
    offset = ++index;
  }
  const size = capacity - offset + leadingZeros;
  const result = new Uint8Array(size);
  let index = 0;
  if (leadingZeros) {
    const zeroCharCode = MapGet(baseMap, 0);
    while (index < leadingZeros) {
      result[index++] = zeroCharCode;
    }
  }
  while (index < size) {
    const charIndex = bytes[offset++];
    result[index++] = MapGet(baseMap, charIndex);
  }
  return result;
}

const Decode = (target, encodedString) => {
  const length = encodedString.length;
  if (!length) {
    return '';
  }
  const alphabet = GetSlot(target, $Alphabet);
  const baseMapLookup = GetSlot(target, $BaseMapLookup);
  const zeroChar = alphabet[0];
  let leadingZeros = 0;
  while (leadingZeros < length && encodedString[leadingZeros] === zeroChar) {
    leadingZeros++;
  }
  const capacity = GetCapacity(length - leadingZeros);
  const bytes = new Uint8Array(capacity);
  const lastIndex = capacity - 1;
  let offset = lastIndex;
  for (let i = leadingZeros; i < length; i++) {
    const charCode = StringCharCodeAt(encodedString, i);
    let carry = MapGet(baseMapLookup, charCode);
    if (carry === undefined) {
      throw new RangeError('Invalid Base58 encoding');
    }
    let index = lastIndex;
    while (carry || index >= offset) {
      carry += bytes[index] * 58;
      bytes[index] = carry & 0xff;
      carry >>= 8;
      index--;
    }
    offset = ++index;
  }
  let result = '';
  while (leadingZeros > 0) {
    result += '\0';
    leadingZeros--;
  }
  while (offset < capacity) {
    const charCode = bytes[offset++];
    result += StringFromCharCode(charCode);
  }
  return result;
}

const DecodeToBytes = (target, encodedString) => {
  const length = encodedString.length;
  if (!length) {
    return new Uint8Array(0);
  }
  const alphabet = GetSlot(target, $Alphabet);
  const baseMapLookup = GetSlot(target, $BaseMapLookup);
  const zeroChar = alphabet[0];
  let leadingZeros = 0;
  while (leadingZeros < length && encodedString[leadingZeros] === zeroChar) {
    leadingZeros++;
  }
  const capacity = GetCapacity(length - leadingZeros);
  const bytes = new Uint8Array(capacity);
  const lastIndex = capacity - 1;
  let offset = lastIndex;
  for (let i = leadingZeros; i < length; i++) {
    const charCode = StringCharCodeAt(encodedString, i);
    let carry = MapGet(baseMapLookup, charCode);
    if (carry === undefined) {
      throw new RangeError('Invalid Base58 encoding');
    }
    let index = lastIndex;
    while (carry || index >= offset) {
      carry += bytes[index] * 58;
      bytes[index] = carry & 0xff;
      carry >>= 8;
      index--;
    }
    offset = ++index;
  }
  const size = capacity - offset + leadingZeros;
  const result = new Uint8Array(size);
  let index = leadingZeros;
  while (index < size) {
    result[index++] = bytes[offset++];
  }
  return result;
}

const EncodeBytes = (target, buffer) => {
  const source = IsUint8Array(buffer) ? buffer : new Uint8Array(buffer);
  const length = TypedArrayLength(source);
  if (!length) {
    return new Uint8Array(0);
  }
  const baseMap = GetSlot(target, $BaseMap);
  let leadingZeros = 0;
  while (leadingZeros < length && source[leadingZeros] === 0) {
    leadingZeros++
  }
  const capacity = GetCapacity(length - leadingZeros);
  const bytes = new Uint8Array(capacity);
  const lastIndex = capacity - 1;
  let offset = lastIndex;
  for (let i = leadingZeros; i < length; i++) {
    let carry = source[i];
    let index = lastIndex;
    while (carry || index >= offset) {
      carry += bytes[index] << 8;
      bytes[index] = carry % 58;
      carry = (carry / 58) | 0;
      index--;
    }
    offset = ++index;
  }
  const size = capacity - offset + leadingZeros;
  const result = new Uint8Array(size);
  let index = 0;
  if (leadingZeros) {
    const zeroCharCode = MapGet(baseMap, 0);
    while (index < leadingZeros) {
      result[index++] = zeroCharCode;
    }
  }
  while (index < size) {
    const charIndex = bytes[offset++];
    result[index++] = MapGet(baseMap, charIndex);
  }
  return result;
}

const EncodeBytesToString = (target, buffer) => {
  const source = IsUint8Array(buffer) ? buffer : new Uint8Array(buffer);
  const length = TypedArrayLength(source);
  if (!length) {
    return '';
  }
  const alphabet = GetSlot(target, $Alphabet);
  let leadingZeros = 0;
  while (leadingZeros < length && source[leadingZeros] === 0) {
    leadingZeros++
  }
  const capacity = GetCapacity(length - leadingZeros);
  const bytes = new Uint8Array(capacity);
  const lastIndex = capacity - 1;
  let offset = lastIndex;
  for (let i = leadingZeros; i < length; i++) {
    let carry = source[i];
    let index = lastIndex;
    while (carry || index >= offset) {
      carry += bytes[index] << 8;
      bytes[index] = carry % 58;
      carry = (carry / 58) | 0;
      index--;
    }
    offset = ++index;
  }
  let result = '';
  if (leadingZeros) {
    const zeroChar = alphabet[0];
    while (--leadingZeros >= 0) {
      result += zeroChar;
    }
  }
  while (offset < capacity) {
    const charIndex = bytes[offset++];
    result += alphabet[charIndex];
  }
  return result;
}

const DecodeBytes = (target, buffer) => {
  const source = IsUint8Array(buffer) ? buffer : new Uint8Array(buffer);
  const length = TypedArrayLength(source);
  if (!length) {
    return new Uint8Array(0);
  }
  const baseMapLookup = GetSlot(target, $BaseMapLookup);
  const zeroCharCode = MapGet(baseMapLookup, 0);
  let leadingZeros = 0;
  while (leadingZeros < length && source[leadingZeros] === zeroCharCode) {
    leadingZeros++;
  }
  const capacity = GetInverseCapacity(length - leadingZeros);
  const bytes = new Uint8Array(capacity);
  const lastIndex = capacity - 1;
  let offset = lastIndex;
  for (let i = leadingZeros; i < length; i++) {
    const charCode = source[i];
    let carry = MapGet(baseMapLookup, charCode);
    if (carry === undefined) {
      throw new RangeError('Invalid Base58 encoding');
    }
    let index = lastIndex;
    while (carry || index >= offset) {
      carry += bytes[index] * 58;
      bytes[index] = carry & 0xff;
      carry >>= 8;
      index--;
    }
    offset = ++index;
  }
  const size = capacity - offset + leadingZeros;
  const result = new Uint8Array(size);
  let index = leadingZeros;
  while (index < size) {
    result[index++] = bytes[offset++];
  }
  return result;
}

const DecodeBytesToString = (target, buffer) => {
  const source = IsUint8Array(buffer) ? buffer : new Uint8Array(buffer);
  const length = TypedArrayLength(source);
  if (!length) {
    return '';
  }
  const baseMapLookup = GetSlot(target, $BaseMapLookup);
  const zeroCharCode = MapGet(baseMapLookup, 0);
  let leadingZeros = 0;
  while (leadingZeros < length && source[leadingZeros] === zeroCharCode) {
    leadingZeros++;
  }
  const capacity = GetInverseCapacity(length - leadingZeros);
  const bytes = new Uint8Array(capacity);
  const lastIndex = capacity - 1;
  let offset = lastIndex;
  for (let i = leadingZeros; i < length; i++) {
    const charCode = source[i];
    let carry = MapGet(baseMapLookup, charCode);
    if (carry === undefined) {
      throw new RangeError('Invalid Base58 encoding');
    }
    let index = lastIndex;
    while (carry || index >= offset) {
      carry += bytes[index] * 58;
      bytes[index] = carry & 0xff;
      carry >>= 8;
      index--;
    }
    offset = ++index;
  }
  let result = '';
  while (leadingZeros > 0) {
    result += '\0';
    leadingZeros--;
  }
  while (offset < capacity) {
    const charCode = bytes[offset++];
    result += StringFromCharCode(charCode);
  }
  return result;
}

const EncodeText = (target, text) => {
  const buffer = UTF8Encode(text);
  return EncodeBytesToString(target, buffer);
}

const EncodeTextToBytes = (target, text) => {
  const buffer = UTF8Encode(text);
  return EncodeBytes(target, buffer);
}

const DecodeText = (target, encodedString) => {
  const buffer = DecodeToBytes(target, encodedString);
  return UTF8Decode(buffer);
}

const DecodeBytesToText = (target, buffer) => {
  const bytes = DecodeBytes(target, buffer);
  return UTF8Decode(bytes);
}

const EncodeInt = (target, integer) => {
  const alphabet = GetSlot(target, $Alphabet);
  if (!integer) {
    return alphabet[0];
  }
  let result = '';
  let carry = integer;
  while (carry) {
    const charIndex = carry % 58;
    const char = alphabet[charIndex];
    result = `${char}${result}`;
    carry = MathFloor(carry / 58);
  }
  return result;
}

const DecodeInt = (target, encodedInteger) => {
  const length = encodedInteger.length;
  if (!length) {
    return NaN;
  }
  const alphabet = GetSlot(target, $Alphabet);
  const alphabetLookup = GetSlot(target, $AlphabetLookup);
  const zeroChar = alphabet[0];
  let leadingZeros = 0;
  while (leadingZeros < length && encodedInteger[leadingZeros] === zeroChar) {
    leadingZeros++;
  }
  let result = 0;
  for (let i = leadingZeros; i < length; i++) {
    const char = encodedInteger[i];
    const charIndex = MapGet(alphabetLookup, char);
    if (charIndex === undefined) {
      return NaN;
    }
    result = result * 58 + charIndex;
  }
  return result;
}

export class Base58Encoding {
  constructor(alphabet) {
    if (!IsString(alphabet)) {
      throw new TypeError('`alphabet` is not a string');
    }
    const length = alphabet.length;
    if (!length || length > 58) {
      throw new RangeError('Alphabet length out of range');
    }
    const alphabetLookup = new Map();
    const baseMap = new Map();
    const baseMapLookup = new Map();
    for (let i = 0; i < 58; i++) {
      const char = alphabet[i];
      if (MapHas(alphabetLookup, char)) {
        throw new RangeError('Invalid alphabet');
      }
      const charCode = StringCharCodeAt(alphabet, i);
      if (!IsBase58CharCode(charCode)) {
        throw new RangeError('Invalid alphabet');
      }
      MapSet(alphabetLookup, char, i);
      MapSet(baseMap, i, charCode);
      MapSet(baseMapLookup, charCode, i);
    }
    DefineSlots(this, {
      [$Alphabet]: alphabet,
      [$AlphabetLookup]: alphabetLookup,
      [$BaseMap]: baseMap,
      [$BaseMapLookup]: baseMapLookup
    });
  }

  get alphabet() {
    RequireThis(this);
    return GetSlot(this, $Alphabet);
  }

  encode(string) {
    RequireThis(this);
    const $string = ToString(string);
    return Encode(this, $string);
  }

  encodeToBytes(string) {
    RequireThis(this);
    const $string = ToString(string);
    return EncodeToBytes(this, $string);
  }

  decode(encodedString) {
    RequireThis(this);
    const $encodedString = ToString(encodedString);
    return Decode(this, $encodedString);
  }

  decodeToBytes(encodedString) {
    RequireThis(this);
    const $encodedString = ToString(encodedString);
    return DecodeToBytes(this, $encodedString);
  }

  encodeBytes(buffer) {
    RequireThis(this);
    RequireBuffer(buffer);
    return EncodeBytes(this, buffer);
  }

  encodeBytesToString(buffer) {
    RequireThis(this);
    RequireBuffer(buffer);
    return EncodeBytesToString(this, buffer);
  }

  decodeBytes(buffer) {
    RequireThis(this);
    RequireBuffer(buffer);
    return DecodeBytes(this, buffer);
  }

  decodeBytesToString(buffer) {
    RequireThis(this);
    RequireBuffer(buffer);
    return DecodeBytesToString(this, buffer);
  }

  encodeText(text) {
    RequireThis(this);
    return EncodeText(this, text);
  }

  encodeTextToBytes(text) {
    RequireThis(this);
    return EncodeTextToBytes(this, text);
  }

  decodeText(encodedString) {
    RequireThis(this);
    const $encodedString = ToString(encodedString);
    return DecodeText(this, $encodedString);
  }

  decodeBytesToText(buffer) {
    RequireThis(this);
    RequireBuffer(buffer);
    return DecodeBytesToText(this, buffer);
  }

  encodeInt(integer) {
    RequireThis(this);
    const $integer = ToIntegerOrInfinity(integer);
    if ($integer < 0) {
      throw new RangeError('`integer` cannot be negative');
    }
    if ($integer === Infinity) {
      throw new RangeError('`integer` is not finite');
    }
    return EncodeInt(this, $integer);
  }

  decodeInt(encodedInteger) {
    RequireThis(this);
    const $encodedInteger = ToString(encodedInteger);
    return DecodeInt(this, $encodedInteger);
  }
}
export default Base58Encoding;

ReflectDefineProperty(Base58Encoding, SymbolHasInstance, {
  value: IsBase58Encoding
});

const Base58EncodingPrototype = Base58Encoding.prototype;

ReflectDefineProperty(Base58EncodingPrototype, SymbolToStringTag, {
  value: 'Base58Encoding'
});

if (BigInt) {
  const BIGINT_ZERO = BigInt(0);
  const BIGINT_BASE = BigInt(58);

  const EncodeBigInt = (target, bigint) => {
    const alphabet = GetSlot(target, $Alphabet);
    if (!bigint) {
      return alphabet[0];
    }
    let result = '';
    let carry = bigint;
    while (carry) {
      const charIndex = carry % BIGINT_BASE;
      const char = alphabet[charIndex];
      result = `${char}${result}`;
      carry /= BIGINT_BASE;
    }
    return result;
  }

  const DecodeBigInt = (target, encodedInteger) => {
    const length = encodedInteger.length;
    if (!length) {
      throw new RangeError('Invalid Base58 encoded integer');
    }
    const alphabet = GetSlot(target, $Alphabet);
    const alphabetLookup = GetSlot(target, $AlphabetLookup);
    const zeroChar = alphabet[0];
    let leadingZeros = 0;
    while (leadingZeros < length && encodedInteger[leadingZeros] === zeroChar) {
      leadingZeros++;
    }
    let result = BIGINT_ZERO;
    for (let i = leadingZeros; i < length; i++) {
      const char = encodedInteger[i];
      const charIndex = MapGet(alphabetLookup, char);
      if (charIndex === undefined) {
        throw new RangeError('Invalid Base58 encoded integer');
      }
      result = result * BIGINT_BASE + BigInt(charIndex);
    }
    return result;
  }

  ObjectDefineProperties(Base58EncodingPrototype, {
    encodeBigInt: {
      value: function encodeBigInt(bigint) {
        RequireThis(this);
        const $bigint = ToBigInt(bigint);
        if ($bigint < BIGINT_ZERO) {
          throw new RangeError('`bigint` cannot be negative');
        }
        return EncodeBigInt(this, $bigint);
      }
    },
    decodeBigInt: {
      value: function decodeBigInt(encodedInteger) {
        RequireThis(this);
        const $encodedInteger = ToString(encodedInteger);
        return DecodeBigInt(this, $encodedInteger);
      }
    }
  });
}

export const BASIC = new Base58Encoding('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz');
export const DARKWOLF = new Base58Encoding('AveDarkwo1f23456789BCEFGHJKLMNPQRSTUVWXYZbcdghijmnpqstuxyz');

ObjectDefineProperties(Base58Encoding, {
  BASIC: {
    value: BASIC
  },
  DARKWOLF: {
    value: DARKWOLF
  }
});
