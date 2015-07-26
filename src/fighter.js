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
	
	// Toggle this to turn debug info on and off
	this.debugMode = true;
}

Fighter.prototype.addFrame = function (frame) {
	this.frames.push(frame);
};

Fighter.prototype.draw = function(frame) {	
	// Draw fighter frame
	//console.log(this.frames[frame].height)
	this.engine.ctx.fillStyle = "orange";
	//ctx.fillRect(this.location.x, this.location.y - this.frames[frame].height, this.frames[frame].width, this.frames[frame].height);
	this.engine.ctx.drawImage(this.frames[frame].image, this.location.x, this.location.y - this.frames[frame].height, this.frames[frame].width, this.frames[frame].height);
	
	// If in debug mode, draw fighter bounds and debug info
	if (this.debugMode) {
		this.engine.ctx.strokeStyle = "green";
		this.engine.ctx.lineWidth = "8";
		this.drawBoundingBox(frame, "headBounds");
		this.drawBoundingBox(frame, "bodyBounds");
		this.drawBoundingBox(frame, "leftArmBounds");
		this.drawBoundingBox(frame, "rightArmBounds");
		this.drawBoundingBox(frame, "leftLegBounds");
		this.drawBoundingBox(frame, "rightLegBounds");
		
		this.engine.ctx.font = "12px sans-serif"
		this.engine.ctx.fillStyle = 'black'
		this.engine.ctx.fillText(this.animationState, this.location.x + 100, this.location.y - 95);
		this.engine.ctx.fillText("Modifier: " + this.movementModifier, this.location.x + 100, this.location.y - 80);
		this.engine.ctx.fillText("Facing: " + this.facing, this.location.x + 100, this.location.y - 65);
		this.engine.ctx.fillText("Action: " + this.action, this.location.x + 100, this.location.y - 50);
		this.engine.ctx.fillText("Frame: " + this.currentFrame, this.location.x + 100, this.location.y - 35);
		this.engine.ctx.fillText("Action Frame: " + this.actionFrame, this.location.x + 100, this.location.y - 20);
	}
};

Fighter.prototype.drawBoundingBox = function(frame, boundingBoxSection)
{
	this.engine.ctx.save();
	
	this.engine.ctx.translate(0, -this.frames[frame].height);
	
	var bounds = this.frames[frame].bounds;
	var boundsSection = bounds[boundingBoxSection];
	
	this.engine.ctx.scale(bounds.xScale, bounds.yScale);
	
	if (boundsSection.transform != null) {
		this.engine.ctx.translate(this.location.x / bounds.xScale, this.location.y / bounds.yScale);
		//ctx.transform(bounds.transform.a * xScale, bounds.transform.b * xScale, bounds.transform.c * yScale, bounds.transform.d * yScale, bounds.transform.e * xScale, bounds.transform.f * yScale);
		this.engine.ctx.transform(boundsSection.transform.a, boundsSection.transform.b, boundsSection.transform.c, boundsSection.transform.d, boundsSection.transform.e, boundsSection.transform.f);
		this.engine.ctx.translate(-this.location.x / bounds.xScale, -this.location.y / bounds.yScale);
	}
	
	this.engine.ctx.strokeRect((this.location.x / bounds.xScale) + boundsSection.x, (this.location.y / bounds.yScale) + boundsSection.y, boundsSection.width, boundsSection.height);
	
	this.engine.ctx.restore();
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