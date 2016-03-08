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
			version: '0.3.0d',
			namespaces: null,
			dependencies: [
				{
					name: 'Doodad.Tools.Locale',
					version: '1.3.0',
				}, 
				{
					name: 'Doodad.Tools.Unicode',
					version: '0.1.0',
				}, 
				{
					name: 'Doodad.Tools.SafeEval',
					version: '0.1.0',
				}, 
				{
					name: 'Doodad.IO',
					version: '0.4.0',
				}, 
			],

			create: function create(root, /*optional*/_options) {
				"use strict";

				var doodad = root.Doodad,
					mixIns = doodad.MixIns,
					types = doodad.Types,
					tools = doodad.Tools,
					safeEval = tools.SafeEval,
					locale = tools.Locale,
					unicode = tools.Unicode,
					io = doodad.IO,
					ioMixIns = io.MixIns,
					ioInterfaces = io.Interfaces,
					extenders = doodad.Extenders,
					minifiers = io.Minifiers;

					
				//var __Internal__ = {
				//};
				

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
								this.__state.injectedCode += String(safeEval.eval(expr, this.__directiveValues));
							};
						},
						TO_SOURCE: function(expr) {
							if (!this.__state.remove) {
								this.__state.injectedCode += String(types.toSource(safeEval.eval(expr, this.__directiveValues)));
							};
						},
						IF_EVAL: function(expr) {
							if (this.__state.isIfBlock) {
								throw new types.NotSupported("Nested 'IF' directives are not supported.");
							};
							this.__state.isIfBlock = true;
							this.__state.remove = !safeEval.eval(expr, this.__directiveValues);
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
							explicitSep: false,
							isTemplateExpression: false,
							braceLevel: 0,
							braceLevelStack: [],
							
							isDirective: false,
							isDirectiveBlock: false,
							isIfBlock: false,
							directive: '',
							remove: false,
							
							isFor: false,
							forLevel: 0,
							
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
						safeEval.eval(directive, this.__preparedDirectives);
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
								state.forLevel = 0;
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
								state.explicitSep = false;
							};
							state.token = '';
							state.isToken = false;
						};
						
						var curLocale = locale.getCurrent();
						
						code = state.prevChr + data.valueOf();
						state.prevChr = '';
						analyseChunk: while (code) {
							if (state.isDirective || state.isDirectiveBlock) {
								var chr = unicode.nextChar(code);
								nextCharDirective: while (chr) {
									if (chr.codePoint < 0) {
										// Incomplete Unicode sequence
										break analyseChunk;
									};
									if (state.isDirectiveBlock && ((state.prevChr + chr.chr) === '*/')) {
										if (state.directive.replace(/\t/g, ' ').trim()) {
											this.runDirective(state.directive);
										};
										state.prevChr = '';
										state.isDirectiveBlock = false;
										state.isDirective = false;
										state.directive = '';
										code = state.injectedCode + code.slice(chr.index + chr.size);
										state.injectedCode = '';
										continue analyseChunk;
									} else if (state.prevChr) { // '*'
										state.directive += state.prevChr;
										state.prevChr = '';
										continue nextCharDirective;
									} else if (state.isDirectiveBlock && (chr.chr === '*')) {
										// Wait next char
										state.prevChr = chr.chr;
									} else if ((chr.chr === '\n') || (chr.chr === '\r')) {
										if (state.directive.replace(/\t/g, ' ').trim()) {
											this.runDirective(state.directive);
										};
										state.directive = '';
										if (!state.isDirectiveBlock) {
											state.prevChr = '';
											state.isDirective = false;
											code = state.injectedCode + code.slice(chr.index + chr.size);
											state.injectedCode = '';
											continue analyseChunk;
										};
									} else {
										state.directive += chr.chr;
									};
									chr = chr.nextChar();
								};
								break analyseChunk;
							} else if (state.isComment) {
								var chr = unicode.nextChar(code);
								while (chr) {
									if (chr.codePoint < 0) {
										// Incomplete Unicode sequence
										break analyseChunk;
									};
									if ((chr.chr === '\n') || (chr.chr === '\r')) {
										state.isComment = false;
										code = code.slice(chr.index + chr.size);
										continue analyseChunk;
									};
									chr = chr.nextChar();
								};
								break analyseChunk;
							} else if (state.isCommentBlock) {
								var chr = unicode.nextChar(code);
								nextCharCommentBlock: while (chr) {
									if (chr.codePoint < 0) {
										// Incomplete Unicode sequence
										break analyseChunk;
									};
									if ((state.prevChr + chr.chr) === '*/') {
										state.prevChr = '';
										state.isCommentBlock = false;
										code = code.slice(chr.index + chr.size);
										continue analyseChunk;
									} else if (state.prevChr) { // '*'
										state.prevChr = '';
										continue nextCharCommentBlock;
									} else if (chr.chr === '*') {
										// Wait next char
										state.prevChr = chr.chr;
									};
									chr = chr.nextChar();
								};
								break analyseChunk;
							} else if (state.isString || state.isTemplate) {
								var chr = unicode.nextChar(code);
								nextChar: while (chr) {
									if (chr.codePoint < 0) {
										// Incomplete Unicode sequence
										break analyseChunk;
									};
									if (state.isString && ((chr.chr === '\n') || (chr.chr === '\r'))) {
										// NOTE: "new line" can be "\r\n" or "\n\r", so there is no condition on "state.isEscaped"
										// Multi-Line String. New line is removed. It assumes new line is escaped because otherwise it is a synthax error.
										// Exemple :
										//     var a = "Hello \
										//     world !"
										if (!state.remove) {
											state.buffer += code.slice(0, chr.index);
										};
										code = code.slice(chr.index + chr.size);
										continue analyseChunk;
									} else if (state.isEscaped) {
										// Skip escaped character.
										state.isEscaped = false;
									} else if (chr.chr === '\\') {
										// Character escape. Will skip the following character in case it is "'", '"' or "`". Other escapes ("\n", "\u...", ...) are not harmfull.
										state.isEscaped = true;
									} else if (state.isTemplate && ((state.prevChr + chr.chr) === '${')) {
										state.isTemplate = false;
										state.isTemplateExpression = true;
										state.braceLevelStack.push(state.braceLevel);
										state.braceLevel = 0;
										state.ignoreSep = true;
										if (!state.remove) {
											state.buffer += code.slice(0, chr.index + chr.size);
										};
										code = code.slice(chr.index + chr.size);
										continue analyseChunk;
									} else if (state.isTemplate && (chr.chr === '$')) {
										state.prevChr = chr.chr;
									} else if (chr.chr === state.stringChr) {
										state.isString = false;
										state.isTemplate = false;
										if (!state.remove) {
											state.buffer += code.slice(0, chr.index + chr.size);
										};
										code = code.slice(chr.index + chr.size);
										continue analyseChunk;
									};
									state.prevChr = '';
									chr = chr.nextChar();
								};
								if (!chr) {
									if (!state.remove) {
										state.buffer += code;
									};
								};
								break analyseChunk;
							} else if (state.isRegExp) {
								var chr = unicode.nextChar(code);
								while (chr) {
									if (chr.codePoint < 0) {
										// Incomplete Unicode sequence
										break analyseChunk;
									};
									var lowerChrAscii = unicode.codePointAt(chr.chr.toLowerCase(), 0)[0];
									if (state.isEscaped) {
										state.isEscaped = false;
									} else if (chr.chr === '\\') {
										state.isEscaped = true;
									} else if (state.isCharSequence) {
										if (chr.chr === ']') {
											state.isCharSequence = false;
										};
									} else if (state.isRegExpEnd) {
										if ((lowerChrAscii < 97) || (lowerChrAscii > 122)) { // "a", "z"
											state.isRegExpEnd = false;
											state.isRegExp = false;
											if (!state.remove) {
												state.buffer += code.slice(0, chr.index);
											};
											code = code.slice(chr.index);
											continue analyseChunk;
										};
									} else if (chr.chr === '[') {
										state.isCharSequence = true;
									} else if (chr.chr === '/') {
										state.isRegExpEnd = true;
									};
									chr = chr.nextChar();
								};
								if (!chr) {
									if (!state.remove) {
										state.buffer += code;
									};
								};
								break analyseChunk;
							} else {
								var chr = unicode.nextChar(code);
								nextChar: while (chr) {
									if (chr.codePoint < 0) {
										// Incomplete Unicode sequence
										break analyseChunk;
									};
									if (((state.prevChr + chr.chr) === '//') || ((state.prevChr + chr.chr) === '/*')) {
										// Wait for the next char
										state.prevChr += chr.chr;
										chr = chr.nextChar();
										continue nextChar;
									} else if (this.options.runDirectives && (((state.prevChr + chr.chr) === '//!') || ((state.prevChr + chr.chr) === '/*!'))) {
										writeToken(true);
										if ((state.prevChr + chr.chr) === '/*!') {
											state.isDirectiveBlock = true;
										} else {
											state.isDirective = true;
										};
										state.prevChr = '';
										state.ignoreRegExp = false;
										state.ignoreSep = true;
										state.directive = '';
										code = code.slice(chr.index + chr.size);
										continue analyseChunk;
									} else if ((state.prevChr + chr.chr).slice(0, 2) === '//') {
										writeToken(true);
										state.prevChr = '';
										state.ignoreRegExp = false;
										state.ignoreSep = true;
										state.isComment = true;
										code = code.slice(chr.index + chr.size);
										continue analyseChunk;
									} else if ((state.prevChr + chr.chr).slice(0, 2) === '/*') {
										writeToken(true);
										state.prevChr = '';
										state.ignoreRegExp = false;
										state.ignoreSep = true;
										state.isCommentBlock = true;
										code = code.slice(chr.index + chr.size);
										continue analyseChunk;
									} else if (!state.token && !state.ignoreRegExp && (state.prevChr === '/')) {
										writeToken();
										state.prevChr = '';
										if (!state.remove) {
											state.buffer += '/' + chr.chr;
										};
										state.isRegExp = true;
										state.ignoreSep = false;
										code = code.slice(chr.index + chr.size);
										continue analyseChunk;
									} else if (((chr.codePoint === 43) || (chr.codePoint === 45)) && ((state.prevChr + chr.chr) === (chr.chr + chr.chr))) { // "++", "--"
										writeToken();
										state.prevChr = '';
										state.ignoreRegExp = false;
										if (!state.remove) {
											state.buffer += (chr.chr + chr.chr);
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
									} else if ((chr.codePoint === 47) || (chr.codePoint === 43) || (chr.codePoint === 45)) { // "/", "+", "-"
										// Wait for the next char
										state.prevChr = chr.chr;
										chr = chr.nextChar();
										continue nextChar;
									} else if ((chr.codePoint === 34) || (chr.codePoint === 39)) { // '"', "'"
										writeToken();
										state.ignoreRegExp = false;
										state.ignoreSep = false;
										state.isString = true;
										state.stringChr = chr.chr;
										if (!state.remove) {
											state.buffer += chr.chr;
										};
										code = code.slice(chr.index + chr.size);
										continue analyseChunk;
									} else if (chr.codePoint === 96) { // "`"
										writeToken();
										state.ignoreRegExp = false;
										state.ignoreSep = false;
										state.isTemplate = true;
										state.stringChr = chr.chr;
										if (!state.remove) {
											state.buffer += chr.chr;
										};
										code = code.slice(chr.index + chr.size);
										continue analyseChunk;
									} else if ((chr.codePoint === 59) || unicode.isSpace(chr.chr, curLocale)) { // ";", "{space}"
										do {
											if ((state.isFor && (chr.codePoint === 59) && (state.forLevel === 1)) || (!state.ignoreSep && ((chr.codePoint === 10) || (chr.codePoint === 13) || (chr.codePoint === 59)))) { // ";", "\n", "\r", ";"
												if (chr.codePoint === 59) { // ";"
													state.explicitSep = true;
												};
												state.sep = ';';
											};
											chr = chr.nextChar();
											if (chr) {
												if (chr.codePoint < 0) {
													// Incomplete Unicode sequence
													break analyseChunk;
												};
											} else {
												break;
											};
										} while ((chr.codePoint === 59) || unicode.isSpace(chr.chr, curLocale)) // ";", "{space}"
										state.isToken = false;
										continue nextChar;
									} else if ((chr.codePoint === 36) || (chr.codePoint === 95) || unicode.isAlnum(chr.chr, curLocale)) { // "$", "_", "{alnum}"
										if (!state.isToken) {
											if (state.token && !state.sep && !state.ignoreSep) {
												state.token += ' ';
											};
											writeToken();
										};
										state.isToken = true;
										state.ignoreSep = false;
										do {
											state.token += chr.chr;
											chr = chr.nextChar();
											if (chr) {
												if (chr.codePoint < 0) {
													// Incomplete Unicode sequence
													break analyseChunk;
												};
											} else {
												break;
											};
										} while ((chr.codePoint === 36) || (chr.codePoint === 95) || unicode.isAlnum(chr.chr, curLocale)) // "$", "_", "{alnum}"
										continue nextChar;
									} else if ((chr.codePoint === 125) || (chr.codePoint === 41) || (chr.codePoint === 93)) { // "}", ")", "]"
										if (!state.isFor || (state.forLevel > 1)) {
											state.sep = '';
										};
										if ((chr.codePoint === 41) && state.isFor) { // ")"
											state.forLevel--;
											if (state.forLevel <= 0) {
												state.forLevel = 0;
												state.isFor = false;
											};
										} else if (chr.codePoint === 125) { // "}"
											state.braceLevel--;
											if (state.braceLevel <= 0) {
												if (state.isTemplateExpression) {
													state.braceLevel = state.braceLevelStack.pop() || 0;
													writeToken();
													state.ignoreRegExp = false;
													state.ignoreSep = false;
													state.isTemplate = true;
													state.isTemplateExpression = false;
													state.stringChr = '`';
													if (!state.remove) {
														state.buffer += chr.chr;
													};
													code = code.slice(chr.index + chr.size);
													continue analyseChunk;
												} else {
													state.braceLevel = 0;
												};
											};
										};
										writeToken();
										state.ignoreRegExp = true;
										state.ignoreSep = false;
										if (!state.remove) {
											state.buffer += chr.chr;
										};
									} else { // TOKEN+OP+TOKEN : "=", "==", "===", "!=", "!==", "%", "*", "&", "^", "^=", "&=", "|", "|=", "&&", "||", "^", '<', '>', '<=', '>=', '<<', '>>', '<<=', '>>=', '>>>=', '<<<', '>>>', '.', ',', '+=', '-=', '*=', '/=', '%=', '**', '**=', "?", ":"
											 // OP+TOKEN       : "!", "~"
											 // "{", "(", "["
											 // ",", "."
										if ((chr.codePoint !== 33) && (chr.codePoint !== 126) && (!state.isFor || (state.forLevel > 1))) { // "!", "~"
											if (!state.explicitSep || ((chr.codePoint !== 123) && (chr.codePoint !== 40) && (chr.codePoint !== 91))) { // "{", "(", "["
												state.sep = '';
											};
										};

										writeToken();
										state.ignoreRegExp = false;
										if ((chr.codePoint === 40) && state.isFor) { // "("
											state.forLevel++;
										} else if (chr.codePoint === 123) { // "{"
											state.braceLevel++;
										};
										state.ignoreSep = true;
										if (!state.remove) {
											state.buffer += chr.chr;
										};
									};
									chr = chr.nextChar();
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