function Point(x, y)
{
	if (x === undefined) {
		x = 0;
	}
	
	if (y === undefined) {
		y = 0;
	}
	
	this.x = x;
	this.y = y;
}

function Vector2D(xComp, yComp)
{
	this.x = xComp;
	this.y = yComp;
}

Vector2D.prototype.normal = function() {
	return new Vector2D(-this.y, this.x);
};

Vector2D.prototype.dot = function(otherVect) {
	return (this.x * otherVect.x) + (this.y * otherVect.y);
};

Vector2D.prototype.normalize = function() {
	var magnitude = Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
	this.x /= magnitude;
	this.y /= magnitude;
	return this;
};

Point.prototype.transform = function(transform) {
	// Perform the 1x3 X 3x3 matrix multiplication to transform the point
	// (no need to calculate w here, since for these (2d) points it's always 1
	var newX = (this.x * transform.a) + (this.y * transform.c) + transform.e;
	var newY = (this.x * transform.b) + (this.y * transform.d) + transform.f;
	this.x = newX;
	this.y = newY;
	return this;
};

Point.prototype.scale = function(scaleX, scaleY) {
	this.x *= scaleX;
	this.y *= scaleY;
	
	return this;
};

function Frame(parentFighter, image)
{
	this.parentFighter = parentFighter;
	this.image = image;
	this.aspectRatio = this.image.naturalHeight / this.image.naturalWidth;
	this.width = this.image.naturalWidth * FRAME_SIZE_SCALE_FACTOR;
	this.height = this.image.naturalHeight * FRAME_SIZE_SCALE_FACTOR;
}

Frame.prototype.parseBounds = function(boundsSVG, frameNum)
{
	//var boundsSVG = document.getElementById("aaron");
	
	var headBounds = boundsSVG.getElementById("frame" + frameNum + "-head");
	var bodyBounds = boundsSVG.getElementById("frame" + frameNum + "-body");
	var leftArmBounds = boundsSVG.getElementById("frame" + frameNum + "-arm-left");
	var rightArmBounds = boundsSVG.getElementById("frame" + frameNum + "-arm-right");
	var leftLegBounds = boundsSVG.getElementById("frame" + frameNum + "-leg-left");
	var rightLegBounds = boundsSVG.getElementById("frame" + frameNum + "-leg-right");
	
	var frameBounds = new FrameBounds(this.parentFighter, this.width / boundsSVG.documentElement.viewBox.baseVal.width, this.height / boundsSVG.documentElement.viewBox.baseVal.height);
	
	frameBounds.parseSectionBounds(headBounds, "headBounds");
	frameBounds.parseSectionBounds(bodyBounds, "bodyBounds");
	frameBounds.parseSectionBounds(leftArmBounds, "leftArmBounds");
	frameBounds.parseSectionBounds(rightArmBounds, "rightArmBounds");
	frameBounds.parseSectionBounds(leftLegBounds, "leftLegBounds");
	frameBounds.parseSectionBounds(rightLegBounds, "rightLegBounds");
	
	this.bounds = frameBounds;
	this.bounds = frameBounds;
};

function Bounds(parentBounds, x, y, width, height, transform)
{
	this.parentBounds = parentBounds;
	this.x = x;
	this.y = y;
	this.width = width;
	this.height = height;
	this.transform = transform;
	this.collisionStatus = false;
	this.collidingPart = BodyPartEnum.BODY_PART_NONE;
	
	// Compute the vertices of the bounds rectangle here
	// for use in the collision detection algorithm
	// Vertices are always in the same order, starting with the
	// top left vertex and going clockwise
	this.vertices = [];
	if (this.transform) {
		this.vertices.push(new Point(this.x, this.y).transform(this.transform).scale(this.parentBounds.xScale, this.parentBounds.yScale));
		this.vertices.push(new Point(this.x + this.width, this.y).transform(this.transform).scale(this.parentBounds.xScale, this.parentBounds.yScale));
		this.vertices.push(new Point(this.x + this.width, this.y + this.height).transform(this.transform).scale(this.parentBounds.xScale, this.parentBounds.yScale));
		this.vertices.push(new Point(this.x, this.y + this.height).transform(this.transform).scale(this.parentBounds.xScale, this.parentBounds.yScale));
	} else {
		this.vertices.push(new Point(this.x, this.y).scale(this.parentBounds.xScale, this.parentBounds.yScale));
		this.vertices.push(new Point(this.x + this.width, this.y).scale(this.parentBounds.xScale, this.parentBounds.yScale));
		this.vertices.push(new Point(this.x + this.width, this.y + this.height).scale(this.parentBounds.xScale, this.parentBounds.yScale));
		this.vertices.push(new Point(this.x, this.y + this.height).scale(this.parentBounds.xScale, this.parentBounds.yScale));
	}
	
	// Pre-compute normals of 1st 2 edges for use in collision detection algorithm
	this.normal1 = new Vector2D(this.vertices[0].x - this.vertices[1].x, this.vertices[0].y - this.vertices[1].y).normal().normalize();
	this.normal2 = new Vector2D(this.vertices[1].x - this.vertices[2].x, this.vertices[1].y - this.vertices[2].y).normal().normalize();
}

