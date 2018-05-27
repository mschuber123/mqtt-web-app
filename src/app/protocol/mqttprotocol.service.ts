import { Injectable } from '@angular/core';

//MQTT protocol and version        6    M    Q    I    s    d    p    3
const MqttProtoIdentifier = [0x00, 0x06, 0x4d, 0x51, 0x49, 0x73, 0x64, 0x70, 0x03];

const ERROR = {
  OK: { code: 0, text: "AMQJSC0000I OK." },
  CONNECT_TIMEOUT: { code: 1, text: "AMQJSC0001E Connect timed out." },
  SUBSCRIBE_TIMEOUT: { code: 2, text: "AMQJS0002E Subscribe timed out." },
  UNSUBSCRIBE_TIMEOUT: { code: 3, text: "AMQJS0003E Unsubscribe timed out." },
  PING_TIMEOUT: { code: 4, text: "AMQJS0004E Ping timed out." },
  INTERNAL_ERROR: { code: 5, text: "AMQJS0005E Internal error." },
  CONNACK_RETURNCODE: { code: 6, text: "AMQJS0006E Bad Connack return code:{0} {1}." },
  SOCKET_ERROR: { code: 7, text: "AMQJS0007E Socket error:{0}." },
  SOCKET_CLOSE: { code: 8, text: "AMQJS0008I Socket closed." },
  MALFORMED_UTF: { code: 9, text: "AMQJS0009E Malformed UTF data:{0} {1} {2}." },
  UNSUPPORTED: { code: 10, text: "AMQJS0010E {0} is not supported by this browser." },
  INVALID_STATE: { code: 11, text: "AMQJS0011E Invalid state {0}." },
  INVALID_TYPE: { code: 12, text: "AMQJS0012E Invalid type {0} for {1}." },
  INVALID_ARGUMENT: { code: 13, text: "AMQJS0013E Invalid argument {0} for {1}." },
  UNSUPPORTED_OPERATION: { code: 14, text: "AMQJS0014E Unsupported operation." },
  INVALID_STORED_DATA: { code: 15, text: "AMQJS0015E Invalid data in local storage key={0} value={1}." },
  INVALID_MQTT_MESSAGE_TYPE: { code: 16, text: "AMQJS0016E Invalid MQTT message type {0}." },
  MALFORMED_UNICODE: { code: 17, text: "AMQJS0017E Malformed Unicode string:{0} {1}." },
};

/** CONNACK RC Meaning. */
export const CONNACK_RC = {
  0: "Connection Accepted",
  1: "Connection Refused: unacceptable protocol version",
  2: "Connection Refused: identifier rejected",
  3: "Connection Refused: server unavailable",
  4: "Connection Refused: bad user name or password",
  5: "Connection Refused: not authorized"
};

/**
  * Unique message type identifiers, with associated
  * associated integer values.
  * @private
  */

export const MESSAGE_TYPE = {
  CONNECT: 1,
  CONNACK: 2,
  PUBLISH: 3,
  PUBACK: 4,
  PUBREC: 5,
  PUBREL: 6,
  PUBCOMP: 7,
  SUBSCRIBE: 8,
  SUBACK: 9,
  UNSUBSCRIBE: 10,
  UNSUBACK: 11,
  PINGREQ: 12,
  PINGRESP: 13,
  DISCONNECT: 14
};

/**
 * Format an error message text.
 * @private
 * @param {error} ERROR.KEY value above.
 * @param {substitutions} [array] substituted into the text.
 * @return the text with the substitutions made.
 */
var format = function (error, substitutions) {
  var text = error.text;
  if (substitutions) {
      for (var i = 0; i < substitutions.length; i++) {
          let field = "{" + i + "}";
          let start = text.indexOf(field);
          if (start > 0) {
              var part1 = text.substring(0, start);
              var part2 = text.substring(start + field.length);
              text = part1 + substitutions[i] + part2;
          }
      }
  }
  return text;
}

