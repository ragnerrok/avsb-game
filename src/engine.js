var FacingEnum = Object.freeze({
	FACING_LEFT: "Left",
	FACING_RIGHT: "Right"
});

var AnimationStateEnum = Object.freeze({
	ANIMATION_STATE_IDLE: "Idle",
	ANIMATION_STATE_MOVE: "Move",
	ANIMATION_STATE_JUMP: "Jump"
});

var MovementModifierEnum = Object.freeze({
	MOVEMENT_MODIFIER_NONE: "None",
	MOVEMENT_MODIFIER_RUN: "Run",
	MOVEMENT_MODIFIER_CROUCH: "Crouch"
});

var ActionEnum = Object.freeze({
	ACTION_NONE: "None",
	ACTION_PUNCH: "Punch",
	ACTION_KICK: "Kick",
	ACTION_BLOCK: "Block",
	ACTION_PROJECTILE: "Projectile"
});

var UserInputEnum = Object.freeze({
	USER_INPUT_NONE: 0x0000,
	USER_INPUT_LEFT: 0x0001,
	USER_INPUT_RIGHT: 0x0002,
	USER_INPUT_JUMP: 0x0004,
	USER_INPUT_CROUCH: 0x0008,
	USER_INPUT_PUNCH: 0x0010,
	USER_INPUT_KICK: 0x0020,
	USER_INPUT_BLOCK: 0x0040,
	USER_INPUT_RUN: 0x0080
});

var ControlsMap = [];

ControlsMap[KEY_LEFT.toString()] = UserInputEnum.USER_INPUT_LEFT;
ControlsMap[KEY_RIGHT.toString()] = UserInputEnum.USER_INPUT_RIGHT;
ControlsMap[KEY_UP.toString()] = UserInputEnum.USER_INPUT_JUMP;
ControlsMap[KEY_DOWN.toString()] = UserInputEnum.USER_INPUT_CROUCH;
ControlsMap[KEY_Z.toString()] = UserInputEnum.USER_INPUT_PUNCH;
ControlsMap[KEY_X.toString()] = UserInputEnum.USER_INPUT_KICK;
ControlsMap[KEY_C.toString()] = UserInputEnum.USER_INPUT_BLOCK;
ControlsMap[KEY_CTRL.toString()] = UserInputEnum.USER_INPUT_RUN;

var FPS = 15;
var NUM_FRAMES_PER_STATE = 15;
var FRAME_TIME = 1000 / FPS;
var DEFAULT_MOVEMENT_SPEED = 75;
var DEFAULT_RUN_MODIFIER = 2;
var DEFAULT_CROUCH_MODIFIER = 0.5;
var DEFAULT_JUMP_POWER = 300;
var GRAVITY_ACCELERATION = 150;
var DEFAULT_FIGHTER_WIDTH = 300;
var DEFAULT_FIGHTER_HEIGHT = 500;
var DEFAULT_ACTION_NUM_FRAMES = {"Punch": 5, "Kick": 7, "Block": 1};
// Convenience input bitmasks
var USER_INPUT_MOVING_LEFT_RIGHT = (UserInputEnum.USER_INPUT_LEFT | UserInputEnum.USER_INPUT_RIGHT);

var ctx = null;
var fighters = [];
var currentInput = UserInputEnum.USER_INPUT_NONE;
var lastFrameTime = 0;
var frameDuration = 0;

function init_engine()
{
	var canvas = document.getElementById('main-canvas');
	
	// Add keyevent listeners
	document.addEventListener('keydown', keydown_handler);
	document.addEventListener('keyup', keyup_handler);
	
	ctx = canvas.getContext('2d');
	
	draw_stage_bounds();
	
	var test_fighter = new Fighter("Aaron-Frame-1", new Point(0, ctx.canvas.height));
	fighters.push(test_fighter);
	
	fighters.forEach(function(fighter) {
		load_frames(fighter);
	});
	
	// Start animation loop
	requestAnimationFrame(render_frame);
}

function load_frames(fighter)
{
	var frameImage = document.getElementById("aaron_frame_1");
	var frame = new Frame(frameImage, DEFAULT_FIGHTER_WIDTH);
	var boundsSVG = document.getElementById("aaron_bounds_1");
	frame.parseBounds(boundsSVG, 1);
	fighter.addFrame(frame);
}

