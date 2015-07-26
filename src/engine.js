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
var DEFAULT_FIGHTER_WIDTH = 200;
var DEFAULT_FIGHTER_HEIGHT = 500;
var DEFAULT_ACTION_NUM_FRAMES = {"Punch": 5, "Kick": 7, "Block": 1};
// Convenience input bitmasks
var USER_INPUT_MOVING_LEFT_RIGHT = (UserInputEnum.USER_INPUT_LEFT | UserInputEnum.USER_INPUT_RIGHT);

var currentInput = UserInputEnum.USER_INPUT_NONE;
var lastFrameTime = 0;
var frameDuration = 0;

var gblEngine = null;

function init_game()
{
	gblEngine = new Engine(document);
}

function Engine(mainPage)
{
	// Initialize drawing context
	this.canvas = mainPage.getElementById("main-canvas");
	this.ctx = this.canvas.getContext("2d");
	
	// Add keyboard listeners
	mainPage.addEventListener('keydown', this.keydownHandler.bind(this));
	mainPage.addEventListener('keyup', this.keyupHandler.bind(this));
	
	// Initialize engine controls map
	this.controlsMap = [];
	this.controlsMap[KEY_LEFT.toString()] = UserInputEnum.USER_INPUT_LEFT;
	this.controlsMap[KEY_RIGHT.toString()] = UserInputEnum.USER_INPUT_RIGHT;
	this.controlsMap[KEY_UP.toString()] = UserInputEnum.USER_INPUT_JUMP;
	this.controlsMap[KEY_DOWN.toString()] = UserInputEnum.USER_INPUT_CROUCH;
	this.controlsMap[KEY_Z.toString()] = UserInputEnum.USER_INPUT_PUNCH;
	this.controlsMap[KEY_X.toString()] = UserInputEnum.USER_INPUT_KICK;
	this.controlsMap[KEY_C.toString()] = UserInputEnum.USER_INPUT_BLOCK;
	this.controlsMap[KEY_CTRL.toString()] = UserInputEnum.USER_INPUT_RUN;
	
	// Initialize global engine variables
	this.lastFrameTime = 0;
	this.frameDuration = 0;
	this.currentInput = UserInputEnum.USER_INPUT_NONE;
	this.fighter1 = null;
	this.fighter2 = null;
	
	//TODO: Temporarily loading one fighter
	this.fighter1 = new Fighter(this, "Aaron-Frame-1", new Point(0, this.canvas.height));
	load_frames(this.fighter1);
	
	// Set up stage
	this.drawStageBounds();
	
	// Start animation loop
	// Need to setup self variable for later use in correctly
	// binding subsequent calls of requestAnimationFrame
	this.self = this;
	requestAnimationFrame(this.renderFrame.bind(this.self));
}

Engine.prototype.keydownHandler = function(event) {
	if (this.controlsMap[event.keyCode.toString()]) {
		this.currentInput |= this.controlsMap[event.keyCode.toString()];
	}
};

Engine.prototype.keyupHandler = function(event) {
	if (this.controlsMap[event.keyCode.toString()]) {
		this.currentInput &= ~this.controlsMap[event.keyCode.toString()];
	}
};

Engine.prototype.drawStageBounds = function() {
	this.ctx.strokeStyle = "black";
	this.ctx.lineWidth = "1";
	this.ctx.strokeRect(0, 0, this.canvas.width, this.canvas.height);
};

Engine.prototype.renderFrame = function(globalTime) {
	this.frameDuration = globalTime - this.lastFrameTime;
	this.lastFrameTime = globalTime;
	
	// Clear the canvas
	this.ctx.clearRect(1, 1, this.canvas.width - 2, this.canvas.height - 2);
	
	// TODO: For now, just render fighter 1
	this.fighter1.update(this.frameDuration);
	this.fighter1.draw(0);
	
	requestAnimationFrame(this.renderFrame.bind(this.self));
};

function load_frames(fighter)
{
	var frameImage = document.getElementById("aaron_frame_1");
	var frame = new Frame(frameImage, DEFAULT_FIGHTER_WIDTH);
	var boundsSVG = document.getElementById("aaron_bounds_1");
	frame.parseBounds(boundsSVG, 1);
	fighter.addFrame(frame);
}
