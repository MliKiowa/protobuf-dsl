/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
"use strict";

var $protobuf = require("protobufjs/minimal");

// Common aliases
var $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
var $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

$root.bench = (function() {

    /**
     * Namespace bench.
     * @exports bench
     * @namespace
     */
    var bench = {};

    bench.SimpleMsg = (function() {

        /**
         * Properties of a SimpleMsg.
         * @memberof bench
         * @interface ISimpleMsg
         * @property {number|null} [value] SimpleMsg value
         */

        /**
         * Constructs a new SimpleMsg.
         * @memberof bench
         * @classdesc Represents a SimpleMsg.
         * @implements ISimpleMsg
         * @constructor
         * @param {bench.ISimpleMsg=} [properties] Properties to set
         */
        function SimpleMsg(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * SimpleMsg value.
         * @member {number} value
         * @memberof bench.SimpleMsg
         * @instance
         */
        SimpleMsg.prototype.value = 0;

        /**
         * Creates a new SimpleMsg instance using the specified properties.
         * @function create
         * @memberof bench.SimpleMsg
         * @static
         * @param {bench.ISimpleMsg=} [properties] Properties to set
         * @returns {bench.SimpleMsg} SimpleMsg instance
         */
        SimpleMsg.create = function create(properties) {
            return new SimpleMsg(properties);
        };

        /**
         * Encodes the specified SimpleMsg message. Does not implicitly {@link bench.SimpleMsg.verify|verify} messages.
         * @function encode
         * @memberof bench.SimpleMsg
         * @static
         * @param {bench.ISimpleMsg} message SimpleMsg message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SimpleMsg.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.value != null && Object.hasOwnProperty.call(message, "value"))
                writer.uint32(/* id 1, wireType 0 =*/8).uint32(message.value);
            return writer;
        };

        /**
         * Encodes the specified SimpleMsg message, length delimited. Does not implicitly {@link bench.SimpleMsg.verify|verify} messages.
         * @function encodeDelimited
         * @memberof bench.SimpleMsg
         * @static
         * @param {bench.ISimpleMsg} message SimpleMsg message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SimpleMsg.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a SimpleMsg message from the specified reader or buffer.
         * @function decode
         * @memberof bench.SimpleMsg
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {bench.SimpleMsg} SimpleMsg
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SimpleMsg.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.bench.SimpleMsg();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.value = reader.uint32();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a SimpleMsg message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof bench.SimpleMsg
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {bench.SimpleMsg} SimpleMsg
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SimpleMsg.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a SimpleMsg message.
         * @function verify
         * @memberof bench.SimpleMsg
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        SimpleMsg.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.value != null && message.hasOwnProperty("value"))
                if (!$util.isInteger(message.value))
                    return "value: integer expected";
            return null;
        };

        /**
         * Creates a SimpleMsg message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof bench.SimpleMsg
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {bench.SimpleMsg} SimpleMsg
         */
        SimpleMsg.fromObject = function fromObject(object) {
            if (object instanceof $root.bench.SimpleMsg)
                return object;
            var message = new $root.bench.SimpleMsg();
            if (object.value != null)
                message.value = object.value >>> 0;
            return message;
        };

        /**
         * Creates a plain object from a SimpleMsg message. Also converts values to other types if specified.
         * @function toObject
         * @memberof bench.SimpleMsg
         * @static
         * @param {bench.SimpleMsg} message SimpleMsg
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        SimpleMsg.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults)
                object.value = 0;
            if (message.value != null && message.hasOwnProperty("value"))
                object.value = message.value;
            return object;
        };

        /**
         * Converts this SimpleMsg to JSON.
         * @function toJSON
         * @memberof bench.SimpleMsg
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        SimpleMsg.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for SimpleMsg
         * @function getTypeUrl
         * @memberof bench.SimpleMsg
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        SimpleMsg.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/bench.SimpleMsg";
        };

        return SimpleMsg;
    })();

    bench.UserProfile = (function() {

        /**
         * Properties of a UserProfile.
         * @memberof bench
         * @interface IUserProfile
         * @property {number|null} [id] UserProfile id
         * @property {string|null} [username] UserProfile username
         * @property {boolean|null} [active] UserProfile active
         */

        /**
         * Constructs a new UserProfile.
         * @memberof bench
         * @classdesc Represents a UserProfile.
         * @implements IUserProfile
         * @constructor
         * @param {bench.IUserProfile=} [properties] Properties to set
         */
        function UserProfile(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * UserProfile id.
         * @member {number} id
         * @memberof bench.UserProfile
         * @instance
         */
        UserProfile.prototype.id = 0;

        /**
         * UserProfile username.
         * @member {string} username
         * @memberof bench.UserProfile
         * @instance
         */
        UserProfile.prototype.username = "";

        /**
         * UserProfile active.
         * @member {boolean} active
         * @memberof bench.UserProfile
         * @instance
         */
        UserProfile.prototype.active = false;

        /**
         * Creates a new UserProfile instance using the specified properties.
         * @function create
         * @memberof bench.UserProfile
         * @static
         * @param {bench.IUserProfile=} [properties] Properties to set
         * @returns {bench.UserProfile} UserProfile instance
         */
        UserProfile.create = function create(properties) {
            return new UserProfile(properties);
        };

        /**
         * Encodes the specified UserProfile message. Does not implicitly {@link bench.UserProfile.verify|verify} messages.
         * @function encode
         * @memberof bench.UserProfile
         * @static
         * @param {bench.IUserProfile} message UserProfile message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        UserProfile.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.id != null && Object.hasOwnProperty.call(message, "id"))
                writer.uint32(/* id 1, wireType 0 =*/8).uint32(message.id);
            if (message.username != null && Object.hasOwnProperty.call(message, "username"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.username);
            if (message.active != null && Object.hasOwnProperty.call(message, "active"))
                writer.uint32(/* id 3, wireType 0 =*/24).bool(message.active);
            return writer;
        };

        /**
         * Encodes the specified UserProfile message, length delimited. Does not implicitly {@link bench.UserProfile.verify|verify} messages.
         * @function encodeDelimited
         * @memberof bench.UserProfile
         * @static
         * @param {bench.IUserProfile} message UserProfile message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        UserProfile.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a UserProfile message from the specified reader or buffer.
         * @function decode
         * @memberof bench.UserProfile
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {bench.UserProfile} UserProfile
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        UserProfile.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.bench.UserProfile();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.id = reader.uint32();
                        break;
                    }
                case 2: {
                        message.username = reader.string();
                        break;
                    }
                case 3: {
                        message.active = reader.bool();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a UserProfile message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof bench.UserProfile
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {bench.UserProfile} UserProfile
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        UserProfile.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a UserProfile message.
         * @function verify
         * @memberof bench.UserProfile
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        UserProfile.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.id != null && message.hasOwnProperty("id"))
                if (!$util.isInteger(message.id))
                    return "id: integer expected";
            if (message.username != null && message.hasOwnProperty("username"))
                if (!$util.isString(message.username))
                    return "username: string expected";
            if (message.active != null && message.hasOwnProperty("active"))
                if (typeof message.active !== "boolean")
                    return "active: boolean expected";
            return null;
        };

        /**
         * Creates a UserProfile message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof bench.UserProfile
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {bench.UserProfile} UserProfile
         */
        UserProfile.fromObject = function fromObject(object) {
            if (object instanceof $root.bench.UserProfile)
                return object;
            var message = new $root.bench.UserProfile();
            if (object.id != null)
                message.id = object.id >>> 0;
            if (object.username != null)
                message.username = String(object.username);
            if (object.active != null)
                message.active = Boolean(object.active);
            return message;
        };

        /**
         * Creates a plain object from a UserProfile message. Also converts values to other types if specified.
         * @function toObject
         * @memberof bench.UserProfile
         * @static
         * @param {bench.UserProfile} message UserProfile
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        UserProfile.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults) {
                object.id = 0;
                object.username = "";
                object.active = false;
            }
            if (message.id != null && message.hasOwnProperty("id"))
                object.id = message.id;
            if (message.username != null && message.hasOwnProperty("username"))
                object.username = message.username;
            if (message.active != null && message.hasOwnProperty("active"))
                object.active = message.active;
            return object;
        };

        /**
         * Converts this UserProfile to JSON.
         * @function toJSON
         * @memberof bench.UserProfile
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        UserProfile.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for UserProfile
         * @function getTypeUrl
         * @memberof bench.UserProfile
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        UserProfile.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/bench.UserProfile";
        };

        return UserProfile;
    })();

    bench.Inner = (function() {

        /**
         * Properties of an Inner.
         * @memberof bench
         * @interface IInner
         * @property {number|null} [value] Inner value
         */

        /**
         * Constructs a new Inner.
         * @memberof bench
         * @classdesc Represents an Inner.
         * @implements IInner
         * @constructor
         * @param {bench.IInner=} [properties] Properties to set
         */
        function Inner(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Inner value.
         * @member {number} value
         * @memberof bench.Inner
         * @instance
         */
        Inner.prototype.value = 0;

        /**
         * Creates a new Inner instance using the specified properties.
         * @function create
         * @memberof bench.Inner
         * @static
         * @param {bench.IInner=} [properties] Properties to set
         * @returns {bench.Inner} Inner instance
         */
        Inner.create = function create(properties) {
            return new Inner(properties);
        };

        /**
         * Encodes the specified Inner message. Does not implicitly {@link bench.Inner.verify|verify} messages.
         * @function encode
         * @memberof bench.Inner
         * @static
         * @param {bench.IInner} message Inner message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Inner.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.value != null && Object.hasOwnProperty.call(message, "value"))
                writer.uint32(/* id 1, wireType 0 =*/8).uint32(message.value);
            return writer;
        };

        /**
         * Encodes the specified Inner message, length delimited. Does not implicitly {@link bench.Inner.verify|verify} messages.
         * @function encodeDelimited
         * @memberof bench.Inner
         * @static
         * @param {bench.IInner} message Inner message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Inner.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes an Inner message from the specified reader or buffer.
         * @function decode
         * @memberof bench.Inner
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {bench.Inner} Inner
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Inner.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.bench.Inner();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.value = reader.uint32();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes an Inner message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof bench.Inner
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {bench.Inner} Inner
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Inner.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies an Inner message.
         * @function verify
         * @memberof bench.Inner
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Inner.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.value != null && message.hasOwnProperty("value"))
                if (!$util.isInteger(message.value))
                    return "value: integer expected";
            return null;
        };

        /**
         * Creates an Inner message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof bench.Inner
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {bench.Inner} Inner
         */
        Inner.fromObject = function fromObject(object) {
            if (object instanceof $root.bench.Inner)
                return object;
            var message = new $root.bench.Inner();
            if (object.value != null)
                message.value = object.value >>> 0;
            return message;
        };

        /**
         * Creates a plain object from an Inner message. Also converts values to other types if specified.
         * @function toObject
         * @memberof bench.Inner
         * @static
         * @param {bench.Inner} message Inner
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Inner.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults)
                object.value = 0;
            if (message.value != null && message.hasOwnProperty("value"))
                object.value = message.value;
            return object;
        };

        /**
         * Converts this Inner to JSON.
         * @function toJSON
         * @memberof bench.Inner
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Inner.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for Inner
         * @function getTypeUrl
         * @memberof bench.Inner
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        Inner.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/bench.Inner";
        };

        return Inner;
    })();

    bench.Outer = (function() {

        /**
         * Properties of an Outer.
         * @memberof bench
         * @interface IOuter
         * @property {bench.IInner|null} [inner] Outer inner
         */

        /**
         * Constructs a new Outer.
         * @memberof bench
         * @classdesc Represents an Outer.
         * @implements IOuter
         * @constructor
         * @param {bench.IOuter=} [properties] Properties to set
         */
        function Outer(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Outer inner.
         * @member {bench.IInner|null|undefined} inner
         * @memberof bench.Outer
         * @instance
         */
        Outer.prototype.inner = null;

        /**
         * Creates a new Outer instance using the specified properties.
         * @function create
         * @memberof bench.Outer
         * @static
         * @param {bench.IOuter=} [properties] Properties to set
         * @returns {bench.Outer} Outer instance
         */
        Outer.create = function create(properties) {
            return new Outer(properties);
        };

        /**
         * Encodes the specified Outer message. Does not implicitly {@link bench.Outer.verify|verify} messages.
         * @function encode
         * @memberof bench.Outer
         * @static
         * @param {bench.IOuter} message Outer message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Outer.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.inner != null && Object.hasOwnProperty.call(message, "inner"))
                $root.bench.Inner.encode(message.inner, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified Outer message, length delimited. Does not implicitly {@link bench.Outer.verify|verify} messages.
         * @function encodeDelimited
         * @memberof bench.Outer
         * @static
         * @param {bench.IOuter} message Outer message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Outer.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes an Outer message from the specified reader or buffer.
         * @function decode
         * @memberof bench.Outer
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {bench.Outer} Outer
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Outer.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.bench.Outer();
            while (reader.pos < end) {
                var tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.inner = $root.bench.Inner.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes an Outer message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof bench.Outer
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {bench.Outer} Outer
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Outer.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies an Outer message.
         * @function verify
         * @memberof bench.Outer
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Outer.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.inner != null && message.hasOwnProperty("inner")) {
                var error = $root.bench.Inner.verify(message.inner);
                if (error)
                    return "inner." + error;
            }
            return null;
        };

        /**
         * Creates an Outer message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof bench.Outer
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {bench.Outer} Outer
         */
        Outer.fromObject = function fromObject(object) {
            if (object instanceof $root.bench.Outer)
                return object;
            var message = new $root.bench.Outer();
            if (object.inner != null) {
                if (typeof object.inner !== "object")
                    throw TypeError(".bench.Outer.inner: object expected");
                message.inner = $root.bench.Inner.fromObject(object.inner);
            }
            return message;
        };

        /**
         * Creates a plain object from an Outer message. Also converts values to other types if specified.
         * @function toObject
         * @memberof bench.Outer
         * @static
         * @param {bench.Outer} message Outer
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Outer.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults)
                object.inner = null;
            if (message.inner != null && message.hasOwnProperty("inner"))
                object.inner = $root.bench.Inner.toObject(message.inner, options);
            return object;
        };

        /**
         * Converts this Outer to JSON.
         * @function toJSON
         * @memberof bench.Outer
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Outer.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for Outer
         * @function getTypeUrl
         * @memberof bench.Outer
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        Outer.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/bench.Outer";
        };

        return Outer;
    })();

    return bench;
})();

module.exports = $root;