function draw_stage_bounds()
{
	ctx.strokeStyle = 'black';
	ctx.strokeRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

function render_frame(globalTime)
{
	// Clear the canvas
	ctx.clearRect(1, 1, ctx.canvas.width - 2, ctx.canvas.height - 2);
	
	fighters.forEach(function(fighter) {
		update_fighter(fighter, globalTime);
		// TODO: Always drawing frame 0 temporarily for testing
		fighter.draw(0);
	});
	
	requestAnimationFrame(render_frame);
}

function update_fighter(fighter, globalTime)
{
	frameDuration = globalTime - lastFrameTime;
	
	update_fighter_state(fighter);
	update_fighter_position(fighter, frameDuration);

	// Determine which frame we're on	
	if (frameDuration >= FRAME_TIME) {
		fighter.currentFrame++;
		if (fighter.currentFrame >= NUM_FRAMES_PER_STATE) {
			fighter.currentFrame = 0;
		}
		
		// If we're performing an action, also manage the action frame we're on
		if (fighter.action != ActionEnum.ACTION_NONE) {
			fighter.actionFrame++;
			if (fighter.actionFrame >= fighter.actionNumFrames[fighter.action]) {
				// If we've run through all the action frames for the current action,
				// clear the action
				fighter.actionFrame = 0;
				fighter.action = ActionEnum.ACTION_NONE;
			}
		}
		
		lastFrameTime = globalTime;
	}
}

function update_fighter_state(fighter)
{
	// Determine the current state of the fighter
	// If we're not currently jumping, and the jump input is active, start a jump
	if (currentInput & UserInputEnum.USER_INPUT_JUMP) {
		if (fighter.animationState != AnimationStateEnum.ANIMATION_STATE_JUMP) {
			// Starting a jump overrides any active movement modifiers
			// (an active run modifier will get re-applied below)
			fighter.movementModifier = MovementModifierEnum.MOVEMENT_MODIFIER_NONE;
			
			fighter.animationState = AnimationStateEnum.ANIMATION_STATE_JUMP;
			fighter.currentFrame = 0; // Always start a jump animation at the beginning
			fighter.velY = -fighter.jumpPower;
		}
	}

	// Can only start a new action if another one isn't currently in progress
	if (fighter.action == ActionEnum.ACTION_NONE) {
		if (currentInput & UserInputEnum.USER_INPUT_BLOCK) {
			fighter.action = ActionEnum.ACTION_BLOCK;
			fighter.actionFrame = 0;
		} else if (currentInput & UserInputEnum.USER_INPUT_KICK) {
			fighter.action = ActionEnum.ACTION_KICK;
			fighter.actionFrame = 0;
		} else if (currentInput & UserInputEnum.USER_INPUT_PUNCH) {
			fighter.action = ActionEnum.ACTION_PUNCH;
			fighter.actionFrame = 0;
		}
	}
	
	if (currentInput & UserInputEnum.USER_INPUT_CROUCH) {
		// Don't allow crouch modifier while in the middle of a jump
		if (fighter.animationState != AnimationStateEnum.ANIMATION_STATE_JUMP) {
			fighter.movementModifier = MovementModifierEnum.MOVEMENT_MODIFIER_CROUCH;
		}
	} else if (currentInput & UserInputEnum.USER_INPUT_RUN) {
		fighter.movementModifier = MovementModifierEnum.MOVEMENT_MODIFIER_RUN;
	} else {
		fighter.movementModifier = MovementModifierEnum.MOVEMENT_MODIFIER_NONE;
	}
	
	if (currentInput & USER_INPUT_MOVING_LEFT_RIGHT) {
		// If we're not in the middle of a jump, then we're in the move state
		if (fighter.animationState != AnimationStateEnum.ANIMATION_STATE_JUMP) {
			fighter.animationState = AnimationStateEnum.ANIMATION_STATE_MOVE;
		}
		
		var direction = 1;
		if (currentInput & UserInputEnum.USER_INPUT_LEFT) {
			direction = -1;
		} else if (currentInput & UserInputEnum.USER_INPUT_RIGHT) {
			direction = 1;
		}
		
		var movementModifier = 1;
		switch (fighter.movementModifier) {
		case MovementModifierEnum.MOVEMENT_MODIFIER_CROUCH:
			movementModifier = fighter.crouchModifier;
			break;
		
		case MovementModifierEnum.MOVEMENT_MODIFIER_RUN:
			movementModifier = fighter.runModifier;
			break;
		}
		
		fighter.velX = direction * movementModifier * fighter.movementSpeed;
	} else {
		fighter.velX = 0;
		if (fighter.animationState != AnimationStateEnum.ANIMATION_STATE_JUMP) {
			fighter.animationState = AnimationStateEnum.ANIMATION_STATE_IDLE;
		}
	}
	
	// If either left or right is pressed, determine current facing direction
	if (currentInput & USER_INPUT_MOVING_LEFT_RIGHT) {
		if (currentInput & UserInputEnum.USER_INPUT_LEFT) {
			fighter.facing = FacingEnum.FACING_LEFT;
		} else if (currentInput & UserInputEnum.USER_INPUT_RIGHT) {
			fighter.facing = FacingEnum.FACING_RIGHT;
		}
	}
}

function update_fighter_position(fighter, frameDuration)
{
	var frameDurationSecs = (frameDuration / 1000);
	
	// If we're moving, update the position of the fighter
	switch (fighter.animationState) {
	case AnimationStateEnum.ANIMATION_STATE_JUMP:
		// Calculate new vertical velocity
		fighter.velY += GRAVITY_ACCELERATION * frameDurationSecs;
		// If we're back on the ground, we're not in jump mode anymore
		// TODO: fix this magic number
		var predictedYPos = fighter.location.y + (fighter.velY * frameDurationSecs);
		if (predictedYPos >= ctx.canvas.height) {
			fighter.velY = 0;
			fighter.location.y = ctx.canvas.height;
			fighter.animationState = AnimationStateEnum.ANIMATION_STATE_IDLE;
		}
		break;
	
	default:
		break;
	}
	
	var xOffset = fighter.velX * frameDurationSecs;
	var yOffset = fighter.velY * frameDurationSecs;
	
	// TODO: Fix magic numbers
	fighter.location.x = clamp_to_range(fighter.location.x + xOffset, 0, ctx.canvas.width);
	fighter.location.y = clamp_to_range(fighter.location.y + yOffset, 0, ctx.canvas.height);
}

function keydown_handler(event)
{
	if (ControlsMap[event.keyCode.toString()]) {
		currentInput |= ControlsMap[event.keyCode.toString()];
	}
}

function keyup_handler(event)
{
	if (ControlsMap[event.keyCode.toString()]) {
		currentInput &= ~ControlsMap[event.keyCode.toString()];
	}
}

function clamp_to_range(value, rangeLow, rangeHigh)
{
	return (value < rangeLow) ? rangeLow : ((value > rangeHigh) ? rangeHigh : value);
}

function Fighter(name, startingPosition, movementSpeed, runModifier, crouchModifier, jumpPower, actionNumFrames)
{
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
}

Fighter.prototype.draw = function(frame) {	
	// Draw fighter frame
	//console.log(this.frames[frame].height)
	ctx.fillStyle = "orange";
	ctx.fillRect(this.location.x, this.location.y - this.frames[frame].height, this.frames[frame].width, this.frames[frame].height);
	ctx.drawImage(this.frames[frame].image, this.location.x, this.location.y - this.frames[frame].height, this.frames[frame].width, this.frames[frame].height);
	
	// If in debug mode, draw fighter bounds and debug info
	if (this.debugMode) {
		ctx.strokeStyle = "blue";
		this.drawBoundingBox(frame, "headBounds");
		ctx.strokeStyle = "purple";
		this.drawBoundingBox(frame, "bodyBounds");
		ctx.strokeStyle = "green";
		this.drawBoundingBox(frame, "leftArmBounds");
		this.drawBoundingBox(frame, "rightArmBounds");
		ctx.strokeStyle = "red"
		this.drawBoundingBox(frame, "leftLegBounds");
		this.drawBoundingBox(frame, "rightLegBounds");
		
		ctx.font = "12px sans-serif"
		ctx.fillStyle = 'black'
		ctx.fillText(this.animationState, this.location.x + 100, this.location.y - 95);
		ctx.fillText("Modifier: " + this.movementModifier, this.location.x + 100, this.location.y - 80);
		ctx.fillText("Facing: " + this.facing, this.location.x + 100, this.location.y - 65);
		ctx.fillText("Action: " + this.action, this.location.x + 100, this.location.y - 50);
		ctx.fillText("Frame: " + this.currentFrame, this.location.x + 100, this.location.y - 35);
		ctx.fillText("Action Frame: " + this.actionFrame, this.location.x + 100, this.location.y - 20);
	}
}

Fighter.prototype.drawBoundingBox = function(frame, boundingBoxSection)
{
	ctx.save();
	
	ctx.translate(0, -this.frames[frame].height);
	
	var bounds = this.frames[frame].bounds;
	var boundsSection = bounds[boundingBoxSection];
	
	ctx.scale(bounds.xScale, bounds.yScale);
	
	if (boundsSection.transform != null) {
		ctx.translate(this.location.x / bounds.xScale, this.location.y / bounds.yScale);
		//ctx.transform(bounds.transform.a * xScale, bounds.transform.b * xScale, bounds.transform.c * yScale, bounds.transform.d * yScale, bounds.transform.e * xScale, bounds.transform.f * yScale);
		ctx.transform(boundsSection.transform.a, boundsSection.transform.b, boundsSection.transform.c, boundsSection.transform.d, boundsSection.transform.e, boundsSection.transform.f);
		ctx.translate(-this.location.x / bounds.xScale, -this.location.y / bounds.yScale);
	}
	
	ctx.strokeRect((this.location.x / bounds.xScale) + boundsSection.x, (this.location.y / bounds.yScale) + boundsSection.y, boundsSection.width, boundsSection.height);
	
	ctx.restore();
}

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
}

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
}