var parseUTF8 = function (input, offset, length) {
  var output = "";
  var utf16;
  var pos = offset;

  while (pos < offset + length) {
      var byte1 = input[pos++];
      if (byte1 < 128)
          utf16 = byte1;
      else {
          var byte2 = input[pos++] - 128;
          if (byte2 < 0)
              throw new Error(format(ERROR.MALFORMED_UTF, [byte1.toString(16), byte2.toString(16), ""]));
          if (byte1 < 0xE0)             // 2 byte character
              utf16 = 64 * (byte1 - 0xC0) + byte2;
          else {
              var byte3 = input[pos++] - 128;
              if (byte3 < 0)
                  throw new Error(format(ERROR.MALFORMED_UTF, [byte1.toString(16), byte2.toString(16), byte3.toString(16)]));
              if (byte1 < 0xF0)        // 3 byte character
                  utf16 = 4096 * (byte1 - 0xE0) + 64 * byte2 + byte3;
              else {
                  var byte4 = input[pos++] - 128;
                  if (byte4 < 0)
                      throw new Error(format(ERROR.MALFORMED_UTF, [byte1.toString(16), byte2.toString(16), byte3.toString(16), byte4.toString(16)]));
                  if (byte1 < 0xF8)        // 4 byte character
                      utf16 = 262144 * (byte1 - 0xF0) + 4096 * byte2 + 64 * byte3 + byte4;
                  else                     // longer encodings are not supported
                      throw new Error(format(ERROR.MALFORMED_UTF, [byte1.toString(16), byte2.toString(16), byte3.toString(16), byte4.toString(16)]));
              }
          }
      }

      if (utf16 > 0xFFFF)   // 4 byte character - express as a surrogate pair
      {
          utf16 -= 0x10000;
          output += String.fromCharCode(0xD800 + (utf16 >> 10)); // lead character
          utf16 = 0xDC00 + (utf16 & 0x3FF);  // trail character
      }
      output += String.fromCharCode(utf16);
  }
  return output;
}

  /**
   * Takes a String and writes it into an array as UTF8 encoded bytes.
   * @private
   */
var stringToUTF8 = function (input, output, start) {
    var pos = start;
    for (var i = 0; i < input.length; i++) {
      var charCode = String(input).charCodeAt(i);

      // Check for a surrogate pair.
      if (0xD800 <= charCode && charCode <= 0xDBFF) {
        let lowCharCode = String(input).charCodeAt(++i);
        if (isNaN(lowCharCode)) {
          throw new Error(format(ERROR.MALFORMED_UNICODE, [charCode, lowCharCode]));
        }
        charCode = ((charCode - 0xD800) << 10) + (lowCharCode - 0xDC00) + 0x10000;
      }

      if (charCode <= 0x7F) {
        output[pos++] = charCode;
      } else if (charCode <= 0x7FF) {
        output[pos++] = charCode >> 6 & 0x1F | 0xC0;
        output[pos++] = charCode & 0x3F | 0x80;
      } else if (charCode <= 0xFFFF) {
        output[pos++] = charCode >> 12 & 0x0F | 0xE0;
        output[pos++] = charCode >> 6 & 0x3F | 0x80;
        output[pos++] = charCode & 0x3F | 0x80;
      } else {
        output[pos++] = charCode >> 18 & 0x07 | 0xF0;
        output[pos++] = charCode >> 12 & 0x3F | 0x80;
        output[pos++] = charCode >> 6 & 0x3F | 0x80;
        output[pos++] = charCode & 0x3F | 0x80;
      }
      ;
    }
    return output;
}

var UTF8Length = function (input) {
  var output = 0;
  for (var i = 0; i < input.length; i++) {
    var charCode = String(input).charCodeAt(i);
    if (charCode > 0x7FF) {
      // Surrogate pair means its a 4 byte character
      if (0xD800 <= charCode && charCode <= 0xDBFF) {
        i++;
        output++;
      }
      output += 3;
    }
    else if (charCode > 0x7F)
      output += 2;
    else
      output++;
  }
  return output;
}

var writeString = function (input, utf8Length, buffer, offset) {
  offset = writeUint16(utf8Length, buffer, offset);
  stringToUTF8(input, buffer, offset);
  return offset + utf8Length;
}

var readUint16 = function (buffer, offset) {
  return 256 * buffer[offset] + buffer[offset + 1];
}

/**
 * Encodes an MQTT Multi-Byte Integer
 * @private
 */
var encodeMBI = function(number) {
    var output = new Array(1);
    var numBytes = 0;

    do {
      var digit = number % 128;
      number = number >> 7;
      if (number > 0) {
        digit |= 0x80;
      }
      output[numBytes++] = digit;
    } while ((number > 0) && (numBytes < 4));

    return output;
}

var writeUint16 = function(input, buffer, offset) {
    buffer[offset++] = input >> 8;      //MSB
    buffer[offset++] = input % 256;     //LSB
    return offset;
}

