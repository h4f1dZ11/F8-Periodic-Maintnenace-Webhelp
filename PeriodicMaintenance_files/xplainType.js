/*!
 * VERSION: 0.6.2
 * DATE: 2018-02-15
 * UPDATES AND DOCS AT: http://greensock.com
 *
 * @license Copyright (c) 2008-2018, GreenSock. All rights reserved.
 * This work is subject to the terms at http://greensock.com/standard-license or for
 * Club GreenSock members, the software agreement that was issued with your membership.
 *
 * @author: Jack Doyle, jack@greensock.com
 * @Modified: Alexander Halser, alexander.halser@ec-software.com
 */
var _gsScope=(typeof(module)!=="undefined"&&module.exports&&typeof(global)!=="undefined")?global:this||window;(_gsScope._gsQueue||(_gsScope._gsQueue=[])).push(function(){"use strict";var _getText=function(e){var type=e.nodeType,result="";if(type===1||type===9||type===11){if(typeof(e.textContent)==="string"){return e.textContent}else{for(e=e.firstChild;e;e=e.nextSibling){result+=_getText(e)}}}else if(type===3||type===4){return e.nodeValue}
return result},_emoji="[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2694-\u2697]|\uD83E[\uDD10-\uDD5D]|[\uD800-\uDBFF][\uDC00-\uDFFF]",_emojiExp=new RegExp(_emoji),_emojiAndCharsExp=new RegExp(_emoji+"|.","g"),_emojiSafeSplit=function(text,delimiter){return((delimiter===""||!delimiter)&&_emojiExp.test(text))?text.match(_emojiAndCharsExp):text.split(delimiter||"")},TextPlugin=_gsScope._gsDefine.plugin({propName:"text",API:2,version:"0.6.2",init:function(target,value,tween,index){var i=target.nodeName.toUpperCase(),shrt;if(typeof(value)==="function"){value=value(index,target)}
this._svg=(target.getBBox&&(i==="TEXT"||i==="TSPAN"));this._target=target;if(typeof(value)!=="object"){value={value:value}}
if(value.value===undefined){this._text=this._original=[""];return!0}
this._delimiter=value.delimiter||"";if(this._delimiter==""){this._original=_emojiSafeSplit(_getText(target),this._delimiter);this._text=_emojiSafeSplit(value.value,this._delimiter)}
else{this._original=_emojiSafeSplit(_getText(target).replace(/\s+/g," "),this._delimiter);this._text=_emojiSafeSplit(value.value.replace(/\s+/g," "),this._delimiter)}
this._runBackwards=(tween.vars.runBackwards===!0);if(this._runBackwards){i=this._original;this._original=this._text;this._text=i}
if(typeof(value.newClass)==="string"){this._newClass=value.newClass;this._hasClass=!0}
if(typeof(value.oldClass)==="string"){this._oldClass=value.oldClass;this._hasClass=!0}
i=this._original.length-this._text.length;shrt=(i<0)?this._original:this._text;this._fillChar=value.fillChar||(value.padSpace?"&nbsp;":"");if(i<0){i=-i}
while(--i>-1){shrt.push(this._fillChar)}
return!0},set:function(ratio){if(ratio>1){ratio=1}else if(ratio<0){ratio=0}
if(this._runBackwards){ratio=1-ratio}
var l=this._text.length,i=(ratio*l+0.5)|0,applyNew,applyOld,str,s;if(this._hasClass){applyNew=(this._newClass&&i!==0);applyOld=(this._oldClass&&i!==l);str=(applyNew?"<span class='"+this._newClass+"'>":"")+this._text.slice(0,i).join(this._delimiter)+(applyNew?"</span>":"")+(applyOld?"<span class='"+this._oldClass+"'>":"")+this._delimiter+this._original.slice(i).join(this._delimiter)+(applyOld?"</span>":"")}else{str=this._text.slice(0,i).join(this._delimiter)+this._delimiter+this._original.slice(i).join(this._delimiter)}
if(this._svg){this._target.textContent=str}else if(this._target.nodeType===3||this._target.nodeType===4){this._target.nodeValue=str}else{this._target.innerHTML=(this._fillChar==="&nbsp;"&&str.indexOf("  ")!==-1)?str.split("  ").join("&nbsp;&nbsp;"):str}}}),p=TextPlugin.prototype;p._newClass=p._oldClass=p._delimiter=""});if(_gsScope._gsDefine){_gsScope._gsQueue.pop()()}(function(name){"use strict";var getGlobal=function(){return(_gsScope.GreenSockGlobals||_gsScope)[name]};if(typeof(module)!=="undefined"&&module.exports){require("xplainAni.js");module.exports=getGlobal()}else if(typeof(define)==="function"&&define.amd){define(["TweenLite"],getGlobal)}}("TextPlugin"))