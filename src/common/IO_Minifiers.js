//! BEGIN_MODULE()

//! REPLACE_BY("// Copyright 2015-2018 Claude Petit, licensed under Apache License version 2.0\n", true)
// doodad-js - Object-oriented programming framework
// File: IO_Minifiers.js - Minifiers
// Project home: https://github.com/doodadjs/
// Author: Claude Petit, Quebec city
// Contact: doodadjs [at] gmail.com
// Note: I'm still in alpha-beta stage, so expect to find some bugs or incomplete parts !
// License: Apache V2
//
//	Copyright 2015-2018 Claude Petit
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

//! IF_SET("mjs")
//! ELSE()
"use strict";
//! END_IF()

exports.add = function add(modules) {
	modules = (modules || {});
	modules['Doodad.IO.Minifiers'] = {
		version: /*! REPLACE_BY(TO_SOURCE(VERSION(MANIFEST("name")))) */ null /*! END_REPLACE()*/,
		create: function create(root, /*optional*/_options, _shared) {
			const doodad = root.Doodad,
				//mixIns = doodad.MixIns,
				types = doodad.Types,
				tools = doodad.Tools,
				safeEval = tools.SafeEval,
				locale = tools.Locale,
				unicode = tools.Unicode,
				io = doodad.IO,
				ioMixIns = io.MixIns,
				//ioInterfaces = io.Interfaces,
				extenders = doodad.Extenders,
				//nodejs = doodad.NodeJs,
				//nodejsIO = nodejs && nodejs.IO,
				//nodejsIOInterfaces = nodejsIO && nodejsIO.Interfaces,
				minifiers = io.Minifiers;


			//const __Internal__ = {
			//};

			tools.complete(_shared.Natives, {
				mathMax: global.Math.max,
				mathMin: global.Math.min,
			});


			// TODO: Implements "io.BufferedTextInputStream"

			minifiers.REGISTER(io.Stream.$extend(
				io.BufferedTextOutputStream,
				ioMixIns.TextTransformableIn,
				ioMixIns.TextTransformableOut,
				{
					$TYPE_NAME: 'Javascript',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('Javascript')), true) */,

					__state: doodad.PROTECTED(null),

					__knownDirectives: doodad.PROTECTED(doodad.ATTRIBUTE({
						DEFINE: function DEFINE(key, /*optional*/value) {
							this.variables[key] = value;
						},
						UNDEFINE: function UNDEFINE(key) {
							delete this.variables[key];
						},
						BEGIN_DEFINE: function BEGIN_DEFINE(removeBlock) {
							/*
								ex:
									//! BEGIN_DEFINE()
										const a = 1;
										const b = '2';
										...
									//! END_DEFINE()
							*/
							this.writeToken(false);
							this.pushDirective({
								name: 'DEFINE',
								remove: removeBlock,
							});
						},
						END_DEFINE: function END_DEFINE() {
							const block = this.popDirective();
							if (!block || (block.name !== 'DEFINE')) {
								throw new types.Error("Invalid 'END_DEFINE' directive.");
							};
							const memorizedCode = this.memorizedCode;
							this.memorizedCode = '';
							if (memorizedCode) {
								const lines = memorizedCode.split(/\n|\r/g);
								const mem = {tmp: {}};
								for (let i = 0; i < lines.length; i++) {
									let line = lines[i];
									if (line) {
										line = line.replace(/^\s*const\s+/, 'tmp.');
										safeEval.eval(line, mem);
									};
								};
								if (!block.remove) {
									this.directives.INJECT(memorizedCode);
								};
								tools.extend(this.variables, mem.tmp);
							};
						},
						IS_DEF: function IS_DEF(key) {
							return types.has(this.variables, key);
						},
						IS_UNDEF: function IS_UNDEF(key) {
							return !types.has(this.variables, key);
						},
						IS_SET: function IS_SET(key) {
							return !!types.get(this.variables, key, false);
						},
						IS_UNSET: function IS_UNSET(key) {
							return !types.get(this.variables, key, false);
						},
						VAR: function VAR(key) {
							const tmp = tools.split(key, /\.|\[/g, 2);
							if (types.has(this.variables, tmp[0])) {
								return safeEval.eval(key, this.variables);
							};
						},
						EVAL: function EVAL(expr) {
							return safeEval.eval(expr, tools.extend({global: global, root: root}, this.variables), {allowFunctions: true, allowRegExp: true});
						},
						TO_SOURCE: function TO_SOURCE(val, /*optional*/depth) {
							return tools.toSource(val, depth);
						},
						INJECT: function INJECT(code, /*optional*/raw) {
							code = types.toString(code);
							if (raw) {
								this.writeToken(false);
								this.writeCode(code);
							} else {
								this.parseCode(code, null, null, true);
							};
						},
						IF: function IF(val) {
							this.pushDirective({
								name: 'IF',
								remove: !val,
							});
						},
						IF_DEF: function IF_DEF(key) {
							this.pushDirective({
								name: 'IF',
								remove: !types.has(this.variables, key),
							});
						},
						IF_UNDEF: function IF_UNDEF(key) {
							this.pushDirective({
								name: 'IF',
								remove: types.has(this.variables, key),
							});
						},
						IF_SET: function IF_SET(key) {
							this.pushDirective({
								name: 'IF',
								remove: !types.get(this.variables, key, false),
							});
						},
						IF_UNSET: function IF_UNSET(key) {
							this.pushDirective({
								name: 'IF',
								remove: !!types.get(this.variables, key, false),
							});
						},
						ELSE: function ELSE() {
							const block = this.popDirective();
							if (!block || (block.name !== 'IF')) {
								throw new types.Error("Invalid 'ELSE' directive.");
							};
							this.pushDirective({
								name: 'IF',
								remove: !block.remove,
							});
						},
						ELSE_IF: function ELSE_IF(expr) {
							const block = this.popDirective();
							if (!block || (block.name !== 'IF')) {
								throw new types.Error("Invalid 'ELSE_IF' directive.");
							};
							this.pushDirective({
								name: 'IF',
								remove: !block.remove || !expr,
							});
						},
						END_IF: function END_IF() {
							const block = this.popDirective();
							if (!block || (block.name !== 'IF')) {
								throw new types.Error("Invalid 'END_IF' directive.");
							};
						},
						REPLACE_BY: function REPLACE_BY(code, /*optional*/raw) {
							this.pushDirective({
								name: 'REPLACE',
								remove: true,
								code: code,
								raw: raw,
							});
						},
						REPLACE_IF: function REPLACE_IF(condition, code, /*optional*/raw) {
							this.pushDirective({
								name: 'REPLACE',
								remove: !!condition,
								code: code,
								raw: raw,
							});
						},
						END_REPLACE: function END_REPLACE() {
							const block = this.popDirective();
							if (!block || (block.name !== 'REPLACE')) {
								throw new types.Error("Invalid 'END_REPLACE' directive.");
							};
							if (block.remove) {
								this.directives.INJECT(block.code, block.raw);
							};
						},
						BEGIN_REMOVE: function BEGIN_REMOVE() {
							this.pushDirective({
								name: 'REMOVE',
								remove: true,
							});
						},
						REMOVE_IF: function REMOVE_IF(condition) {
							this.pushDirective({
								name: 'REMOVE',
								remove: !!condition,
							});
						},
						END_REMOVE: function END_REMOVE() {
							const block = this.popDirective();
							if (!block || (block.name !== 'REMOVE')) {
								throw new types.Error("Invalid 'END_REMOVE' directive.");
							};
						},
						FOR_EACH: function FOR_EACH(iter, itemName, /*optional*/keyName) {
							this.writeToken(false);
							this.pushDirective({
								name: 'FOR',
								iter: iter,
								itemName: itemName,
								keyName: keyName,
							});
						},
						END_FOR: function END_FOR() {
							const block = this.popDirective();
							if (!block || (block.name !== 'FOR')) {
								throw new types.Error("Invalid 'END_FOR' directive.");
							};
							const memorizedCode = this.memorizedCode;
							this.memorizedCode = '';
							if (memorizedCode && block.iter) {
								if (this.directives.IS_DEF(block.itemName)) {
									throw new types.Error("Variable '~0~' already defined.", [block.itemName]);
								};
								if (block.keyName && this.directives.IS_DEF(block.keyName)) {
									throw new types.Error("Variable '~0~' already defined.", [block.keyName]);
								};
								tools.forEach(block.iter, function(item, key) {
									this.directives.DEFINE(block.itemName, item);
									if (block.keyName) {
										this.directives.DEFINE(block.keyName, key);
									};
									this.directives.INJECT(memorizedCode);
								}, this);
								this.directives.UNDEFINE(block.itemName);
								if (block.keyName) {
									this.directives.UNDEFINE(block.keyName);
								};
							};
						},
						MAP: function MAP(ar, varName) {
							this.writeToken(false);
							this.pushDirective({
								name: 'MAP',
								array: ar,
								varName: varName,
							});
						},
						END_MAP: function END_MAP() {
							const block = this.popDirective();
							if (!block || (block.name !== 'MAP')) {
								throw new types.Error("Invalid 'END_MAP' directive.");
							};
							const memorizedCode = this.memorizedCode;
							this.memorizedCode = '';
							const ar = block.array,
								arLen = (ar ? ar.length : 0);
							if (memorizedCode && (arLen > 0)) {
								if (this.directives.IS_DEF(block.varName)) {
									throw new types.Error("Variable '~0~' already defined.", [block.varName]);
								};
								for (let i = 0; i < arLen; i++) {
									if (types.has(ar, i)) {
										this.directives.DEFINE(block.varName, ar[i]);
										this.directives.INJECT(memorizedCode);
										if (i < (arLen - 1)) {
											this.directives.INJECT(',');
										};
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

					__endBraceKeywords: doodad.PROTECTED(doodad.ATTRIBUTE([
						'else',
						'catch',
						'finally',
						'until',
					], extenders.UniqueArray)),

					__keywordsFollowingDoKeyword: doodad.PROTECTED(doodad.ATTRIBUTE([
						'while',
					], extenders.UniqueArray)),

					__noSemiKeywords: doodad.PROTECTED(doodad.ATTRIBUTE([
						'var',
						'let',
						'const',
					], extenders.UniqueArray)),

					__acceptRegExpKeywords: doodad.PROTECTED(doodad.ATTRIBUTE([
						'return',
					], extenders.UniqueArray)),

					setOptions: doodad.OVERRIDE(function setOptions(options) {
						types.getDefault(options, 'runDirectives', types.getIn(this.options, 'runDirectives', false));
						types.getDefault(options, 'keepComments', types.getIn(this.options, 'keepComments', false));
						types.getDefault(options, 'keepSpaces', types.getIn(this.options, 'keepSpaces', false));
						//TODO: types.getDefault(options, 'removeEmptyLines', types.getIn(this.options, 'removeEmptyLines', false));

						this._super(options);
					}),

					__clearState: doodad.PROTECTED(function() {
						const state = {
							index: 0,
							minifier: this,
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
								const level = this.levelStack.pop() || tools.nullObject();
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
								const block = this.getDirective();
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
								const block = this.directiveStack.shift();
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
									if (this.newLine) {
										this.memorizedCode += this.options.newLine;
										this.newLine = false;
									};
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
								this.prevChr = '';
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
										const name = tools.split(directive, '(', 2)[0].trim();
										let evaled = false;
										if (tools.indexOf(this.minifier.__beginMemorizeDirectives, name) >= 0) {
											if (this.memorize === 0) {
												try {
													safeEval.eval(directive, this.directives, null, {allowRegExp: true});
												} catch(ex) {
													throw new types.ParseError("The directive '~0~' has failed to execute : ~1~", [directive, ex.stack]);
												};
												evaled = true;
											};
											this.memorize++;
										} else if (tools.indexOf(this.minifier.__endMemorizeDirectives, name) >= 0) {
											this.writeToken(false);
											this.memorize--;
										};
										if (!evaled) {
											if (this.memorize > 0) {
												this.writeToken(false);
												this.memorizedCode += '/*!' + directive + '*/';
											} else {
												try {
													safeEval.eval(directive, this.directives, null, {allowRegExp: true});
												} catch(ex) {
													throw new types.ParseError("The directive '~0~' has failed to execute : ~1~", [directive, ex.stack]);
												};
												//evaled = true;
											};
										};
									};
								};
							},

							parseCode: function(code, /*optional*/start, /*optional*/end, /*optional*/eof) {
								const curLocale = locale.getCurrent();

								code = (this.prevChr || '') + (code || '');
								this.prevChr = '';

								this.index = (types.isNothing(start) ? 0 : _shared.Natives.mathMax(start, 0));
								end = (types.isNothing(end) ? code.length : _shared.Natives.mathMin(end, code.length));

								analyseChunk: while (this.index < end) {
									let chr = unicode.nextChar(code, this.index, end);
									if (this.isDirective || this.isDirectiveBlock) {
										nextCharDirective: while (chr) {
											if (!chr.complete) {
												// Incomplete Unicode sequence
												break analyseChunk;
											};
											if (this.isDirectiveBlock && ((this.prevChr + chr.chr) === '*/')) {
												this.prevChr = '';
												this.isDirectiveBlock = false;
												const directive = this.directive;
												this.directive = '';
												if (directive) {
													this.runDirective(directive);
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
												this.prevChr = '';
												this.isDirective = false;
												const isDirectiveBlock = this.isDirectiveBlock;
												this.isDirectiveBlock = false;
												const directive = this.directive;
												this.directive = '';
												if (directive) {
													this.runDirective(directive);
												};
												if (isDirectiveBlock) {
													this.isDirectiveBlock = true;
												} else {
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
													this.writeToken(false);
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
											this.writeToken(false);
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
													this.writeToken(false);
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
										if (!chr) {
											if (this.options.keepComments) {
												this.writeToken(false);
												this.writeCode(code.slice(this.index));
											};
										};
										break analyseChunk;
									} else if (this.isString || this.isTemplate) {
										while (chr) {
											if (!chr.complete) {
												// Incomplete Unicode sequence
												break analyseChunk;
											};
											if (this.isString && ((chr.chr === '\n') || (chr.chr === '\r'))) {
												// NOTE: "new line" can be "\r\n" or "\n\r", so there is no condition on "this.isEscaped"
												// Multi-Line String. New line is removed. It assumes new line is escaped because otherwise it is a synthax error.
												// Exemple :
												//     const a = "Hello \
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
									} else if (this.isRegExp || this.isRegExpEnd) {
										while (chr) {
											if (!chr.complete) {
												// Incomplete Unicode sequence
												break analyseChunk;
											};
											if (this.isRegExpEnd) {
												// Flags
												const lowerChrAscii = unicode.codePointAt(chr.chr.toLowerCase(), 0).codePoint;
												if ((lowerChrAscii < 97) || (lowerChrAscii > 122)) { // "a", "z"
													this.isRegExpEnd = false;
													this.isRegExp = false;
													this.writeCode(code.slice(this.index, chr.index));
													this.index = chr.index;
													continue analyseChunk;
												};
											} else if (this.isEscaped) {
												this.isEscaped = false;
											} else if (chr.chr === '\\') {
												this.isEscaped = true;
											} else if (this.isCharSequence) {
												if (chr.chr === ']') {
													this.isCharSequence = false;
												};
											} else if (chr.chr === '[') {
												this.isCharSequence = true;
											} else if (chr.chr === '/') {
												this.isRegExp = false;
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
											} else if (!this.ignoreRegExp && (this.prevChr === '/')) {
												this.writeToken(false);
												this.writeCode('/');
												this.prevChr = '';
												this.isRegExp = true;
												this.isRegExpEnd = false;
												this.index = chr.index;
												continue analyseChunk;
											} else if (((chr.codePoint === 43) || (chr.codePoint === 45)) && ((this.prevChr + chr.chr) === (chr.chr + chr.chr))) { // "++", "--"
												this.writeToken(false);
												this.prevChr = '';
												this.writeCode(chr.chr + chr.chr);
												this.ignoreRegExp = false;
											} else if ((this.prevChr === '/') || (this.prevChr === '+') || (this.prevChr === '-')) { // "/", "+", "-"
												const prevChr = this.prevChr;
												this.prevChr = '';
												this.writeToken(!this.explicitSep);
												this.writeCode(prevChr);
												this.hasSep = true;
												this.ignoreRegExp = false;
												continue nextChar;
											} else if ((chr.codePoint === 47) || (chr.codePoint === 43) || (chr.codePoint === 45)) { // "/", "+", "-"
												// Wait for the next char
												this.index = chr.index; // for "this.options.keepComments"
												this.prevChr = chr.chr;
												chr = chr.nextChar();
												continue nextChar;
											} else if ((chr.codePoint === 34) || (chr.codePoint === 39)) { // '"', "'"
												this.writeToken(false);
												this.isString = true;
												this.stringChr = chr.chr;
												this.writeCode(chr.chr);
												this.index = chr.index + chr.size;
												this.ignoreRegExp = false;
												continue analyseChunk;
											} else if (chr.codePoint === 96) { // "`"
												this.writeToken(false);
												this.isTemplate = true;
												this.stringChr = chr.chr;
												this.writeCode(chr.chr);
												this.index = chr.index + chr.size;
												continue analyseChunk;
											} else if ((chr.codePoint === 59) || unicode.isSpace(chr.chr, curLocale)) { // ";", "{space}"
												if (this.options.keepSpaces) {
													this.writeToken(false);
												};
												let lastIndex = null;
												let hasSemi = false;
												let hasNewLine = false;
												let hasSpace = false;
												this.index = chr.index;
												doSpaces: do {
													lastIndex = chr.index + chr.size;
													if (chr.codePoint === 59) { // ";"
														hasSemi = true;
													} else if ((chr.codePoint === 10) || (chr.codePoint === 13)) { // CR/LF
														hasNewLine = true;
													} else { // Other {space}
														hasSpace = true;
													};
													chr = chr.nextChar();
													if (chr) {
														if (!chr.complete) {
															// Incomplete Unicode sequence
															break analyseChunk;
														};
													} else {
														if (eof) {
															break doSpaces;
														};
														this.prevChr = code.slice(this.index, lastIndex);
														break analyseChunk;
													};
												} while ((chr.codePoint === 59) || unicode.isSpace(chr.chr, curLocale)); // ";", "{space}"
												if (hasSemi) { // ";"
													this.sep = ';';
													this.explicitSep = true;
													if (!this.options.keepSpaces && this.isForArguments) {
														this.hasSep = false;
														this.writeToken(false);
													};
												} else if (hasNewLine) { // CR/LF
													this.newLine = true;
													if (this.token) {
														this.hasSep = false;
													};
												} else if (hasSpace && !this.sep) { // Other {space}
													this.sep = ' ';
												};
												if (this.options.keepSpaces) {
													this.explicitSep = false;
													this.sep = '';
													this.hasSep = true;
													this.newLine = false;
													this.writeCode(code.slice(this.index, lastIndex));
													this.index = lastIndex;
													continue analyseChunk;
												} else if (this.memorize > 0) {
													this.hasSep = false;
													this.writeToken(false);
												};
												continue nextChar;
											} else if ((chr.codePoint === 36) || (chr.codePoint === 95) || unicode.isAlnum(chr.chr, curLocale)) { // "$", "_", "{alnum}"
												let token = '';
												doGetToken: do {
													token += chr.chr; // build new token
													chr = chr.nextChar();
													if (chr) {
														if (!chr.complete) {
															// Incomplete Unicode sequence
															break analyseChunk;
														};
													} else {
														if (eof) {
															break doGetToken;
														};
														this.prevChr = token;
														break analyseChunk;
													};
												} while ((chr.codePoint === 36) || (chr.codePoint === 95) || unicode.isAlnum(chr.chr, curLocale)); // "$", "_", "{alnum}"
												if (token === 'for') {
													this.isFor = true;
												} else if (token === 'do') {
													this.isDo = true;
												} else {
													if (this.endBrace && ((this.sep === ' ') || (this.minifier.__endBraceKeywords.indexOf(token) >= 0) || (this.isDo && (this.minifier.__keywordsFollowingDoKeyword.indexOf(token) >= 0)))) {
														this.hasSep = true;
													};
													this.isDo = false;
													this.isFor = false;
												};
												if (this.token || this.explicitSep || this.newLine) {
													if (this.token || this.explicitSep) {
														this.hasSep = false;
													};
													if (this.minifier.__noSemiKeywords.indexOf(this.token) >= 0) {
														this.sep = ' ';
													} else if (this.newLine) {
														this.sep = ';';
													};
													this.writeToken(false); // write current token and separator
												};
												this.token = token;
												this.ignoreRegExp = (token && (this.minifier.__acceptRegExpKeywords.indexOf(token) < 0));
												continue nextChar;
											} else if ((chr.codePoint === 123) || (chr.codePoint === 40) || (chr.codePoint === 91)) { // "{", "(", "["
												if (chr.codePoint === 40) { // "("
													if (this.explicitSep || this.newLine) {
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

								if (eof) {
									if (this.isDirectiveBlock) {
										throw new types.Error("A directives block is still opened at EOF.");
									};

									if (this.isDirective) {
										this.prevChr = '';
										this.isDirective = false;
										const directive = this.directive;
										this.directive = '';
										if (directive) {
											this.runDirective(directive);
										};
									};

									if (this.isCommentBlock) {
										throw new types.Error("A comments block is still opened at EOF.");
									};

									if (this.isString) {
										throw new types.Error("A string is still opened at EOF.");
									};

									if (this.isTemplateExpression) {
										throw new types.Error("A template expression is still opened at EOF.");
									};

									if (this.isTemplate) {
										throw new types.Error("A template is still opened at EOF.");
									};

									if (this.isRegExp) {
										throw new types.Error("A regular expression is still opened at EOF.");
									};

									const prevChr = this.prevChr;
									this.prevChr = '';
									this.writeToken(false);
									if (prevChr) {
										this.writeCode(prevChr);
									};
								};
							},
						};

						const knownDirectives = this.__knownDirectives,
							directives = state.directives;

						tools.forEach(knownDirectives, function(directive, name) {
							directives[name] = types.bind(state, directive);
						});

						this.__state = state;
					}),

					reset: doodad.OVERRIDE(function reset() {
						this.__clearState();

						this._super();
					}),

					define: doodad.PUBLIC(function define(name, value) {
						this.__state.directives.DEFINE(name, value);
					}),

					undefine: doodad.PUBLIC(function undefine(name) {
						this.__state.directives.UNDEFINE(name);
					}),

					onWrite: doodad.OVERRIDE(function onWrite(ev) {
						const retval = this._super(ev);

						const data = ev.data;
						const minifierState = this.__state;

						ev.preventDefault();

						const eof = (data.raw === io.EOF);

						minifierState.parseCode(data.toString(), null, null, eof); // sync

						if (minifierState.buffer) {
							this.submit(new io.TextData(minifierState.buffer), {callback: data.defer()});
							minifierState.buffer = '';
						};

						if (eof) {
							this.__clearState();
							this.submit(new io.TextData(io.EOF), {callback: data.defer()});
						};

						return retval;
					}),
				}));


			//return function init(/*optional*/options) {
			//};
		},
	};
	return modules;
};

//! END_MODULE()
