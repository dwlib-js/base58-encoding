# Base58 Encoding

## Install
`npm i --save @dwlib/base58-encoding`

## Usage
```javascript
// CJS
const base58Encoding = require('@dwlib/base58-encoding');
// ESM
import Base58Encoding from '@dwlib/base58-encoding';
import * as base58Encoding from '@dwlib/base58-encoding';
// Module Exports
const {
  Base58Encoding,
  BASIC,
  DARKWOLF
} = base58Encoding;

Base58Encoding.BASIC.alphabet; // => '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
Base58Encoding.DARKWOLF.alphabet; // => 'AveDarkwo1f23456789BCEFGHJKLMNPQRSTUVWXYZbcdghijmnpqstuxyz'

const text = 'Ave, Darkwolf!🐺🐺🐺';

const encodedString = Base58Encoding.BASIC.encodeText(text); // => '31GEC6Z1ppWwvCikxA5J7EaPFzPWhoJejFpV'
const decodedText = Base58Encoding.BASIC.decodeText(encodedString);
decodedText === text; // => true

const encodedStringDarkwolf = Base58Encoding.DARKWOLF.encodeText(text); // => 'eA642rRAjjNut2bdx1a8k4SF5zFNZi8Wc5jM'
const decodedTextDarkwolf = Base58Encoding.DARKWOLF.decodeText(encodedStringDarkwolf);
decodedTextDarkwolf === text; // => true
```
