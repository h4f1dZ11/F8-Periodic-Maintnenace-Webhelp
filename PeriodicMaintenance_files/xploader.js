//--------------------------------------------------------//
//  XPLOADER.JS helper script to dynamically load Xplains.
//  Version: 1.0
//  Copyright (c) EC Software GmbH 2019
//
//  Usage:
//
//  1) Reference this script in the HTML page that you want to load Xplains into.
//     Important: This script must be referenced AFTER all <div> tags that will
//                hold an Xplain! The best place to include this script is at the
//                end of the HTML page, right before the closing </body> tag.
//
//     Example:
//
//       <script src="./xploader.js" type="text/javascript"></script>
//       </body>
//     </html>
//
//  2) Create one or more <div> tags in this HTML page and specify the attributes as follows:
// 
//     <div class="helpxplain" 
//          data-url="./relative_path_to_your_xplain.html" 
//          data-aspect="56.25"
//          data-title="Presentation title"
//          data-caption="This caption is displayed as an <i>overlay</i>"
//          data-lightbox="false" 
//          data-load="click" 
//          data-playbutton="true" 
//          data-startat="1" 
//          data-playafter="0" >
//	   </div>
//
//     class            Mandatory attribute, the class of the <div> tag MUST be "helpxplain".
//
//     data-url         Mandatory string attribute, the relative path to your Xplain HTML page. 
//                      This HTML page will be loaded into an iFrame that is created inside the <div> tag.
//
//     data-aspect      Per cent value of presentation height versus width. This value defines the
//                      aspect ratio of the Xplain. The loader script takes the aspect ratio from the 
//                      preview image by default. This is ok for most presentations.
//
//                      However, if the Xplain uses a skin with player controls that are displayed above 
//                      or below the presentation (but not inside as an overlay) these player controls 
//                      will add to the required total height of the presentation and therefore 
//                      change the aspect ratio. For presentations with player controls above or below 
//                      the presentation, specify the aspect ratio with this parameter.
//
//     data-title       Optional but strongly suggested string, assigned to the preview image as ALT attribute.
//
//     data-caption     Optional caption string, displayed as an overlay for the preview image and (if run
//                      in a lightbox) below the lightbox. The text is white on a 50% transparent black background.
//                      Note: While playing inline, the caption is hidden. 
//                      You can style the text with your own CSS, addressed by:
//
//                      div.helpxplain > p { text-align: center; font-size: 80% }  
//
//     data-lightbox    true|false (optional, default false) - specifies whether the Xplain is displayed inline 
//                      or if it runs in a lightbox when clicked.  
//
//     data-load        click|view|preload (optional, default "click") - specifies when the Xplain is actually
//                      loaded (if played inline). Before loading the iframe content, the Xplain just displays a 
//                      preview of the first slide, optionally with a play button (see data-playbutton below).
//                      Note, that this option has no effect on Xplains displayed in a lightbox!
//
//                      click:     The Xplain is not loaded automatically, only when clicked. 
//                                 This option makes sense in combination with a play button.
//
//                      view:      The Xplain is loaded when it comes into the viewport (user scrolls down the page).
//                                 When it comes into view, the iFrame content is automatically loaded to be 
//                                 ready for user interaction.    
//
//                      preload:   The Xplain is loaded immediately when the HTML page loads.
//                                 Keep in mind that Xplains may contain a lot of images and
//                                 by preloading the Xplains, it takes longer to load the HTML page.
//                                 Use this option with care! In most cases, "view" will do a better job.
//
//     data-playbutton  true|false|url (optional, default false) - shows a play button on top of the Xplain.
//                      Set this option to "true" for the default play button or specify the url for a custom image.
//                      The play button has the class name "xplplaybutton" and you can style this button with 
//                      your own custom CSS, implemented in the host page. 
//
//                      Example CSS - make the play button grow on mouse-over:
//
//                      .xplplaybutton { transition: transform 0.3s }
//                      .xplplaybutton:hover { transform: scale(1.1,1.1) }
//
//     data-playbuttoncolor  Optional color value for the play button, e.g. "#FF0000"
//
//     data-startat   	Slide number (optional, default 1) - starts with specified slide number.
//
//     data-playafter   Seconds (optional, default 0) - automatically starts playing the Xplain XX seconds 
//                      after loading it. This option is ideal for Xplains that should automatically run when 
//                      the page is visited. "0"  means no autoplay. If you want to start the Xplain 
//                      immediately, specify a very short delay like "0.01" (seconds).
//
//                      This parameter works differently in combination with data-inline and data-preload.
//
//                      Inline:    If data-preload is true, the Xplain is loaded immediately. If 
//                                 playafter is greater 0, the Xplain will start autoplaying XX seconds
//                                 after loading (that is, after the HTML page was loaded and the Xplain
//                                 iFrame is complete).
//                                 If data-preload is false, the Xplain will load when it comes into view
//                                 and start auto-playing XX seconds later.
//
//                      Lightbox:  Xplains displayed in a lightbox remain static until clicked and the
//                                 lightbox is displayed. They are loaded when the lightbox is created,
//                                 but do not necessarily start auto-playing. If playafter is > 0, the
//                                 Xplain will start auto-playing XX seconds after the lightbox has been
//                                 created.
//
//     data-debug       true|false (optional, default false) - enables debugging messages, in case something
//                      does not work. 
//
//--------------------------------------------------------//
		
