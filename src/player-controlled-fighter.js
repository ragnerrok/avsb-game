function PlayerFighter(engine, name, startingPosition, movementSpeed, runModifier, crouchModifier, jumpPower, actionNumFrames)
{
	AbstractFighter.call(this, engine, name, startingPosition, movementSpeed, runModifier, crouchModifier, jumpPower, actionNumFrames); // Call superconstructor
}

PlayerFighter.prototype = Object.create(AbstractFighter.prototype);
PlayerFighter.prototype.constructor = PlayerFighter;

PlayerFighter.prototype.updateState = function() {
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

PlayerFighter.prototype.updatePosition = function(frameDuration) {
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