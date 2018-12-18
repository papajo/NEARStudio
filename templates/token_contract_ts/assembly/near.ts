import { u128 } from "./bignum/integer/safe/u128";

// TODO: Figure out what's best way to export these types from near module. Looks like type automatically exported.
// TODO: I guess wrapper classes might be needed, which also allows to select subset of relevant ops
type Address = u128;
type MoneyNumber = u128;

class ContractContext {
  // TODO: Should return u256 instead
  get sender(): string {
    let arr = new Uint8Array(32);
    sender_id(arr.buffer.data);
    return near.base58(arr);
  }
}

export class GlobalStorage {
  setItem(key: string, value: string): void {
    near.log("setItem: " + key + " value: " + value);
    storage_write(near.utf8(key), near.utf8(value));
  }
  getItem(key: string): string {
    near.log("getItem: " + key);
    let len = storage_read_len(<usize>key);
    if (len == 0) {
      return null;
    }
    near.log("len: " + near.str(len));

    let buf = new Uint8Array(len);
    storage_read_into(near.utf8(key), buf.buffer.data);
    let value = String.fromUTF8(buf.buffer.data, buf.byteLength);
    near.log("value: " + value);
    return value;
  }
  removeItem(key: string): void {
    assert(false, "storage_remove not implemented yet.");
  }
  setU128(key: string, value: u128): void {
    this.setItem(key, value.toString());
  }
  getU128(key: string): u128 {
    return u128.fromString(this.getItem(key) || "0");
  }
}

export let globalStorage: GlobalStorage = new GlobalStorage();
export let contractContext: ContractContext = new ContractContext();

export namespace near {
  export function bufferWithSizeFromPtr(ptr: usize, length: usize): Uint8Array {
    near.log("bufferWithSizeFromPtr length: " + near.str(length));
    let withSize = new Uint8Array(length + 4);
    store<u32>(withSize.buffer.data, length);
    // TODO: Should use better copy routine or better avoid copy altogether
    for (let i = <usize>0; i < length; i++) {
        withSize[i + 4] = load<u8>(ptr + i);
    }
    return withSize;
  }

  export function bufferWithSize(buf: Uint8Array): Uint8Array {
    return bufferWithSizeFromPtr(buf.buffer.data, buf.byteLength);
  }

  export function log(msg: string): void {
    _near_log(<usize>msg);
  }

  export function str<T>(value: T): string {
    let arr: Array<T> = [value];
    return arr.toString(); 
  }

  export function utf8(value: string): usize {
    return bufferWithSizeFromPtr(value.toUTF8(), value.lengthUTF8 - 1).buffer.data;
  }

  export function base58(source: Uint8Array): string {
    // Code converted from:
    // https://github.com/cryptocoinjs/base-x/blob/master/index.js
    const iFACTOR = 2; // TODO: Calculate it
    const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    const BASE = ALPHABET.length;
    const LEADER = ALPHABET.charAt(0);

    // Skip & count leading zeroes.
    let zeroes = 0
    let length = 0
    let pbegin = 0
    const pend = source.length

    while (pbegin !== pend && source[pbegin] === 0) {
      pbegin++
      zeroes++
    }

    // Allocate enough space in big-endian base58 representation.
    const size = ((pend - pbegin) * iFACTOR + 1) >>> 0
    const b58 = new Uint8Array(size)

    // Process the bytes.
    while (pbegin !== pend) {
      let carry = i32(source[pbegin])

      // Apply "b58 = b58 * 256 + ch".
      let i = 0
      for (let it = size - 1; (carry !== 0 || i < length) && (it !== -1); it--, i++) {
        carry += (256 * b58[it]) >>> 0
        b58[it] = (carry % BASE) >>> 0
        carry = (carry / BASE) >>> 0
      }

      assert(carry == 0, 'Non-zero carry');
      length = i
      pbegin++
    }

    // Skip leading zeroes in base58 result.
    let it = size - length
    while (it !== size && b58[it] === 0) {
      it++
    }

    // Translate the result into a string.
    let str = LEADER.repeat(zeroes)
    for (; it < size; ++it) str += ALPHABET.charAt(b58[it])

    return str
  }
}

function bin2hex(bin: Uint8Array, uppercase: boolean = false): string {
  let hex = uppercase ? "0123456789ABCDEF" : "0123456789abcdef";
  let str = "";
  for (let i = 0, len = bin.length; i < len; i++) {
    str += hex.charAt((bin[i] >>> 4) & 0x0f) + hex.charAt(bin[i] & 0x0f);
  }
  return str;
}

// TODO: Other functions exposed by runtime should be defined here

@external("env", "storage_write")
declare function storage_write(key: usize, value: usize): void;
@external("env", "storage_read_len")
declare function storage_read_len(key: usize): usize;
@external("env", "storage_read_into")
declare function storage_read_into(key: usize, value: usize): void;

@external("env", "input_read_len")
declare function input_read_len(): usize;
@external("env", "input_read_into")
declare function input_read_into(ptr: usize): void;

// Alias is standard length prefix buffer, but ID is always 32 bytes.
@external("env", "account_alias_to_id")
declare function account_alias_to_id(account_alias: usize, account_id: usize) : void;
// Sender's account id. Writes 32 bytes.
@external("env", "sender_id")
declare function sender_id(account_id: usize) : void;
// Current account id. Writes 32 bytes.
@external("env", "account_id")
declare function account_id(account_id: usize) : void;

@external("env", "return_value")
declare function return_value(value_ptr: usize): void;

@external("env", "log")
declare function _near_log(msg_ptr: usize): void;

/*
    // First 4 bytes are the length of the remaining buffer.
    fn storage_write(key: *const u8, value: *const u8);
    fn storage_read_len(key: *const u8) -> u32;
    fn storage_read_into(key: *const u8, value: *mut u8);

    fn input_read_len() -> u32;
    fn input_read_into(value: *mut u8);

    fn result_count() -> u32;
    fn result_is_ok(index: u32) -> bool;
    fn result_read_len(index: u32) -> u32;
    fn result_read_into(index: u32, value: *mut u8);

    fn return_value(value: *const u8);
    fn return_promise(promise_index: u32);

    // Alias is standard length prefix buffer, but ID is always 32 bytes.
    fn account_alias_to_id(account_alias: *const u8, account_id: *mut u8);
    // Sender's account id. Writes 32 bytes.
    fn sender_id(account_id: *mut u8);
    // Current account id. Writes 32 bytes.
    fn account_id(account_id: *mut u8);

    // AccountID is just 32 bytes without the prefix length.
    fn promise_create(
        account_id: *const u8,
        method_name: *const u8,
        arguments: *const u8,
        mana: u32,
        amount: u64,
    ) -> u32;

    fn promise_then(
        promise_index: u32,
        method_name: *const u8,
        arguments: *const u8,
        mana: u32,
    ) -> u32;

    fn promise_and(promise_index1: u32, promise_index2: u32) -> u32;

    fn balance() -> u64;
    fn mana_left() -> u32;
    fn gas_left() -> u64;
    fn received_amount() -> u64;
    fn assert(expr: bool);
*/