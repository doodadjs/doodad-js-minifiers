//! BEGIN_MODULE()

//! REPLACE_BY("// Copyright 2015-2017 Claude Petit, licensed under Apache License version 2.0\n", true)
// doodad-js - Object-oriented programming framework
// File: IO_Minifiers.js - Minifiers
// Project home: https://github.com/doodadjs/
// Author: Claude Petit, Quebec city
// Contact: doodadjs [at] gmail.com
// Note: I'm still in alpha-beta stage, so expect to find some bugs or incomplete parts !
// License: Apache V2
//
//	Copyright 2015-2017 Claude Petit
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
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('Javascript')), true) */,

					__listening: doodad.PROTECTED(false),
					__state: doodad.PROTECTED(null),

					__knownDirectives: doodad.PROTECTED(doodad.ATTRIBUTE({
						DEFINE: function(key, /*optional*/value) {
							this.variables[key] = value;
						},
						UNDEFINE: function(key) {
							delete this.variables[key];
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
							this.writeToken();
							this.pushDirective({
								name: 'DEFINE',
								remove: removeBlock,
							});
						},
						END_DEFINE: function() {
							var block = this.popDirective();
							if (!block || (block.name !== 'DEFINE')) {
								throw new types.Error("Invalid 'END_DEFINE' directive.");
							};
							var memorizedCode = this.memorizedCode;
							this.memorizedCode = '';
							if (memorizedCode) {
								var lines = memorizedCode.split(/\n|\r/g);
								var mem = {tmp: {}};
								for (var i = 0; i < lines.length; i++) {
									var line = lines[i];
									if (line) {
										line = line.replace(/^\s*(var\s|const\s|let\s)/, 'tmp.');
										safeEval.eval(line, mem);
									};
								};
								if (!block.remove) {
									this.directives.INJECT(memorizedCode);
								};
								types.extend(this.variables, mem.tmp);
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
							var tmp = tools.split(key, /\.|\[/g, 2);
							if (types.has(this.variables, tmp[0])) {
								return safeEval.eval(key, this.variables)
							};
						},
						EVAL: function(expr) {
							return safeEval.eval(expr, types.extend({global: global, root: root}, this.variables), null, null, true);
						},
						TO_SOURCE: function(val, /*optional*/depth) {
							return types.toSource(val, depth);
						},
						INJECT: function(code, /*optional*/raw) {
							code = types.toString(code) + (raw ? '' : '\n');
							if (raw) {
								this.writeToken();
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
						},
						IF: function(val) {
							this.pushDirective({
								name: 'IF',
								remove: !val,
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
							this.writeToken();
							this.pushDirective({
								name: 'FOR',
								iter: iter,
								varName: varName,
							});
						},
						END_FOR: function() {
							var block = this.popDirective();
							if (!block || (block.name !== 'FOR')) {
								throw new types.Error("Invalid 'END_FOR' directive.");
							};
							var memorizedCode = this.memorizedCode;
							this.memorizedCode = '';
							if (memorizedCode) {
								if (this.directives.IS_DEF(block.varName)) {
									throw new types.Error("Variable '~0~' already defined.", [block.varName]);
								};
								var self = this;
								tools.forEach(block.iter, function(item) {
									self.directives.DEFINE(block.varName, item);
									self.directives.INJECT(memorizedCode);
								});
								this.directives.UNDEFINE(block.varName);
							};
						},
						MAP: function(ar, varName) {
							this.writeToken();
							this.pushDirective({
								name: 'MAP',
								array: ar,
								varName: varName,
							});
						},
						END_MAP: function() {
							var block = this.popDirective();
							if (!block || (block.name !== 'MAP')) {
								throw new types.Error("Invalid 'END_MAP' directive.");
							};
							var memorizedCode = this.memorizedCode;
							this.memorizedCode = '';
							if (memorizedCode) {
								if (this.directives.IS_DEF(block.varName)) {
									throw new types.Error("Variable '~0~' already defined.", [block.varName]);
								};
								var ar = block.array,
									arLen = ar.length;
								for (var i = 0; i < arLen; i++) {
									if (i in ar) {
										this.directives.DEFINE(block.varName, ar[i]);
										this.directives.INJECT(memorizedCode + (i < arLen - 1 ? ',' : ''));
									};
								};
								this.directives.UNDEFINE(block.varName);
							};
						},
					}, extenders.ExtendObject)),
					
					__beginMemorizeDirectives: doodad.PROTECTED(doodad.ATTRIBUTE([
						'BEGIN_DEFINE',
						'FOR_EACH',
						'MAP',
					], extenders.UniqueArray)),

					__endMemorizeDirectives: doodad.PROTECTED(doodad.ATTRIBUTE([
						'END_DEFINE',
						'END_FOR',
						'END_MAP',
					], extenders.UniqueArray)),

	
					setOptions: doodad.OVERRIDE(function setOptions(options) {
						types.getDefault(options, 'runDirectives', types.getIn(this.options, 'runDirectives', false));
						types.getDefault(options, 'keepComments', types.getIn(this.options, 'keepComments', false));
						types.getDefault(options, 'keepSpaces', types.getIn(this.options, 'keepSpaces', false));
						//TODO: types.getDefault(options, 'removeEmptyLines', types.getIn(this.options, 'removeEmptyLines', false));

						this._super(options);
					}),
							
					__clearState: doodad.PROTECTED(function() {
						var state = {
							index: 0,
							options: this.options,
							beginMemorizeDirectives: this.__beginMemorizeDirectives,
							endMemorizeDirectives: this.__endMemorizeDirectives,
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
							isForArguments: false,
							isDo: false,
							levelStack: [],
							pushLevel: function pushLevel(name) {
								this.levelStack.push({
									name: name,
									isTemplate: this.isTemplate,
									isTemplateExpression: this.isTemplateExpression,
									isForArguments: this.isForArguments,
									isDo: this.isDo,
								});
								this.isTemplate = false;
								this.isTemplateExpression = false;
								if (this.isFor) {
									this.isFor = false;
									this.isForArguments = true;
								} else {
									this.isForArguments = false;
								};
								this.isDo = false;
							},
							popLevel: function popLevel(name) {
								var level = this.levelStack.pop() || types.nullObject();
								// TODO: if (name !== level.name) { ??? };
								this.isTemplate = !!level.isTemplate;
								this.isTemplateExpression = !!level.isTemplateExpression;
								this.isForArguments = !!level.isForArguments;
								this.isDo = !!level.isDo;
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
								if (this.memorize > 0) {
									this.memorizedCode += code;
								} else if (!this.getDirective().remove) {
									this.buffer += code;
								};
								this.hasSep = false;
							},
							writeToken: function writeToken(/*optional*/noSep) {
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
							runDirective: function runDirective(directive) {
								if (this.options.runDirectives) {
									directive = tools.trim(directive.replace(/^\s*/, ''));
									if (directive) {
										var name = tools.split(directive, '(', 2)[0].trim();
										var evaled = false;
										if (tools.indexOf(this.beginMemorizeDirectives, name) >= 0) {
											if (this.memorize === 0) {
												safeEval.eval(directive, this.directives);
												evaled = true;
											};
											this.memorize++;
										} else if (tools.indexOf(this.endMemorizeDirectives, name) >= 0) {
											this.memorize--;
										};
										if (!evaled) {
											if (this.memorize > 0) {
												this.memorizedCode += '/*!' + directive + '*/';
											} else {
												safeEval.eval(directive, this.directives);
											};
										};
									};
								};
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
												var directive = this.directive;
												this.directive = '';
												this.runDirective(directive);
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
												var directive = this.directive;
												this.directive = '';
												this.runDirective(directive);
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
												this.pushLevel('{');
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
														if (!this.options.keepSpaces && this.isForArguments) {
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
													if (token === 'for') {
														this.isFor = true;
													} else if (token === 'do') {
														this.isDo = true;
													} else {
														if (this.endBrace && ((['else', 'catch', 'finally', 'until'].indexOf(token) >= 0) || (this.isDo && (token === 'while')))) {
															// No separator before these keywords
															this.hasSep = true;
														};
														this.isDo = this.isFor = false;
													};
													if (this.token || this.explicitSep || this.newLine) {
														if (this.token || this.explicitSep) {
															this.hasSep = false;
														};
														if (this.newLine) {
															this.sep = ';';
														};
														this.writeToken(); // write current token and separator
													};
													this.token = token;
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
													this.pushLevel('(');
												} else if (chr.codePoint === 123) { // "{"
													this.pushLevel('{');
												};
												this.hasSep = true;
												this.ignoreRegExp = false;
											} else if ((chr.codePoint === 125) || (chr.codePoint === 41) || (chr.codePoint === 93)) { // "}", ")", "]"
												if (chr.codePoint === 41) { // ")"
													this.popLevel('(');
												} else if (chr.codePoint === 125) { // "}"
													this.popLevel('{');
													if (this.isTemplateExpression) {
														this.stringChr = '`';
														this.writeToken(true);
														this.writeCode(chr.chr);
														this.index = chr.index + chr.size;
														continue analyseChunk;
													};
												};
												this.writeToken(true);
												this.writeCode(chr.chr);
												if (chr.codePoint === 125) { // "}"
													this.endBrace = true;
												};
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

						var data = ev.data;
						var state = this.__state;

						ev.preventDefault();

						var eof = (data.raw === io.EOF);

						state.parseCode(data.valueOf() || '', null, null, eof); // sync

						if (state.buffer) {
							var data2 = this.transform({raw: state.buffer});
							state.buffer = '';
							this.push(data2);
						};
									
						if (eof) {
							this.__clearState();
							var data2 = this.transform({raw: io.EOF});
							this.push(data2);
						};

						if (this.options.flushMode === 'half') {
							this.flush(this.options.autoFlushOptions);
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