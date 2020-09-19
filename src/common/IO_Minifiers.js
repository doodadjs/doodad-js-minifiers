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
				types = doodad.Types,
				tools = doodad.Tools,
				safeEval = tools.SafeEval,
				locale = tools.Locale,
				unicode = tools.Unicode,
				io = doodad.IO,
				ioMixIns = io.MixIns,
				extenders = doodad.Extenders,
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
							const state = this.__state;
							if (tools.indexOf(state.readOnlyVariables, key) >= 0) {
								throw new types.Error("Variable '~0~' is reserved and it cannot be defined.", [key]);
							};
							state.variables[key] = value;
						},
						UNDEFINE: function UNDEFINE(key) {
							const state = this.__state;
							if (tools.indexOf(state.readOnlyVariables, key) >= 0) {
								throw new types.Error("Variable '~0~' is reserved and it cannot be undefined.", [key]);
							};
							delete state.variables[key];
						},
						SET: function SET(key) {
							const state = this.__state;
							state.directives.DEFINE(key, true);
						},
						UNSET: function UNSET(key) {
							const state = this.__state;
							state.directives.DEFINE(key, false);
						},
						BEGIN_DEFINE: function BEGIN_DEFINE(removeBlock) {
							//const state = this.__state;
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
							const state = this.__state;
							const block = this.popDirective();
							if (!block || (block.name !== 'DEFINE')) {
								throw new types.Error("Invalid 'END_DEFINE' directive.");
							};
							const memorizedCode = state.memorizedCode;
							state.memorizedCode = '';
							let retval;
							if (memorizedCode) {
								const lines = memorizedCode.split(this.newLineRegExp);
								const mem = {tmp: {}};
								for (let i = 0; i < lines.length; i++) {
									let line = lines[i];
									if (line) {
										line = line.replace(/^\s*const\s+/, 'tmp.');
										safeEval.eval(line, mem);
									};
								};
								tools.forEach(mem.tmp, function(value, key) {
									if (tools.indexOf(state.readOnlyVariables, key) >= 0) {
										throw new types.Error("Variable '~0~' is reserved and it cannot be defined.", [key]);
									};
								}, this);
								if (!block.remove) {
									retval = state.directives.INJECT(memorizedCode);
								};
								tools.extend(state.variables, mem.tmp);
							};
							return retval;
						},
						IS_DEF: function IS_DEF(key) {
							const state = this.__state;
							return types.has(state.variables, key);
						},
						IS_UNDEF: function IS_UNDEF(key) {
							const state = this.__state;
							return !types.has(state.variables, key);
						},
						IS_SET: function IS_SET(key) {
							const state = this.__state;
							return !!types.get(state.variables, key, false);
						},
						IS_UNSET: function IS_UNSET(key) {
							const state = this.__state;
							return !types.get(state.variables, key, false);
						},
						VAR: function VAR(key) {
							const state = this.__state;
							const tmp = tools.split(key, /\.|\[/g, 2);
							if (types.has(state.variables, tmp[0])) {
								return safeEval.eval(key, state.variables);
							};
						},
						EVAL: function EVAL(expr) {
							const state = this.__state;
							return safeEval.eval(expr, tools.extend({global: global, root: root}, state.variables), {allowFunctions: true, allowRegExp: true});
						},
						TO_SOURCE: function TO_SOURCE(val, /*optional*/depth) {
							//const state = this.__state;
							return tools.toSource(val, {depth});
						},
						INJECT: function INJECT(code, /*optional*/raw) {
							//const state = this.__state;
							code = types.toString(code);
							if (raw) {
								this.writeToken(false);
								this.writeCode(code);
							} else {
								const Promise = types.getPromise();
								return Promise.create(function(resolve, reject) {
									//const oldPrevChr = state.prevChr;
									//state.prevChr = '';
									this.parseCode(code, 0, false, doodad.Callback(this, function(err) {
										if (err) {
											reject(err);
										} else {
											//state.prevChr = oldPrevChr;
											resolve();
										};
									}));
								}, this);
							};
						},
						IF: function IF(val) {
							//const state = this.__state;
							this.pushDirective({
								name: 'IF',
								remove: !val,
							});
						},
						IF_DEF: function IF_DEF(key) {
							const state = this.__state;
							this.pushDirective({
								name: 'IF',
								remove: !types.has(state.variables, key),
							});
						},
						IF_UNDEF: function IF_UNDEF(key) {
							const state = this.__state;
							this.pushDirective({
								name: 'IF',
								remove: types.has(state.variables, key),
							});
						},
						IF_SET: function IF_SET(key) {
							const state = this.__state;
							this.pushDirective({
								name: 'IF',
								remove: !types.get(state.variables, key, false),
							});
						},
						IF_UNSET: function IF_UNSET(key) {
							const state = this.__state;
							this.pushDirective({
								name: 'IF',
								remove: !!types.get(state.variables, key, false),
							});
						},
						ELSE: function ELSE() {
							//const state = this.__state;
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
							//const state = this.__state;
							const block = this.popDirective();
							if (!block || (block.name !== 'IF')) {
								throw new types.Error("Invalid 'ELSE_IF' directive.");
							};
							this.pushDirective({
								name: 'IF',
								remove: !block.remove || !expr,
							});
						},
						ELSE_IF_DEF: function ELSE_IF_DEF(key) {
							const state = this.__state;
							const block = this.popDirective();
							if (!block || (block.name !== 'IF')) {
								throw new types.Error("Invalid 'ELSE_IF' directive.");
							};
							this.pushDirective({
								name: 'IF',
								remove: !block.remove || !types.has(state.variables, key),
							});
						},
						ELSE_IF_UNDEF: function ELSE_IF_UNDEF(key) {
							const state = this.__state;
							const block = this.popDirective();
							if (!block || (block.name !== 'IF')) {
								throw new types.Error("Invalid 'ELSE_IF' directive.");
							};
							this.pushDirective({
								name: 'IF',
								remove: !block.remove || types.has(state.variables, key),
							});
						},
						ELSE_IF_SET: function ELSE_IF_SET(key) {
							const state = this.__state;
							const block = this.popDirective();
							if (!block || (block.name !== 'IF')) {
								throw new types.Error("Invalid 'ELSE_IF' directive.");
							};
							this.pushDirective({
								name: 'IF',
								remove: !block.remove || !types.get(state.variables, key, false),
							});
						},
						ELSE_IF_UNSET: function ELSE_IF_UNSET(key) {
							const state = this.__state;
							const block = this.popDirective();
							if (!block || (block.name !== 'IF')) {
								throw new types.Error("Invalid 'ELSE_IF' directive.");
							};
							this.pushDirective({
								name: 'IF',
								remove: !block.remove || !!types.get(state.variables, key, false),
							});
						},
						END_IF: function END_IF() {
							//const state = this.__state;
							const block = this.popDirective();
							if (!block || (block.name !== 'IF')) {
								throw new types.Error("Invalid 'END_IF' directive.");
							};
						},
						REPLACE_BY: function REPLACE_BY(code, /*optional*/raw) {
							//const state = this.__state;
							this.pushDirective({
								name: 'REPLACE',
								remove: true,
								code: code,
								raw: raw,
							});
						},
						REPLACE_IF: function REPLACE_IF(condition, code, /*optional*/raw) {
							//const state = this.__state;
							this.pushDirective({
								name: 'REPLACE',
								remove: !!condition,
								code: code,
								raw: raw,
							});
						},
						END_REPLACE: function END_REPLACE() {
							const state = this.__state;
							const block = this.popDirective();
							if (!block || (block.name !== 'REPLACE')) {
								throw new types.Error("Invalid 'END_REPLACE' directive.");
							};
							let retval;
							if (block.remove) {
								retval = state.directives.INJECT(block.code, block.raw);
							};
							return retval;
						},
						BEGIN_REMOVE: function BEGIN_REMOVE() {
							//const state = this.__state;
							this.pushDirective({
								name: 'REMOVE',
								remove: true,
							});
						},
						REMOVE_IF: function REMOVE_IF(condition) {
							//const state = this.__state;
							this.pushDirective({
								name: 'REMOVE',
								remove: !!condition,
							});
						},
						END_REMOVE: function END_REMOVE() {
							//const state = this.__state;
							const block = this.popDirective();
							if (!block || (block.name !== 'REMOVE')) {
								throw new types.Error("Invalid 'END_REMOVE' directive.");
							};
						},
						FOR_EACH: function FOR_EACH(iter, itemName, /*optional*/keyName) {
							//const state = this.__state;
							this.writeToken(false);
							this.pushDirective({
								name: 'FOR',
								iter: iter,
								itemName: itemName,
								keyName: keyName,
							});
						},
						END_FOR: function END_FOR() {
							const state = this.__state;
							const block = this.popDirective();
							if (!block || (block.name !== 'FOR')) {
								throw new types.Error("Invalid 'END_FOR' directive.");
							};
							const memorizedCode = state.memorizedCode;
							state.memorizedCode = '';
							let retval;
							if (memorizedCode && block.iter) {
								if (state.directives.IS_DEF(block.itemName)) {
									throw new types.Error("Variable '~0~' already defined.", [block.itemName]);
								};
								if (block.keyName && state.directives.IS_DEF(block.keyName)) {
									throw new types.Error("Variable '~0~' already defined.", [block.keyName]);
								};
								const Promise = types.getPromise();
								retval = Promise.map(block.iter, function(item, key) {
									state.directives.DEFINE(block.itemName, item);
									if (block.keyName) {
										state.directives.DEFINE(block.keyName, key);
									};
									return state.directives.INJECT(memorizedCode);
								}, {thisObj: this, concurrency: 1})
									.then(function(dummy) {
										state.directives.UNDEFINE(block.itemName);
										if (block.keyName) {
											state.directives.UNDEFINE(block.keyName);
										};
									}, null, this);
							};
							return retval;
						},
						MAP: function MAP(ar, varName) {
							//const state = this.__state;
							this.writeToken(false);
							this.pushDirective({
								name: 'MAP',
								array: ar,
								varName: varName,
							});
						},
						END_MAP: function END_MAP() {
							const state = this.__state;
							const block = this.popDirective();
							if (!block || (block.name !== 'MAP')) {
								throw new types.Error("Invalid 'END_MAP' directive.");
							};
							const memorizedCode = state.memorizedCode;
							state.memorizedCode = '';
							const ar = block.array,
								arLen = (ar ? ar.length : 0);
							let retval;
							if (memorizedCode && (arLen > 0)) {
								if (state.directives.IS_DEF(block.varName)) {
									throw new types.Error("Variable '~0~' already defined.", [block.varName]);
								};
								const Promise = types.getPromise();
								retval = Promise.map(ar, function(item, key) {
									state.directives.DEFINE(block.varName, item);
									return state.directives.INJECT(memorizedCode)
										.then(function(dummy) {
											let retval;
											if (key < (arLen - 1)) {
												retval = state.directives.INJECT(',');
											};
											return retval;
										});
								}, {thisObj: this, concurrency: 1})
									.then(function(dummy) {
										state.directives.UNDEFINE(block.varName);
									}, null, this);
							};
							return retval;
						},
					}, extenders.ExtendObject)),

					beginMemorizeDirectives: doodad.PUBLIC(doodad.ATTRIBUTE([
						'BEGIN_DEFINE',
						'FOR_EACH',
						'MAP',
					], extenders.UniqueArray)),

					endMemorizeDirectives: doodad.PUBLIC(doodad.ATTRIBUTE([
						'END_DEFINE',
						'END_FOR',
						'END_MAP',
					], extenders.UniqueArray)),

					endBraceKeywords: doodad.PUBLIC(doodad.ATTRIBUTE([
						'else',
						'catch',
						'finally',
						'until',
					], extenders.UniqueArray)),

					keywordsFollowingDoKeyword: doodad.PUBLIC(doodad.ATTRIBUTE([
						'while',
					], extenders.UniqueArray)),

					noSemiKeywords: doodad.PUBLIC(doodad.ATTRIBUTE([
						'var',
						'let',
						'const',
					], extenders.UniqueArray)),

					acceptRegExpKeywords: doodad.PUBLIC(doodad.ATTRIBUTE([
						'return',
						'yield',
					], extenders.UniqueArray)),

					newLineChars: doodad.PUBLIC(doodad.ATTRIBUTE([
						'\n',
						'\r',
						'\u2028',
						'\u2029',
					], extenders.UniqueArray)),

					newLineRegExp: doodad.PUBLIC(/\n|\r|\u2028|\u2029/g),

					setOptions: doodad.OVERRIDE(function setOptions(options) {
						types.getDefault(options, 'runDirectives', types.getIn(this.options, 'runDirectives', false));
						types.getDefault(options, 'keepComments', types.getIn(this.options, 'keepComments', false));
						types.getDefault(options, 'keepSpaces', types.getIn(this.options, 'keepSpaces', false));
						//TODO: types.getDefault(options, 'removeEmptyLines', types.getIn(this.options, 'removeEmptyLines', false));

						this._super(options);
					}),

					pushLevel: doodad.PROTECTED(function pushLevel(name) {
						const state = this.__state;
						state.levelStack.push({
							name: name,
							isTemplate: state.isTemplate,
							isTemplateExpression: state.isTemplateExpression,
							isForArguments: state.isForArguments,
							isDo: state.isDo,
						});
						state.isTemplate = false;
						state.isTemplateExpression = false;
						if (state.isFor) {
							state.isFor = false;
							state.isForArguments = true;
						} else {
							state.isForArguments = false;
						};
						state.isDo = false;
					}),

					popLevel: doodad.PROTECTED(function popLevel(name) {
						const state = this.__state;
						const level = state.levelStack.pop() || tools.nullObject();
						// TODO: if (name !== level.name) { ??? };
						state.isTemplate = !!level.isTemplate;
						state.isTemplateExpression = !!level.isTemplateExpression;
						state.isForArguments = !!level.isForArguments;
						state.isDo = !!level.isDo;
					}),

					getDirective: doodad.PROTECTED(function getDirective(/*optional*/name) {
						const state = this.__state;
						if (name) {
							return tools.getItem(state.directiveStack, function(block) {
								return block.name === name;
							});
						} else {
							return state.directiveStack[0];
						};
					}),

					pushDirective: doodad.PROTECTED(function pushDirective(newBlock) {
						const state = this.__state;
						if (!newBlock.name) {
							throw new types.Error("Missing a name to new block.");
						};
						const block = this.getDirective();
						newBlock.remove = newBlock.remove || block.remove;
						if (newBlock.remove) {
							newBlock.token = state.token;
							newBlock.sep = state.sep;
							newBlock.explicitSep = state.explicitSep;
							newBlock.hasSep = state.hasSep;
							newBlock.newLine = state.newLine;
							newBlock.endBrace = state.endBrace;
						};
						state.directiveStack.unshift(newBlock);
					}),

					popDirective: doodad.PROTECTED(function popDirective() {
						const state = this.__state;
						if (state.directiveStack <= 1) {
							return null;
						};
						const block = state.directiveStack.shift();
						if (block.remove) {
							state.token = block.token;
							state.sep = block.sep;
							state.explicitSep = block.explicitSep;
							state.hasSep = block.hasSep;
							state.newLine = block.newLine;
							state.endBrace = block.endBrace;
						};
						return block;
					}),

					writeCode: doodad.PROTECTED(function writeCode(code) {
						const state = this.__state;
						if (state.memorize > 0) {
							state.memorizedCode += code;
							if (state.newLine) {
								state.memorizedCode += this.options.newLine;
								state.newLine = false;
							};
						} else if (!this.getDirective().remove) {
							state.buffer += code;
						};
						state.hasSep = false;
					}),

					writeToken: doodad.PROTECTED(function writeToken(/*optional*/noSep) {
						const state = this.__state;
						if (noSep || state.hasSep) {
							this.writeCode(state.token);
						} else {
							this.writeCode(state.token + state.sep);
						};
						state.prevChr = '';
						state.token = '';
						state.sep = '';
						state.explicitSep = false;
						state.newLine = false;
						state.endBrace = false;
						state.hasSep = true;
					}),

					runDirective: doodad.PROTECTED(function runDirective(directive) {
						const state = this.__state;
						let retval;
						if (this.options.runDirectives) {
							directive = tools.trim(directive.replace(/^\s*/, ''));
							if (directive) {
								const name = tools.split(directive, '(', 2)[0].trim();
								if (tools.indexOf(this.endMemorizeDirectives, name) >= 0) {
									this.writeToken(false);
									state.memorize--;
								};
								if (state.memorize === 0) {
									try {
										retval = safeEval.eval(directive, state.directives, null, {allowRegExp: true, allowFunctions: true});
									} catch(ex) {
										throw new types.ParseError("The directive '~0~' has failed to execute : ~1~", [directive, ex.stack]);
									};
								} else {
									state.memorizedCode += '/*!' + directive + '*/';
								};
								if (tools.indexOf(this.beginMemorizeDirectives, name) >= 0) {
									state.memorize++;
								};
							};
						};
						return retval;
					}),

					parseCode: doodad.PROTECTED(function parseCode(code, start, eof, callback) {
						const state = this.__state;
						const curLocale = locale.getCurrent();

						state.index = _shared.Natives.mathMax(start, 0);

						if (state.prevChr) {
							code = state.prevChr + code.slice(state.index);
							state.index = 0;
							state.prevChr = '';
						};

						const end = code.length;

						let deferredEnd = false;

						analyseChunk: while (state.index < end) {
							let chr = unicode.nextChar(code, state.index, end);
							if (state.isDirective || state.isDirectiveBlock) {
								nextCharDirective: while (chr) {
									if (!chr.complete) {
										// Incomplete Unicode sequence
										break analyseChunk;
									};
									if (state.isDirectiveBlock && ((state.prevChr + chr.chr) === '*/')) {
										state.prevChr = '';
										state.isDirectiveBlock = false;
										const directive = state.directive;
										state.directive = '';
										if (directive) {
											const retval = this.runDirective(directive);
											if (types.isPromise(retval)) {
												// Wait for directive to execute.
												const oldChr = chr;
												deferredEnd = true;
												retval.nodeify(function(err, dummy) {
													if (err) {
														callback(err);
													} else {
														this.parseCode(code, oldChr.index + oldChr.size, eof, callback);
													};
												}, this);
												break analyseChunk;
											};
										};
										state.index = chr.index + chr.size;
										continue analyseChunk;
									} else if (state.prevChr) { // '*'
										state.directive += state.prevChr;
										state.prevChr = '';
										continue nextCharDirective;
									} else if (state.isDirectiveBlock && (chr.chr === '*')) {
										// Wait next char
										state.prevChr = chr.chr;
									} else if (tools.indexOf(this.newLineChars, chr.chr) >= 0) {
										state.prevChr = '';
										state.isDirective = false;
										const isDirectiveBlock = state.isDirectiveBlock;
										state.isDirectiveBlock = false;
										const directive = state.directive;
										state.directive = '';
										if (directive) {
											const retval = this.runDirective(directive);
											if (types.isPromise(retval)) {
												// Wait for directive to execute.
												const oldChr = chr;
												deferredEnd = true;
												retval.nodeify(function(err, dummy) {
													if (err) {
														callback(err);
													} else {
														if (isDirectiveBlock) {
															state.isDirectiveBlock = true;
														};
														this.parseCode(code, oldChr.index + oldChr.size, eof, callback);
													};
												}, this);
												break analyseChunk;
											};
										};
										if (isDirectiveBlock) {
											state.isDirectiveBlock = true;
										} else {
											state.index = chr.index + chr.size;
											continue analyseChunk;
										};
									} else {
										state.directive += chr.chr;
									};
									chr = chr.nextChar();
								};
								break analyseChunk;
							} else if (state.isComment) {
								while (chr) {
									if (!chr.complete) {
										// Incomplete Unicode sequence
										break analyseChunk;
									};
									if (tools.indexOf(this.newLineChars, chr.chr) >= 0) {
										state.isComment = false;
										if (this.options.keepComments) {
											this.writeToken(false);
											this.writeCode(code.slice(state.index, chr.index + chr.size));
											state.index = chr.index + chr.size;
										} else {
											state.index = chr.index;
										};
										continue analyseChunk;
									};
									chr = chr.nextChar();
								};
								if (!chr && this.options.keepComments) {
									this.writeToken(false);
									this.writeCode(code.slice(state.index));
								};
								break analyseChunk;
							} else if (state.isCommentBlock) {
								nextCharCommentBlock: while (chr) {
									if (!chr.complete) {
										// Incomplete Unicode sequence
										break analyseChunk;
									};
									if ((state.prevChr + chr.chr) === '*/') {
										state.prevChr = '';
										state.isCommentBlock = false;
										if (this.options.keepComments) {
											this.writeToken(false);
											this.writeCode(code.slice(state.index, chr.index + chr.size));
										};
										state.index = chr.index + chr.size;
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
								if (!chr) {
									if (this.options.keepComments) {
										this.writeToken(false);
										this.writeCode(code.slice(state.index));
									};
								};
								break analyseChunk;
							} else if (state.isString || state.isTemplate) {
								while (chr) {
									if (!chr.complete) {
										// Incomplete Unicode sequence
										break analyseChunk;
									};
									if (state.isString && (tools.indexOf(this.newLineChars, chr.chr) >= 0)) {
										// NOTE: "new line" can be "\r\n" or "\n\r", so there is no condition on "state.isEscaped"
										// Multi-Line String. New line is removed. It assumes new line is escaped because otherwise it is a synthax error.
										// Exemple :
										//     const a = "Hello \
										//     world !"
										this.writeCode(code.slice(state.index, chr.index));
										state.index = chr.index + chr.size;
										continue analyseChunk;
									} else if (state.isEscaped) {
										// Skip escaped character.
										state.isEscaped = false;
									} else if (chr.chr === '\\') {
										// Character escape. Will skip the following character in case it is "'", '"' or "`". Other escapes ("\n", "\u...", ...) are not harmfull.
										state.isEscaped = true;
									} else if (state.isTemplate && ((state.prevChr + chr.chr) === '${')) {
										state.prevChr = '';
										this.pushLevel('{');
										state.isTemplateExpression = true;
										this.writeCode(code.slice(state.index, chr.index + chr.size));
										state.index = chr.index + chr.size;
										continue analyseChunk;
									} else if (state.isTemplate && (chr.chr === '$')) {
										state.prevChr = chr.chr;
									} else if (chr.chr === state.stringChr) {
										state.isString = false;
										state.isTemplate = false;
										this.writeCode(code.slice(state.index, chr.index + chr.size));
										state.index = chr.index + chr.size;
										continue analyseChunk;
									} else {
										state.prevChr = '';
									};
									chr = chr.nextChar();
								};
								if (!chr) {
									this.writeCode(code.slice(state.index));
								};
								break analyseChunk;
							} else if (state.isRegExp || state.isRegExpEnd) {
								while (chr) {
									if (!chr.complete) {
										// Incomplete Unicode sequence
										break analyseChunk;
									};
									if (state.isRegExpEnd) {
										// Flags
										const lowerChrAscii = unicode.codePointAt(chr.chr.toLowerCase(), 0).codePoint;
										if ((lowerChrAscii < 97) || (lowerChrAscii > 122)) { // "a", "z"
											state.isRegExpEnd = false;
											state.isRegExp = false;
											this.writeCode(code.slice(state.index, chr.index));
											state.index = chr.index;
											continue analyseChunk;
										};
									} else if (state.isEscaped) {
										state.isEscaped = false;
									} else if (chr.chr === '\\') {
										state.isEscaped = true;
									} else if (state.isCharSequence) {
										if (chr.chr === ']') {
											state.isCharSequence = false;
										};
									} else if (chr.chr === '[') {
										state.isCharSequence = true;
									} else if (chr.chr === '/') {
										state.isRegExp = false;
										state.isRegExpEnd = true;
									};
									chr = chr.nextChar();
								};
								if (!chr) {
									this.writeCode(code.slice(state.index));
								};
								break analyseChunk;
							} else {
								nextChar: while (chr) {
									if (!chr.complete) {
										// Incomplete Unicode sequence
										break analyseChunk;
									};
									if (((state.prevChr + chr.chr) === '//') || ((state.prevChr + chr.chr) === '/*')) {
										// Wait for the next char
										state.prevChr += chr.chr;
										chr = chr.nextChar();
										continue nextChar;
									} else if (((state.prevChr + chr.chr) === '//!') || ((state.prevChr + chr.chr) === '/*!')) {
										if ((state.prevChr + chr.chr) === '/*!') {
											state.isDirectiveBlock = true;
										} else {
											state.isDirective = true;
										};
										state.prevChr = '';
										state.directive = '';
										state.index = chr.index + chr.size;
										continue analyseChunk;
									} else if ((state.prevChr + chr.chr).slice(0, 2) === '//') {
										state.prevChr = '';
										state.isComment = true;
										if (!this.options.keepComments) {
											state.index = chr.index;
										};
										continue analyseChunk;
									} else if ((state.prevChr + chr.chr).slice(0, 2) === '/*') {
										state.prevChr = '';
										state.isCommentBlock = true;
										if (!this.options.keepComments) {
											state.index = chr.index;
										};
										continue analyseChunk;
									} else if (!state.ignoreRegExp && (state.prevChr === '/')) {
										this.writeToken(false);
										this.writeCode('/');
										state.prevChr = '';
										state.isRegExp = true;
										state.isRegExpEnd = false;
										state.index = chr.index;
										continue analyseChunk;
									} else if (((chr.codePoint === 43) || (chr.codePoint === 45)) && ((state.prevChr + chr.chr) === (chr.chr + chr.chr))) { // "++", "--"
										this.writeToken(false);
										state.prevChr = '';
										this.writeCode(chr.chr + chr.chr);
										state.ignoreRegExp = false;
									} else if ((state.prevChr === '/') || (state.prevChr === '+') || (state.prevChr === '-')) { // "/", "+", "-"
										const prevChr = state.prevChr;
										state.prevChr = '';
										this.writeToken(!state.explicitSep);
										this.writeCode(prevChr);
										state.hasSep = true;
										state.ignoreRegExp = false;
										continue nextChar;
									} else if ((chr.codePoint === 47) || (chr.codePoint === 43) || (chr.codePoint === 45)) { // "/", "+", "-"
										// Wait for the next char
										state.index = chr.index; // for "this.options.keepComments"
										state.prevChr = chr.chr;
										chr = chr.nextChar();
										continue nextChar;
									} else if ((chr.codePoint === 34) || (chr.codePoint === 39)) { // '"', "'"
										if (state.explicitSep || state.newLine) {
											state.hasSep = false;
										};
										this.writeToken(false);
										state.isString = true;
										state.stringChr = chr.chr;
										this.writeCode(chr.chr);
										state.index = chr.index + chr.size;
										state.ignoreRegExp = false;
										continue analyseChunk;
									} else if (chr.codePoint === 96) { // "`"
										if (state.explicitSep || state.newLine) {
											state.hasSep = false;
										};
										this.writeToken(false);
										state.isTemplate = true;
										state.stringChr = chr.chr;
										this.writeCode(chr.chr);
										state.index = chr.index + chr.size;
										state.ignoreRegExp = false;
										continue analyseChunk;
									} else if ((chr.codePoint === 59) || unicode.isSpace(chr.chr, curLocale)) { // ";", "{space}"
										if (this.options.keepSpaces || (state.memorize > 0)) {
											this.writeToken(false);
										};
										let lastIndex = null;
										let hasSemi = false;
										let hasNewLine = false;
										let hasSpace = false;
										state.index = chr.index;
										doSpaces: do {
											lastIndex = chr.index + chr.size;
											if (chr.codePoint === 59) { // ";"
												hasSemi = true;
												if (state.isForArguments && !this.options.keepSpaces && (state.memorize <= 0)) {
													chr = chr.nextChar();
													break doSpaces;
												};
											} else if (tools.indexOf(this.newLineChars, chr.chr) >= 0) { // New line
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
												state.prevChr = code.slice(state.index, lastIndex);
												break analyseChunk;
											};
										} while ((chr.codePoint === 59) || unicode.isSpace(chr.chr, curLocale)); // ";", "{space}"
										if (this.options.keepSpaces || (state.memorize > 0)) {
											state.explicitSep = false;
											state.sep = '';
											state.hasSep = true;
											state.newLine = false;
											this.writeCode(code.slice(state.index, lastIndex));
											state.index = lastIndex;
											continue analyseChunk;
										} else if (hasSemi) { // ";"
											state.sep = ';';
											state.explicitSep = true;
											if (state.isForArguments) {
												state.hasSep = false;
												this.writeToken(false);
											};
										} else if (hasNewLine) { // CR/LF
											state.newLine = true;
											if (state.token) {
												state.hasSep = false;
											};
										} else if (hasSpace && !state.sep) { // Other {space}
											state.sep = ' ';
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
												state.prevChr = token;
												break analyseChunk;
											};
										} while ((chr.codePoint === 36) || (chr.codePoint === 95) || unicode.isAlnum(chr.chr, curLocale)); // "$", "_", "{alnum}"
										if (token === 'for') {
											state.isFor = true;
										} else if (token === 'do') {
											state.isDo = true;
										} else {
											if (state.endBrace && ((state.sep === ' ') || (this.endBraceKeywords.indexOf(token) >= 0) || (state.isDo && (this.keywordsFollowingDoKeyword.indexOf(token) >= 0)))) {
												state.hasSep = true;
											};
											state.isDo = false;
											state.isFor = false;
										};
										if (state.token || state.explicitSep || state.newLine) {
											if (state.token || state.explicitSep) {
												state.hasSep = false;
											};
											if (this.noSemiKeywords.indexOf(state.token) >= 0) {
												state.sep = ' ';
											} else if (state.newLine) {
												state.sep = ';';
											};
											this.writeToken(false); // write current token and separator
										};
										state.token = token;
										state.ignoreRegExp = (token && (this.acceptRegExpKeywords.indexOf(token) < 0));
										continue nextChar;
									} else if ((chr.codePoint === 123) || (chr.codePoint === 40) || (chr.codePoint === 91)) { // "{", "(", "["
										if (state.sep !== ';') {
											state.hasSep = true;
										} else if (state.explicitSep || state.newLine) {
											state.hasSep = false;
										};
										this.writeToken(false);
										this.writeCode(chr.chr);
										if (chr.codePoint === 40) { // "("
											this.pushLevel('(');
										} else if (chr.codePoint === 123) { // "{"
											this.pushLevel('{');
										};
										state.hasSep = true;
										state.ignoreRegExp = false;
									} else if ((chr.codePoint === 125) || (chr.codePoint === 41) || (chr.codePoint === 93)) { // "}", ")", "]"
										if (chr.codePoint === 41) { // ")"
											this.popLevel('(');
										} else if (chr.codePoint === 125) { // "}"
											this.popLevel('{');
											if (state.isTemplateExpression) {
												state.stringChr = '`';
												this.writeToken(true);
												this.writeCode(chr.chr);
												state.index = chr.index + chr.size;
												continue analyseChunk;
											};
										};
										this.writeToken(true);
										this.writeCode(chr.chr);
										if (chr.codePoint === 125) { // "}"
											state.endBrace = true;
										};
										state.ignoreRegExp = true;
									} else if ((chr.codePoint === 33) || (chr.codePoint === 126)) { // "!", "~"
										// OP+TOKEN
										if (state.explicitSep || state.newLine) {
											state.hasSep = false;
										};
										this.writeToken(false);
										this.writeCode(chr.chr);
										state.hasSep = true;
										state.ignoreRegExp = false;
									} else { // TOKEN+OP+TOKEN : "=", "==", "===", "!=", "!==", "%", "*", "&", "^", "^=", "&=", "|", "|=", "&&", "||", "^", '<', '>', '<=', '>=', '<<', '>>', '<<=', '>>=', '>>>=', '<<<', '>>>', '.', ',', '+=', '-=', '*=', '/=', '%=', '**', '**=', "?", ":"
										// ",", "."
										this.writeToken(!state.explicitSep);
										this.writeCode(chr.chr);
										state.hasSep = true;
										state.ignoreRegExp = false;
									};
									chr = chr.nextChar();
								};
								break analyseChunk;
							};
						};

						const onEnd = function(err, dummy) {
							if (!err && eof) {
								if (state.isCommentBlock) {
									throw new types.Error("A comments block is still opened at EOF.");
								};

								if (state.isString) {
									throw new types.Error("A string is still opened at EOF.");
								};

								if (state.isTemplateExpression) {
									throw new types.Error("A template expression is still opened at EOF.");
								};

								if (state.isTemplate) {
									throw new types.Error("A template is still opened at EOF.");
								};

								if (state.isRegExp) {
									throw new types.Error("A regular expression is still opened at EOF.");
								};

								if (state.isForArguments || state.isFor) {
									throw new types.Error("A for statement is still opened at EOF.");
								};

								if (state.levelStack.length > 0) {
									throw new types.Error("A '$0' is still opened at EOF.", [state.levelStack[state.levelStack.length - 1].name]);
								};

								const prevChr = state.prevChr;
								state.prevChr = '';
								if (state.explicitSep || state.newLine) {
									state.hasSep = false;
								};
								this.writeToken(false);
								if (prevChr) {
									this.writeCode(prevChr);
								};
							};

							callback(err);
						};

						if (!deferredEnd) {
							if (eof) {
								if (state.isDirectiveBlock) {
									throw new types.Error("A directives block is still opened at EOF.");
								};

								if (state.isDirective) {
									state.prevChr = '';
									state.isDirective = false;
									const directive = state.directive;
									state.directive = '';
									if (directive) {
										const retval = this.runDirective(directive);
										if (types.isPromise(retval)) {
											retval.nodeify(onEnd, this);
											return;
										};
									};
								};
							};

							onEnd.call(this, null, null);
						};
					}),

					__clearState: doodad.PROTECTED(function() {
						const state = {
							index: 0,
							variables: {},
							directives: {},
							readOnlyVariables: [],

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
							hasSep: true,
							sep: '',
							explicitSep: false,
							newLine: false,
							endBrace: false,

							isTemplateExpression: false,
							isFor: false,
							isForArguments: false,
							isDo: false,
							levelStack: [],

							isDirective: false,
							isDirectiveBlock: false,
							directive: '',
							directiveStack: [{
								name: '',
								remove: false,
							}],

							memorize: 0,
							memorizedCode: '',
						};

						const knownDirectives = this.__knownDirectives,
							directives = state.directives;

						tools.forEach(knownDirectives, function(directive, name) {
							directives[name] = doodad.Callback(this, directive);
						}, this);

						this.__state = state;
					}),

					reset: doodad.OVERRIDE(function reset() {
						this.__clearState();

						this._super();
					}),

					define: doodad.PUBLIC(function define(name, value, /*optional*/readOnly) {
						const state = this.__state;
						if (readOnly === undefined) {
							readOnly = true;
						};
						if (readOnly && (tools.indexOf(state.readOnlyVariables, name) < 0)) {
							state.readOnlyVariables.push(name);
						};
						state.variables[name] = value;
					}),

					undefine: doodad.PUBLIC(function undefine(name) {
						const state = this.__state;
						delete state.variables[name];
					}),

					onWrite: doodad.OVERRIDE(function onWrite(ev) {
						const retval = this._super(ev);

						const state = this.__state;
						const data = ev.data;

						ev.preventDefault();

						const eof = (data.raw === io.EOF);

						const deferCb1 = data.defer(),
							deferCb2 = data.defer();

						this.parseCode(data.toString(), 0, eof, doodad.Callback(this, function(err) {
							if (err) {
								deferCb1(err);
								//deferCb2(err);
							} else {
								if (state.buffer) {
									this.submit(new io.TextData(state.buffer), {callback: deferCb1});
									state.buffer = '';
								} else {
									deferCb1();
								};

								if (eof) {
									this.__clearState();
									this.submit(new io.TextData(io.EOF), {callback: deferCb2});
								} else {
									deferCb2();
								};
							};
						}));

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