/* utf.js - UTF-8 <=> UTF-16 convertion
 *
 * Copyright (C) 1999 Masanao Izumo <iz@onicos.co.jp>
 * Version: 1.0
 * LastModified: Dec 25 1999
 * This library is free.  You can redistribute it and/or modify it.
 */

function Utf8ArrayToStr(array) {
  var out, i, len, c;
  var char2, char3;

  out = "";
  len = array.length;
  i = 0;
  while(i < len) {
  c = array[i++];
  switch(c >> 4)
  { 
    case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
      // 0xxxxxxx
      out += String.fromCharCode(c);
      break;
    case 12: case 13:
      // 110x xxxx   10xx xxxx
      char2 = array[i++];
      out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
      break;
    case 14:
           // 1110 xxxx  10xx xxxx  10xx xxxx
           char2 = array[i++];
           char3 = array[i++];
           out += String.fromCharCode(((c & 0x0F) << 12) |
                          ((char2 & 0x3F) << 6) |
                          ((char3 & 0x3F) << 0));
           break;
    }
  }
  return out;
}

export class Message {

  private payload;
  public destinationName = undefined;
  public qos : number = 0;
  public retained : boolean = false;
  public duplicate : boolean = false;

  constructor(newPayload) {
    if (typeof newPayload === "string"
      || newPayload instanceof ArrayBuffer
      || newPayload instanceof Int8Array
      || newPayload instanceof Uint8Array
      || newPayload instanceof Int16Array
      || newPayload instanceof Uint16Array
      || newPayload instanceof Int32Array
      || newPayload instanceof Uint32Array
      || newPayload instanceof Float32Array
      || newPayload instanceof Float64Array
      ) {
      this.payload = newPayload;
    } else {
      throw (format(ERROR.INVALID_ARGUMENT, [newPayload, "newPayload"]));
    }
  }
  
  public payloadString() : string {
      if (typeof this.payload === "string")
          return this.payload;
      else
          return parseUTF8(this.payload, 0, this.payload.length);
  };
  public payloadBytes() {
      if (typeof this.payload === "string") {
          var buffer = new ArrayBuffer(UTF8Length(this.payload));
          var byteStream = new Uint8Array(buffer);
          stringToUTF8(this.payload, byteStream, 0);
          return byteStream;
      } else {
          return this.payload;
      }
  }
  public setDestinationName(newDestinationName) {
      if (typeof newDestinationName === "string")
          this.destinationName = newDestinationName;
      else
          throw new Error(format(ERROR.INVALID_ARGUMENT, [newDestinationName, "newDestinationName"]));
  }
  public setQos(newQos) {
      if (newQos === 0 || newQos === 1 || newQos === 2)
          this.qos = newQos;
      else
          throw new Error("Invalid argument:" + newQos);
  }
  public setRetained(newRetained) {
      if (typeof newRetained === "boolean")
        this.retained = newRetained;
      else
        throw new Error(format(ERROR.INVALID_ARGUMENT, [newRetained, "newRetained"]));
  }
  public setuplicate(newDuplicate) {
      this.duplicate = newDuplicate;
  }
}

export class WireMessage {
  public waitForAckTimer : number = 0;
  [x: string]: any;
  constructor(public type: number, options = {}) {
    Object.keys(options).forEach(key => {
      this[key] = options[key];
      console.log('WireMessage ' + key + '=' + options[key]);
    })
  }
  public payloadToStr() {
    if (this.payloadMessage.payload != undefined) {
      return Utf8ArrayToStr(this.payloadMessage.payload);
    } else 
      return "";
  }
}


@Injectable()
export class MqttprotocolService {

  constructor() { }

  public getMqttPacket(type: number, options = {}) : WireMessage {
    return new WireMessage(type, options);
  }

