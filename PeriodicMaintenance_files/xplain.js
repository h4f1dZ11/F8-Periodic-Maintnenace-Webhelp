//----------------------------------------------------------//
//  XPLAIN.JS Animation script for HelpXPlain presentations.
//  Version: 1.5
//  Copyright EC Software GmbH 2018-2019
//----------------------------------------------------------//

(function ( document, window ) {
	
    var pfx = (function() {
        
        var style = document.createElement('dummy').style,
            prefixes = 'Webkit Moz O ms Khtml'.split(' '),
            memory = {};
        
        return function( prop ) {
            if ( typeof memory[ prop ] === "undefined" ) {
                
                var ucProp  = prop.charAt(0).toUpperCase() + prop.substr(1),
                    props   = (prop + ' ' + prefixes.join(ucProp + ' ') + ucProp).split(' ');
                
                memory[ prop ] = null;
                for ( var i in props ) {
                    if ( style[ props[i] ] !== undefined ) {
                        memory[ prop ] = props[i];
                        break;
                    }
                }
            
            }
            
            return memory[ prop ];
        };
    
    })();

    var css = function( el, props ) {
        var key, pkey;
        for ( key in props ) {
            if ( props.hasOwnProperty(key) ) {
                pkey = pfx(key);
                if ( pkey !== null ) {
                    el.style[pkey] = props[key];
                }
            }
        }
        return el;
    };
	
	var data = function( obj, key ) { 
		var value; 
		if(!obj.dataset) {
			value = obj.getAttribute("data-" + key); 
		}
		else {
			value = obj.dataset[key]; 
		}
		return value; 
	};
	
	
	initXplain = function(enableKeys, autoLoop, pushHistory) {

		var ua = navigator.userAgent.toLowerCase();
		var xplainSupported = ( pfx("transform") !== null );  //&& ( document.body.getElementsByClassName );
		var xplain3d =        ( pfx("perspective") !== null );  // browser supports CSS 3D transtorms 
								//( ua.search(/(iphone)|(ipod)|(ipad)/) === -1 );
		var notsupported = function() { return false };
		
		if (!xplainSupported) {
			var fallbackmessage = document.getElementById('fallbackmessage');
			if (fallbackmessage) {
				css(fallbackmessage, { display: 'block' });
			}
			return { goto: notsupported, 
					 prev: notsupported, 
					 next: notsupported, 
					 navigate: notsupported, 
					 play: notsupported, 
					 stop: notsupported, 
					 reload: notsupported,
					 share: notsupported,
					 gofullscreen: notsupported, 
					 exitfullscreen: notsupported, 
					 addEventListener: notsupported,
					 removeEventListener: notsupported,
					 //show: notsupported, 
					 //hide: notsupported,
					 animateTo: notsupported,
					 animateFromTo: notsupported,
					 set: notsupported,
					 slideDuration: notsupported
					};
		}
		
		var windowHash = window.location.hash;
		if (windowHash.indexOf('?') > -1) {
			windowHash = windowHash.substr(1, windowHash.indexOf('?')-1);
		}
		var autoPlayAfter = 0;
		if (window.location.href.indexOf('?autoplay=') > -1) {
			autoPlayAfter = parseFloat(window.location.href.substring(window.location.href.indexOf('?autoplay=')+10));
		}
		var backgroundbase = document.getElementById('xplbackgroundbase');
		var background = document.getElementById('xplbackground');
		var base = document.getElementById('xplbase');
		var canvas = document.getElementById('xplcanvas');
		var frames = Array.prototype.slice.call(document.getElementsByClassName("xplframe"));
		frames.sort(function(a,b) {
			var aIndex = parseInt(data(a, 'frameindex')),
				bIndex = parseInt(data(b, 'frameindex'));
			if (aIndex < bIndex) { 
				return -1;
			}
			if (aIndex > bIndex) { 
				return 1;
			}
			return 0;
		});
		for (i = 0; i < frames.length; i++) {
			frames[i].cx = data(frames[i], 'framecx');
			frames[i].cy = data(frames[i], 'framecy');
			frames[i].w  = data(frames[i], 'framew');
			frames[i].h  = data(frames[i], 'frameh');
			frames[i].r  = data(frames[i], 'framer');
			frames[i].position = data(frames[i], 'frameposition');
			frames[i].duration = data(frames[i], 'frametrans');
			frames[i].zoomout = data(frames[i], 'framezoomout');
			frames[i].displayTime = data(frames[i], 'frameshow');
			frames[i].nextFrame = data(frames[i], 'framenext');
			frames[i].animateIn = [];
			frames[i].animateOut = [];
			frames[i].dirty = true;
		} 				
		var playerControls = document.getElementById('xplplayercontrols');
		if ((playerControls) && (xplainSupported)) css(playerControls, { display: 'block' });
		var autoPlayTimer,
			autoPlaying = false,
			imagesLoaded = false,
			isFullScreen = false;
		var currentFrame = -1,
			currentFrameDuration = 4,
			currentScale = 1,
		    currentRotation = 0,
			currentTransX = 0,
			currentTransY = 0,
			currentFrameRate = 60,
			currentTimeline,
			tickerStartFrame = 0
			tickerStartTime = 0.1;
		var eventHandler = [];
		
		var touchSurface = {
			startX: 0,
			startY: 0,
			startTime: 0,
			touchInit: false
		}	
		
		var addEventListener = function( name, handler ) {
			var event = new Object();
			event.name = name;
			event.handler = handler;
			eventHandler.push(event);
		}
		var removeEventListener = function( name, handler ) {
			for (i = 0; i < eventHandler.length; i++) {
				if ((eventHandler[i].name == name) && (eventHandler[i].handler == handler)) {
					eventHandler.splice(i, 1);
				}
			}
		}
		var dispatchCustomEvent = function( name, data1, data2 ) {
			for (i = 0; i < eventHandler.length; i++) {
				if (eventHandler[i].name == name) {
					return eventHandler[i].handler(data1, data2);
				}
			}
		}

		var getPlayerControlsHeight = function() {
			var h = ((playerControls) && (data(playerControls, 'overlay')!=1)) ? playerControls.offsetHeight : 0;
			return h; 
		}
		var getPlayerControlsTopOffset = function() {
			var topOffset = ((playerControls) && (data(playerControls, 'overlay')!=1) && (playerControls.offsetTop == 0)) ? playerControls.offsetHeight : 0;
			return topOffset; 
		}
		var enableButton = function( button, value ) {
			if (button) {
				var cn = button.className;
				cn = cn.replace(' enabled', '').replace(' disabled', '') + (value ?  ' enabled' : ' disabled');
				button.className = cn;
			}
		}
		var enableNavButtons = function() {
			enableButton(document.getElementById('xplplayerprev'), (currentFrame > 0) && imagesLoaded);
			enableButton(document.getElementById('xplplayernext'), (findNextFrame() > -1) && imagesLoaded);
		}
		var enablePlayButton = function( value ) {
			enableButton(document.getElementById('xplplayerplay'), value && imagesLoaded);
			enableButton(document.getElementById('xplplayerstop'), !value && imagesLoaded);
			enableNavButtons();
		}
		var enableFullScreenButton = function( value ) {
			enableButton(document.getElementById('xplplayergofullscreen'), value);
			enableButton(document.getElementById('xplplayerexitfullscreen'), !value);
		}
		var showLoading = function() {
			enableButton(document.getElementById('xplplayerloading'), !imagesLoaded);
		}

		var getAbsoluteScale = function( frame ) {
			var wScale = window.innerWidth / frame.w,
				hScale = (window.innerHeight-getPlayerControlsHeight()) / frame.h,
				scale = hScale > wScale ? wScale : hScale;
				if (frame.position == 'margin') { scale = scale * 0.9 }
				if (frame.position == 'fill')   { scale = hScale < wScale ? wScale : hScale }
			return scale;
		};
		
		var setActiveFrame = function(newIndex) {
			for (i = 0; i < frames.length; i++) {
				var c = document.getElementById('xplthumb' + i);
				if (c) { 
					if (i==newIndex) c.className = 'active';
					else c.className = '';
				}
			}
		}
		
		var getFrameFromString = function( str ) {
			str = str.replace(/[^\d]/g,"");
			return (isNaN(str)||(str < 1)||(str > frames.count)) ? 0 : str-1;
		}

		var resetAnimationStack = function( from ) {
			
			function doReset(animationStack) {
				for (i = 0; i < animationStack.length; i++) {
					switch(animationStack[i].kind) {
						case 'hide':
						case 'fadeout':
						case 'scaleby':
						case 'rotateby':
						case 'moveto':
						case 'moveby':
						case 'movefrom':
							TweenLite.set(animationStack[i].obj, {visibility: 'visible'});
							break;
						case 'stroke':
							TweenLite.set(animationStack[i].obj, {display: 'none'});
							break;
						default:
							TweenLite.set(animationStack[i].obj, {visibility: 'hidden'});
					}
					switch(animationStack[i].kind) {
						case 'fadeout':
							TweenLite.set(animationStack[i].obj, {opacity: (animationStack[i].orgo)?animationStack[i].orgo:1});
					}
					switch(animationStack[i].kind) {
						case 'scaleby':
						case 'drag':
							TweenLite.set(animationStack[i].obj, {scale: (animationStack[i].orgs)?animationStack[i].orgs:1});
					}
					switch(animationStack[i].kind) {
						case 'moveleft':
						case 'movetop':
						case 'moveright':
						case 'movebottom':
						case 'moveto':
						case 'moveby':
							TweenLite.set(animationStack[i].obj, {left: animationStack[i].orgx, top: animationStack[i].orgy });
							break;
						case 'movefrom':
							TweenLite.set(animationStack[i].obj, {left: animationStack[i].value1, top: animationStack[i].value2 });
							break;
						case 'size':
							TweenLite.set(animationStack[i].obj, {left: animationStack[i].orgx, top: animationStack[i].orgy, width: animationStack[i].orgw, height: animationStack[i].orgh });
							break;
					}
				}
			}
			
			for (f = from; f < frames.length; f++) {
				if (frames[f].dirty) {
					doReset(frames[f].animateIn);
					doReset(frames[f].animateOut);
					frames[f].dirty = false;
				}
			}
		}
		
		var frameAnimateStack = function( index, moveIn ) {
			var animationStack = (moveIn) ? frames[index].animateIn : frames[index].animateOut;
			if (animationStack) {
				if (moveIn) frames[index].dirty = true;
				var t = new TimelineLite();
				
				var totalTime = 0, ft = 0;
				for (i = 0; i < animationStack.length; i++) {
					ft = parseFloat(animationStack[i].duration) + parseFloat( (animationStack[i].delay > 0) ? animationStack[i].delay : -animationStack[i].delay );
					totalTime = (totalTime < ft) ? ft : totalTime;
				}
				for (i = 0; i < animationStack.length; i++) {
					var animationDelay = (animationStack[i].delay >= 0) ? animationStack[i].delay : totalTime + parseFloat(animationStack[i].delay),
					    animationEase = null;
					switch (animationStack[i].ease.toLowerCase()) {
						case 'power1.easeout':
							animationEase = CustomEase.create("Power1.EaseOut", "M0,0,C0.104,0.204,0.492,1,1,1");
							break;
						case 'power2.easeout':
							animationEase = CustomEase.create("Power2.EaseOut", "M0,0,C0.126,0.382,0.282,0.674,0.44,0.822,0.632,1.002,0.818,1,1,1");
							break;
						case 'back.easeout':
							animationEase = CustomEase.create("Back.EaseOut", "M0,0,C0.128,0.572,0.257,1.016,0.512,1.09,0.672,1.136,0.838,1,1,1");
							break;
						case 'elastic.easeout':
							animationEase = CustomEase.create("Elastic.EaseOut", "M0,0,C0,0,0.049,0.675,0.085,1.115,0.122,1.498,0.156,1.34,0.16,1.322,0.189,1.193,0.203,1.111,0.23,0.978,0.262,0.818,0.303,0.876,0.307,0.882,0.335,0.925,0.349,0.965,0.38,1.006,0.43,1.088,0.484,1.022,0.53,0.997,0.58,0.964,0.667,1.002,0.725,1.004,0.829,1.008,1,1,1,1");
							break;
						case 'bounce.easeout':
							animationEase = CustomEase.create("Bounce.EaseOut", "M0,0 C0.14,0 0.242,0.438 0.272,0.561 0.313,0.728 0.354,0.963 0.362,1 0.37,0.985 0.414,0.873 0.455,0.811 0.51,0.726 0.573,0.753 0.586,0.762 0.662,0.812 0.719,0.981 0.726,0.998 0.788,0.914 0.84,0.936 0.859,0.95 0.878,0.964 0.897,0.985 0.911,0.998 0.922,0.994 0.939,0.984 0.954,0.984 0.969,0.984 1,1 1,1");
							break;
					}
					
					switch (animationStack[i].kind) {
						case 'show':
							t.to(animationStack[i].obj, 0, {visibility: 'visible' }, animationDelay);
							break;

						case 'hide':
							t.to(animationStack[i].obj, 0, {visibility: 'hidden' }, animationDelay);
							break;

						case 'fadein':
							var o = animationStack[i].obj.style.opacity;
							if (!o) { o = 1 };
							t.to(animationStack[i].obj, 0, {opacity: 0}, animationDelay);
							t.to(animationStack[i].obj, 0, {visibility: 'visible' }, animationDelay);
							t.to(animationStack[i].obj, animationStack[i].duration, {opacity: o}, animationDelay);
							break;

						case 'fadeout':
							resultVisible = false;
							var o = animationStack[i].obj.style.opacity;
							if (!o) { o = 1 };
							t.fromTo(animationStack[i].obj, animationStack[i].duration, {opacity: o}, {opacity: 0}, animationDelay);
							t.to(animationStack[i].obj, 0, {visibility: 'hidden' }, parseFloat(animationStack[i].duration) + parseFloat(animationDelay));
							break;

						case 'stroke':
							t.to(animationStack[i].obj, 0, {display: 'block' }, animationDelay);
							var c =  animationStack[i].obj.children,
							    svg = (c.length > 0) ? c[0] : null;
							if (svg) { 
								var pathList = svg.childNodes; 
								if (pathList) {
									for (p = 0; p < pathList.length; p++) {
										if ((pathList[p].tagName == 'path') || (pathList[p].tagName == 'rect') || (pathList[p].tagName == 'ellipse')) {
											switch (data(pathList[p], 'type')) {
											case 'startcap':
												break;
											case 'endcap':
												t.to(pathList[p], 0, {visibility: 'hidden'}, 0);
												t.to(pathList[p], 0, {visibility: 'visible'}, parseFloat(animationStack[i].duration) + parseFloat(animationDelay));
												break;
											default:
												t.fromTo(pathList[p], animationStack[i].duration, {drawSVG:"0 0"}, {drawSVG:"0% 100%"}, animationDelay);
												break;
											}
										}
									}
								}
							}
							break;

						case 'typetext':
							function collectText(root, func) {
								var node = root;
								start: while (node) {
									func(node);
									if (node.firstChild) {
										node = node.firstChild;
										continue start;
									}
									while (node) {
										if (node === root) {
											break start;
										}
										if (node.nextSibling) {
											node = node.nextSibling;
											continue start;
										}
										node = node.parentNode;
									}
								}
							}
							
							var c = [],
							    len = 0;
								
							collectText(animationStack[i].obj.querySelector("div"), function (node) { 
								if ((node.nodeValue) && (node.nodeValue != "") && (node.nodeValue.trim() != "")) { 
									c.push(node); 
									len = len + node.nodeValue.length;
								}
								if ((c.length > 0) && ((node.tagName == 'P') || (node.tagName == 'LI') || (node.tagName == 'DIV'))) {
									c.push(null); 
									len = len + 10;
								}
							});	
							var tmpDuration = animationStack[i].duration / len,
								tmpDelay = 0;
							
							t.to(animationStack[i].obj, 0, {visibility: 'visible' }, animationDelay);
							for (n = 0; n < c.length; n++) {
								if (c[n] != null) {
									var newText = c[n].nodeValue,
										nodeDelay = parseFloat(animationDelay) + parseFloat(tmpDelay),
										nodeDuration = parseFloat(tmpDuration * newText.length);
									t.to(c[n], 0, {text: ''}, animationDelay);
									t.to(c[n], nodeDuration, {text: newText}, nodeDelay);
									tmpDelay = parseFloat(tmpDelay + nodeDuration);
								}
								else {
									tmpDelay = parseFloat(tmpDelay + tmpDuration*10);
								}
							}
							break;
							
						case 'svgstroke':
						case 'svgdraw':
							t.to(animationStack[i].obj, 0, {visibility: 'visible' }, animationDelay);
							var c =  animationStack[i].obj.children,
							    svg = (c.length > 0) ? c[0].contentDocument : null;
							if (svg) { 
								var pathList = svg.querySelectorAll('path, line, polyline, polygon, rect, ellipse'); 
								if (pathList.length > 0) {
									var tmpDuration = parseFloat(animationStack[i].duration / pathList.length);
									for (p = 0; p < pathList.length; p++) {
										switch (animationStack[i].kind) {
										case 'svgstroke':
											pathList[p].setAttribute('data-fill', pathList[p].getAttribute('fill')); 
											pathList[p].setAttribute('fill', 'none'); 
											t.fromTo(pathList[p], tmpDuration, {drawSVG:"0 0"}, {drawSVG:"0 100%"}, animationDelay)
											 .call(function(obj) {obj.setAttribute('fill', obj.getAttribute('data-fill'))}, [pathList[p]]);
											break;
										case 'svgdraw':
											t.fromTo(pathList[p], tmpDuration, {opacity: 0}, {opacity: 1}, animationDelay);
											break;
										}
										animationDelay = animationDelay + tmpDuration; 
									}
								}
							}
							break;
							
						case 'size':
							var newL = parseFloat(animationStack[i].orgx),
							    newT = parseFloat(animationStack[i].orgy),
								newW = parseFloat(animationStack[i].value1),
								newH = parseFloat(animationStack[i].value2);
							if (newW < 0) { newL = newL + newW; newW = -newW }
							if (newH < 0) { newT = newT + newH; newH = -newH }
							t.to(animationStack[i].obj, animationStack[i].duration, {left: newL, top: newT, width: newW, height: newH, visibility: 'visible', ease: animationEase}, animationDelay);
							break;

							
						case 'scale':
							var s = parseFloat(data(animationStack[i].obj, 'scale'));
							t.to(animationStack[i].obj, 0, {scale: s/20 }, animationDelay);
							t.to(animationStack[i].obj, 0, {visibility: 'visible' }, animationDelay);
							t.fromTo(animationStack[i].obj, animationStack[i].duration, {scale: s/20}, {scale: s}, animationDelay);
							break;

						case 'scaleby':
							var s = parseFloat(data(animationStack[i].obj, 'scale')),
							    s2 = parseFloat(animationStack[i].value1);
							t.fromTo(animationStack[i].obj, animationStack[i].duration, {scale: s}, {scale: s2}, animationDelay);
							break;
							
						case 'rotate':
							var s = parseFloat(data(animationStack[i].obj, 'scale')),
								r = parseFloat(data(animationStack[i].obj, 'rotate'));
							t.to(animationStack[i].obj, 0, {scale: s/20, visibility: 'visible'}, animationDelay);
							t.fromTo(animationStack[i].obj, animationStack[i].duration, {scale: s/20,rotation: r-360}, {scale: s,rotation: r}, animationDelay);
							break;

						case 'rotateby':
							var r = parseFloat(data(animationStack[i].obj, 'rotate')),
							    r2 = r + parseFloat(animationStack[i].value1);
							t.fromTo(animationStack[i].obj, animationStack[i].duration, {rotation: r}, {rotation: r2}, animationDelay);
							break;
						
						case 'drag':
							var s = parseFloat(data(animationStack[i].obj, 'scale')),
							    s2 = parseFloat(animationStack[i].value1);
							t.to(animationStack[i].obj, 0, {visibility: 'visible' }, 0);
							t.fromTo(animationStack[i].obj, animationStack[i].duration, {scale: s}, {scale: s2}, animationDelay);
							break;

						case 'flash':
						case 'dblflash':
							var s = parseFloat(data(animationStack[i].obj, 'scale'));
							t.to(animationStack[i].obj, 0, {scale: s/20 }, animationDelay);
							t.to(animationStack[i].obj, 0, {visibility: 'visible' }, animationDelay);
							if (animationStack[i].kind=='flash') {
								t.fromTo(animationStack[i].obj, animationStack[i].duration, {scale: s/20}, {scale: s}, animationDelay);
							}
							else {
								t.fromTo(animationStack[i].obj, animationStack[i].duration/2, {scale: s/20}, {scale: s}, animationDelay);
								t.fromTo(animationStack[i].obj, animationStack[i].duration/2, {scale: s/20}, {scale: s}, parseFloat(animationDelay) + animationStack[i].duration/2);
							}
							t.to(animationStack[i].obj, 0, {visibility: 'hidden' }, parseFloat(animationStack[i].duration) + parseFloat(animationDelay));
							break;
							
						case 'moveto':
							t.fromTo(animationStack[i].obj, animationStack[i].duration, {left: animationStack[i].orgx, top: animationStack[i].orgy}, {left: animationStack[i].value1, top: animationStack[i].value2, ease: animationEase}, animationDelay);
							break;

						case 'moveby':
							t.fromTo(animationStack[i].obj, animationStack[i].duration, {left: animationStack[i].orgx, top: animationStack[i].orgy}, {left: animationStack[i].orgx + parseFloat(animationStack[i].value1), top: animationStack[i].orgy + parseFloat(animationStack[i].value2), ease: animationEase}, animationDelay);
							break;

						case 'movefrom':
							t.fromTo(animationStack[i].obj, animationStack[i].duration, {left: animationStack[i].value1, top: animationStack[i].value2}, {left: animationStack[i].orgx, top: animationStack[i].orgy, ease: animationEase}, animationDelay);
							break;

						default:
							var endX = animationStack[i].obj.offsetLeft,
								endY = animationStack[i].obj.offsetTop,
								startX = 0,
								startY = 0,
								parentRotation = 0,
								parentScale = 1;
								par = animationStack[i].obj.parentElement;
							
							while ((par) && (par != canvas)) {
								parentRotation = parentRotation + parseFloat(data(par, 'rotate')); 
								parentScale = parentScale * parseFloat(data(par, 'scale')); 
								par = par.parentElement;
							}
							parentRotation = (parentRotation-frames[index].r);
							parentScale = (parentScale/getAbsoluteScale(frames[index]));
							var si = Math.sin(-parentRotation * Math.PI / 180),
								co = Math.cos(-parentRotation * Math.PI / 180);
								
							var dx = (window.innerWidth > window.innerHeight) ? window.innerWidth : window.innerHeight,
								dy = dx;
							
							switch (animationStack[i].kind) {
							case 'moveleft':
								startX = endX - (co * dx * parentScale);
								startY = endY - (si * dx * parentScale);
								break;
							case 'moveright':
								startX = endX + (co * dx * parentScale);
								startY = endY + (si * dy * parentScale);
								break;
							case 'movetop':
								startX = endX - (si * dx * parentScale);
								startY = endY - (co * dy * parentScale);
								break;
							case 'movebottom':
								startX = endX + (si * dx * parentScale);
								startY = endY + (co * dy * parentScale);
								break;
							}
							t.to(animationStack[i].obj, 0, {left: startX, top: startY}, animationDelay);
							t.to(animationStack[i].obj, 0, {visibility: 'visible' }, animationDelay);
							t.to(animationStack[i].obj, animationStack[i].duration, {left: endX, top: endY, ease: animationEase}, animationDelay);
					}
				}
				return t;
			}
			else return null;
		}
		
		var animationComplete = function( index, totalDuration, animateStack ) {
			TweenLite.ticker.removeEventListener("tick", updateTicker);
			dispatchCustomEvent('onmoved', index, frames.length);
			if (animateStack) frameAnimateStack(index, true);
		}
		var updateTicker = function() {
			if (currentTimeline) {
				var f = parseInt(TweenLite.ticker.frame-tickerStartFrame),
				    t = TweenLite.ticker.time-tickerStartTime,
					fps = f/t;
				
				//if (console) console.log('#' + f + ' fps = ' + fps + '  (supposed fps = ' +currentFrameRate+')'  );
				
				if (f > 5) {
					if (fps < currentFrameRate*0.9) {
						if (currentFrameRate > 20) {
							currentFrameRate = currentFrameRate-5;
							TweenLite.ticker.fps(currentFrameRate);
						}
						else {
							TweenLite.ticker.removeEventListener("tick", updateTicker); //remove it, we do not go below FPS 20
						}
						var s = currentTimeline.timeScale();
						if (s < 1.5) currentTimeline.timeScale(s*1.07);
						//if (console) console.log('  -> modified timeScale= ' + s + ' fps= ' + currentFrameRate);
					}
				}
			}
		}
		
		
		var executeGotoFrame = function( index, animate, duration, animateStack ) {
			if (animateStack) {	resetAnimationStack(index); }
			dispatchCustomEvent('onmoving', index, frames.length);
			window.scrollTo(0, 0);
			//TweenLite.lagSmoothing(100, 10);
			//TweenLite.ticker.useRAF(false);
			currentFrameRate = 60;
			TweenLite.ticker.fps(currentFrameRate);
			//if (console) console.clear();			

			var hideObjects = false;
			if (hideObjects) {
				for (i = 0; i < frames.length; i++) {
					if ((i == currentFrame) || (i == index)) { 
						css(frames[i], { display: 'block' });
					}
					else {
						css(frames[i], { display: 'none' });
					}
				} 		
			} 		
			
			//center canvas in viewport (window client width minus player controls)
			var cy = (window.innerHeight-getPlayerControlsHeight());
			css(base, { top: (cy/2+getPlayerControlsTopOffset()) + 'px' });
			if (backgroundbase) {
				css(backgroundbase, { top: cy/2 + 'px' });
			}
			var idx = index;
			// If we are going back, use animation option of currentFrame
			if ((currentFrame > -1)  && ((index > 0) || ((index == 0) && (currentFrame != frames.length-1)))&& (index < currentFrame)) {
				idx = currentFrame;
				duration = frames[idx].duration;
			}
			var zoomOut = (frames[idx].zoomout) ? frames[idx].zoomout : 0,
				nScale = getAbsoluteScale(frames[index]),
				nRotation = -frames[index].r,
				nX = -frames[index].cx,
				nY = -frames[index].cy;
			if (background) {
				var cw = data(background, 'cw'), 
				    ch = data(background, 'ch'), 
					bd = data(background, 'distance'), 
					bw = background.offsetWidth,
					bh = background.offsetHeight,
					wScale = window.innerWidth / cw,
					hScale = (window.innerHeight-getPlayerControlsHeight()) / ch,
					canvasToViewRatio = hScale > wScale ? wScale : hScale,
					relativeCanvasScale = nScale/canvasToViewRatio,
					relativeBackgroundScale = (((relativeCanvasScale-1) / 100 * (100-(bd*1)))+1),
					nbScale = relativeBackgroundScale * canvasToViewRatio,
					offsetX = (nX / 100 * (100-bd)),
					offsetY = (nY / 100 * (100-bd)),
					nbX = -bw/2 + offsetX,
					nbY = -bh/2 + offsetY;
			}
			
			/* Zoom & Move
				   Slide1 100% -> Slide2 80% (zoom in)  -> move first, then zoom/rotate
				   Slide1 80% -> Slide2 100% (zoom out) -> zoom/rotate first, then move 
			*/				
			if (animate) {
				var cSineInOut = "M0,0,C0.2,0,0.374,0.306,0.507,0.512,0.652,0.738,0.822,1,1,1",
				    cSineOut = "M0,0,C0.266,0.412,0.436,0.654,0.565,0.775,0.609,0.816,0.78,1,1,1",
				    cSineIn = "M0,0,C0.434,0.004,0.79,0.698,1,1";
					//cBackIn = "M0,0,C0.078,-0.218,0.438,-0.317,0.612,-0.208,0.84,-0.064,0.832,0.19,1,1",
					//cBackIn2 = "M0,0,C0.17,-0.282,0.276,-0.337,0.482,-0.326,0.9,-0.302,0.832,0.19,1,1",
					//cBackOut = "M0,0,C0.128,0.572,0.257,1.016,0.512,1.09,0.672,1.136,0.838,1,1,1",
					//cBackOut2 = "M0,0,C0.132,0.578,0.116,1.078,0.326,1.232,0.46,1.33,0.842,1.31,1,1",
					//cExpoInOut = "M0,0,C0.25,0,0.294,0.023,0.335,0.05,0.428,0.11,0.466,0.292,0.498,0.502,0.532,0.73,0.586,0.88,0.64,0.928,0.679,0.962,0.698,1,1,1";
				
				var sScale = cSineInOut,
					sMove = cSineInOut,
					//sRot = cSineInOut;
					sRot = "M0,0,C0.496,0,0.609,0.272,0.7,0.5,0.786,0.716,0.822,1,1,1";
					
				// If we move AND zoom > 10% difference, let's zoom out a little bit
				if (((Math.abs(currentTransX-nX) > 100) || (Math.abs(currentTransY-nY) > 100)) && (((nScale/currentScale) < 0.9) || ((nScale/currentScale) > 1.1))) 
					zoomOut = 0.5; 
				if (zoomOut > 0) {					
					duration = duration * (1.3 + zoomOut/3);					
					var yScale = 1;
					if (nScale < currentScale) {				
						yScale = yScale + (0.3*zoomOut / (currentScale/nScale-1) );
						sScale = "M0,0,C0.2,0,0.1," + yScale + ",0.5," +yScale + ",0.9," + yScale + ",0.9,1,1,1";   //back.out
					}
					else {
						if (nScale == currentScale) nScale = nScale + .00001;
						yScale = (0.3*zoomOut / (nScale/currentScale-1) );
						sScale = "M0,0,C0.1,0,0.1,-" + yScale +",0.4,-" + yScale + ",0.9,-" + yScale + ",0.9,1,1,1";  //back.in
					}
				}
				else {
					if (currentScale < nScale*0.9) {
						sScale = cSineIn;
						sMove = cSineOut;
					}
					if (currentScale > nScale*1.1) {
						sScale = cSineOut;
						sMove = cSineIn;
					}
					if ((currentRotation != nRotation) && ((Math.abs(currentTransX-nX) < 100) && (Math.abs(currentTransY-nY) < 100))) {
						sScale = cSineInOut;
						sMove = cSineInOut;
					}
					if ((currentScale > nScale) && (currentScale > nScale*0.7) && (Math.abs(currentRotation - nRotation) < 90)) { 
						if (currentScale/nScale < 2) {
							sMove = cSineOut;
						}
					}
				}
				var eScale = CustomEase.create("scale", sScale),
				    eMove = CustomEase.create("move", sMove),
					eRot = CustomEase.create("rotate", sRot); 
				
				currentTimeline = new TimelineLite();
				currentTimeline.timeScale(1);
				// Monitor speed 
				TweenLite.ticker.addEventListener("tick", updateTicker);
				tickerStartFrame = TweenLite.ticker.frame;
				tickerStartTime = TweenLite.ticker.time;
					
				if (background) {
					if (xplain3d) { currentTimeline.to(backgroundbase, duration, {rotationZ: nRotation, ease: eRot}, 0); }
					else          { currentTimeline.to(backgroundbase, duration, {rotation: nRotation, ease: eRot}, 0); }
					currentTimeline.to(backgroundbase, duration, {scale: nbScale, ease: eScale}, 0);
					currentTimeline.to(background, duration, {x: nbX, y:nbY, ease: eMove}, 0);
				}
				if (xplain3d) { currentTimeline.to(base, duration, {rotationZ: nRotation, ease: eRot}, 0); }
				else            { currentTimeline.to(base, duration, {rotation: nRotation, ease: eRot}, 0); }
				currentTimeline.to(base, duration, {scale: nScale, ease: eScale}, 0);
				currentTimeline.to(canvas, duration, {x: nX, y:nY, ease: eMove, onComplete: animationComplete, onCompleteParams:[index,duration,animateStack]}, 0);
			}
			else {
				if (background) {
					if (xplain3d) { TweenLite.set(backgroundbase, {scale: nbScale, rotationZ: nRotation}); }
					else            { TweenLite.set(backgroundbase, {scale: nbScale, rotation: nRotation}); }
					TweenLite.set(background, {x: nbX, y:nbY});
				}
				if (xplain3d) { TweenLite.set(base, {scale: nScale, rotationZ: nRotation}); }
				else            { TweenLite.set(base, {scale: nScale, rotation: nRotation}); }
				TweenLite.set(canvas, {x: nX, y:nY});
				dispatchCustomEvent('onmoved', index, frames.length);
				if (animateStack) frameAnimateStack(index, true);
			}

			setActiveFrame(index);
			currentFrame = index;
			currentScale = nScale;
		    currentRotation = nRotation;
			currentTransX = nX;
			currentTransY = nY;

			windowHash = '#' + (index+1);
			if (pushHistory) window.location.hash = windowHash;

			enableNavButtons();
			var prgind = document.getElementById('xplplayerprogressindicator');
			if (prgind) {
				if (animate) { css(prgind, { transition: duration + 's ease' }) }
				else { css(prgind, { transition: '' }) }
				css(prgind, { width: (index+1)/frames.length*100 + '%' });
			}
		}
		
		var gotoFrame = function( index, animate, duration, animateStack ) {
			var t;
			if ((animateStack) && (currentFrame > -1) && (index > currentFrame)) { 
				var t = frameAnimateStack(currentFrame, false );
			}
			if (t) { 
				t.eventCallback('onComplete', executeGotoFrame, [index, animate, duration, animateStack]); 
			}
			else executeGotoFrame(index, animate, duration, animateStack); 
		}
		
		var gotoFrameAnimated = function( index, animateStack ) {
			if ((index > -1) && (index < frames.length)) {
				var aniDuration = parseFloat(frames[index].duration);
				gotoFrame( index, true, aniDuration, animateStack );
			}
		}
		var prevFrame = function() {
			if (currentFrame > 0) { gotoFrameAnimated(currentFrame-1, true) }
		}
		var findNextFrame = function() {
			var aFrame = -1;
			if (frames[currentFrame].nextFrame) {
				aFrame = parseInt(frames[currentFrame].nextFrame);
			}
			else {
				if (currentFrame < frames.length-1) { aFrame = currentFrame + 1 }
				else if (autoLoop) { aFrame = 0; }
			}
			var newFrame = dispatchCustomEvent('onnextslide', aFrame);
			if ((newFrame > -1) && (newFrame < frames.length)) { aFrame = newFrame; };
			return aFrame;
		}

		var nextFrame = function() {
			var aFrame = findNextFrame();
			if (aFrame > -1) { 
				if (aFrame == 0) { resetAnimationStack(0); } //when moving forward, reset animation stack when we start over at frame #0
				gotoFrameAnimated(aFrame, true) 
			}
		}

		var navClick = function(dir) {
			if (autoPlaying) { stopAutoPlay() }  //stop autoplay when prev or next button is clicked
			(dir < 0) ? prevFrame() : nextFrame();
		}
		
		var startAutoPlay = function(frameToGo, Delay) {
			if (!autoPlaying) { enablePlayButton(false) }
			autoPlaying = true;
			if ((Delay) && (Delay > 0)) { 
				currentFrameDuration = Delay
			}
			else {
				if (!frameToGo) { 
					frameToGo = findNextFrame(); 
					if (frameToGo == -1) frameToGo = 0;  //when Play button is clicked and we are on the last slide, rewind
				}
				if (frameToGo > -1) {
					if (frameToGo == 0) { resetAnimationStack(0); } 
					gotoFrameAnimated(frameToGo, true);
					currentFrame = frameToGo;
					currentFrameDuration = parseFloat(frames[frameToGo].displayTime);
				}
				else { currentFrameDuration = 0; }
			}
			if (currentFrameDuration > 0) {
				/* check if animated objects take longer to anmiate than the frame stays */
				for (i = 0; i < frames[currentFrame].animateIn.length; i++) {
					var d = parseFloat(frames[currentFrame].animateIn[i].delay) + parseFloat(frames[currentFrame].animateIn[i].duration);
					if (d > currentFrameDuration) {
						currentFrameDuration = d;
					}
				}
				autoPlayTimer = setTimeout( function(){ 

					function doStartAutoPlay() {
						if ((currentFrameDuration > 0) && (currentFrame < frames.length-1 || autoLoop)) { startAutoPlay() }
						else { stopAutoPlay() }
					}
					if (imagesLoaded) { 
						doStartAutoPlay(); 
					}
					else {
						var insurance = 0;
						var imagesCheck = setInterval(function(){
						  insurance++;
						  if (imagesLoaded) {
							clearInterval(imagesCheck);
							doStartAutoPlay();
						  }
						if (insurance > 600) {  /* wait until images loaded */
						   clearInterval(imagesCheck);
						   doStartAutoPlay();
						}
						},100);				
					}
				}, currentFrameDuration*1000);
			}
			else { 
				stopAutoPlay(); 
			}
		}

		var stopAutoPlay = function() {
			clearTimeout(autoPlayTimer);
			autoPlaying = false;
			enablePlayButton(true);
		} 
		
		var getFrameDuration = function(index) {
			if (index = 'last') { index = frames.length-1 }
			return frames[index].displayTime;
		} 
		
		var restartAutoPlay = function() {
			startAutoPlay(0, 0);
		}
		
		var preloadImages = function(imgs) {
			
			function preloadDone() {
				imagesLoaded = true;
				enablePlayButton(!autoPlaying);
				enableNavButtons();
				showLoading();
				if (prgind) {
					css(prgind, { width: (currentFrame+1)/frames.length*100 + '%' });
				}
			}
			
			var remaining = imgs.length;
			if (remaining == 0) {
				preloadDone();
			}
			else {
				var prgind = document.getElementById('xplplayerprogressindicator');
				for (var i = 0; i < imgs.length; i++) {
					var img = new Image();
					img.onload = function() {
						--remaining;
						if (prgind) {
							css(prgind, { width: (imgs.length-remaining+1)/imgs.length*100 + '%' });
						}
						if (remaining <= 0) {
							preloadDone();
						}
					};
					img.onerror = img.onload;
					img.src = imgs[i].src;
				}
			}
		}
		
		var checkFullScreenChanged = function() {
			//return (window.outerWidth === screen.width && window.outerHeight === screen.height);
			var fe = (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement),
			    fs = true;
			if (!fe) { fs = false; }
			if (fs != isFullScreen) {
				isFullScreen = fs;
				enableFullScreenButton(!isFullScreen);
				//When returning from full screen mode with autoplay on, stop it.
				if ((!isFullScreen) && (autoPlaying)) { 
					stopAutoPlay(); 
				}
			}
		}
	
		var goFullScreen = function() {
			var element = document.body;
			if (element.requestFullscreen) 
				element.requestFullscreen();
			else if(element.mozRequestFullScreen)
				element.mozRequestFullScreen();
			else if(element.webkitRequestFullscreen)
				element.webkitRequestFullscreen();
			else if(element.msRequestFullscreen)
				element.msRequestFullscreen();
		}
		var exitFullScreen = function() {
			if(document.exitFullscreen)
				document.exitFullscreen();
			else if(document.mozCancelFullScreen)
				document.mozCancelFullScreen();
			else if(document.webkitExitFullscreen)
				document.webkitExitFullscreen();
			else if(document.msExitFullscreen)
				document.msExitFullscreen();
		}
		
		var shareLink = function(target) {
			var title = document.title,
				url = window.location;
			switch(target) {
				case 'facebook':
					window.open('https://www.facebook.com/sharer.php?u=' + encodeURI(url), '_blank');
					break;
				case 'twitter':
					window.open('https://twitter.com/intent/tweet/?text=' + encodeURIComponent(title), '_blank');
					break;
				case 'linkedin':
					window.open('https://www.linkedin.com/shareArticle?mini=true&url=' + encodeURI(url) + '&title=' + encodeURIComponent(title), '_blank');
					break;
				case 'xing':
					window.open('https://www.xing.com/social_plugins/share?url=' + encodeURI(url), '_blank');
					break;
				case 'email':
					window.location.href = 'mailto:?subject=' + encodeURIComponent(title) + '&body=' + encodeURI(url);
					break;
			}
		}
		
		// Prevent default keydown action when one of supported key is pressed.
		if (enableKeys) {
			document.addEventListener("keydown", function ( event ) {
				if (( event.keyCode >= 32 && event.keyCode <= 34 ) || (event.keyCode >= 37 && event.keyCode <= 40)) {
					event.preventDefault();
				}
			}, false);		

			document.addEventListener("keyup", function( event ) {
				if ( event.keyCode === 9 || ( event.keyCode >= 32 && event.keyCode <= 34 ) || (event.keyCode >= 37 && event.keyCode <= 40) ) {
					switch( event.keyCode ) {
						case 33: // pg up
						case 37: // left
						case 38: // up
							if (autoPlaying) { stopAutoPlay() }  //stop autoplay when prev/next key is pressed
							prevFrame();
							break;
						case 34: // pg down
						case 39: // right
						case 40: // down
							if (autoPlaying) { stopAutoPlay() }  //stop autoplay when prev/next key is pressed
							nextFrame();
							break;
						case 32: // space
							if (autoPlaying) stopAutoPlay();
							else if (document.getElementById('xplplayerplay')) startAutoPlay();
							break;
					}
					
					event.preventDefault();
				}
			}, false);
			
			document.addEventListener('touchstart', function(e) {
				touchSurface.startX = e.changedTouches[0].screenX;
				touchSurface.startY = e.changedTouches[0].screenY;
				touchSurface.startTime = new Date().getTime();
				if (!touchSurface.touchInit) {
					touchSurface.touchInit = true;
					//init touch CSS
				}
			}, false);

			document.addEventListener('touchend', function(e) {
				var dist = e.changedTouches[0].screenX - touchSurface.startX,
					elapsedTime = new Date().getTime() - touchSurface.startTime;
				if ((elapsedTime < 200) && ((dist > 30) || (dist < -30))) { 
					if (dist < -30) { nextFrame() } else if (dist > 30) { prevFrame() };
					e.preventDefault();
				}
			}, false);		
		}
		
		// rescale presentation when window is resized
		window.addEventListener("resize", function() {
			gotoFrame( currentFrame, false, 0.2, false);
			checkFullScreenChanged();
		}, false);

		window.addEventListener("hashchange", function() {
			if (window.location.hash !== windowHash) {
				windowHash = window.location.hash;
				currentFrame = getFrameFromString(windowHash);
				gotoFrameAnimated(currentFrame, true);
			}
		}, false);
		
		//INIT Xplain and goto frame 0
		if (xplainSupported) {
			if (backgroundbase) { 
			  css(backgroundbase, { display: 'block' }); 
			}
			css(base, { display: 'block' });	
			var firstFrame = getFrameFromString(windowHash),
				items = document.getElementsByClassName("xplitem");
			for (i = 0; i < items.length; i++) {
				if (xplain3d) {
					css(items[i], { transform: 'scale3d(' + data(items[i], 'scale') + ',' + data(items[i], 'scale') + ',1) rotateZ(' + data(items[i], 'rotate') + 'deg)' });
				} 		
				var frameIn = data(items[i], 'framein');
				if (frameIn) {
					var inValues = frameIn.split(','),
					    inObject = new Object();
					inObject.obj = items[i];
					inObject.kind = inValues[1];
					inObject.value1 = inValues[2];
					inObject.value2 = inValues[3];
					inObject.duration = inValues[4];
					inObject.delay = inValues[5];
					inObject.ease = inValues[6];
					inObject.step = inValues[7];
					if (inObject.obj.tagName.toUpperCase() == 'SVG') {
						var box = inObject.obj.getBBox();
						inObject.orgx = box.x;
						inObject.orgy = box.y;
						inObject.orgw = box.width;
						inObject.orgh = box.height;
					}
					else {
						inObject.orgx = inObject.obj.offsetLeft;
						inObject.orgy = inObject.obj.offsetTop;
						inObject.orgw = inObject.obj.width;
						inObject.orgh = inObject.obj.height;
					}
					inObject.orgs = data(inObject.obj, 'scale');
					inObject.orgo = inObject.obj.style.opacity;
					frames[parseInt(inValues[0])].animateIn.push(inObject);
				}
				var frameOut = data(items[i], 'frameout');
				if (frameOut) {
					var outValues = frameOut.split(','),
					    outObject = new Object();
					outObject.obj = items[i];
					outObject.kind = outValues[1];
					outObject.value1 = outValues[2];
					outObject.value2 = outValues[3];
					outObject.duration = outValues[4];
					outObject.delay = outValues[5];
					outObject.ease = outValues[6];
					if (outObject.obj.tagName.toUpperCase() == 'SVG') {
						var box = outObject.obj.getBBox();
						outObject.orgx = box.x;
						outObject.orgy = box.y;
						outObject.orgw = box.width;
						outObject.orgh = box.height;
					}
					else {
						outObject.orgx = outObject.obj.offsetLeft;
						outObject.orgy = outObject.obj.offsetTop;
						outObject.orgw = outObject.obj.width;
						outObject.orgh = outObject.obj.height;
					}
					outObject.orgs = data(outObject.obj, 'scale');
					outObject.orgo = outObject.obj.style.opacity;
					frames[parseInt(outValues[0])].animateOut.push(outObject);
				}
			}
			resetAnimationStack( firstFrame );
			gotoFrame( firstFrame, false, 0, true );
			enablePlayButton(false);
			enableNavButtons();
			showLoading();
			preloadImages( canvas.getElementsByTagName("img") );
			
			if (autoPlayAfter > 0) {
				startAutoPlay(1, autoPlayAfter);
			}
			checkFullScreenChanged();
			
			return { goto: gotoFrameAnimated, 
			         prev: prevFrame, 
					 next: nextFrame, 
					 navigate: navClick, 
					 play: startAutoPlay, 
					 stop: stopAutoPlay,
					 reload: restartAutoPlay,
					 share: shareLink,
					 gofullscreen: goFullScreen,
					 exitfullscreen: exitFullScreen,
					 addEventListener: addEventListener,
					 removeEventListener: removeEventListener,
					 //show: makeVisible,
					 //hide: makeHidden
					 animateTo: TweenLite.to,
					 animateFromTo: TweenLite.fromTo,
					 set: TweenLite.set,
					 slideDuration: getFrameDuration
					 };
		}
	};
})(document, window);