Bounds.prototype.isColliding = function(otherBounds) {
	// Since all bounds are rectangles, only need to check the two perpendicular axes
	// (checking both of the parallel axes is redundant)
	if (this.checkSeparatingAxis(this.normal1, otherBounds)) {
		return false;
	}
	if (this.checkSeparatingAxis(this.normal2, otherBounds)) {
		return false;
	}
	if (this.checkSeparatingAxis(otherBounds.normal1, otherBounds)) {
		return false;
	}
	if (this.checkSeparatingAxis(otherBounds.normal2, otherBounds)) {
		return false;
	}
	return true;
};

Bounds.prototype.resetCollisionState = function() {
	this.collisionStatus = false;
	this.collidingPart = BodyPartEnum.BODY_PART_NONE;
};

Bounds.prototype.checkSeparatingAxis = function(axis, otherBounds) {
	var bounds1X = 0;
	if (this.parentBounds.parentFighter.facing == FacingEnum.FACING_LEFT) {
		bounds1X = this.parentBounds.parentFighter.subCanvas.width - this.vertices[0].x;
	} else {
		bounds1X = this.vertices[0].x
	}
	var bounds1VertexGlobal = new Point(bounds1X + this.parentBounds.parentFighter.location.x, this.vertices[0].y + this.parentBounds.parentFighter.location.y);
	var bounds1Min = axis.dot(bounds1VertexGlobal);
	var bounds1Max = bounds1Min;
	
	var bounds2X = 0;
	if (otherBounds.parentBounds.parentFighter.facing == FacingEnum.FACING_LEFT) {
		bounds2X = otherBounds.parentBounds.parentFighter.subCanvas.width - otherBounds.vertices[0].x;
	} else {
		bounds2X = otherBounds.vertices[0].x
	}
	var bounds2VertexGlobal = new Point(bounds2X + otherBounds.parentBounds.parentFighter.location.x, otherBounds.vertices[0].y + otherBounds.parentBounds.parentFighter.location.y);
	var bounds2Min = axis.dot(bounds2VertexGlobal);
	var bounds2Max = bounds2Min;
	
	for (var i = 1; i < this.vertices.length; i++) {
		if (this.parentBounds.parentFighter.facing == FacingEnum.FACING_LEFT) {
			bounds1X = this.parentBounds.parentFighter.subCanvas.width - this.vertices[i].x;
		} else {
			bounds1X = this.vertices[i].x
		}
		bounds1VertexGlobal = new Point(bounds1X + this.parentBounds.parentFighter.location.x, this.vertices[i].y + this.parentBounds.parentFighter.location.y);
		var projection = axis.dot(bounds1VertexGlobal);
		if (projection < bounds1Min) {
			bounds1Min = projection;
		} else if(projection > bounds1Max) {
			bounds1Max = projection;
		}
	}
	
	for (var i = 1; i < otherBounds.vertices.length; i++) {
		if (otherBounds.parentBounds.parentFighter.facing == FacingEnum.FACING_LEFT) {
			bounds2X = otherBounds.parentBounds.parentFighter.subCanvas.width - otherBounds.vertices[i].x;
		} else {
			bounds2X = otherBounds.vertices[i].x
		}
		bounds2VertexGlobal = new Point(bounds2X + otherBounds.parentBounds.parentFighter.location.x, otherBounds.vertices[i].y + otherBounds.parentBounds.parentFighter.location.y);
		var projection = axis.dot(bounds2VertexGlobal);
		if (projection < bounds2Min) {
			bounds2Min = projection;
		} else if(projection > bounds2Max) {
			bounds2Max = projection;
		}
	}
	
	return ((bounds1Max < bounds2Min) || (bounds1Min > bounds2Max));
};

function FrameBounds(parentFighter, xScale, yScale)
{
	this.parentFighter = parentFighter;
	this.xScale = xScale;
	this.yScale = yScale;
	this.headBounds = null;
	this.bodyBounds = null;
	this.leftArmBounds = null;
	this.rightArmBounds = null;
	this.leftLegBounds = null;
	this.rightLegBounds = null;
}

