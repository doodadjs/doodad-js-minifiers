//! BEGIN_MODULE()

//! REPLACE_BY("// Copyright 2016 Claude Petit, licensed under Apache License version 2.0\n", true)
// doodad-js - Object-oriented programming framework
// File: IO_Minifiers.js - Minifiers
// Project home: https://github.com/doodadjs/
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

module.exports = {
	add: function add(DD_MODULES) {
		DD_MODULES = (DD_MODULES || {});
		DD_MODULES['Doodad.IO.Minifiers'] = {
			version: /*! REPLACE_BY(TO_SOURCE(VERSION(MANIFEST("name")))) */ null /*! END_REPLACE()*/,
			create: function create(root, /*optional*/_options, _shared) {
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
						
				types.complete(_shared.Natives, {
					mathMax: global.Math.max,
					mathMin: global.Math.min,
				});
						

				minifiers.REGISTER(io.Stream.$extend(
									io.TextInputStream,
									io.TextOutputStream,
				{
					$TYPE_NAME: 'Javascript',

					__listening: doodad.PROTECTED(false),
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
						BEGIN_DEFINE: function(removeBlock) {
							/*
								ex: 
									//! BEGIN_DEFINE()
										var a = 1;
										var b = '2';
										var c = null;
										...
									//! END_DEFINE()
							*/
							if (this.memorize <= 0) {
								this.writeToken();
							};
							this.pushDirective({
								name: 'DEFINE',
								remove: removeBlock,
							});
							this.memorize++;
							this.directive = '';
						},
						END_DEFINE: function() {
							var block = this.popDirective();
							if (!block || (block.name !== 'DEFINE')) {
								throw new types.Error("Invalid 'END_DEFINE' directive.");
							};
							this.memorize--;
							if (this.memorize <= 0) {
								var memorizedCode = this.memorizedCode;
								this.memorizedCode = '';
								if (memorizedCode) {
									var lines = memorizedCode.split(/\n|\r/g);
									var mem = {tmp: {}};
									for (var i = 0; i < lines.length; i++) {
										var line = lines[i];
										if (line) {
											line = line.replace(/^\s*(var\s|const\s|let\s)/, 'tmp.');
											safeEval.eval(line, mem, null, false);
										};
									};
									if (!block.remove) {
										this.directives.INJECT(memorizedCode);
									};
									types.extend(this.variables, mem.tmp);
								};
							};
						},
						IS_DEF: function(key) {
							return types.has(this.variables, key);
						},
						IS_UNDEF: function(key) {
							return !types.has(this.variables, key);
						},
						IS_SET: function(key) {
							return !!types.get(this.variables, key, false);
						},
						IS_UNSET: function(key) {
							return !types.get(this.variables, key, false);
						},
						VAR: function(key) {
							if (this.memorize <= 0) {
								var tmp = tools.split(key, /\.|\[/g, 2);
								if (types.has(this.variables, tmp[0])) {
									return safeEval.eval(key, this.variables)
								};
							};
						},
						TO_SOURCE: function(val, /*optional*/depth) {
							if (this.memorize <= 0) {
								return types.toSource(val, depth);
							};
						},
						INJECT: function(code, /*optional*/raw) {
							if (this.memorize <= 0) {
								code = types.toString(code) + (raw ? '' : '\n');
								if (raw) {
									this.writeCode(code);
								} else {
									//var isDirective = this.isDirective,
									//	isDirectiveBlock = this.isDirectiveBlock,
									//	directive = this.directive;
												
									this.isDirective = false;
									this.isDirectiveBlock = false;
									this.directive = '';
												
									this.parseCode(code);
											
									//this.isDirective = isDirective;
									//this.isDirectiveBlock = isDirectiveBlock;
									//this.directive = directive;
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
								remove: !types.has(this.variables, key),
							});
						},
						IF_UNDEF: function(key) {
							this.pushDirective({
								name: 'IF',
								remove: types.has(this.variables, key),
							});
						},
						IF_SET: function(key) {
							this.pushDirective({
								name: 'IF',
								remove: !types.get(this.variables, key, false),
							});
						},
						IF_UNSET: function(key) {
							this.pushDirective({
								name: 'IF',
								remove: !!types.get(this.variables, key, false),
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
						ELSE_IF: function(expr) {
							var block = this.popDirective();
							if (!block || (block.name !== 'IF')) {
								throw new types.Error("Invalid 'ELSE_IF' directive.");
							};
							this.pushDirective({
								name: 'IF',
								remove: !block.remove || !expr,
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
						REPLACE_IF: function(condition, code, /*optional*/raw) {
							this.pushDirective({
								name: 'REPLACE',
								remove: !!condition,
								code: code,
								raw: raw,
							});
						},
						END_REPLACE: function() {
							var block = this.popDirective();
							if (!block || (block.name !== 'REPLACE')) {
								throw new types.Error("Invalid 'END_REPLACE' directive.");
							};
							if (block.remove) {
								this.directives.INJECT(block.code, block.raw);
							};
						},
						BEGIN_REMOVE: function() {
							this.pushDirective({
								name: 'REMOVE',
								remove: true,
							});
						},
						REMOVE_IF: function(condition) {
							this.pushDirective({
								name: 'REMOVE',
								remove: !!condition,
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
						types.getDefault(options, 'runDirectives', false);
						types.getDefault(options, 'keepComments', false);
						types.getDefault(options, 'keepSpaces', false);
						//TODO: types.getDefault(options, 'removeEmptyLines', false);

						this._super(options);
					}),
							
					__clearState: doodad.PROTECTED(function() {
						var state = {
							index: 0,
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
							getDirective: function getDirective(/*optional*/name) {
								if (name) {
									return tools.getItem(this.directiveStack, function(block) {
										return block.name === name;
									});
								} else {
									return this.directiveStack[0];
								};
							},
							pushDirective: function pushDirective(newBlock) {
								if (!newBlock.name) {
									throw new types.Error("Missing a name to new block.");
								};
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
							
							parseCode: function(code, /*optional*/start, /*optional*/end, /*optional*/eof) {
								var curLocale = locale.getCurrent();

								code = (this.prevChr || '') + (code || '');
								this.prevChr = '';

								if (eof) {
									code = tools.trim(tools.trim(code, '\n', -1, 1), '\r', -1, 1) + this.options.newLine;
								};
								
								this.index = (types.isNothing(start) ? 0 : _shared.Natives.mathMax(start, 0));
								end = (types.isNothing(end) ? code.length : _shared.Natives.mathMin(end, code.length));
										
								analyseChunk: while (this.index < end) {
									var chr = unicode.nextChar(code, this.index, end);
									if (this.isDirective || this.isDirectiveBlock) {
										nextCharDirective: while (chr) {
											if (!chr.complete) {
												// Incomplete Unicode sequence
												break analyseChunk;
											};
											if (this.isDirectiveBlock && ((this.prevChr + chr.chr) === '*/')) {
												this.isDirectiveBlock = false;
												this.prevChr = '';
												if (this.options.runDirectives) {
													this.directive = tools.trim(this.directive.replace(/\s/g, ' '));
													if (this.directive) {
														safeEval.eval(this.directive, this.directives);
														if ((this.memorize > 0) && this.directive) {
															this.memorizedCode += '/*!' + this.directive + '*/';
														};
													};
													this.directive = '';
												};
												this.index = chr.index + chr.size;
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
												if (this.options.runDirectives) {
													this.directive = tools.trim(this.directive.replace(/\s/g, ' '));
													if (this.directive) {
														safeEval.eval(this.directive, this.directives);
														if ((this.memorize > 0) && this.directive) {
															this.memorizedCode += '/*!' + this.directive + '*/';
														};
													};
													this.directive = '';
												};
												if (!this.isDirectiveBlock) {
													this.index = chr.index + chr.size;
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
												if (this.options.keepComments) {
													this.writeCode(code.slice(this.index, chr.index + chr.size));
													this.index = chr.index + chr.size;
												} else {
													this.index = chr.index;
												};
												continue analyseChunk;
											};
											chr = chr.nextChar();
										};
										if (!chr && this.options.keepComments) {
											this.writeCode(code.slice(this.index));
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
												if (this.options.keepComments) {
													this.writeCode(code.slice(this.index, chr.index + chr.size));
												};
												this.index = chr.index + chr.size;
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
										if (!chr && this.options.keepComments) {
											this.writeCode(code.slice(this.index));
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
												this.writeCode(code.slice(this.index, chr.index));
												this.index = chr.index + chr.size;
												continue analyseChunk;
											} else if (this.isEscaped) {
												// Skip escaped character.
												this.isEscaped = false;
											} else if (chr.chr === '\\') {
												// Character escape. Will skip the following character in case it is "'", '"' or "`". Other escapes ("\n", "\u...", ...) are not harmfull.
												this.isEscaped = true;
											} else if (this.isTemplate && ((this.prevChr + chr.chr) === '${')) {
												this.prevChr = '';
												this.pushLevel();
												this.isTemplateExpression = true;
												this.writeCode(code.slice(this.index, chr.index + chr.size));
												this.index = chr.index + chr.size;
												continue analyseChunk;
											} else if (this.isTemplate && (chr.chr === '$')) {
												this.prevChr = chr.chr;
											} else if (chr.chr === this.stringChr) {
												this.isString = false;
												this.isTemplate = false;
												this.writeCode(code.slice(this.index, chr.index + chr.size));
												this.index = chr.index + chr.size;
												continue analyseChunk;
											} else {
												this.prevChr = '';
											};
											chr = chr.nextChar();
										};
										if (!chr) {
											this.writeCode(code.slice(this.index));
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
													this.writeCode(code.slice(this.index, chr.index));
													this.index = chr.index;
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
											this.writeCode(code.slice(this.index));
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
											} else if (((this.prevChr + chr.chr) === '//!') || ((this.prevChr + chr.chr) === '/*!')) {
												if ((this.prevChr + chr.chr) === '/*!') {
													this.isDirectiveBlock = true;
												} else {
													this.isDirective = true;
												};
												this.prevChr = '';
												this.directive = '';
												this.index = chr.index + chr.size;
												continue analyseChunk;
											} else if ((this.prevChr + chr.chr).slice(0, 2) === '//') {
												this.prevChr = '';
												this.isComment = true;
												if (!this.options.keepComments) {
													this.index = chr.index;
												};
												continue analyseChunk;
											} else if ((this.prevChr + chr.chr).slice(0, 2) === '/*') {
												this.prevChr = '';
												this.isCommentBlock = true;
												if (!this.options.keepComments) {
													this.index = chr.index;
												};
												continue analyseChunk;
											} else if (!this.token && !this.ignoreRegExp && (this.prevChr === '/')) {
												this.writeToken();
												this.writeCode('/');
												this.prevChr = '';
												this.isRegExp = true;
												this.index = chr.index;
												continue analyseChunk;
											} else if (((chr.codePoint === 43) || (chr.codePoint === 45)) && ((this.prevChr + chr.chr) === (chr.chr + chr.chr))) { // "++", "--"
												this.writeToken();
												this.prevChr = '';
												this.writeCode(chr.chr + chr.chr);
												this.ignoreRegExp = false;
											} else if ((this.prevChr === '/') || (this.prevChr === '+') || (this.prevChr === '-')) { // "/", "+", "-"
												this.writeToken(!this.explicitSep);
												this.writeCode(this.prevChr);
												this.hasSep = true;
												this.prevChr = '';
												this.ignoreRegExp = false;
												continue nextChar;
											} else if ((chr.codePoint === 47) || (chr.codePoint === 43) || (chr.codePoint === 45)) { // "/", "+", "-"
												// Wait for the next char
												this.index = chr.index; // for "this.options.keepComments"
												this.prevChr = chr.chr;
												chr = chr.nextChar();
												continue nextChar;
											} else if ((chr.codePoint === 34) || (chr.codePoint === 39)) { // '"', "'"
												this.writeToken();
												this.isString = true;
												this.stringChr = chr.chr;
												this.writeCode(chr.chr);
												this.index = chr.index + chr.size;
												this.ignoreRegExp = false;
												continue analyseChunk;
											} else if (chr.codePoint === 96) { // "`"
												this.writeToken();
												this.isTemplate = true;
												this.stringChr = chr.chr;
												this.writeCode(chr.chr);
												this.index = chr.index + chr.size;
												continue analyseChunk;
											} else if ((chr.codePoint === 59) || unicode.isSpace(chr.chr, curLocale)) { // ";", "{space}"
												if (this.token) {
													this.ignoreRegExp = true;
												};
												if (this.options.keepSpaces) {
													this.writeToken();
												};
												var lastIndex = null;
												this.index = chr.index;
												doSpaces: do {
													if (chr.codePoint === 59) { // ";"
														this.sep = ';';
														this.explicitSep = true;
														if (!this.options.keepSpaces && this.isFor && (this.parentheseLevel === 1)) {
															this.hasSep = false;
															this.writeToken();
														};
													} else if ((chr.codePoint === 10) || (chr.codePoint === 13)) { // CR/LF
														this.newLine = true;
													} else if (!this.sep) { // Other {space}
														this.sep = ' ';
													};
													lastIndex = chr.index + chr.size;
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
												if (this.options.keepSpaces) {
													this.explicitSep = false;
													this.sep = '';
													this.hasSep = true;
													this.newLine = false;
													this.writeCode(code.slice(this.index, lastIndex));
													this.index = lastIndex;
													continue analyseChunk;
												};
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
												this.ignoreRegExp = false;
												continue nextChar;
											} else if ((chr.codePoint === 123) || (chr.codePoint === 40) || (chr.codePoint === 91)) { // "{", "(", "["
												if (chr.codePoint === 40) { // "("
													if (this.newLine) {
														this.hasSep = false;
													};
												};
												this.writeToken(!this.explicitSep);
												this.writeCode(chr.chr);
												if (chr.codePoint === 40) { // "("
													this.parentheseLevel++;
												} else if (chr.codePoint === 123) { // "{"
													this.braceLevel++;
												};
												this.hasSep = true;
												this.ignoreRegExp = false;
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
															this.index = chr.index + chr.size;
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
												this.ignoreRegExp = false;
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
						this.__listening = false;
						this.__clearState();
								
						this._super();
					}),

					isListening: doodad.OVERRIDE(function() {
						return this.__listening;
					}),
							
					listen: doodad.OVERRIDE(function(/*optional*/options) {
						if (!this.__listening) {
							this.__listening = true;
							this.onListen(new doodad.Event());
						};
					}),
							
					stopListening: doodad.OVERRIDE(function() {
						if (this.__listening) {
							this.__listening = false;
							this.onStopListening(new doodad.Event());
						};
					}),

					define: doodad.PUBLIC(function define(name, value) {
						this.__state.directives.DEFINE(name, value);
					}),
							
					undefine: doodad.PUBLIC(function undefine(name) {
						this.__state.directives.UNDEFINE(name);
					}),
							
					onWrite: doodad.OVERRIDE(function onWrite(ev) {
						const retval = this._super(ev);

						ev.preventDefault();

						var data = ev.data;
						var state = this.__state;

						state.parseCode(data.valueOf() || '', null, null, (data.raw === io.EOF)); // sync

						if (state.buffer) {
							var data2 = {
								raw: state.buffer,
								text: state.buffer,
								valueOf: function() {
									return this.text;
								},
							};

							state.buffer = '';

							if (data.raw !== io.EOF) {
								data2.options = data.options;
							};

							this.push(data2);
						};
									
						if (data.raw === io.EOF) {
							this.__clearState();

							this.push(data);
						};

						return retval;
					}),
				}));
							
							
							
				//return function init(/*optional*/options) {
				//};
			},
		};
		return DD_MODULES;
	},
};
//! END_MODULE()