  public encode(mqttPacket : WireMessage) : ArrayBuffer {
    // Compute the first byte of the fixed header
    var first = ((<number>(mqttPacket.type) & 0x0f) << 4);
    /*
     * Now calculate the length of the variable header + payload by adding up the lengths
     * of all the component parts
     */
    let remLength = 0;
    let topicStrLength = new Array();

    // if the message contains a messageIdentifier then we need two bytes for that
    if (mqttPacket.messageIdentifier != undefined)
      remLength += 2;

    let destinationNameLength = 0;

    switch (mqttPacket.type) {
      // If this a Connect then we need to include 12 bytes for its header
      case MESSAGE_TYPE.CONNECT:
        remLength += MqttProtoIdentifier.length + 3;
        remLength += UTF8Length(mqttPacket.clientId) + 2;
        if (mqttPacket.willMessage != undefined) {
          remLength += UTF8Length(mqttPacket.willMessage.destinationName) + 2;
          // Will message is always a string, sent as UTF-8 characters with a preceding length.
          var willMessagePayloadBytes = mqttPacket.willMessage.payloadBytes();
          if (!(willMessagePayloadBytes instanceof Uint8Array))
            willMessagePayloadBytes = new Uint8Array(payloadBytes);
          remLength += willMessagePayloadBytes.byteLength + 2;
        }
        if (mqttPacket.userName != undefined)
          remLength += UTF8Length(mqttPacket.userName) + 2;
        if (mqttPacket.password != undefined)
          remLength += UTF8Length(mqttPacket.password) + 2;
        break;

      // Subscribe, Unsubscribe can both contain topic strings
      case MESSAGE_TYPE.SUBSCRIBE:
        first |= 0x02; // Qos = 1;
        for (var i = 0; i < mqttPacket.topics.length; i++) {
          topicStrLength[i] = UTF8Length(mqttPacket.topics[i]);
          remLength += topicStrLength[i] + 2;
        }
        remLength += mqttPacket.requestedQos.length; // 1 byte for each topic's Qos
        // QoS on Subscribe only
        break;

      case MESSAGE_TYPE.UNSUBSCRIBE:
        first |= 0x02; // Qos = 1;
        for (var i = 0; i < mqttPacket.topics.length; i++) {
          topicStrLength[i] = UTF8Length(mqttPacket.topics[i]);
          remLength += topicStrLength[i] + 2;
        }
        break;

      case MESSAGE_TYPE.PUBLISH:
      console.log('remLength='+remLength);
        if (mqttPacket.payloadMessage.duplicate) first |= 0x08;
        first = first |= (mqttPacket.payloadMessage.qos << 1);
        if (mqttPacket.payloadMessage.retained) first |= 0x01;
        destinationNameLength = UTF8Length(mqttPacket.payloadMessage.destinationName);
        remLength += destinationNameLength + 2;
        console.log('remLength='+remLength);
        var payloadBytes = mqttPacket.payloadMessage.payloadBytes();
        remLength += payloadBytes.byteLength;
        console.log('remLength='+remLength);
        if (payloadBytes instanceof ArrayBuffer)
          payloadBytes = new Uint8Array(payloadBytes);
        else if (!(payloadBytes instanceof Uint8Array))
          payloadBytes = new Uint8Array(payloadBytes.buffer);
        break;

      case MESSAGE_TYPE.DISCONNECT:
        break;

      default:
        ;
    }

    // Now we can allocate a buffer for the message
    var mbi = encodeMBI(remLength);  // Convert the length to MQTT MBI format
    var pos = mbi.length + 1;        // Offset of start of variable header
    var buffer = new ArrayBuffer(remLength + pos);
    var byteStream = new Uint8Array(buffer);    // view it as a sequence of bytes

    //Write the fixed header into the buffer
    byteStream[0] = first;
    byteStream.set(mbi, 1);

    // If this is a PUBLISH then the variable header starts with a topic
    if (mqttPacket.type == MESSAGE_TYPE.PUBLISH)
      pos = writeString(mqttPacket.payloadMessage.destinationName, destinationNameLength, byteStream, pos);
    // If this is a CONNECT then the variable header contains the protocol name/version, flags and keepalive time

    else if (mqttPacket.type == MESSAGE_TYPE.CONNECT) {
      byteStream.set(MqttProtoIdentifier, pos);
      pos += MqttProtoIdentifier.length;
      var connectFlags = 0;
      if (mqttPacket.cleanSession)
        connectFlags = 0x02;
      if (mqttPacket.willMessage != undefined) {
        connectFlags |= 0x04;
        connectFlags |= (mqttPacket.willMessage.qos << 3);
        if (mqttPacket.willMessage.retained) {
          connectFlags |= 0x20;
        }
      }
      if (mqttPacket.userName != undefined)
        connectFlags |= 0x80;
      if (mqttPacket.password != undefined)
        connectFlags |= 0x40;
      byteStream[pos++] = connectFlags;
      pos = writeUint16(mqttPacket.keepAliveInterval, byteStream, pos);
    }

    // Output the messageIdentifier - if there is one
    if (mqttPacket.messageIdentifier != undefined)
      pos = writeUint16(mqttPacket.messageIdentifier, byteStream, pos);

    switch (mqttPacket.type) {
      case MESSAGE_TYPE.CONNECT:
        pos = writeString(mqttPacket.clientId, UTF8Length(mqttPacket.clientId), byteStream, pos);
        /*
        if (this.willMessage != undefined) {
          pos = writeString(this.willMessage.destinationName, UTF8Length(this.willMessage.destinationName), byteStream, pos);
          pos = writeUint16(willMessagePayloadBytes.byteLength, byteStream, pos);
          byteStream.set(willMessagePayloadBytes, pos);
          pos += willMessagePayloadBytes.byteLength;
        }*/
        if (mqttPacket.userName != undefined)
          pos = writeString(mqttPacket.userName, UTF8Length(mqttPacket.userName), byteStream, pos);
        if (mqttPacket.password != undefined)
          pos = writeString(mqttPacket.password, UTF8Length(mqttPacket.password), byteStream, pos);
        break;

      case MESSAGE_TYPE.PUBLISH:
        // PUBLISH has a text or binary payload, if text do not add a 2 byte length field, just the UTF characters.
        byteStream.set(payloadBytes, pos);

        break;

      //    	    case MESSAGE_TYPE.PUBREC:	
      //    	    case MESSAGE_TYPE.PUBREL:	
      //    	    case MESSAGE_TYPE.PUBCOMP:	
      //    	    	break;

      case MESSAGE_TYPE.SUBSCRIBE:
        // SUBSCRIBE has a list of topic strings and request QoS
        for (var i = 0; i < mqttPacket.topics.length; i++) {
          pos = writeString(mqttPacket.topics[i], topicStrLength[i], byteStream, pos);
          byteStream[pos++] = mqttPacket.requestedQos[i];
        }
        break;

      case MESSAGE_TYPE.UNSUBSCRIBE:
        // UNSUBSCRIBE has a list of topic strings
        for (var i = 0; i < mqttPacket.topics.length; i++)
          pos = writeString(mqttPacket.topics[i], topicStrLength[i], byteStream, pos);
        break;

      default:
      // Do nothing.
    }
    //console.log("MQTT SEND...")
    //console.log(buffer)
    return buffer;
  }