FrameBounds.prototype.parseSectionBounds = function(boundsElement, section) {
	var transform = null;
	if (boundsElement.transform.baseVal.length != 0) {
		transform = boundsElement.transform.baseVal[0].matrix;
	}
	
	this[section] = new Bounds(this, boundsElement.x.baseVal.value, boundsElement.y.baseVal.value, boundsElement.width.baseVal.value, boundsElement.height.baseVal.value, transform);
};

FrameBounds.prototype.resetCollisionState = function() {
	this.headBounds.resetCollisionState();
	this.bodyBounds.resetCollisionState();
	this.leftArmBounds.resetCollisionState();
	this.rightArmBounds.resetCollisionState();
	this.leftLegBounds.resetCollisionState();
	this.rightLegBounds.resetCollisionState();
}

function FrameSetLoadInfo(path, prefix, numFrames)
{
	this.path = path;
	this.prefix = prefix;
	this.numFrames = numFrames;
}

function checkCollisions(fighter1, fighter2) {
	// TODO: For now, just collide left leg, left arm, body, and head against each other
	
	// TODO: Make these the proper frames when we're loading frames
	var fighter1Frame = fighter1.framesNew[fighter1.currentFrameSet][fighter1.currentFrame];
	var fighter2Frame = fighter2.framesNew[fighter2.currentFrameSet][fighter2.currentFrame];
	
	// Reset the collision state of all body parts, since we're gonna recalculate them for the current frame
	fighter1Frame.bounds.resetCollisionState();
	fighter2Frame.bounds.resetCollisionState();
	
	// Check fighter 1 left leg colliding with fighter 2 left leg
	if (fighter1Frame.bounds.leftLegBounds.isColliding(fighter2Frame.bounds.leftLegBounds)) {
		fighter1Frame.bounds.leftLegBounds.collisionStatus = true;
		fighter2Frame.bounds.leftLegBounds.collisionStatus = true;
		fighter1Frame.bounds.leftLegBounds.collidingPart = BodyPartEnum.BODY_PART_LEFT_LEG;
		fighter2Frame.bounds.leftLegBounds.collidingPart = BodyPartEnum.BODY_PART_LEFT_LEG;
	}
	
	// Check fighter 1 left leg colliding with fighter 2 body
	if (fighter1Frame.bounds.leftLegBounds.isColliding(fighter2Frame.bounds.bodyBounds)) {
		fighter1Frame.bounds.leftLegBounds.collisionStatus = true;
		fighter2Frame.bounds.bodyBounds.collisionStatus = true;
		fighter1Frame.bounds.leftLegBounds.collidingPart = BodyPartEnum.BODY_PART_BODY;
		fighter2Frame.bounds.bodyBounds.collidingPart = BodyPartEnum.BODY_PART_LEFT_LEG;
	}
	
	// Check fighter 1 left leg colliding with fighter 2 left arm
	if (fighter1Frame.bounds.leftLegBounds.isColliding(fighter2Frame.bounds.leftArmBounds)) {
		fighter1Frame.bounds.leftLegBounds.collisionStatus = true;
		fighter2Frame.bounds.leftArmBounds.collisionStatus = true;
		fighter1Frame.bounds.leftLegBounds.collidingPart = BodyPartEnum.BODY_PART_LEFT_ARM;
		fighter2Frame.bounds.leftArmBounds.collidingPart = BodyPartEnum.BODY_PART_LEFT_LEG;
	}
	
	// Check fighter 1 left leg colliding with fighter 2 head
	if (fighter1Frame.bounds.leftLegBounds.isColliding(fighter2Frame.bounds.headBounds)) {
		fighter1Frame.bounds.leftLegBounds.collisionStatus = true;
		fighter2Frame.bounds.headBounds.collisionStatus = true;
		fighter1Frame.bounds.leftLegBounds.collidingPart = BodyPartEnum.BODY_PART_HEAD;
		fighter2Frame.bounds.headBounds.collidingPart = BodyPartEnum.BODY_PART_LEFT_LEG;
	}
	
	// Check fighter 1 left arm colliding with fighter 2 left leg
	if (fighter1Frame.bounds.leftArmBounds.isColliding(fighter2Frame.bounds.leftLegBounds)) {
		fighter1Frame.bounds.leftArmBounds.collisionStatus = true;
		fighter2Frame.bounds.leftLegBounds.collisionStatus = true;
		fighter1Frame.bounds.leftArmBounds.collidingPart = BodyPartEnum.BODY_PART_LEFT_LEG;
		fighter2Frame.bounds.leftLegBounds.collidingPart = BodyPartEnum.BODY_PART_LEFT_ARM;
	}
	
	// Check fighter 1 left arm colliding with fighter 2 body
	if (fighter1Frame.bounds.leftArmBounds.isColliding(fighter2Frame.bounds.bodyBounds)) {
		fighter1Frame.bounds.leftArmBounds.collisionStatus = true;
		fighter2Frame.bounds.bodyBounds.collisionStatus = true;
		fighter1Frame.bounds.leftArmBounds.collidingPart = BodyPartEnum.BODY_PART_BODY;
		fighter2Frame.bounds.bodyBounds.collidingPart = BodyPartEnum.BODY_PART_LEFT_ARM;
	}
	
	// Check fighter 1 left arm colliding with fighter 2 left arm
	if (fighter1Frame.bounds.leftArmBounds.isColliding(fighter2Frame.bounds.leftArmBounds)) {
		fighter1Frame.bounds.leftArmBounds.collisionStatus = true;
		fighter2Frame.bounds.leftArmBounds.collisionStatus = true;
		fighter1Frame.bounds.leftArmBounds.collidingPart = BodyPartEnum.BODY_PART_LEFT_ARM;
		fighter2Frame.bounds.leftArmBounds.collidingPart = BodyPartEnum.BODY_PART_LEFT_ARM;
	}
	
	// Check fighter 1 left arm colliding with fighter 2 head
	if (fighter1Frame.bounds.leftArmBounds.isColliding(fighter2Frame.bounds.headBounds)) {
		fighter1Frame.bounds.leftArmBounds.collisionStatus = true;
		fighter2Frame.bounds.headBounds.collisionStatus = true;
		fighter1Frame.bounds.leftArmBounds.collidingPart = BodyPartEnum.BODY_PART_HEAD;
		fighter2Frame.bounds.headBounds.collidingPart = BodyPartEnum.BODY_PART_LEFT_ARM;
	}
	
	// Check fighter 1 body colliding with fighter 2 left leg
	if (fighter1Frame.bounds.bodyBounds.isColliding(fighter2Frame.bounds.leftLegBounds)) {
		fighter1Frame.bounds.bodyBounds.collisionStatus = true;
		fighter2Frame.bounds.leftLegBounds.collisionStatus = true;
		fighter1Frame.bounds.bodyBounds.collidingPart = BodyPartEnum.BODY_PART_LEFT_LEG;
		fighter2Frame.bounds.leftLegBounds.collidingPart = BodyPartEnum.BODY_PART_BODY;
	}
	
	// Check fighter 1 head colliding with fighter 2 left leg
	if (fighter1Frame.bounds.headBounds.isColliding(fighter2Frame.bounds.leftLegBounds)) {
		fighter1Frame.bounds.headBounds.collisionStatus = true;
		fighter2Frame.bounds.leftLegBounds.collisionStatus = true;
		fighter1Frame.bounds.headBounds.collidingPart = BodyPartEnum.BODY_PART_LEFT_LEG;
		fighter2Frame.bounds.leftLegBounds.collidingPart = BodyPartEnum.BODY_PART_HEAD;
	}
	
	// Check fighter 1 body colliding with fighter 2 left arm
	if (fighter1Frame.bounds.bodyBounds.isColliding(fighter2Frame.bounds.leftArmBounds)) {
		fighter1Frame.bounds.bodyBounds.collisionStatus = true;
		fighter2Frame.bounds.leftArmBounds.collisionStatus = true;
		fighter1Frame.bounds.bodyBounds.collidingPart = BodyPartEnum.BODY_PART_LEFT_ARM;
		fighter2Frame.bounds.leftArmBounds.collidingPart = BodyPartEnum.BODY_PART_BODY;
	}
	
	// Check fighter 1 head colliding with fighter 2 left arm
	if (fighter1Frame.bounds.headBounds.isColliding(fighter2Frame.bounds.leftArmBounds)) {
		fighter1Frame.bounds.headBounds.collisionStatus = true;
		fighter2Frame.bounds.leftArmBounds.collisionStatus = true;
		fighter1Frame.bounds.headBounds.collidingPart = BodyPartEnum.BODY_PART_LEFT_ARM;
		fighter2Frame.bounds.leftArmBounds.collidingPart = BodyPartEnum.BODY_PART_HEAD;
	}
}

function clampToRange(value, rangeLow, rangeHigh)
{
	return (value < rangeLow) ? rangeLow : ((value > rangeHigh) ? rangeHigh : value);
}

function createBoundFunction(func /*additional arguments passed here*/)
{
	var boundArgs = Array.prototype.slice.call(arguments, 1);
	return function() {
		return func.apply(this, boundArgs);
	}
}
