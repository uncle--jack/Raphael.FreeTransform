/*
 * Licensed under the MIT license:
 * http://www.opensource.org/licenses/mit-license.php
 *
 */

Raphael.fn.freeTransform = function(el, options) {
	// Enable method chaining
	if ( el.freeTransform ) return el.freeTransform;

	var paper = this;

	var ft = el.freeTransform = {
		el: el,
		handle: false,
		opts: {
			boundary: {
				x: paper._left,
				y: paper._top,
				width: paper.width,
				height: paper.height
				},
			color: '#000',
			drag: true,
			rotate: true,
			scale: true,
			size: .6
			},
		};

	// Override defaults
	for ( var i in options ) {
		el.freeTransform.opts[i] = options[i];
	}

	/**
	 * Get box size
	 */
	ft.getBox = function() {
		var bbox = this.el.getBBox(true);

		bbox.center = {
			x: bbox.x + bbox.width  / 2,
			y: bbox.y + bbox.height / 2
			};

		return bbox;
	}

	if ( ft.opts.rotate || ft.opts.scale ) {
		ft.handle = new Object;

		var box = ft.getBox();

		ft.handle.line = paper
			.path('M' + box.center.x + ',' + box.center.y)
			.attr({ stroke: ft.opts.color, opacity: .2 })
			;

		ft.handle.disc = paper
			.circle(box.center.x, box.center.y, 5)
			.attr({ fill: ft.opts.color, stroke: 'none' })
			;

		ft.handle.disc.ft = ft;
	}

	/**
	 * Remove handle
	 */
	ft.unplug = function() {
		var ft = this;

		if ( ft.handle ) {
			ft.handle.disc.remove();
			ft.handle.line.remove();
		}

		if ( ft.opts.drag ) ft.el.undrag();

		// Goodbye
		delete this;
	};

	/**
	 * Draw handle based on the elements attributes
	 */
	ft.updateHandle = function() {
		var ft = this;

		if ( !ft.handle ) return;

		var
			box    = ft.getBox(),
			matrix = ft.el.matrix.split()
			;

		var ratio = box.width / box.height;

		// Get the element's rotation
		var rad = ( matrix.rotate + 90 ) * Math.PI / 180;

		var
			cx = box.center.x + ( box.width  * matrix.scalex * ft.opts.size ) * Math.cos(rad) / ratio,
			cy = box.center.y + ( box.height * matrix.scaley * ft.opts.size ) * Math.sin(rad)
			;

		ft.handle.disc.attr({
			cx: Math.max(Math.min(cx || 0, ft.opts.boundary.x + ft.opts.boundary.width),  ft.opts.boundary.x),
			cy: Math.max(Math.min(cy || 0, ft.opts.boundary.y + ft.opts.boundary.height), ft.opts.boundary.y)
			});

		ft.handle.line.attr({ path: 'M' + box.center.x + ',' + box.center.y + 'L' + ft.handle.disc.attrs.cx + ',' + ft.handle.disc.attrs.cy });
	}

	if ( ft.opts.drag ) {
		el.drag(function(dx, dy) {
			var ft = this.freeTransform;

			var matrix = ft.el.matrix.split();

			this
				.attr({ x: dx + ft.ox, y: dy + ft.oy, cx: dx + ft.ocx, cy: dy + ft.ocy })
				.transform('S' + matrix.scalex + ',' + matrix.scaley + 'R' + matrix.rotate)
				;

			if ( ft.handle ) {
				var box = ft.getBox();

				ft.handle.disc.attr({ cx: dx + ft.handle.disc.ox, cy: dy + ft.handle.disc.oy });

				ft.handle.line.attr({ path: 'M' + ( box.center.x ) + ',' + ( box.center.y ) + 'L' + ft.handle.disc.attrs.cx + ',' + ft.handle.disc.attrs.cy });
			}
		}, function() {
			var ft = this.freeTransform;

			var box = ft.getBox();

			// Offset values
			ft.ox = box.x;
			ft.oy = box.y;

			ft.ocx = box.center.x;
			ft.ocy = box.center.y;

			if ( ft.handle ) {
				ft.handle.disc.ox = ft.handle.disc.attrs.cx;
				ft.handle.disc.oy = ft.handle.disc.attrs.cy;
			}
		});
	}

	if ( ft.handle ) {
		ft.handle.disc.drag(function(dx, dy) {
			var ft = this.ft;

			var
				box    = ft.getBox(),
				matrix = ft.el.matrix.split()
				;

			var
				cx = dx + ft.handle.disc.ox,
				cy = dy + ft.handle.disc.oy
				;

			if ( ft.opts.rotate ) {
				var
					rad = Math.atan2(cy - box.center.y, cx - box.center.x)
					deg = rad * 180 / Math.PI - 90
					;

				// Keep line at length if scaling is disabled
				if ( !ft.opts.scale ) {
					cx = box.center.x + ( box.height / ft.opts.size ) * Math.cos(rad);
					cy = box.center.y + ( box.height / ft.opts.size ) * Math.sin(rad);
				}
			} else {
				var deg = ft.el._.deg;
			}

			// Keep handle within boundaries
			cx = Math.max(Math.min(cx, ft.opts.boundary.x + ft.opts.boundary.width),  ft.opts.boundary.x);
			cy = Math.max(Math.min(cy, ft.opts.boundary.y + ft.opts.boundary.height), ft.opts.boundary.y);

			var ratio = box.width / box.height;

			var length = Math.sqrt(Math.pow(cx - box.center.x, 2) + Math.pow(cy - box.center.y, 2));

			if ( ft.opts.scale ) {
				var scale = {
					x: length / ( box.width  * ft.opts.size ) * ratio,
					y: length / ( box.height * ft.opts.size )
					};
			} else {
				var scale = {
					x: matrix.scalex,
					y: matrix.scaley
					};
			}

			ft.el.transform('S' + scale.x + ',' + scale.y + 'R' + deg);

			ft.updateHandle();
		}, function() {
			var ft = this.ft;

			// Offset values
			ft.handle.disc.ox = this.attrs.cx;
			ft.handle.disc.oy = this.attrs.cy;
		});
	}

	if ( ft.handle ) ft.updateHandle();

	// Enable method chaining
	return el.freeTransform;
};