  public decode(input : Uint8Array) : WireMessage {
    var first = input[0];
    var type = first >> 4;
    var messageInfo = first &= 0x0f;
    var pos = 1;
    
    // Decode the remaining length (MBI format)
    var digit;
    var remLength = 0;
    var multiplier = 1;
    do {
        digit = input[pos++];
        remLength += ((digit & 0x7F) * multiplier);
        multiplier *= 128;
    } while ((digit & 0x80) != 0);

    let wireMessage = new WireMessage(type);
    
    switch (type) {
        case MESSAGE_TYPE.CONNACK:
            wireMessage.topicNameCompressionResponse = input[pos++];
            wireMessage.returnCode = input[pos++];
            break;

        case MESSAGE_TYPE.PUBLISH:
            var qos = (messageInfo >> 1) & 0x03;

            var len = readUint16(input, pos);
            pos += 2;
            var topicName = parseUTF8(input, pos, len);
            pos += len;
            // If QoS 1 or 2 there will be a messageIdentifier
            if (qos > 0) {
                wireMessage.messageIdentifier = readUint16(input, pos);
                pos += 2;
            }

            var message = new Message(input.slice(pos));
            if ((messageInfo & 0x01) == 0x01)
                message.retained = true;
            if ((messageInfo & 0x08) == 0x08)
                message.duplicate = true;
            message.qos = qos;
            message.destinationName = topicName;
            wireMessage.payloadMessage = message;
            break;

        case  MESSAGE_TYPE.PUBACK:
        case  MESSAGE_TYPE.PUBREC:
        case  MESSAGE_TYPE.PUBREL:
        case  MESSAGE_TYPE.PUBCOMP:
        case  MESSAGE_TYPE.UNSUBACK:
            wireMessage.messageIdentifier = readUint16(input, pos);
            break;

        case  MESSAGE_TYPE.SUBACK:
            wireMessage.messageIdentifier = readUint16(input, pos);
            pos += 2;
            wireMessage.grantedQos = input.slice(pos);
            break;

        default:
            ;
    }
    return wireMessage;
  }
}
