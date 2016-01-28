//! REPLACE_BY("// Copyright 2016 Claude Petit, licensed under Apache License version 2.0\n")
// dOOdad - Object-oriented programming framework
// File: IO_Minifiers.js - Minifiers
// Project home: https://sourceforge.net/projects/doodad-js/
// Trunk: svn checkout svn://svn.code.sf.net/p/doodad-js/code/trunk doodad-js-code
// Author: Claude Petit, Quebec city
// Contact: doodadjs [at] gmail.com
// Note: I'm still in alpha-beta stage, so expect to find some bugs or incomplete parts !
// License: Apache V2
//
//	Copyright 2016 Claude Petit
//
//	Licensed under the Apache License, Version 2.0 (the "License");
//	you may not use this file except in compliance with the License.
//	You may obtain a copy of the License at
//
//		http://www.apache.org/licenses/LICENSE-2.0
//
//	Unless required by applicable law or agreed to in writing, software
//	distributed under the License is distributed on an "AS IS" BASIS,
//	WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//	See the License for the specific language governing permissions and
//	limitations under the License.
//! END_REPLACE()

(function() {
	var global = this;

	var exports = {};
	if (typeof process === 'object') {
		module.exports = exports;
	};
	
	exports.add = function add(DD_MODULES) {
		DD_MODULES = (DD_MODULES || {});
		DD_MODULES['Doodad.IO.Minifiers'] = {
			type: null,
			version: '0.2d',
			namespaces: null,
			dependencies: [
				{
					name: 'Doodad.IO',
					version: '0.2',
				}, 
			],

			create: function create(root, /*optional*/_options) {
				"use strict";

				var doodad = root.Doodad,
					mixIns = doodad.MixIns,
					types = doodad.Types,
					tools = doodad.Tools,
					io = doodad.IO,
					ioMixIns = io.MixIns,
					ioInterfaces = io.Interfaces,
					extenders = doodad.Extenders,
					minifiers = io.Minifiers;

					
				minifiers.REGISTER(io.Stream.$extend(
									ioMixIns.TextInput,
									ioMixIns.TextOutput,
				{
					$TYPE_NAME: 'Javascript',

					__listening: doodad.PROTECTED(false),
					__buffer: doodad.PROTECTED(null),
					__state: doodad.PROTECTED(null),

					__directiveValues: doodad.PROTECTED(null),
					__preparedDirectives: doodad.PROTECTED(null),
					
					__knownDirectives: doodad.PROTECTED({
						INSERT: function(str) {
							if (!this.__state.remove) {
								this.__state.buffer += str;
							};
						},
						EVAL: function(expr) {
							if (!this.__state.remove) {
								this.__state.injectedCode += String(tools.safeEval(expr, this.__directiveValues));
							};
						},
						TO_SOURCE: function(expr) {
							if (!this.__state.remove) {
								this.__state.injectedCode += String(types.toSource(tools.safeEval(expr, this.__directiveValues)));
							};
						},
						IF_EVAL: function(expr) {
							if (this.__state.isIfBlock) {
								throw new types.NotSupported("Nested 'IF' directives are not supported.");
							};
							this.__state.isIfBlock = true;
							this.__state.remove = !tools.safeEval(expr, this.__directiveValues);
						},
						IF_DEF: function(key) {
							if (this.__state.isIfBlock) {
								throw new types.NotSupported("Nested 'IF' directives are not supported.");
							};
							this.__state.isIfBlock = true;
							this.__state.remove = !types.hasKey(this.__directiveValues, key);
						},
						IF_UNDEF: function(key) {
							if (this.__state.isIfBlock) {
								throw new types.NotSupported("Nested 'IF' directives are not supported.");
							};
							this.__state.isIfBlock = true;
							this.__state.remove = types.hasKey(this.__directiveValues, key);
						},
						ELSE: function() {
							if (!this.__state.isIfBlock) {
								throw new types.Error("Invalid 'ELSE' directive.");
							};
							this.__state.remove = !this.__state.remove;
						},
						END_IF: function() {
							if (!this.__state.isIfBlock) {
								throw new types.Error("Invalid 'END_IF' directive.");
							};
							this.__state.isIfBlock = false;
							this.__state.remove = false;
						},
						DEFINE: function(key, /*optional*/value) {
							if (!this.__state.remove) {
								this.__directiveValues[key] = value;
							};
						},
						UNDEFINE: function(key) {
							if (!this.__state.remove) {
								delete this.__directiveValues[key];
							};
						},
						REPLACE_BY: function(str) {
							if (this.__state.isIfBlock) {
								throw new types.Error("Invalid 'REPLACE_BY' directive.");
							};
							if (!this.__state.remove) {
								this.__state.remove = true;
								this.__state.buffer += str;
							};
						},
						END_REPLACE: function(str) {
							if (!this.__state.remove || this.__state.isIfBlock) {
								throw new types.Error("Invalid 'END_REPLACE' directive.");
							};
							this.__state.remove = false;
						},
						BEGIN_REMOVE: function() {
							if (this.__state.isIfBlock) {
								throw new types.Error("Invalid 'BEGIN_REMOVE' directive.");
							};
							this.__state.remove = true;
						},
						END_REMOVE: function() {
							if (!this.__state.remove || this.__state.isIfBlock) {
								throw new types.Error("Invalid 'END_REMOVE' directive.");
							};
							this.__state.remove = false;
						},
					}),
			
					
					create: doodad.OVERRIDE(function create(/*optional*/options) {
						this._super(options);
						
						this.prepareDirectives();
						
						types.getDefault(this.options, 'runDirectives', false);

						this.reset();
					}),
					
					__clearState: doodad.PROTECTED(function() {
						this.__state = {
							isComment: false,
							isCommentBlock: false,
							isString: false,
							stringChr: '',
							isTemplate: false,
							isRegExp: false,
							isRegExpEnd: false,
							isCharSequence: false,
							ignoreRegExp: false,
							isEscaped: false,
							buffer: '',
							prevChr: '',
							isToken: false,
							token: '',
							sep: '',
							ignoreSep: true,
							
							isDirective: false,
							isDirectiveBlock: false,
							isIfBlock: false,
							directive: '',
							remove: false,
							
							isFor: false,
							level: 0,
							
							injectedCode: '',
						};
					}),
					
					reset: doodad.OVERRIDE(function reset() {
						this.__buffer = [];
						this.__listening = false;
						this.__clearState();
						this.__directiveValues = {};
						
						this._super();
					}),

					clear: doodad.OVERRIDE(function clear() {
						this.__buffer = [];
						
						this._super();
					}),

					isListening: doodad.OVERRIDE(function() {
						return this.__listening;
					}),
					
					listen: doodad.OVERRIDE(function(/*optional*/options) {
						this.__listening = true;
					}),
					
					stopListening: doodad.OVERRIDE(function() {
						this.__listening = false;
					}),

					read: doodad.OVERRIDE(function(/*optional*/options) {
						if (root.DD_ASSERT) {
							root.DD_ASSERT(types.isNothing(options) || types.isObject(options), "Invalid options.");
						};
						
						var count = types.get(options, 'count');

						if (root.DD_ASSERT) {
							root.DD_ASSERT(types.isNothing(count) || types.isInteger(count), "Invalid count.");
						};

						if (types.isNothing(count)) {
							return this.__buffer.shift();
						} else {
							return this.__buffer.splice(0, count);
						};
					}),
					
					getCount: doodad.OVERRIDE(function(/*optional*/options) {
						return this.__buffer.length;
					}),

					prepareDirectives: doodad.PROTECTED(function prepareDirectives() {
						var self = this,
							knownDirectives = this.__knownDirectives;
						var __preparedDirectives = this.__preparedDirectives = {};
						tools.forEach(knownDirectives, function(directive, name) {
							__preparedDirectives[name] = types.makeInside(self, directive);
						});
					}),
					
					runDirective: doodad.PUBLIC(function runDirective(directive) {
						tools.safeEval(directive, this.__preparedDirectives);
					}),
					
					define: doodad.PUBLIC(function define(name, value) {
						this.__preparedDirectives.DEFINE(name, value);
					}),
					
					undefine: doodad.PUBLIC(function undefine(name) {
						this.__preparedDirectives.UNDEFINE(name);
					}),
					
					write: doodad.OVERRIDE(function write(code, /*optional*/options) {
						// TODO: "String templates"
						// TODO: Minify variable names (don't forget "set" which is by scope)
						
						var data = {
							raw: code,
							options: options,
						};
						data = this.transform(data) || data;
						
						this.onWrite(new doodad.Event(data));
						
						var state = this.__state;

						function writeToken(/*optional*/noSep) {
							if (state.token.trim() === 'for') {
								state.isFor = true;
								state.level = 0;
							};
							if (!state.remove) {
								if (noSep) {
									state.buffer += state.token;
								} else {
									state.buffer += state.token + state.sep;
								};
							};
							if (!noSep) {
								state.sep = '';
							};
							state.token = '';
							state.isToken = false;
						};
						
						code = state.prevChr + data.valueOf();
						state.prevChr = '';
						analyseChunk: while (code) {
							if (state.isDirective || state.isDirectiveBlock) {
								var i = 0;
								nextCharDirective: while (i < code.length) {
									var chr = code[i];
									if (state.isDirectiveBlock && ((state.prevChr + chr) === '*/')) {
										if (state.directive.replace(/\t/g, ' ').trim()) {
											this.runDirective(state.directive);
										};
										state.prevChr = '';
										state.isDirectiveBlock = false;
										state.isDirective = false;
										state.directive = '';
										code = state.injectedCode + code.slice(i + 1);
										state.injectedCode = '';
										continue analyseChunk;
									} else if (state.prevChr) { // '*'
										state.directive += state.prevChr;
										state.prevChr = '';
										continue nextCharDirective;
									} else if (state.isDirectiveBlock && (chr === '*')) {
										// Wait next char
										state.prevChr = chr;
									} else if ((chr === '\n') || (chr === '\r')) {
										if (state.directive.replace(/\t/g, ' ').trim()) {
											this.runDirective(state.directive);
										};
										state.directive = '';
										if (!state.isDirectiveBlock) {
											state.prevChr = '';
											state.isDirective = false;
											code = state.injectedCode + code.slice(i);
											state.injectedCode = '';
											continue analyseChunk;
										};
									} else {
										state.directive += chr;
									};
									i++;
								};
								break analyseChunk;
							} else if (state.isComment) {
								for (var i = 0; i < code.length; i++) {
									var chr = code[i];
									if ((chr === '\n') || (chr === '\r')) {
										state.isComment = false;
										code = code.slice(i);
										continue analyseChunk;
									};
								};
								break analyseChunk;
							} else if (state.isCommentBlock) {
								var i = 0;
								nextCharCommentBlock: while (i < code.length) {
									var chr = code[i];
									if ((state.prevChr + chr) === '*/') {
										state.prevChr = '';
										state.isCommentBlock = false;
										code = code.slice(i + 1);
										continue analyseChunk;
									} else if (state.prevChr) { // '*'
										state.prevChr = '';
										continue nextCharCommentBlock;
									} else if (chr === '*') {
										// Wait next char
										state.prevChr = chr;
									};
									i++;
								};
								break analyseChunk;
							} else if (state.isString) {
								var i = 0;
								for (; i < code.length; i++) {
									var chr = code[i];
									if (state.isEscaped) {
										state.isEscaped = false;
									} else if (chr === '\\') {
										state.isEscaped = true;
									} else if (chr === state.stringChr) {
										state.isString = false;
										if (!state.remove) {
											state.buffer += code.slice(0, i + 1);
										};
										code = code.slice(i + 1);
										continue analyseChunk;
									};
								};
								if (i >= code.length) {
									if (!state.remove) {
										state.buffer += code;
									};
								};
								break analyseChunk;
							} else if (state.isRegExp) {
								var i = 0;
								for (; i < code.length; i++) {
									var chr = code[i],
										lowerChrAscii = chr.toLowerCase().charCodeAt(0);
									if (state.isEscaped) {
										state.isEscaped = false;
									} else if (chr === '\\') {
										state.isEscaped = true;
									} else if (state.isCharSequence) {
										if (chr === ']') {
											state.isCharSequence = false;
										};
									} else if (state.isRegExpEnd) {
										if ((lowerChrAscii < 97) || (lowerChrAscii > 122)) { // "a", "z"
											state.isRegExpEnd = false;
											state.isRegExp = false;
											if (!state.remove) {
												state.buffer += code.slice(0, i);
											};
											code = code.slice(i);
											continue analyseChunk;
										};
									} else if (chr === '[') {
										state.isCharSequence = true;
									} else if (chr === '/') {
										state.isRegExpEnd = true;
									};
								};
								if (i >= code.length) {
									if (!state.remove) {
										state.buffer += code;
									};
								};
								break analyseChunk;
							} else if (state.isTemplate) {
								throw new types.NotSupported("String templates not supported.");
							} else {
								var i = 0;
								nextChar: while (i < code.length) {
									var chr = code[i],
										ascii = chr.charCodeAt(0);
									if (((state.prevChr + chr) === '//') || ((state.prevChr + chr) === '/*')) {
										// Wait for the next char
										state.prevChr += chr;
										i++;
										continue nextChar;
									} else if (this.options.runDirectives && (((state.prevChr + chr) === '//!') || ((state.prevChr + chr) === '/*!'))) {
										writeToken(true);
										if ((state.prevChr + chr) === '/*!') {
											state.isDirectiveBlock = true;
										} else {
											state.isDirective = true;
										};
										state.prevChr = '';
										state.ignoreRegExp = false;
										state.ignoreSep = true;
										state.directive = '';
										code = code.slice(i + 1);
										continue analyseChunk;
									} else if ((state.prevChr + chr).slice(0, 2) === '//') {
										writeToken(true);
										state.prevChr = '';
										state.ignoreRegExp = false;
										state.ignoreSep = true;
										state.isComment = true;
										code = code.slice(i);
										continue analyseChunk;
									} else if ((state.prevChr + chr).slice(0, 2) === '/*') {
										writeToken(true);
										state.prevChr = '';
										state.ignoreRegExp = false;
										state.ignoreSep = true;
										state.isCommentBlock = true;
										code = code.slice(i);
										continue analyseChunk;
									} else if (!state.token && !state.ignoreRegExp && (state.prevChr === '/')) {
										writeToken();
										state.prevChr = '';
										if (!state.remove) {
											state.buffer += '/' + chr;
										};
										state.isRegExp = true;
										state.ignoreSep = false;
										code = code.slice(i + 1);
										continue analyseChunk;
									} else if (((ascii === 43) || (ascii === 45)) && ((state.prevChr + chr) === (chr + chr))) { // "++", "--"
										writeToken();
										state.prevChr = '';
										state.ignoreRegExp = false;
										if (!state.remove) {
											state.buffer += (chr + chr);
										};
									} else if (state.prevChr === '/') { // "/"
										writeToken();
										state.ignoreRegExp = false;
										state.ignoreSep = true;
										if (!state.remove) {
											state.buffer += state.prevChr;
										};
										state.prevChr = '';
										continue nextChar;
									} else if ((state.prevChr === '+') || (state.prevChr === '-')) { // "+", "-"
										state.sep = '';
										writeToken();
										state.ignoreRegExp = false;
										state.ignoreSep = true;
										if (!state.remove) {
											state.buffer += state.prevChr;
										};
										state.prevChr = '';
										continue nextChar;
									} else if ((ascii === 47) || (ascii === 43) || (ascii === 45)) { // "/", "+", "-"
										// Wait for the next char
										state.prevChr = chr;
										i++;
										continue nextChar;
									} else if ((ascii === 34) || (ascii === 39)) { // '"', "'"
										writeToken();
										state.ignoreRegExp = false;
										state.ignoreSep = false;
										state.isString = true;
										state.stringChr = chr;
										if (!state.remove) {
											state.buffer += chr;
										};
										code = code.slice(i + 1);
										continue analyseChunk;
									} else if (ascii === 96) { // "`"
										writeToken();
										state.ignoreRegExp = false;
										state.ignoreSep = false;
										state.isTemplate = true;
										if (!state.remove) {
											state.buffer += chr;
										};
										code = code.slice(i + 1);
										continue analyseChunk;
									} else if ((ascii === 10) || (ascii === 13) || (ascii === 32) || (ascii === 9) || (ascii === 59)) { // "\n", "\r", " ", "\t", ";"
										do {
											if ((state.isFor && (ascii === 59) && (state.level === 1)) || (!state.ignoreSep && ((ascii === 10) || (ascii === 13) || (ascii === 59)))) { // ";", "\n", "\r", ";"
												state.sep = ';';
											};
											i++;
											chr = code[i];
											if (i < code.length) {
												chr = code[i];
												ascii = chr.charCodeAt(0);
											} else {
												break;
											};
										} while ((ascii === 10) || (ascii === 13) || (ascii === 32) || (ascii === 9) || (ascii === 59)); // "\n", "\r", " ", "\t", ";"
										state.isToken = false;
										continue nextChar;
									} else if (((ascii >= 65) && (ascii <= 90)) || ((ascii >= 97) && (ascii <= 122)) || ((ascii >= 48) && (ascii <= 57)) || (ascii === 36) || (ascii === 95)) { // "A-Z", "a-z", "0-9", "$", "_"
										if (!state.isToken) {
											if (state.token && !state.sep && !state.ignoreSep) {
												state.token += ' ';
											};
											writeToken();
										};
										state.isToken = true;
										state.ignoreSep = false;
										do {
											state.token += chr;
											i++;
											if (i < code.length) {
												chr = code[i];
												ascii = chr.charCodeAt(0);
											} else {
												break;
											};
										} while (((ascii >= 65) && (ascii <= 90)) || ((ascii >= 97) && (ascii <= 122)) || ((ascii >= 48) && (ascii <= 57)) || (ascii === 36) || (ascii === 95)) // "A-Z", "a-z", "0-9", "$", "_"
										continue nextChar;
									} else if ((ascii === 125) || (ascii === 41) || (ascii === 93)) { // "}", ")", "]"
										if (!state.isFor || (state.level > 1)) {
											state.sep = '';
										};
										if ((ascii === 41) && state.isFor) { // ")"
											state.level--;
											if (state.level <= 0) {
												state.level = 0;
												state.isFor = false;
											};
										};
										writeToken();
										state.ignoreRegExp = true;
										state.ignoreSep = false;
										if (!state.remove) {
											state.buffer += chr;
										};
									} else { // TOKEN+OP+TOKEN : "=", "==", "===", "!=", "!==", "%", "*", "&", "^", "^=", "&=", "|", "|=", "&&", "||", "^", '<', '>', '<=', '>=', '<<', '>>', '<<=', '>>=', '>>>=', '<<<', '>>>', '.', ',', '+=', '-=', '*=', '/=', '%=', '**', '**=', "?", ":"
											 // OP+TOKEN       : "!", "~"
											 // "{", "(", "["
										if ((ascii !== 33) && (ascii !== 126) && (!state.isFor || (state.level > 1))) { // "!", "~"
											state.sep = '';
										};
										writeToken();
										state.ignoreRegExp = false;
										if ((ascii === 40) && state.isFor) { // "("
											state.level++;
										};
										state.ignoreSep = true;
										if (!state.remove) {
											state.buffer += chr;
										};
									};
									i++;
								};
								break analyseChunk;
							};
						};

						var value = data.valueOf();
						
						if (value === io.EOF) {
							writeToken();
						};

						
						// TODO: Review
						var bufferSize = this.options.bufferSize,
							callback = types.get(options, 'callback');

						var writeEOF = function writeEOF() {
							if (value === io.EOF) {
								this.__clearState();
								var newData = {
									raw: io.EOF,
								};
								newData = this.transform(newData) || newData;
								if (this.options.autoFlush) {
									this.__buffer.push(newData.valueOf());
									this.flush(types.extend({}, options, {
										callback: function() {
											if (callback) {
												callback();
											};
										},
									}));
								} else if (this.__buffer.length < bufferSize) {
									if (this.__listening) {
										var ev = new doodad.Event(newData);
										this.onReady(ev);
										if (!ev.prevent) {
											this.__buffer.push(newData.valueOf());
										};
									} else {
										this.__buffer.push(newData.valueOf());
									};
									if (callback) {
										callback();
									};
								} else {
									throw new types.BufferOverflow();
								};
							} else {
								if (callback) {
									callback();
								};
							};
						};
							
						if (state.buffer) {
							var newData = {
								raw: state.buffer,
							};
							state.buffer = '';
							newData = this.transform(newData) || newData;
							if (this.options.autoFlush) {
								this.__buffer.push(newData.valueOf());
								if (this.__buffer.length >= bufferSize) {
									this.flush(types.extend({}, options, {
										callback: new doodad.Callback(this, writeEOF),
									}));
								} else {
									writeEOF.call(this);
								};
							} else if (this.__buffer.length < bufferSize) {
								if (this.__listening) {
									var ev = new doodad.Event(newData);
									this.onReady(ev);
									if (!ev.prevent) {
										this.__buffer.push(newData.valueOf());
									};
								} else {
									this.__buffer.push(newData.valueOf());
								};
								writeEOF.call(this);
							} else {
								throw new types.BufferOverflow();
							};
						} else {
							writeEOF.call(this);
						};
					}),
					
					flush: doodad.OVERRIDE(function flush(/*optional*/options) {
						var callback = types.get(options, 'callback');
						
						if (this.__listening) {
							var data;
							while (data = this.__buffer.shift()) {
								var ev = new doodad.Event(data);
								this.onReady(ev);
							};
						} else {
							this.__buffer = [];
						};
						
						this.onFlush(new doodad.Event({
							options: options,
						}));
						
						if (callback) {
							callback();
						};
					}),
				}));
					
					
					
				//return function init(/*optional*/options) {
				//};
			},
		};
		
		return DD_MODULES;
	};
	
	if (typeof process !== 'object') {
		// <PRB> export/import are not yet supported in browsers
		global.DD_MODULES = exports.add(global.DD_MODULES);
	};
}).call((typeof global !== 'undefined') ? global : ((typeof window !== 'undefined') ? window : this));