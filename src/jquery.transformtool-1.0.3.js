/**
 * This file contains the jQuery.transformTool v1.0.3 plugin ported to KineticJS 5.1.0.
 *
 * Original author:
 * 
 * @author   Gonzalo Chumillas <gonzalo@soloproyectos.com>
 * @license  https://raw.github.com/soloproyectos/transformtool/master/LICENSE BSD 2-Clause License
 * @link     https://github.com/soloproyectos/transformtool
 */
(function($) {
    /**
     * Configure Kinetic to use radians
     */
    Kinetic.angleDeg = false;

    /**
     * Namespace.
     */
    var namespace = 'transformTool';
    
    /**
     * Default options.
     */
    var defaultOptions = {
        'handler-radius': 5,
        'handler-fill': 'white',
        'handler-stroke': 'black',
        'handler-stroke-width': 2,
        'border-stroke': 'black',
        'border-stroke-width': 2,
        'rotate-distance': 35,
        'allow-rotate': true,
        'allow-scale': true,
        'allow-resize': true,
        'allow-move': true
    };
    
    /**
     * Line class.
     * 
     * A line can be defined by a point and a vector.
     * 
     * @param {Object} point  Point of the form (x, y)
     * @param {Object} vector Vector of the form (x, y)
     * 
     * @return {Void}
     */
    function Line(point, vector) {
        this._point = point;
        this._vector = vector;
    }
    
    /**
     * Gets the point.
     * 
     * @param {Object} a point of the form (x, y)
     */
    Line.prototype.getPoint = function () {
        return this._point;
    };
    
    /**
     * Gets the vector.
     * 
     * @param {Object} a vector of the form (x, y)
     */
    Line.prototype.getVector = function() {
        return this._vector;
    };
    
    /**
     * Handler class.
     * 
     * This class extends the Kinetic.Circle class.
     * 
     * @param {Number} hAlign      Horizontal alignment (left: -1, center: 0,
     *                             right: 1)
     * @param {Number} vAlign      Vertical alignment (top: -1, middle: 0,
     *                             bottom: 1)
     * @param {Number} radius      Handler radius
     * @param {String} fill        Fill color
     * @param {String} stroke      Stroke color
     * @param {Number} strokeWidth Stroke width
     * 
     * @return {Void}
     */
    function Handler(hAlign, vAlign, radius, fill, stroke, strokeWidth) {
        this._align = [hAlign, vAlign];
        
        Kinetic.Circle.call(this, {
            radius: radius,
            fill: fill,
            stroke: stroke,
            strokeWidth: strokeWidth,
            draggable: true
        });
    }
    Kinetic.Util.extend(Handler, Kinetic.Circle);
    
    /**
     * Gets handler alignment.
     * 
     * Returns an array of two numbers. The first number is the horizontal alignment
     * and the second number is the vertical alignment.
     * 
     * @return {Array}
     */
    Handler.prototype.getAlign = function () {
        return this._align;
    };
    
    /**
     * TransformToolGroup class.
     * 
     * This class extends the Kinetic.Group class.
     * 
     * @param {Kinetic.Node} target  The target
     * @param {Object}       options Custom options
     * 
     * @return {Void}
     */
    function TransformToolGroup(target, options) {
        this._target = target;
        this._options = $.extend({}, defaultOptions, options);
        this._rotateHandler = null;
        this._border = null;
        this._selectedHandler = null;
        this._handlers = [];

        Kinetic.Group.call(this);

        // makes the group draggable
        var rotateGroup = this._target.getParent();
        rotateGroup.draggable(this._options['allow-move']);

        this.createBorder();

        // places handlers on the corners of the target
        this.addHandler(
            TransformToolGroup.LEFT,
            TransformToolGroup.TOP,
            this._options['allow-scale']
        );
        this.addHandler(
            TransformToolGroup.RIGHT,
            TransformToolGroup.TOP,
            this._options['allow-scale']
        );
        this.addHandler(
            TransformToolGroup.LEFT,
            TransformToolGroup.BOTTOM,
            this._options['allow-scale']
        );
        this.addHandler(
            TransformToolGroup.RIGHT,
            TransformToolGroup.BOTTOM,
            this._options['allow-scale']
        );
        
        // places handlers on the sides of the target
        this.addHandler(
            TransformToolGroup.CENTER,
            TransformToolGroup.TOP,
            this._options['allow-resize']
        );
        this.addHandler(
            TransformToolGroup.LEFT,
            TransformToolGroup.MIDDLE,
            this._options['allow-resize']
        );
        this.addHandler(
            TransformToolGroup.RIGHT,
            TransformToolGroup.MIDDLE,
            this._options['allow-resize']
        );
        this.addHandler(
            TransformToolGroup.CENTER,
            TransformToolGroup.BOTTOM,
            this._options['allow-resize']
        );

        this.createRotateHandler();
        this.update();
    }
    Kinetic.Util.extend(TransformToolGroup, Kinetic.Group);
    
    /**
     * Horizontal orientations.
     */
    TransformToolGroup.LEFT = -1;
    TransformToolGroup.CENTER = 0;
    TransformToolGroup.RIGHT = 1;
    
    /**
     * Vertical orientations.
     */
    TransformToolGroup.TOP = -1;
    TransformToolGroup.MIDDLE = 0;
    TransformToolGroup.BOTTOM = 1;
    
    /**
     * Gets the point of the line that is closest to a given point.
     * 
     * @param {Object} point Point of the form (x, y)
     * @param {Line}   line  Line
     * 
     * @return {Object} a point of the line of the form (x, y)
     */
    TransformToolGroup.prototype.getNearestPoint = function (line, point) {
        var a = line.getPoint();
        var v = line.getVector();
        
        var x =
            ((point.x - a.x) * v.x + (point.y - a.y) * v.y) /
            (Math.pow(v.x, 2) + Math.pow(v.y, 2));
        
        return {x: a.x + v.x * x, y: a.y + v.y * x};
    };
    
    /**
     * Gets the counterclockwise angle in radians between the
     * positive Y axis and a given point.
     * 
     * @param {Object} point Point of the form (x, y)
     * 
     * @return {Number} a number between Math.PI and -Math.PI
     */
    TransformToolGroup.prototype.getAngle = function (point) {
        return Math.atan2(point.y, point.x) - Math.PI / 2;
    };
    
    /**
     * Creates the border.
     * 
     * @return {Void}
     */
    TransformToolGroup.prototype.createBorder = function () {
        this._border = new Kinetic.Line({
            points: [0, 0],
            stroke: this._options['border-stroke'],
            strokeWidth: this._options['border-stroke-width']
        });
        
        this.add(this._border);
    };
    
    /**
     * Creates the rotate handler.
     * 
     * @return {Kinetic.Circle}
     */
    TransformToolGroup.prototype.createRotateHandler = function () {
        var self = this;
        
        this._rotateHandler = new Kinetic.Circle({
            radius: this._options['handler-radius'],
            fill: this._options['handler-fill'],
            stroke: this._options['handler-stroke'],
            strokeWidth: this._options['handler-stroke-width'],
            draggable: true,
            dragBoundFunc: function(pos) {
                if (this.isDragging()) {
                    var rotateGroup = self.getParent();
                    var targetWidth = rotateGroup.width();
                    var targetHeight = rotateGroup.height();
                    console.log("pos");
                    console.log(pos);
                    var p = rotateGroup.position();
                    console.log("absolute position");
                    console.log(p);
                    var v = {x: p.x - targetWidth / 2 - pos.x, y: p.y - targetHeight / 2- pos.y};
                    console.log("vector");
                    console.log(v);
                    var angle = self.getAngle(v);
                    console.log("angle");
                    console.log(angle * 180/Math.PI);

                    rotateGroup.rotation(angle);
//                    debugger
                }

                return pos;
            }
        });
        this._rotateHandler.visible(this._options['allow-rotate']);
        this._rotateHandler.on('dragmove', function() {
            self.update();
        });
        
        this.add(this._rotateHandler);
        return this._rotateHandler;
    };
    
    /**
     * Adds a handler.
     * 
     * @param {Number}  hAlign  Horizontal alignment (left: -1, center: 0, right: 1)
     * @param {Number}  vAlign  Vertical alignment (top: -1, middle: 0, bottom: 1)
     * @param {Boolean} visible Is the handler visible?
     * 
     * @return {Handler}
     */
    TransformToolGroup.prototype.addHandler = function (hAlign, vAlign, visible) {
        var self = this;
        var handler = new Handler(
            hAlign,
            vAlign,
            this._options['handler-radius'],
            this._options['handler-fill'],
            this._options['handler-stroke'],
            this._options['handler-stroke-width']
        );
        var boundaryLine = {point: {x: 0, y: 0}, vector: {x: 0, y: 0}};
        
        handler.visible(visible);
        
        // the dragging is restricted to the points of the boundary line
        handler.dragBoundFunc(function (pos) {
            if (this.isDragging()) {
                pos = self.getNearestPoint(boundaryLine, pos);
            }
            
            return pos;
        });
        
        // defines the boundary line
        handler.on('mousedown', function () {
            var p0 = this.getAbsolutePosition()
            var p1 = self.getOppositeHandler(this).getAbsolutePosition();
            var v = {x: p1.x - p0.x, y: p1.y - p0.y};
            
            self._selectedHandled = this;
            boundaryLine = new Line(p0, v);
        });
        
        // no handlers are selected
        handler.on('mouseup', function () {
            self._selectedHandled = null;
        });
        
        // applies the transformation and updates the handler positions
        handler.on('dragmove', function () {
            self.apply();
            self.update();
        });
        
        this.add(handler);
        this._handlers.push(handler);
        
        return handler;
    };
    
    /**
     * Applies a transformation on the target.
     * 
     * @return {Void}
     */
    TransformToolGroup.prototype.apply = function () {
        var pos = this._selectedHandled.position();
        var align = this._selectedHandled.getAlign();
        var width = align[0] != 0? Math.abs(2 * pos.x) : this._target.width();
        var height = align[1] != 0? Math.abs(2 * pos.y) : this._target.height();
        
        this._target.size({width: width, height: height});
        this._target.offset({ x: width / 2, y: height / 2});
    };
    
    /**
     * Gets a handler by alignment.
     * 
     * @param {Number} hAlign Horizontal alignment (left: -1, center: 0, right: 1)
     * @param {Number} vAlign Vertical alignment (top: -1, middle: 0, bottom: 1)
     * 
     * @return {Handler}
     */
    TransformToolGroup.prototype.getHandlerByAlign = function (
        hAlign,
        vAlign
    ) {
        var ret = null;
        
        $.each(this._handlers, function() {
            var align = this.getAlign();
            
            if (align[0] == hAlign && align[1] == vAlign) {
                ret = this;
                return false;
            }
        });
        
        return ret;
    };
    
    /**
     * Gets the opposite handler.
     * 
     * @return {Handler}
     */
    TransformToolGroup.prototype.getOppositeHandler = function (handler) {
        var align = handler.getAlign();
        
        return this.getHandlerByAlign(-align[0], -align[1]);
    };
    
    /**
     * Updates handler positions.
     * 
     * @return {Void}
     */
    TransformToolGroup.prototype.update = function () {
//        debugger
        // target properties
        var targetX = this._target.x();
        var targetY = this._target.y();
        var targetWidth = this._target.width();
        var targetHeight = this._target.height();


        // positions
        var rotate = {
                x: targetX,
                y: targetY - targetHeight / 2 - this._options['rotate-distance']
        };
        var leftTop = {x: targetX - targetWidth / 2, y: targetY - targetHeight / 2};
        var rightTop = {x: targetX + targetWidth / 2, y: targetY - targetHeight / 2};
        var leftBottom = {x: targetX - targetWidth / 2, y: targetY + targetHeight / 2};
        var rightBottom = {x: targetX + targetWidth / 2, y: targetY + targetHeight / 2};
        var centerTop = {x: targetX, y: targetY - targetHeight / 2};
        var leftMiddle = {x: targetX - targetWidth / 2, y: targetY};
        var rightMiddle = {x: targetX + targetWidth / 2, y: targetY};
        var centerBottom = {x: targetX, y: targetY + targetHeight / 2};
        
        // adds points to the border
        var points = [
            centerTop,
            leftTop,
            leftBottom,
            rightBottom,
            rightTop,
            centerTop
        ];
        if (this._options['allow-rotate']) {
            points.unshift(rotate);
        }
        this._border.points(points);
        
        
        // sets rotate handler position
        this._rotateHandler.position(rotate);
        
        // sets left-top handler position
        this.getHandlerByAlign(
            TransformToolGroup.LEFT,
            TransformToolGroup.TOP
        ).position(leftTop);
        
        // sets right-top handler position
        this.getHandlerByAlign(
            TransformToolGroup.RIGHT,
            TransformToolGroup.TOP
        ).position(rightTop);
        
        // sets left-bottom handler position
        this.getHandlerByAlign(
            TransformToolGroup.LEFT,
            TransformToolGroup.BOTTOM
        ).position(leftBottom);
        
        // sets right-bottom handler position
        this.getHandlerByAlign(
            TransformToolGroup.RIGHT,
            TransformToolGroup.BOTTOM
        ).position(rightBottom);
        
        // sets center-top handler position
        this.getHandlerByAlign(
            TransformToolGroup.CENTER,
            TransformToolGroup.TOP
        ).position(centerTop);
        
        // sets left-middle handler position
        this.getHandlerByAlign(
            TransformToolGroup.LEFT,
            TransformToolGroup.MIDDLE
        ).position(leftMiddle);
        
        // sets right-middle handler position
        this.getHandlerByAlign(
            TransformToolGroup.RIGHT,
            TransformToolGroup.MIDDLE
        ).position(rightMiddle);
        
        // sets center-bottom handler position
        this.getHandlerByAlign(
            TransformToolGroup.CENTER,
            TransformToolGroup.BOTTOM
        ).position(centerBottom);
    };
    
    /**
     * Gets the transform tool group.
     * 
     * @param {Object} target The target
     * 
     * @return {Kinetic.Group}
     */
    function getTransformToolGroup(target) {
        return $(target).data(namespace + ':tool');
    }
    
    /**
     * Sets a transform tool group.
     * 
     * @param {Object}        target The target
     * @param {Kinetic.Group} tool   The transform tool group
     */
    function setTransformToolGroup(target, tool) {
        $(target).data(namespace + ':tool', tool);
    }
    
    /**
     * Calls the callback function when the stage is ready.
     * 
     * @param {Kinetic.Shape} target   Target
     * @param {Function}      callback Callback function
     * 
     * @return {Void}
     */
    function onStageReady(target, callback) {
        $.timer(0, function () {
            this.setDelay(1000);
            
            var stage = target.getStage();
            
            if (typeof stage != 'undefined') {
                this.stop();
                callback.apply(target);
            }
        }).start();
    }
    
    /**
     * Shows the transform tool.
     * 
     * @param {Kinetic.Shape} target The target
     * @param {Object}        options Custom options
     * 
     * @return {Void}
     */
    function showTransformTool(target, options) {
        initTransformTool(target, options, function (tool) {
            var stage = target.getStage();
            var rotateGroup = target.getParent();
            
            rotateGroup.draggable(true);
            tool.show();
            stage.draw();
        });
    }
    
    /**
     * Hides the transform tool.
     * 
     * @param {Kinetic.Shape} target The target
     * @param {Object}        options Custom options
     * 
     * @return {Void}
     */
    function hideTransformTool(target, options) {
        initTransformTool(target, options, function (tool) {
            var stage = target.getStage();
            var rotateGroup = target.getParent();
            
            rotateGroup.draggable(false);
            tool.hide();
            stage.draw();
        });
    }
    
    /**
     * Hides or shows the transform tool.
     * 
     * @param {Kinetic.Shape} target The target
     * @param {Object}        options Custom options
     * 
     * @return {Void}
     */
    function toggleTransformTool(target, options) {
        initTransformTool(target, options, function (tool) {
            if (tool.getVisible()) {
                hideTransformTool(target);
            } else {
                showTransformTool(target);
            }
        });
    }
    
    /**
     * Initializes the transform tool.
     * 
     * @param {Kinetic.Shape} target  The target
     * @param {Object}        options Custom options
     * @param {Function}      onReady Called when the tool is ready (not required)
     * 
     * @return {Void}
     */
    function initTransformTool(target, options, onReady) {
        onStageReady(target, function () {
            var tool = getTransformToolGroup(target);
            
            if (typeof tool == 'undefined') {
                tool = createTransformTool(target, options);
            }
            
            // calls onReady function
            if (typeof onReady != 'undefined') {
                onReady(tool);
            }
        });
    }
    
    /**
     * Creates the transform tool.
     * 
     * @param {Kinetic.Shape} target  The target
     * @param {Object}        options Custom options
     * 
     * @return {Void}
     */
    function createTransformTool(target, options) {
        var parent = target.getParent();

        // creates a new rotation group centered in the target
        // doesn't it depend on if the target is positioned by center or top left already? assume center now
        var rotateGroup = new Kinetic.Group({
            x: target.x() + target.width() / 2,
            y: target.y() + target.height() / 2,
            width: target.width(),
            height: target.height()
        });
        parent.add(rotateGroup);

        // the rotation group is the new parent of the target
        target.remove();
        rotateGroup.add(target);

        // places the target at the center of the rotation group
        // when the rotation group rotates, the target rotates also around its center
        target.position({x: 0, y: 0});
		
        //rotateGroup.offset({
        target.offset({
            x: target.width() / 2,
            y: target.height() / 2
        });
		

        window.parent = parent;
        // creates a new transform tool group
        var tool = new TransformToolGroup(target, options);
        rotateGroup.add(tool);

        // saves the tool in the target
        // we will obtain the tool later using getTransformToolGroup()
        setTransformToolGroup(target, tool);
        
        // update the parent
        parent.draw();

        console.log("group dimensions");
        console.log("pos: " + rotateGroup.position().x + ", " + rotateGroup.position().y);
        console.log("width: " + rotateGroup.width());
        console.log("height: " + rotateGroup.height());
        console.log("offset: " + rotateGroup.offset().x + ", " + rotateGroup.offset().y);
        console.log("target dimensions");
        console.log("pos: " + target.position().x + ", " + target.position().y);
        console.log("width: " + target.width());
        console.log("height: " + target.height());
        console.log("offset: " + target.offset().x + ", " + target.offset().y);

        return tool;
    }
    
    var methods = {
        'init': function(options) {
            return this.each(function() {
                var tool = getTransformToolGroup(this);
                
                if (typeof tool != 'undefined') {
                    showTransformTool(this, options);
                } else {
                    initTransformTool(this, options);
                }
            });
        },
        'hide': function(options) {
            return this.each(function() {
                hideTransformTool(this, options);
            });
        },
        'show': function(options) {
            return this.each(function() {
                showTransformTool(this, options);
            });
        },
        'toggle': function(options) {
            return this.each(function() {
                toggleTransformTool(this, options);
            });
        }
    };
    
    /**
     * Plugin method.
     * 
     * @param {String} methodName Method name
     * 
     * @return {jQuery}
     */
    $.fn[namespace] = function (methodName) {
        var ret = null;
        
        if (typeof methodName == 'string') {
            var args = Array.prototype.slice.call(arguments, 1);
            var method = methods[methodName];
            
            if (typeof method == 'undefined') {
                $.error('Method not found: ' + methodName);
            }
            
            ret = method.apply(this, args);
        } else {
            ret = methods.init.apply(this, arguments);
        }
        
        return ret;
    };
})(jQuery);