(function ( document, window ) {

	function data( obj, key ) { 
		var value = ''; 
		if(!obj.dataset) {
			value = obj.getAttribute('data-' + key); 
		}
		else if (obj.dataset[key]) {
			value = obj.dataset[key]; 
		}
		return value; 
	};
	
	function evalBool( strval, defaultvalue ) {
		var value = defaultvalue;
		if (strval) {
			if (strval == '1') value = true
			else if (strval == '0') value = false
			else if (strval.toLowerCase() == 'true') value = true
			else if (strval.toLowerCase() == 'false') value = false;
		}
		return value;
	}
	
	function loadXplain( thisXplain, previewImg, inLightbox ) {
		if (!thisXplain.error && !thisXplain.loaded) {
			var a = (previewImg.height/previewImg.width*100);
			if (a == 0) a = 56.25; 
			if (thisXplain.aspect > 0) a = thisXplain.aspect;
			
			var s = '<div style="padding:0;width:100%;height:auto">';
			s = s + '<div style="position:relative;overflow:hidden;width:100%;padding:0 0 ' + a + '% 0;height:0">';
			s = s + '<iframe style="left:0;top:0;position:absolute;width:100%;height:100%;border:none;background:#000" src="';
			s = s + thisXplain.url;
			if (thisXplain.startAt > 1) {
				s = s + '#' + thisXplain.startAt;
			}
			if ((thisXplain.playAfter) && (thisXplain.playAfter > 0)) {
				if ((!thisXplain.startAt) || (thisXplain.startAt < 2)) {
					s = s + '#1';
				}
				s = s + '?autoplay=' + thisXplain.playAfter;
			}
			s = s + '"></iframe></div></div>';
			
			if (inLightbox) {
				if (thisXplain.debug) alert('Load ' + thisXplain.url + ' in lightbox');				
				
				var lightboxWindow = window,
					lightboxDocument = document;
				/* If we are inside an iframe, lets try to use outer window for the lightbox */
				if (parent.window) {
					try {
						lightboxWindow = parent.window;
						lightboxDocument = parent.window.document;
					}
					catch(err) {
						lightboxWindow = window;
						lightboxDocument = document;
					}					
				}
				var lightBox = lightboxDocument.createElement('div');
				lightBox.className = 'xpllightboxshader';
				lightBox.style.position = 'fixed';
				lightBox.style.left = '0';
				lightBox.style.top = '0';
				lightBox.style.right = '0';
				lightBox.style.bottom = '0';
				/* Use pt for MSIE and CHM files on highres monitors */
				lightBox.style.padding = '16pt 16pt 0 16pt';  
				lightBox.style.background = 'rgba(0,0,0,0.7)';
				lightBox.style.transition = 'opacity 0.3s';
				lightBox.style.opacity = '0.01';
				lightBox.style.zIndex = '999999';
				var lightBoxInner = lightboxDocument.createElement('div');
				lightBox.className = 'xpllightbox';
				lightBox.appendChild(lightBoxInner);
				lightBoxInner.style.position = 'relative';
				lightBoxInner.style.width = '100%';
				lightBoxInner.style.margin = '0 auto';
				lightBoxInner.innerHTML = s;
				
				lightboxDocument.body.appendChild(lightBox);
				
				var lightBoxClose = lightboxDocument.createElement('div');
				lightBoxClose.className = 'xpllightboxclose';
				lightBoxClose.style.position = 'absolute';
				/* Use pt for MSIE and CHM files on highres monitors */
				lightBoxClose.style.top = '-16pt';
				lightBoxClose.style.right = '-16pt';
				lightBoxClose.style.width = '20pt';
				lightBoxClose.style.height = '20pt';
				lightBoxClose.style.margin = '3pt';
				lightBoxClose.innerHTML = '<svg style="width:100%;height:100%;cursor:pointer;" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" stroke="#0A0A0A" stroke-width="4" fill="#FFFFFF"></circle><g stroke="#0A0A0A" stroke-width="8" stroke-linecap="square"><line x1="30" y1="30" x2="70" y2="70"></line><line x1="70" y1="30" x2="30" y2="70"></line></g></svg>';
				lightBoxInner.appendChild(lightBoxClose);

				function lightBoxResize() {
					var w = lightboxWindow.innerWidth - 48,  /* 2 x 16pt/72*96 => 48 virtual pixel */
					    h = lightboxWindow.innerHeight - 48;
					if (h/w*100 < a) {
						lightBoxInner.style.width = parseFloat((h*10000/a)/w) + '%';
						lightBox.style.padding = '16pt 16pt 0 16pt';  
					}
					else {
						lightBoxInner.style.width = '100%';
						lightBox.style.padding = parseFloat((lightboxWindow.innerHeight-w*a/100)/3) +'pt 16pt 0 16pt';
					}
				}

				lightboxWindow.setTimeout(function(){ 
					lightBox.style.opacity = 1;  //fade in
				}, 50);
				lightBox.onclick = function() {
					lightboxWindow.removeEventListener("resize", lightBoxResize);
					lightBox.style.opacity = 0;
					lightboxWindow.setTimeout(function(){ 
						lightboxDocument.body.removeChild(lightBox);
					}, 300);
				}
				lightBoxResize();
				lightboxWindow.addEventListener("resize", lightBoxResize);
			}
			else {
				if (thisXplain.debug) alert('Load ' + thisXplain.url + ' inline');				
				thisXplain.loaded = true;
				thisXplain.innerHTML = s;
			}
		}
	}
	
	function checkInView() {
		var viewportHeight = window.innerHeight,
			documentTop = (document.documentElement && document.documentElement.scrollTop) || document.body.scrollTop;
			
		for (i = 0; i < xplains.length; i++) {
			if (xplains[i].loadInView && !xplains[i].loaded && !xplains[i].error) {
				var elementPosTop = xplains[i].offsetTop,
					elementHeight = xplains[i].offsetHeight;				
				if ((elementPosTop < (viewportHeight+documentTop)) && ((elementPosTop + elementHeight) > documentTop)) {
					loadXplain(xplains[i], xplains[i].preview, false);
				}
			}
		}
	}
	
	var xplains = Array.prototype.slice.call(document.getElementsByClassName("helpxplain")),
	    xplCheckInView = false;

	for (i = 0; i < xplains.length; i++) {
		xplains[i].url = data(xplains[i], 'url');
		xplains[i].title = data(xplains[i], 'title');
		xplains[i].caption = data(xplains[i], 'caption');
		xplains[i].inline = !evalBool(data(xplains[i], 'lightbox'), false);
		xplains[i].preload = (xplains[i].inline) && (data(xplains[i], 'load').toLowerCase() == 'preload');
		xplains[i].loadInView = (xplains[i].inline) && (data(xplains[i], 'load').toLowerCase() == 'view');
		var pb = data(xplains[i], 'playbutton');
		xplains[i].playButton = (pb != '') && (pb.toLowerCase() != 'false');
		if ((xplains[i].playButton) && (pb.toLowerCase() != 'true')) xplains[i].playButtonUrl = pb; 
		xplains[i].startAt = parseInt(data(xplains[i], 'startat'));
		xplains[i].playAfter = parseFloat(data(xplains[i], 'playafter'));
		xplains[i].aspect = parseFloat(data(xplains[i], 'aspect'));
		xplains[i].debug = evalBool(data(xplains[i], 'debug'), false);
		xplains[i].loaded = false;
		xplains[i].error = false;
		xplains[i].previewSrc = xplains[i].url.substr(0, xplains[i].url.lastIndexOf('.')) + '/preview.jpg';
		xplains[i].preview = new Image();
		xplains[i].preview.xplain = xplains[i];
		
		if (xplains[i].loadInView) { 
			xplCheckInView = true;
		}

		xplains[i].preview.onload = function() {
			var mustLoadNow = this.xplain.preload;
			if (this.xplain.loadInView) {
				var viewportHeight = window.innerHeight,
			        documentTop = document.body.scrollTop;
				var elementPosTop = this.xplain.offsetTop,
					elementHeight = this.xplain.offsetWidth / this.width * this.height;				
				if ((elementPosTop < (viewportHeight+documentTop)) && ((elementPosTop + elementHeight) > documentTop)) {
					mustLoadNow = true;
				}
			}
			if (mustLoadNow) {
				this.xplain.preload = true;
				loadXplain(this.xplain, this, false);
			}
			else {
				this.style.width = '100%';
				this.style.height = 'auto';
				this.style.border = '';
				this.title = this.xplain.title;
				this.alt = this.title;
				if ((!this.xplain.inline) || (this.xplain.playAfter == 0)) {
					this.style.cursor = 'pointer';
				}
				this.xplain.appendChild(this);
				this.onclick = function() {
					loadXplain(this.xplain, this, (!this.xplain.inline));
				}
				if (this.xplain.playButton) {
					var prv = this;  //store this in local variable
					var pb = document.createElement('div');
					pb.className = 'xplplaybutton';
					pb.style.position = 'absolute';
					pb.style.top = '50%';
					pb.style.left = '50%';
					pb.style.width = '10vH';
					pb.style.height = '10vH';
					pb.style.margin = '-5vH 0 0 -5vH';
					pb.style.cursor = 'pointer';
					pb.onclick = function() { loadXplain(prv.xplain, prv, !prv.xplain.inline) }
					this.xplain.appendChild(pb);
					
					if (this.xplain.playButtonUrl) {
						pb.innerHTML = '<img style="width:100%;height:100%" src="' + prv.xplain.playButtonUrl + '"/>';
					}
					else {
						var pbcolor = data(this.xplain, 'playbuttoncolor');
						if ((!pbcolor) || (pbcolor == '')) pbcolor = '#FF0000';
						pb.innerHTML = '<svg viewBox="0 0 100 100" style="width:100%;height:100%"><circle cx="50" cy="50" r="50" fill="#FFFFFF"></circle><circle fill="' + pbcolor + '" cx="50" cy="50" r="46"></circle><path d="M40,72.5L70,50L40,27.45V72.5z" fill="#FFFFFF"></path></svg>';
					}
				}
				if ((this.xplain.caption) && (this.xplain.caption != '')) {
					this.xplain.style.position = 'relative';
					var c = document.createElement('p');
					c.style.position = 'absolute';
					c.style.bottom = '0';
					c.style.width = '98%';
					c.style.background = '#000000';
					c.style.opacity = '0.6';
					c.style.color = '#FFFFFF';
					c.style.padding = '1%';
					c.style.margin = '0';
					c.innerHTML = this.xplain.caption;
					this.xplain.appendChild(c);
				}
			}
		};
		xplains[i].preview.onerror = function() {
			this.xplain.innerHTML = '<p>Preview image missing: ' + this.src + '</p>';
			this.xplain.error = true;
		};
		xplains[i].preview.src = xplains[i].previewSrc;
	} 				
	
	if (xplCheckInView) {
		document.addEventListener("scroll", function ( event ) {
			checkInView();
		});
	}
	
})(document, window);
