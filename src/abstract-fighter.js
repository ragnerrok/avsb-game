function AbstractFighter(engine, name, startingPosition, movementSpeed, runModifier, crouchModifier, jumpPower, actionNumFrames)
{
	this.engine = engine;
	
	if (startingPosition === undefined) {
		startingPosition = new Point();
	}
	
	if (movementSpeed === undefined) {
		movementSpeed = DEFAULT_MOVEMENT_SPEED;
	}
	
	if (runModifier === undefined) {
		runModifier = DEFAULT_RUN_MODIFIER;
	}
	
	if (crouchModifier === undefined) {
		crouchModifier = DEFAULT_CROUCH_MODIFIER;
	}
	
	if (jumpPower === undefined) {
		jumpPower = DEFAULT_JUMP_POWER;
	}
	
	if (actionNumFrames === undefined) {
		actionNumFrames = DEFAULT_ACTION_NUM_FRAMES;
	}
	
	this.name = name;
	this.animationState = AnimationStateEnum.ANIMATION_STATE_IDLE;
	this.action = ActionEnum.ACTION_NONE;
	this.movementModifier = MovementModifierEnum.MOVEMENT_MODIFIER_NONE;
	this.facing = FacingEnum.FACING_LEFT;
	this.actionNumFrames = actionNumFrames;
	this.frameElapsedTime = 0;
	this.currentFrame = 0;
	this.actionFrame = 0;
	this.location = startingPosition;
	this.movementSpeed = movementSpeed;
	this.runModifier = runModifier;
	this.crouchModifier = crouchModifier;
	this.jumpPower = jumpPower;
	this.velY = 0;
	this.velX = 0;
	
	// TODO: This is temporary
	this.frames = [];
	
	this.loadFrames();
	
	var maxFrameBounds = this.getMaxFrameBounds();
	this.maxFrameWidth = maxFrameBounds.x;
	this.maxFrameHeight = maxFrameBounds.y;
	
	// Create a per-fighter canvas to render each frame into.
	// This is so we can apply transformations to each frame without
	// affecting the main canvas.  The fighter canvas will then be
	// rendered into the main canvas
	this.subCanvas = this.engine.mainPage.createElement("canvas");
	this.subCanvas.width = this.maxFrameWidth;
	this.subCanvas.height = this.maxFrameHeight;
	this.subCtx = this.subCanvas.getContext("2d");
	
	// Toggle this to turn debug info on and off
	this.debugMode = true;
}

AbstractFighter.prototype.loadFrames = function() {
	var frameImage = this.engine.mainPage.getElementById("aaron_frame_1");
	var frame = new Frame(this, frameImage);
	var boundsSVG = this.engine.mainPage.getElementById("aaron_bounds_1");
	frame.parseBounds(boundsSVG, 1);
	this.frames.push(frame);
};

AbstractFighter.prototype.getMaxFrameBounds = function() {
	var maxWidth = 0;
	var maxHeight = 0;
	this.frames.forEach(function(frame) {
		if (frame.width > maxWidth) {
			maxWidth = frame.width;
		}
		
		if (frame.height > maxHeight) {
			maxHeight = frame.height;
		}
	});
	
	return new Point(maxWidth, maxHeight);
}

AbstractFighter.prototype.draw = function(frame) {
	// Clear the fighter's drawing context
	this.subCtx.clearRect(0, 0, this.subCanvas.width, this.subCanvas.height);
	
	// Draw fighter frame
	this.subCtx.save();
	
	if (this.facing == FacingEnum.FACING_LEFT) {
		this.subCtx.translate(this.frames[frame].width, 0.0);
		this.subCtx.scale(-1.0, 1.0);
		//this.subCtx.translate(-this.frames[frame].width, 0.0);
	}
	
	this.subCtx.fillStyle = "orange";
	this.subCtx.drawImage(this.frames[frame].image, 0, 0, this.frames[frame].width, this.frames[frame].height);
	
	// If in debug mode, draw fighter bounds
	if (this.debugMode) {
		this.drawBoundingBox(frame, "headBounds");
		this.drawBoundingBox(frame, "bodyBounds");
		this.drawBoundingBox(frame, "leftArmBounds");
		this.drawBoundingBox(frame, "rightArmBounds");
		this.drawBoundingBox(frame, "leftLegBounds");
		this.drawBoundingBox(frame, "rightLegBounds");
	}
	
	this.subCtx.restore();
	
	// If in debug mode, draw debug info.  Putting this here after context restore
	// so we don't flip the debug info if we're facing left
	if (this.debugMode) {
		this.subCtx.save();
		var debugInfoY = this.frames[frame].height - 100;
		this.subCtx.fillStyle = "orange";
		this.subCtx.fillRect(0, debugInfoY, 100, 100);
		this.subCtx.font = "12px sans-serif"
		this.subCtx.fillStyle = 'black'
		this.subCtx.fillText(this.animationState, 5, debugInfoY + 10);
		this.subCtx.fillText("Modifier: " + this.movementModifier, 5, debugInfoY + 25);
		this.subCtx.fillText("Facing: " + this.facing, 5, debugInfoY + 40);
		this.subCtx.fillText("Action: " + this.action, 5, debugInfoY + 55);
		this.subCtx.fillText("Frame: " + this.currentFrame, 5, debugInfoY + 70);
		this.subCtx.fillText("Action Frame: " + this.actionFrame, 5, debugInfoY + 85);
		this.subCtx.restore();
	}
};

AbstractFighter.prototype.drawBoundingBox = function(frame, boundingBoxSection)
{
	this.subCtx.save();
	
	this.subCtx.lineWidth = "12";
	
	var bounds = this.frames[frame].bounds;
	var boundsSection = bounds[boundingBoxSection];
	
	if (boundsSection.collisionStatus) {
		this.subCtx.strokeStyle = "red";
	} else {
		this.subCtx.strokeStyle = "green";
	}
	
	this.subCtx.scale(bounds.xScale, bounds.yScale);
	
	if (boundsSection.transform != null) {
		this.subCtx.transform(boundsSection.transform.a, boundsSection.transform.b, boundsSection.transform.c, boundsSection.transform.d, boundsSection.transform.e, boundsSection.transform.f);
	}
	
	this.subCtx.strokeRect(boundsSection.x, boundsSection.y, boundsSection.width, boundsSection.height);
	
	this.subCtx.restore();
};

AbstractFighter.prototype.update = function(frameDuration) {
	this.frameElapsedTime += frameDuration;
	
	this.updateState();
	this.updatePosition(frameDuration);

	// Determine which frame we're on	
	if (this.frameElapsedTime >= FRAME_TIME) {
		this.frameElapsedTime = 0;
		this.currentFrame++;
		if (this.currentFrame >= NUM_FRAMES_PER_STATE) {
			this.currentFrame = 0;
		}
		
		// If we're performing an action, also manage the action frame we're on
		if (this.action != ActionEnum.ACTION_NONE) {
			this.actionFrame++;
			if (this.actionFrame >= this.actionNumFrames[this.action]) {
				// If we've run through all the action frames for the current action,
				// clear the action
				this.actionFrame = 0;
				this.action = ActionEnum.ACTION_NONE;
			}
		}
	}
};
