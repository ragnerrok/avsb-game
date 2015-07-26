function Fighter(engine, name, startingPosition, movementSpeed, runModifier, crouchModifier, jumpPower, actionNumFrames)
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

Fighter.prototype.loadFrames = function() {
	var frameImage = this.engine.mainPage.getElementById("aaron_frame_1");
	var frame = new Frame(frameImage);
	var boundsSVG = this.engine.mainPage.getElementById("aaron_bounds_1");
	frame.parseBounds(boundsSVG, 1);
	this.frames.push(frame);
};

Fighter.prototype.getMaxFrameBounds = function() {
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

Fighter.prototype.draw = function(frame) {
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
		this.subCtx.strokeStyle = "green";
		this.subCtx.lineWidth = "8";
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

Fighter.prototype.drawBoundingBox = function(frame, boundingBoxSection)
{
	this.subCtx.save();
	
	var bounds = this.frames[frame].bounds;
	var boundsSection = bounds[boundingBoxSection];
	
	this.subCtx.scale(bounds.xScale, bounds.yScale);
	
	if (boundsSection.transform != null) {
		this.subCtx.transform(boundsSection.transform.a, boundsSection.transform.b, boundsSection.transform.c, boundsSection.transform.d, boundsSection.transform.e, boundsSection.transform.f);
	}
	
	this.subCtx.strokeRect(boundsSection.x, boundsSection.y, boundsSection.width, boundsSection.height);
	
	this.subCtx.restore();
};

Fighter.prototype.update = function(frameDuration) {
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

Fighter.prototype.updateState = function() {
	// Determine the current state of the fighter
	// If we're not currently jumping, and the jump input is active, start a jump
	if (this.engine.currentInput & UserInputEnum.USER_INPUT_JUMP) {
		if (this.animationState != AnimationStateEnum.ANIMATION_STATE_JUMP) {
			// Starting a jump overrides any active movement modifiers
			// (an active run modifier will get re-applied below)
			this.movementModifier = MovementModifierEnum.MOVEMENT_MODIFIER_NONE;
			
			this.animationState = AnimationStateEnum.ANIMATION_STATE_JUMP;
			this.currentFrame = 0; // Always start a jump animation at the beginning
			this.velY = -this.jumpPower;
		}
	}

	// Can only start a new action if another one isn't currently in progress
	if (this.action == ActionEnum.ACTION_NONE) {
		if (this.engine.currentInput & UserInputEnum.USER_INPUT_BLOCK) {
			this.action = ActionEnum.ACTION_BLOCK;
			this.actionFrame = 0;
		} else if (this.engine.currentInput & UserInputEnum.USER_INPUT_KICK) {
			this.action = ActionEnum.ACTION_KICK;
			this.actionFrame = 0;
		} else if (this.engine.currentInput & UserInputEnum.USER_INPUT_PUNCH) {
			this.action = ActionEnum.ACTION_PUNCH;
			this.actionFrame = 0;
		}
	}
	
	if (this.engine.currentInput & UserInputEnum.USER_INPUT_CROUCH) {
		// Don't allow crouch modifier while in the middle of a jump
		if (this.animationState != AnimationStateEnum.ANIMATION_STATE_JUMP) {
			this.movementModifier = MovementModifierEnum.MOVEMENT_MODIFIER_CROUCH;
		}
	} else if (this.engine.currentInput & UserInputEnum.USER_INPUT_RUN) {
		this.movementModifier = MovementModifierEnum.MOVEMENT_MODIFIER_RUN;
	} else {
		this.movementModifier = MovementModifierEnum.MOVEMENT_MODIFIER_NONE;
	}
	
	if (this.engine.currentInput & USER_INPUT_MOVING_LEFT_RIGHT) {
		// If we're not in the middle of a jump, then we're in the move state
		if (this.animationState != AnimationStateEnum.ANIMATION_STATE_JUMP) {
			this.animationState = AnimationStateEnum.ANIMATION_STATE_MOVE;
		}
		
		var direction = 1;
		if (this.engine.currentInput & UserInputEnum.USER_INPUT_LEFT) {
			direction = -1;
		} else if (this.engine.currentInput & UserInputEnum.USER_INPUT_RIGHT) {
			direction = 1;
		}
		
		var movementModifier = 1;
		switch (this.movementModifier) {
		case MovementModifierEnum.MOVEMENT_MODIFIER_CROUCH:
			movementModifier = this.crouchModifier;
			break;
		
		case MovementModifierEnum.MOVEMENT_MODIFIER_RUN:
			movementModifier = this.runModifier;
			break;
		}
		
		this.velX = direction * movementModifier * this.movementSpeed;
	} else {
		this.velX = 0;
		if (this.animationState != AnimationStateEnum.ANIMATION_STATE_JUMP) {
			this.animationState = AnimationStateEnum.ANIMATION_STATE_IDLE;
		}
	}
	
	// If either left or right is pressed, determine current facing direction
	if (this.engine.currentInput & USER_INPUT_MOVING_LEFT_RIGHT) {
		if (this.engine.currentInput & UserInputEnum.USER_INPUT_LEFT) {
			this.facing = FacingEnum.FACING_LEFT;
		} else if (this.engine.currentInput & UserInputEnum.USER_INPUT_RIGHT) {
			this.facing = FacingEnum.FACING_RIGHT;
		}
	}
};
Fighter.prototype.updatePosition = function(frameDuration) {
	var frameDurationSecs = (frameDuration / 1000);
	
	// If we're moving, update the position of the fighter
	switch (this.animationState) {
	case AnimationStateEnum.ANIMATION_STATE_JUMP:
		// Calculate new vertical velocity
		this.velY += GRAVITY_ACCELERATION * frameDurationSecs;
		// If we're back on the ground, we're not in jump mode anymore
		var predictedYPos = this.location.y + (this.velY * frameDurationSecs);
		if (predictedYPos >= this.engine.canvas.height) {
			this.velY = 0;
			this.location.y = this.engine.canvas.height;
			this.animationState = AnimationStateEnum.ANIMATION_STATE_IDLE;
		}
		break;
	
	default:
		break;
	}
	
	var xOffset = this.velX * frameDurationSecs;
	var yOffset = this.velY * frameDurationSecs;
	
	// TODO: Fix magic numbers
	this.location.x = clamp_to_range(this.location.x + xOffset, 0, this.engine.canvas.width);
	this.location.y = clamp_to_range(this.location.y + yOffset, 0, this.engine.canvas.height);
}