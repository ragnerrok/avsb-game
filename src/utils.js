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

function Frame(image, width)
{
	this.image = image;
	this.aspectRatio = this.image.naturalHeight / this.image.naturalWidth;
	this.width = width;
	this.height = this.width * this.aspectRatio;
}

Frame.prototype.parseBounds = function(boundsSVG, frameNum)
{
	var boundsSVG = document.getElementById("aaron");
	
	var headBounds = document.getElementById("frame" + frameNum + "-head");
	var bodyBounds = document.getElementById("frame" + frameNum + "-body");
	var leftArmBounds = document.getElementById("frame" + frameNum + "-leftarm");
	var rightArmBounds = document.getElementById("frame" + frameNum + "-rightarm");
	var leftLegBounds = document.getElementById("frame" + frameNum + "-leftleg");
	var rightLegBounds = document.getElementById("frame" + frameNum + "-rightleg");
	
	var frameBounds = new FrameBounds(DEFAULT_FIGHTER_WIDTH / boundsSVG.viewBox.baseVal.width, (DEFAULT_FIGHTER_WIDTH * this.aspectRatio) / boundsSVG.viewBox.baseVal.height);
	
	frameBounds.parseSectionBounds(headBounds, "headBounds");
	frameBounds.parseSectionBounds(bodyBounds, "bodyBounds");
	frameBounds.parseSectionBounds(leftArmBounds, "leftArmBounds");
	frameBounds.parseSectionBounds(rightArmBounds, "rightArmBounds");
	frameBounds.parseSectionBounds(leftLegBounds, "leftLegBounds");
	frameBounds.parseSectionBounds(rightLegBounds, "rightLegBounds");
	
	this.bounds = frameBounds;
	this.bounds = frameBounds;
};

function Bounds(x, y, width, height, transform)
{
	this.x = x;
	this.y = y;
	this.width = width;
	this.height = height;
	this.transform = transform;
}

function FrameBounds(xScale, yScale)
{
	this.xScale = xScale;
	this.yScale = yScale;
	this.headBounds = null;
	this.bodyBounds = null;
	this.leftArmBounds = null;
	this.rightArmBounds = null;
	this.leftLegBounds = null;
	this.rightLegBounds = null;
}

FrameBounds.prototype.parseSectionBounds = function (boundsElement, section) {
	var transform = null;
	if (boundsElement.transform.baseVal.length != 0) {
		transform = boundsElement.transform.baseVal[0].matrix;
	}
	
	this[section] = new Bounds(boundsElement.x.baseVal.value, boundsElement.y.baseVal.value, boundsElement.width.baseVal.value, boundsElement.height.baseVal.value, transform);
};

function clamp_to_range(value, rangeLow, rangeHigh)
{
	return (value < rangeLow) ? rangeLow : ((value > rangeHigh) ? rangeHigh : value);
}