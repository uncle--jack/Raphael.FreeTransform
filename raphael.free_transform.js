/*
 * Licensed under the MIT license:
 * http://www.opensource.org/licenses/mit-license.php
 *
 */

Raphael.fn.freeTransform = function(subject, options, callback) {
	// Enable method chaining
	if ( subject.freeTransform ) return subject.freeTransform;

	// Add Array.map if the browser doesn't support it
	if ( !( 'map' in Array.prototype ) ) {
		Array.prototype.map = function(callback, arg) {
			var mapped = new Array();

			for ( var i in this ) {
				if ( this.hasOwnProperty(i) ) {
					mapped[i] = callback.call(arg, this[i], i, this);
				}
			}

			return mapped;
		};
	}

	var paper = this;

	var ft = subject.freeTransform = {
		axes: [ 'x', 'y'],
		callback: ( typeof callback == 'function' ? callback : false ),
		items: subject.type == 'set' ? subject.items : [ subject ],
		handles: false,
		opts: {
			attrs: {
				fill: '#000',
				stroke: '#000'
				},
			boundary: {
				x: paper._left ? paper._left : 0,
				y: paper._top  ? paper._top  : 0,
				width: paper.width,
				height: paper.height
				},
			drag: true,
			grid: false,
			gridSnap: 0,
			keepRatio: false,
			rotate: true,
			rotateSnap: false,
			scale: true,
			showBBox: false,
			size: 1.2
			},
		// Keep track of transformations in case we can't access item._.transform
		transform: {
			rotate: 0,
			scale:     { x: 1, y: 1 },
			translate: { x: 0, y: 0 }
		   }
		};

	// Override defaults
	for ( var i in options ) {
		subject.freeTransform.opts[i] = options[i];
	}

	// Nothing to do here
	if ( !ft.opts.rotate && !ft.opts.scale && !ft.opts.drag ) {
		return ft;
	}

	if ( !ft.opts.scale ) {
		ft.opts.keepRatio = true;
	}

	if ( ft.opts.keepRatio ) {
		ft.axes = [ 'y' ];
	}

	if ( !ft.opts.gridSnap ) {
		ft.opts.gridSnap = ft.opts.grid;
	}

	/**
	 * Get what we need to know about the subject
	 */
	ft.getThing = function() {
		var thing;

		var bbox = subject.getBBox(true);

		thing = {
			x: bbox.x,
			y: bbox.y,
			size: {
				x: bbox.width,
				y: bbox.height
			},
			center: {
				x: bbox.x + bbox.width  / 2,
				y: bbox.y + bbox.height / 2
				},
			items: [],
			rotate:    ft.transform.rotate,
			scale:     ft.transform.scale,
			translate: ft.transform.translate
			};

		ft.items.map(function(item, i) {
			thing.items[i] = {
				rotate:    ft.transform.rotate,
				scale:     ft.transform.scale,
				translate: ft.transform.translate
				};

			// Get the current transform values if we can access them
			if ( item._ && item._.transform ) {
				item._.transform.map(function(transform) {
					if ( transform[0] ) {
						switch ( transform[0].toUpperCase() ) {
							case 'T':
								thing.items[i].translate.x = transform[1];
								thing.items[i].translate.y = transform[2];

								break;

							case 'S':
								thing.items[i].scale.x = transform[1];
								thing.items[i].scale.y = transform[2];

								break;
							case 'R':
								thing.items[i].rotate = transform[1];

								break;
						}
					}
				});
			}
		});

		if ( subject.type != 'set' ) {
			thing.rotate    = thing.items[0].rotate;
			thing.scale     = thing.items[0].scale;
			thing.translate = thing.items[0].translate;
		}

		return thing;
	}

	// Draw handles
	ft.handles = {
		center: new Object,
		x:      new Object,
		y:      new Object
		};

	var thing = ft.getThing();

	if ( ft.opts.rotate || ft.opts.scale ) {
		ft.axes.map(function(axis) {
			ft.handles[axis].line = paper
				.path([ 'M', thing.center.x, thing.center.y ])
				.attr({
					stroke: ft.opts.attrs.stroke,
					'stroke-dasharray': '- ',
					opacity: .3
					})
				;

			ft.handles[axis].disc = paper
				.circle(thing.center.x, thing.center.y, 5)
				.attr(ft.opts.attrs)
				;

			ft.handles[axis].disc.ft = ft;
		});
	}

	if ( ft.opts.drag ) {
		ft.handles.center.disc = paper
			.circle(thing.center.x, thing.center.y, 5)
			.attr(ft.opts.attrs)
			;
	}

	if ( ft.opts.showBBox ) {
		ft.bbox = paper
			.rect('')
			.attr({
				stroke: ft.opts.attrs.stroke,
				opacity: .2
				})
			;
	}

	/**
	 * Remove handles, commit suicide
	 */
	ft.unplug = function() {
		if ( ft.opts.drag ) {
			ft.handles.center.disc.remove();

			for ( var i in ft.items ) {
				ft.items[i].undrag();
			}
		}

		if ( ft.opts.rotate || ft.opts.scale ) {
			ft.axes.map(function(axis) {
				if ( ft.handles[axis] ) {
					ft.handles[axis].disc.remove();

				ft.transform.translate = {
					x: thing.x,
					y: thing.y
					};

					ft.handles[axis].line.remove();
				}
			});
		}

		if ( ft.opts.showBBox) {
			ft.bbox.remove();
		}

		// Goodbye
		delete subject.freeTransform;
	};

	/**
	 * Update handles based on the element's transformations
	 */
	ft.updateHandles = function(thing) {
		if ( thing ) {
			// Keep track of transformations in case we can't access item._.transform
			ft.transform = {
				rotate:    thing.rotate,
				scale:     { x: thing.scale.x,     y: thing.scale.y     },
				translate: { x: thing.translate.x, y: thing.translate.y }
				};
		} else {
			thing = ft.getThing();
		}

		asyncCallback(thing);

		// Get the element's rotation
		var rad = thing.rotate * Math.PI / 180;

		if ( ft.opts.drag ) {
			ft.handles.center.disc.attr({
				cx: Math.max(Math.min(thing.center.x + thing.translate.x || 0, ft.opts.boundary.x + ft.opts.boundary.width),  ft.opts.boundary.x),
				cy: Math.max(Math.min(thing.center.y + thing.translate.y || 0, ft.opts.boundary.y + ft.opts.boundary.height), ft.opts.boundary.y)
				});
		}

		if ( ft.opts.rotate || ft.opts.scale ) {
			ft.axes.map(function(axis) {
				rad += ( axis == 'y' ? 90 : 0 ) * Math.PI / 180;

				var
					cx = thing.center.x + thing.translate.x + ( thing.size[axis] / 2 * thing.scale[axis] * ft.opts.size ) * Math.cos(rad),
					cy = thing.center.y + thing.translate.y + ( thing.size[axis] / 2 * thing.scale[axis] * ft.opts.size ) * Math.sin(rad)
					;

				// Keep handle within boundaries
				ft.handles[axis].disc.attr({
					cx: Math.max(Math.min(cx || 0, ft.opts.boundary.x + ft.opts.boundary.width),  ft.opts.boundary.x),
					cy: Math.max(Math.min(cy || 0, ft.opts.boundary.y + ft.opts.boundary.height), ft.opts.boundary.y)
					});

				ft.handles[axis].line.attr({
					path: [ [ 'M', thing.center.x + thing.translate.x, thing.center.y + thing.translate.y ], [ 'L', ft.handles[axis].disc.attrs.cx, ft.handles[axis].disc.attrs.cy ] ]
					});
			});
		}

		if ( ft.opts.showBBox ) {
			// TODO: Don't use scaling on the bounding box, get the actual coordinates
			ft.bbox.attr({
				x:      thing.x + thing.translate.x,
				y:      thing.y + thing.translate.y,
				width:  thing.size.x,
				height: thing.size.y
				})
				.transform([
					'R', thing.rotate,
					'S', thing.scale.x, thing.scale.y
					]);
		}
	}

	// Drag element and center handle
	if ( ft.opts.drag ) {
		var draggables = ft.opts.drag ? [ subject, ft.handles.center.disc ] : [ subject ];

		draggables.map(function(draggable) {
			draggable.drag(function(dx, dy) {
				var
					dist = { x: 0, y: 0 },
					snap = { x: 0, y: 0 }
					;

				// viewBox might be zoomed in/out
				if ( ft.o.viewBoxRatio ) {
					dx *= ft.o.viewBoxRatio.x;
					dy *= ft.o.viewBoxRatio.y;
				}

				// Snap to grid
				if ( ft.opts.grid ) {
					dist.x = dx + ft.o.bbox.x - Math.round(( dx + ft.o.bbox.x ) / ft.opts.grid) * ft.opts.grid;
					dist.y = dy + ft.o.bbox.y - Math.round(( dy + ft.o.bbox.y ) / ft.opts.grid) * ft.opts.grid;

					if ( Math.abs(dist.x) < ft.opts.gridSnap ) snap.x = dist.x;
					if ( Math.abs(dist.y) < ft.opts.gridSnap ) snap.y = dist.y;
				}

				ft.items.map(function(item) {
					item.transform([
						'R', ft.o.rotate,
						'S', ft.o.scale.x, ft.o.scale.y,
						'T', dx + ft.o.translate.x - snap.x, dy + ft.o.translate.y - snap.y
						]);
				});

				// Recycle ft.o so we don't have to call ft.getThing() many times
				var thing = cloneObj(ft.o);

				thing.translate.x += dx - snap.x;
				thing.translate.y += dy - snap.y;

				ft.updateHandles(thing);
			}, function() {
				// Offset values
				ft.o = ft.getThing();

				if ( ft.opts.grid ) ft.o.bbox = subject.getBBox();

				// viewBox might be zoomed in/out
				if ( paper._viewBox ) {
					ft.o.viewBoxRatio = {
						x: paper._viewBox[2] / paper.width,
						y: paper._viewBox[3] / paper.height
						};
				}

				if ( ft.opts.rotate || ft.opts.scale ) {
					ft.axes.map(function(axis) {
						ft.handles[axis].disc.ox = ft.handles[axis].disc.attrs.cx;
						ft.handles[axis].disc.oy = ft.handles[axis].disc.attrs.cy;
					});
				}
			});
		});
	}

	// Drag x, y handles
	if ( ft.opts.rotate || ft.opts.scale ) {
		ft.axes.map(function(axis) {
			ft.handles[axis].disc.drag(function(dx, dy) {
				// viewBox might be zoomed in/out
				if ( ft.o.viewBoxRatio ) {
					dx *= ft.o.viewBoxRatio.x;
					dy *= ft.o.viewBoxRatio.y;
				}

				var
					cx = dx + ft.handles[axis].disc.ox,
					cy = dy + ft.handles[axis].disc.oy
					;

				if ( ft.opts.rotate ) {
					var
						rad = Math.atan2(cy - ft.o.center.y - ft.o.translate.y, cx - ft.o.center.x - ft.o.translate.x),
						deg = rad * 180 / Math.PI - ( axis == 'y' ? 90 : 0 )
						;
				} else {
					var deg = ft.o.rotate;
				}

				// Keep handle within boundaries
				cx = Math.max(Math.min(cx, ft.opts.boundary.x + ft.opts.boundary.width),  ft.opts.boundary.x);
				cy = Math.max(Math.min(cy, ft.opts.boundary.y + ft.opts.boundary.height), ft.opts.boundary.y);

				var length = Math.sqrt(Math.pow(cx - ft.o.center.x - ft.o.translate.x, 2) + Math.pow(cy - ft.o.center.y - ft.o.translate.y, 2));

				if ( ft.opts.scale ) {
					var scale = {
						x: axis == 'x' ? length / ( ft.o.size.x / 2 * ft.opts.size ) : ft.o.scale.x,
						y: axis == 'y' ? length / ( ft.o.size.y / 2 * ft.opts.size ) : ft.o.scale.y
						};

					if ( ft.opts.keepRatio ) {
						scale.x = scale.y;
					}
				} else {
					var scale = {
						x: ft.o.scale.x,
						y: ft.o.scale.y
						};
				}

				// Rotate with increments
				if ( ft.opts.rotateSnap ) {
					deg = Math.round(deg / ft.opts.rotateSnap) * ft.opts.rotateSnap;
				}

				if ( scale.x && scale.y ) {
					ft.items.map(function(item) {
						item.transform([
							'R', deg,
							'S', scale.x, scale.y,
							'T', ft.o.translate.x, ft.o.translate.y
							]);
					});
				}

				// Recycle ft.o so we don't have to call ft.getThing() many times
				var thing = cloneObj(ft.o);

				thing.scale.x = scale.x;
				thing.scale.y = scale.y;

				thing.rotate = deg;

				ft.updateHandles(thing);
			}, function() {
				// Offset values
				ft.o = ft.getThing();

				if ( paper._viewBox ) {
					ft.o.viewBoxRatio = {
						x: paper._viewBox[2] / paper.width,
						y: paper._viewBox[3] / paper.height
						};
				}

				ft.handles[axis].disc.ox = this.attrs.cx;
				ft.handles[axis].disc.oy = this.attrs.cy;
			});
		});
	}

	// Recursive copy of object
	function cloneObj(obj) {
		var clone = new Object;

		for ( var i in obj ) {
			clone[i] = typeof obj[i] == 'object' ? cloneObj(obj[i]) : obj[i];
		}

		return clone;
	}

	// Call callback asynchronously for better performance
	var timeout = false;

	function asyncCallback(thing) {
		if ( ft.callback ) {
			clearTimeout(timeout);

			setTimeout(function() { ft.callback(thing, subject); }, 1);
		}
	}

	ft.updateHandles();

	// Enable method chaining
	return ft;
};
