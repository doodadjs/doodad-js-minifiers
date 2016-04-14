//! REPLACE_BY("// Copyright 2016 Claude Petit, licensed under Apache License version 2.0\n", true)
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
	
	//! BEGIN_REMOVE()
	if ((typeof process === 'object') && (typeof module === 'object')) {
	//! END_REMOVE()
		//! IF_DEF("serverSide")
			module.exports = exports;
		//! END_IF()
	//! BEGIN_REMOVE()
	};
	//! END_REMOVE()
	
	exports.add = function add(DD_MODULES) {
		DD_MODULES = (DD_MODULES || {});
		DD_MODULES['Doodad.IO.Minifiers'] = {
			version: /*! REPLACE_BY(TO_SOURCE(VERSION(MANIFEST("name")))) */ null /*! END_REPLACE() */,

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
					nodejs = doodad.NodeJs,
					nodejsIO = nodejs && nodejs.IO,
					nodejsIOInterfaces = nodejsIO && nodejsIO.Interfaces,
					minifiers = io.Minifiers;

					
				//var __Internal__ = {
				//};
				

				minifiers.REGISTER(io.Stream.$extend(
									ioMixIns.TextInput,
									ioMixIns.TextOutput,
									/*optional*/ nodejsIOInterfaces && nodejsIOInterfaces.ITransform,
				{
					$TYPE_NAME: 'Javascript',

					__listening: doodad.PROTECTED(false),
					__buffer: doodad.PROTECTED(null),
					__state: doodad.PROTECTED(null),

					__knownDirectives: doodad.PROTECTED(doodad.ATTRIBUTE({
						DEFINE: function(key, /*optional*/value) {
							if (this.memorize <= 0) {
								this.variables[key] = value;
							};
						},
						UNDEFINE: function(key) {
							if (this.memorize <= 0) {
								delete this.variables[key];
							};
						},
						VAR: function(key) {
							if (this.memorize <= 0) {
								//var tmp = key.split('.', 2);
								//if (types.hasKey(tmp[0], this.variables)) {
									return safeEval.eval(key, this.variables)
								//};
							};
						},
						TO_SOURCE: function(val, /*optional*/depth) {
							if (this.memorize <= 0) {
								return types.toSource(val, depth);
							};
						},
						INJECT: function(code, /*optional*/raw) {
							if (this.memorize <= 0) {
								code = String(code) + (raw ? '' : '\n');
								if (raw) {
									this.writeCode(code);
								} else {
									var isDirective = this.isDirective,
										isDirectiveBlock = this.isDirectiveBlock,
										directive = this.directive;
										
									this.isDirective = false;
									this.isDirectiveBlock = false;
									this.directive = '';
										
									this.parseCode(code);
									
									this.isDirective = isDirective;
									this.isDirectiveBlock = isDirectiveBlock;
									this.directive = directive;
								};
							};
						},
						IF: function(expr) {
							this.pushDirective({
								name: 'IF',
								remove: !expr,
							});
						},
						IF_DEF: function(key) {
							this.pushDirective({
								name: 'IF',
								remove: !types.hasKey(this.variables, key),
							});
						},
						IF_UNDEF: function(key) {
							this.pushDirective({
								name: 'IF',
								remove: types.hasKey(this.variables, key),
							});
						},
						ELSE: function() {
							var block = this.popDirective();
							if (!block || (block.name !== 'IF')) {
								throw new types.Error("Invalid 'ELSE' directive.");
							};
							this.pushDirective({
								name: 'IF',
								remove: !block.remove,
							});
						},
						END_IF: function() {
							var block = this.popDirective();
							if (!block || (block.name !== 'IF')) {
								throw new types.Error("Invalid 'END_IF' directive.");
							};
						},
						REPLACE_BY: function(code, /*optional*/raw) {
							this.pushDirective({
								name: 'REPLACE',
								remove: true,
								code: code,
								raw: raw,
							});
						},
						END_REPLACE: function() {
							var block = this.popDirective();
							if (!block || (block.name !== 'REPLACE')) {
								throw new types.Error("Invalid 'END_REPLACE' directive.");
							};
							this.directives.INJECT(block.code, block.raw);
						},
						BEGIN_REMOVE: function() {
							this.pushDirective({
								name: 'REMOVE',
								remove: true,
							});
						},
						END_REMOVE: function() {
							var block = this.popDirective();
							if (!block || (block.name !== 'REMOVE')) {
								throw new types.Error("Invalid 'END_REMOVE' directive.");
							};
						},
						FOR_EACH: function(iter, varName) {
							if (this.memorize <= 0) {
								this.writeToken();
							};
							this.pushDirective({
								name: 'FOR',
								iter: iter,
								varName: varName,
							});
							this.memorize++;
							this.directive = '';
						},
						END_FOR: function() {
							var block = this.popDirective();
							if (!block || (block.name !== 'FOR')) {
								throw new types.Error("Invalid 'END_FOR' directive.");
							};
							this.memorize--;
							if (this.memorize <= 0) {
								var memorizedCode = this.memorizedCode;
								this.memorizedCode = '';
								if (memorizedCode) {
									var self = this;
									tools.forEach(block.iter, function(item) {
										self.directives.DEFINE(block.varName, item);
										self.directives.INJECT(memorizedCode + '\n');
									});
								};
							};
						},
						MAP: function(iter, varName) {
							if (this.memorize <= 0) {
								this.writeToken();
							};
							this.pushDirective({
								name: 'MAP',
								iter: iter,
								varName: varName,
							});
							this.memorize++;
							this.directive = '';
						},
						END_MAP: function() {
							var block = this.popDirective();
							if (!block || (block.name !== 'MAP')) {
								throw new types.Error("Invalid 'END_MAP' directive.");
							};
							this.memorize--;
							if (this.memorize <= 0) {
								var memorizedCode = this.memorizedCode;
								this.memorizedCode = '';
								if (memorizedCode) {
									var items = types.values(block.iter);
									for (var i = 0; i < items.length; i++) {
										this.directives.DEFINE(block.varName, items[i]);
										this.directives.INJECT(memorizedCode + (i < items.length - 1 ? ',' : ''));
									};
								};
							};
						},
					}, extenders.ExtendObject)),
			
					
					create: doodad.OVERRIDE(function create(/*optional*/options) {
						this._super(options);
						
						types.getDefault(this.options, 'runDirectives', false);

						this.reset();
					}),
					
					__clearState: doodad.PROTECTED(function() {
						var state = {
							options: this.options,
							variables: {},
							directives: {},
							
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
							
							token: '',
							hasSep: true, //false,
							sep: '',
							explicitSep: false,
							newLine: false,
							endBrace: false,
							
							isTemplateExpression: false,
							isFor: false,
							braceLevel: 0,
							parentheseLevel: 0,
							levelStack: [],
							pushLevel: function pushLevel() {
								this.levelStack.push({
									isTemplate: this.isTemplate,
									isTemplateExpression: this.isTemplateExpression,
									isFor: this.isFor,
									braceLevel: this.braceLevel, 
									parentheseLevel: this.parentheseLevel,
								});
								this.isTemplate = false;
								this.isTemplateExpression = false;
								this.isFor = false;
								this.braceLevel = 0;
								this.parentheseLevel = 0;
							},
							popLevel: function popLevel() {
								var level = this.levelStack.pop() || {};
								this.isTemplate = level.isTemplate || false;
								this.isTemplateExpression = level.isTemplateExpression || false;
								this.isFor = level.isFor || false;
								this.braceLevel = level.braceLevel || 0;
								this.parentheseLevel = level.parentheseLevel || 0;
							},
							
							isDirective: false,
							isDirectiveBlock: false,
							directive: '',
							directiveStack: [{
								name: '',
								remove: false,
							}],
							getDirective: function getDirective() {
								return this.directiveStack[0];
							},
							pushDirective: function pushDirective(newBlock) {
								var block = this.getDirective();
								newBlock.remove = newBlock.remove || block.remove;
								if (newBlock.remove) {
									newBlock.token = this.token;
									newBlock.sep = this.sep;
									newBlock.explicitSep = this.explicitSep;
									newBlock.hasSep = this.hasSep;
									newBlock.newLine = this.newLine;
									newBlock.endBrace = this.endBrace;
								};
								this.directiveStack.unshift(newBlock);
							},
							popDirective: function popDirective() {
								if (this.directiveStack <= 1) {
									return null;
								};
								var block = this.directiveStack.shift();
								if (block.remove) {
									this.token = block.token;
									this.sep = block.sep;
									this.explicitSep = block.explicitSep;
									this.hasSep = block.hasSep;
									this.newLine = block.newLine;
									this.endBrace = block.endBrace;
								};
								return block;
							},
							
							memorize: 0,
							memorizedCode: '',
							
							writeCode: function writeCode(code) {
								if (this.memorize) {
									this.memorizedCode += code;
								} else if (!this.getDirective().remove) {
									this.buffer += code;
								};
								this.ignoreRegExp = false;
								this.hasSep = false;
							},
							writeToken: function writeToken(/*optional*/noSep) {
								if (this.token === 'for') {
									this.pushLevel();
									this.isFor = true;
								};
								if (noSep || this.hasSep) {
									this.writeCode(this.token);
								} else {
									this.writeCode(this.token + this.sep);
								};
								this.token = '';
								this.sep = '';
								this.explicitSep = false;
								this.newLine = false;
								this.endBrace = false;
								this.hasSep = true;
							},
							
							parseCode: function(code) {
								var curLocale = locale.getCurrent();

								code = (this.prevChr || '') + code;
								this.prevChr = '';

								analyseChunk: while (code) {
									var chr = unicode.nextChar(code);
									if (this.isDirective || this.isDirectiveBlock) {
										nextCharDirective: while (chr) {
											if (!chr.complete) {
												// Incomplete Unicode sequence
												break analyseChunk;
											};
											if (this.isDirectiveBlock && ((this.prevChr + chr.chr) === '*/')) {
												this.isDirectiveBlock = false;
												this.prevChr = '';
												this.directive = tools.trim(this.directive.replace(/\s/g, ' '));
												if (this.directive) {
													safeEval.eval(this.directive, this.directives);
													if ((this.memorize > 0) && this.directive) {
														this.memorizedCode += '/*!' + this.directive + '*/';
													};
												};
												this.directive = '';
												code = code.slice(chr.index + chr.size);
												continue analyseChunk;
											} else if (this.prevChr) { // '*'
												this.directive += this.prevChr;
												this.prevChr = '';
												continue nextCharDirective;
											} else if (this.isDirectiveBlock && (chr.chr === '*')) {
												// Wait next char
												this.prevChr = chr.chr;
											} else if ((chr.chr === '\n') || (chr.chr === '\r')) {
												this.isDirective = false;
												this.prevChr = '';
												this.directive = tools.trim(this.directive.replace(/\s/g, ' '));
												if (this.directive) {
													safeEval.eval(this.directive, this.directives);
													if ((this.memorize > 0) && this.directive) {
														this.memorizedCode += '/*!' + this.directive + '*/';
													};
												};
												this.directive = '';
												if (!this.isDirectiveBlock) {
													code = code.slice(chr.index + chr.size);
													continue analyseChunk;
												};
											} else {
												this.directive += chr.chr;
											};
											chr = chr.nextChar();
										};
										break analyseChunk;
									} else if (this.isComment) {
										while (chr) {
											if (!chr.complete) {
												// Incomplete Unicode sequence
												break analyseChunk;
											};
											if ((chr.chr === '\n') || (chr.chr === '\r')) {
												this.isComment = false;
												code = code.slice(chr.index);
												continue analyseChunk;
											};
											chr = chr.nextChar();
										};
										break analyseChunk;
									} else if (this.isCommentBlock) {
										nextCharCommentBlock: while (chr) {
											if (!chr.complete) {
												// Incomplete Unicode sequence
												break analyseChunk;
											};
											if ((this.prevChr + chr.chr) === '*/') {
												this.prevChr = '';
												this.isCommentBlock = false;
												code = code.slice(chr.index + chr.size);
												continue analyseChunk;
											} else if (this.prevChr) { // '*'
												this.prevChr = '';
												continue nextCharCommentBlock;
											} else if (chr.chr === '*') {
												// Wait next char
												this.prevChr = chr.chr;
											};
											chr = chr.nextChar();
										};
										break analyseChunk;
									} else if (this.isString || this.isTemplate) {
										nextChar: while (chr) {
											if (!chr.complete) {
												// Incomplete Unicode sequence
												break analyseChunk;
											};
											if (this.isString && ((chr.chr === '\n') || (chr.chr === '\r'))) {
												// NOTE: "new line" can be "\r\n" or "\n\r", so there is no condition on "this.isEscaped"
												// Multi-Line String. New line is removed. It assumes new line is escaped because otherwise it is a synthax error.
												// Exemple :
												//     var a = "Hello \
												//     world !"
												this.writeCode(code.slice(0, chr.index));
												code = code.slice(chr.index + chr.size);
												continue analyseChunk;
											} else if (this.isEscaped) {
												// Skip escaped character.
												this.isEscaped = false;
											} else if (chr.chr === '\\') {
												// Character escape. Will skip the following character in case it is "'", '"' or "`". Other escapes ("\n", "\u...", ...) are not harmfull.
												this.isEscaped = true;
											} else if (this.isTemplate && ((this.prevChr + chr.chr) === '${')) {
												this.pushLevel();
												this.isTemplateExpression = true;
												this.writeCode(code.slice(0, chr.index + chr.size));
												code = code.slice(chr.index + chr.size);
												continue analyseChunk;
											} else if (this.isTemplate && (chr.chr === '$')) {
												this.prevChr = chr.chr;
											} else if (chr.chr === this.stringChr) {
												this.isString = false;
												this.isTemplate = false;
												this.writeCode(code.slice(0, chr.index + chr.size));
												code = code.slice(chr.index + chr.size);
												continue analyseChunk;
											};
											this.prevChr = '';
											chr = chr.nextChar();
										};
										if (!chr) {
											this.writeCode(code);
										};
										break analyseChunk;
									} else if (this.isRegExp) {
										while (chr) {
											if (!chr.complete) {
												// Incomplete Unicode sequence
												break analyseChunk;
											};
											if (this.isEscaped) {
												this.isEscaped = false;
											} else if (chr.chr === '\\') {
												this.isEscaped = true;
											} else if (this.isCharSequence) {
												if (chr.chr === ']') {
													this.isCharSequence = false;
												};
											} else if (this.isRegExpEnd) {
												// Flags
												var lowerChrAscii = unicode.codePointAt(chr.chr.toLowerCase(), 0).codePoint;
												if ((lowerChrAscii < 97) || (lowerChrAscii > 122)) { // "a", "z"
													this.isRegExpEnd = false;
													this.isRegExp = false;
													this.writeCode(code.slice(0, chr.index));
													code = code.slice(chr.index);
													continue analyseChunk;
												};
											} else if (chr.chr === '[') {
												this.isCharSequence = true;
											} else if (chr.chr === '/') {
												this.isRegExpEnd = true;
											};
											chr = chr.nextChar();
										};
										if (!chr) {
											this.writeCode(code);
										};
										break analyseChunk;
									} else {
										nextChar: while (chr) {
											if (!chr.complete) {
												// Incomplete Unicode sequence
												break analyseChunk;
											};
											if (((this.prevChr + chr.chr) === '//') || ((this.prevChr + chr.chr) === '/*')) {
												// Wait for the next char
												this.prevChr += chr.chr;
												chr = chr.nextChar();
												continue nextChar;
											} else if (this.options.runDirectives && (((this.prevChr + chr.chr) === '//!') || ((this.prevChr + chr.chr) === '/*!'))) {
												if ((this.prevChr + chr.chr) === '/*!') {
													this.isDirectiveBlock = true;
												} else {
													this.isDirective = true;
												};
												this.prevChr = '';
												this.directive = '';
												code = code.slice(chr.index + chr.size);
												continue analyseChunk;
											} else if ((this.prevChr + chr.chr).slice(0, 2) === '//') {
												this.prevChr = '';
												this.isComment = true;
												code = code.slice(chr.index + chr.size);
												continue analyseChunk;
											} else if ((this.prevChr + chr.chr).slice(0, 2) === '/*') {
												this.prevChr = '';
												this.isCommentBlock = true;
												code = code.slice(chr.index + chr.size);
												continue analyseChunk;
											} else if (!this.token && !this.ignoreRegExp && (this.prevChr === '/')) {
												this.writeToken();
												this.writeCode('/');
												this.prevChr = '';
												this.isRegExp = true;
												code = code.slice(chr.index);
												continue analyseChunk;
											} else if (((chr.codePoint === 43) || (chr.codePoint === 45)) && ((this.prevChr + chr.chr) === (chr.chr + chr.chr))) { // "++", "--"
												this.writeToken();
												this.prevChr = '';
												this.writeCode(chr.chr + chr.chr);
											} else if ((this.prevChr === '/') || (this.prevChr === '+') || (this.prevChr === '-')) { // "/", "+", "-"
												this.writeToken(!this.explicitSep);
												this.writeCode(this.prevChr);
												this.hasSep = true;
												this.prevChr = '';
												continue nextChar;
											} else if ((chr.codePoint === 47) || (chr.codePoint === 43) || (chr.codePoint === 45)) { // "/", "+", "-"
												// Wait for the next char
												this.prevChr = chr.chr;
												chr = chr.nextChar();
												continue nextChar;
											} else if ((chr.codePoint === 34) || (chr.codePoint === 39)) { // '"', "'"
												this.writeToken();
												this.isString = true;
												this.stringChr = chr.chr;
												this.writeCode(chr.chr);
												code = code.slice(chr.index + chr.size);
												continue analyseChunk;
											} else if (chr.codePoint === 96) { // "`"
												this.writeToken();
												this.isTemplate = true;
												this.stringChr = chr.chr;
												this.writeCode(chr.chr);
												code = code.slice(chr.index + chr.size);
												continue analyseChunk;
											} else if ((chr.codePoint === 59) || unicode.isSpace(chr.chr, curLocale)) { // ";", "{space}"
												doSpaces: do {
													if (chr.codePoint === 59) { // ";"
														this.sep = ';';
														this.explicitSep = true;
														if (this.isFor && (this.parentheseLevel === 1)) {
															this.hasSep = false;
															this.writeToken();
														};
													} else if ((chr.codePoint === 10) || (chr.codePoint === 13)) { // CR/LF
														this.newLine = true;
													} else if (!this.sep) { // Other {space}
														this.sep = ' ';
													};
													chr = chr.nextChar();
													if (chr) {
														if (!chr.complete) {
															// Incomplete Unicode sequence
															break analyseChunk;
														};
													} else {
														break doSpaces;
													};
												} while ((chr.codePoint === 59) || unicode.isSpace(chr.chr, curLocale)) // ";", "{space}"
												continue nextChar;
											} else if ((chr.codePoint === 36) || (chr.codePoint === 95) || unicode.isAlnum(chr.chr, curLocale)) { // "$", "_", "{alnum}"
												if (this.token || this.explicitSep || this.newLine) {
													if (this.token || this.explicitSep) {
														this.hasSep = false;
													};
													if (this.newLine) {
														this.sep = ';';
													};
													this.writeToken(); // write current token and separator
												};
												var token = '';
												doAlnum: do {
													token += chr.chr; // build new token
													chr = chr.nextChar();
													if (chr) {
														if (!chr.complete) {
															// Incomplete Unicode sequence
															break analyseChunk;
														};
													} else {
														this.prevChr = token;
														break doAlnum;
													};
												} while ((chr.codePoint === 36) || (chr.codePoint === 95) || unicode.isAlnum(chr.chr, curLocale)); // "$", "_", "{alnum}"
												if (chr) {
													this.token = token;
													//if (this.endBrace && (['else', 'catch', 'finally', 'while', 'until'].indexOf(token) >= 0)) {
													//	// No separator before these keywords
													//	this.hasSep = true;
													//};
												};
												continue nextChar;
											} else if ((chr.codePoint === 123) || (chr.codePoint === 40) || (chr.codePoint === 91)) { // "{", "(", "["
												this.writeToken(!this.explicitSep);
												this.writeCode(chr.chr);
												if (chr.codePoint === 40) { // "("
													this.parentheseLevel++;
												} else if (chr.codePoint === 123) { // "{"
													this.braceLevel++;
												};
												this.hasSep = true;
											} else if ((chr.codePoint === 125) || (chr.codePoint === 41) || (chr.codePoint === 93)) { // "}", ")", "]"
												if (chr.codePoint === 41) { // ")"
													this.parentheseLevel--;
													if (this.parentheseLevel <= 0) {
														this.popLevel();
													};
												} else if (chr.codePoint === 125) { // "}"
													this.braceLevel--;
													if (this.braceLevel <= 0) {
														this.braceLevel = 0;
														if (this.isTemplateExpression) {
															this.popLevel();
															this.stringChr = '`';
															this.writeToken(true);
															this.writeCode(chr.chr);
															code = code.slice(chr.index + chr.size);
															continue analyseChunk;
														};
													};
												};
												this.writeToken(true);
												this.writeCode(chr.chr);
												//if (chr.codePoint === 125) { // "}"
												//	this.endBrace = true;
												//};
												this.ignoreRegExp = true;
											} else { // TOKEN+OP+TOKEN : "=", "==", "===", "!=", "!==", "%", "*", "&", "^", "^=", "&=", "|", "|=", "&&", "||", "^", '<', '>', '<=', '>=', '<<', '>>', '<<=', '>>=', '>>>=', '<<<', '>>>', '.', ',', '+=', '-=', '*=', '/=', '%=', '**', '**=', "?", ":"
													 // OP+TOKEN       : "!", "~"
													 // ",", "."
												this.writeToken(!this.explicitSep);
												this.writeCode(chr.chr);
												this.hasSep = true;
											};
											chr = chr.nextChar();
										};
										break analyseChunk;
									};
								};
							},
						};
						
						var knownDirectives = this.__knownDirectives,
							directives = state.directives;
						
						tools.forEach(knownDirectives, function(directive, name) {
							directives[name] = types.bind(state, directive);
						});
						
						this.__state = state;
					}),
					
					reset: doodad.OVERRIDE(function reset() {
						this.__buffer = [];
						this.__listening = false;
						this.__clearState();
						
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

					define: doodad.PUBLIC(function define(name, value) {
						this.__state.directives.DEFINE(name, value);
					}),
					
					undefine: doodad.PUBLIC(function undefine(name) {
						this.__state.directives.UNDEFINE(name);
					}),
					
					write: doodad.OVERRIDE(function write(code, /*optional*/options) {
						// TODO: "String templates"
						// TODO: Minify variable names (don't forget "set" which is by scope)
						
						var data = {
							raw: code,
							options: options,
						};
						data = this.transform(data, options) || data;
						
						this.onWrite(new doodad.Event(data));
						
						var state = this.__state;

						if (data.raw === io.EOF) {
							state.writeToken();
						} else {
							state.parseCode(data.valueOf());
						};
						
						// TODO: Simplify me !!!
						
						var bufferSize = this.options.bufferSize,
							callback = types.get(options, 'callback');

						var duplex = nodejsIOInterfaces && this.getInterface(nodejsIOInterfaces.ITransform);
										
						var writeEOF = function writeEOF() {
							if (data.raw === io.EOF) {
								this.__clearState();
								var newData = {
									raw: io.EOF,
								};
								newData = this.transform(newData) || newData;
								if (this.options.autoFlush) {
									this.__buffer.push(newData);
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
											this.__buffer.push(newData);
											duplex && duplex.isPaused() && duplex.emit('readable');
											duplex && duplex.emit('end');
											duplex && duplex.emit('finish');
										};
									} else {
										this.__buffer.push(newData);
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
								this.__buffer.push(newData);
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
										var emitted = duplex && !duplex.isPaused() && duplex.emit('data', newData.valueOf());
										if (!emitted) {
											this.__buffer.push(newData);
											duplex && duplex.emit('readable');
										};
									};
								} else {
									this.__buffer.push(newData);
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
							var duplex = nodejsIOInterfaces && this.getInterface(nodejsIOInterfaces.ITransform);
							var data;
							while (data = this.__buffer.shift()) {
								var ev = new doodad.Event(data);
								this.onReady(ev);
								if (data.raw === io.EOF) {
									duplex && duplex.emit('end');
									duplex && duplex.emit('finish');
								} else {
									duplex && duplex.emit('data', data.valueOf());
								};
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
	
	//! BEGIN_REMOVE()
	if ((typeof process !== 'object') || (typeof module !== 'object')) {
	//! END_REMOVE()
		//! IF_UNDEF("serverSide")
			// <PRB> export/import are not yet supported in browsers
			global.DD_MODULES = exports.add(global.DD_MODULES);
		//! END_IF()
	//! BEGIN_REMOVE()
	};
	//! END_REMOVE()
}).call(
	//! BEGIN_REMOVE()
	(typeof window !== 'undefined') ? window : ((typeof global !== 'undefined') ? global : this)
	//! END_REMOVE()
	//! IF_DEF("serverSide")
	//! 	INJECT("global")
	//! ELSE()
	//! 	INJECT("window")
	//! END_IF()
);