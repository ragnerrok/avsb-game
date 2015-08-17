function AIFighter(engine, name, startingPosition, fighterInitJSONUrl, movementSpeed, runModifier, crouchModifier, jumpPower, actionNumFrames)
{
	AbstractFighter.call(this, engine, name, startingPosition, fighterInitJSONUrl, movementSpeed, runModifier, crouchModifier, jumpPower, actionNumFrames); // Call superconstructor
}

AIFighter.prototype = Object.create(AbstractFighter.prototype);
AIFighter.prototype.constructor = AIFighter;

AIFighter.prototype.updateState = function() {
	//TODO: Implement this
};

AIFighter.prototype.updatePosition = function(frameDuration) {
	//TODO: Implement this
}