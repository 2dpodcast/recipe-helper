'use strict';

/* Response metadata */

function buildSpeechletResponse(title, output, repromptText,
    shouldEndSession) {
  return {
    outputSpeech: {
      type: 'PlainText',
      text: output,
    },
    card: {
      type: 'Simple',
      title: title,
      content: output,
    },
    reprompt: {
      outputSpeech: {
        type: 'PlainText',
        text: repromptText,
      },
    },
    shouldEndSession,
  };
}

function buildResponse(sessionAttributes, speechletResponse) {
  return {
    version: '1.0',
    sessionAttributes,
    response: speechletResponse,
  };
}

/* Response handling */

// Execute callback with provided response; save response for repeating
function speak(sessionAttributes, cardTitle, speechOutput, repromptText,
    shouldEndSession, callback) {
  sessionAttributes.lastResponse = speechOutput;
  callback(sessionAttributes, buildSpeechletResponse(cardTitle, speechOutput,
    repromptText, shouldEndSession));
}

function handleRepeatRequest(intent, session, callback) {
  const sessionAttributes = session.attributes;
  const cardTitle = 'Repeating response';
  const speechOutput = sessionAttributes.lastResponse;
  const repromptText = null;
  const shouldEndSession = false;

  speak(sessionAttributes, cardTitle, speechOutput, repromptText,
    shouldEndSession, callback);
}

/* General events */

// Welcome user to skill; explain ingredient adding
function getWelcomeResponse(callback) {
  const sessionAttributes = {};
  const cardTitle = 'Hello';
  const speechOutput = 'Hello. And welcome to Recipe Helper. Tell me the ' +
    'first ingredient you have, by saying something like, I have milk. List ' +
    'your ingredients by asking, what ingredients do I have? Find a recipe ' +
    "by saying, that's it. Have me repeat my last response by saying, " +
    'repeat that';
  const repromptText = 'Tell me the first ingredient you have by saying ' +
    'something like, I have milk';
  const shouldEndSession = false;

  speak(sessionAttributes, cardTitle, speechOutput, repromptText,
   shouldEndSession, callback);
}

// Bid user farewell; thank user for using skill
function handleSessionEndRequest(callback) {
  const sessionAttributes = {};
  const cardTitle = 'Goodbye';
  const speechOutput = 'Thanks for using Recipe Helper';
  const repromptText = null;
  const shouldEndSession = true;

  speak(sessionAttributes, cardTitle, speechOutput, repromptText,
    shouldEndSession, callback);
}

/* Ingredient handling */

// Save provided ingredient to ingredients attribute; prompt again if necessary
function setIngredientsInSession(intent, session, callback) {
  let sessionAttributes = session.attributes;
  const cardTitle = 'Adding ingredient';
  let speechOutput = '';
  let repromptText = '';
  const shouldEndSession = false;

  let ingredientSlot = intent.slots.Ingredient;
  if (ingredientSlot) {
    const ingredient = ingredientSlot.value;
    sessionAttributes = pushIngredientsAttribute(sessionAttributes,
      ingredient);
    speechOutput = `You have ${ingredient}`;
    repromptText = 'List your ingredients by asking, what ingredients do I ' +
      'have?';
  } else {
    speechOutput = "I don't know the first ingredient you have. Try telling " +
      'me again?';
    repromptText = "I don't know the first ingredient you have. Tell me by " +
      'saying something like, I have milk';
  }

  speak(sessionAttributes, cardTitle, speechOutput, repromptText,
    shouldEndSession, callback);
}

// List user-provided ingredients; prompt again if necessary
function getIngredientsFromSession(intent, session, callback) {
  const sessionAttributes = session.attributes;
  const cardTitle = 'Your ingredients';
  let speechOutput = '';
  const repromptText = null;
  const shouldEndSession = false;

  let ingredients, list;

  if (sessionAttributes) {
    ingredients = getIngredientsAttribute(sessionAttributes);
    list = makeIngredientsList(ingredients);
  }

  if (list) {
    speechOutput = `You have ${list}`;
  } else {
    speechOutput = "I don't know the first ingredient you have. Tell me by " +
      'saying something like, I have milk';
  }

  speak(sessionAttributes, cardTitle, speechOutput, repromptText,
    shouldEndSession, callback);
}

// Save ingredient to ingredients attribute
function pushIngredientsAttribute(sessionAttributes, ingredient) {
  if (!sessionAttributes) {
    sessionAttributes = {};
  }
  if (!sessionAttributes.ingredients) {
    sessionAttributes.ingredients = "";
  }

  let ingredients = sessionAttributes.ingredients;
  if (ingredients === "") {
    ingredients = ingredient;
  } else {
    ingredients += `::${ingredient}`;
  }
  sessionAttributes.ingredients = ingredients;
  return sessionAttributes;
}

// Return ingredients from ingredients attribute
function getIngredientsAttribute(sessionAttributes) {
  const ingredients = sessionAttributes.ingredients;
  if (ingredients) {
    return ingredients.split('::');
  } else {
    return [];
  }
}

// Create human-friendly ingredients list
function makeIngredientsList(ingredients) {
  let list;
  if (ingredients.length > 1) {
    list = ingredients.slice(0, -1).join(', ');
    if (ingredients.length > 2) {
      list += ',';
    }
    list += ' and ' + ingredients.slice(-1);
  } else {
    list = ingredients[0];
  }
  return list;
}

/* Recipe preparation handling */

// Search through ingredients to find an appropriate recipe; reprompt if
//  necessary
function findRecipe(intent, session, callback) {
  const sessionAttributes = session.attributes;
  const cardTitle = 'Finding recipe';
  let speechOutput = '';
  const repromptText = null;
  const shouldEndSession = false;

  let ingredients;
  if (sessionAttributes) {
    ingredients = getIngredientsAttribute(sessionAttributes);
  }

  if (ingredients) {
    const recipeIndex = matchRecipe(ingredients);
    if (recipeIndex) {
      sessionAttributes.recipeIndex = recipeIndex;
      const recipe = getRecipe(recipeIndex);
      const recipeName = recipe.name;
      speechOutput = 'Oh boy, have I got the recipe for you. Shall we try, ' +
        `${recipeName}? To start, say, let's go`;
    } else {
      speechOutput = "I couldn't find anything. Try adding some more " +
        'ingredients?';
    }
  } else {
    speechOutput = "I don't know the first ingredient you have. Tell me by " +
      'saying something like, I have milk';
  }

  speak(sessionAttributes, cardTitle, speechOutput, repromptText,
    shouldEndSession, callback);
}

// Attempt to match ingredients to a recipe
// TODO: Add fuzzy matching with additional required ingredients and match
//  score
function matchRecipe(ingredients) {
  for (var i in recipes) {
    if (recipes[i]) {
      const recipe = recipes[i];
      const requiredIngredients = recipe.ingredients;
      const requiredIngredientsCount = requiredIngredients.length;
      let foundIngredientsCount = 0;
      for (const requiredIngredient of requiredIngredients) {
        let foundMatch = false;
        for (const ingredient of ingredients) {
          if (!foundMatch && requiredIngredient.name.toLowerCase().
              indexOf(ingredient.toLowerCase()) > -1) {
            foundIngredientsCount++;
            foundMatch = true;
          }
        }
      }
      if (requiredIngredientsCount <= foundIngredientsCount) {
        return i;
      }
    }
  }
}

// Return recipe of given index
function getRecipe(recipeIndex) {
  if (recipeIndex < recipes.length) {
    return recipes[recipeIndex];
  } else {
    return {};
  }
}

/* Recipe instruction handling */

// List next recipe instruction
// TODO: Add better speech text for "x of x"
function continueRecipe(intent, session, callback) {
  const sessionAttributes = session.attributes;
  const cardTitle = 'Explaining recipe';
  let speechOutput = '';
  const repromptText = null;
  let shouldEndSession = false;

  let recipe;
  if (sessionAttributes) {
    const recipeIndex = sessionAttributes.recipeIndex;
    recipe = getRecipe(recipeIndex);
  }

  if (recipe) {
    let ingredientIndex = sessionAttributes.ingredientIndex;
    if (ingredientIndex === undefined) {
      ingredientIndex = 0;
      speechOutput = "I'll now list the ingredients and quantities you'll " +
        'need. First up is, ';
    } else {
      speechOutput = "Next you'll need, ";
    }

    const ingredient = recipe.ingredients[ingredientIndex];
    if (ingredientIndex !== recipe.ingredients.length) {
      speechOutput += `${ingredient.quantity} ${ingredient.measure} of ` +
        `${ingredient.name}`;
      if (ingredientIndex === 0 &&
          ingredientIndex + 1 !== recipe.ingredients.length) {
        speechOutput += '. Hear the next ingredient by saying, continue';
      }
      if (ingredientIndex + 1 === recipe.ingredients.length) {
        speechOutput += '. Get started with the recipe by saying, continue';
      }

      ingredientIndex++;
      sessionAttributes.ingredientIndex = ingredientIndex;
    } else {
      let stepIndex = sessionAttributes.stepIndex;
      if (stepIndex === undefined) {
        stepIndex = 0;
        speechOutput = "I'll now list the steps you'll need to take. To " +
          'start off, ';
      } else {
        speechOutput = 'Next, ';
      }

      const step = recipe.steps[stepIndex];
      speechOutput += `${step}`;
      if (stepIndex === 0) {
        speechOutput += '. Hear the next step by saying, continue';
      }
      if (stepIndex + 1 !== recipe.steps.length) {
        stepIndex++;
        sessionAttributes.stepIndex = stepIndex;
      } else {
        speechOutput += ". After that, you're all done!";
        shouldEndSession = true;
      }
    }
  } else {
    speechOutput = "You don't have a recipe selected. Find a recipe by " +
      "saying, that's it";
  }

  speak(sessionAttributes, cardTitle, speechOutput, repromptText,
    shouldEndSession, callback);
}

/* Events */

function onSessionStarted(sessionStartedRequest, session) {
  console.log('onSessionStarted ' +
    `requestId=${sessionStartedRequest.requestId}, ` +
    `sessionId=${session.sessionId}`);
}

function onLaunch(launchRequest, session, callback) {
  console.log(`onLaunch requestId=${launchRequest.requestId}, ` +
    `sessionId=${session.sessionId}`);
  getWelcomeResponse(callback);
}

function onIntent(intentRequest, session, callback) {
  console.log(`onIntent requestId=${intentRequest.requestId}, ` +
    `sessionId=${session.sessionId}`);

  const intent = intentRequest.intent;
  const intentName = intentRequest.intent.name;

  if (intentName === 'MyIngredientsAreIntent') {
    setIngredientsInSession(intent, session, callback);
  } else if (intentName === 'WhatAreMyIngredientsIntent') {
    getIngredientsFromSession(intent, session, callback);
  } else if (intentName === 'FindRecipeIntent') {
    findRecipe(intent, session, callback);
  } else if (intentName === 'StartRecipeIntent') {
    continueRecipe(intent, session, callback);
  } else if (intentName === 'ContinueRecipeIntent') {
    continueRecipe(intent, session, callback);
  } else if (intentName === 'AMAZON.RepeatIntent') {
    handleRepeatRequest(intent, session, callback);
  } else if (intentName === 'AMAZON.StopIntent') {
    handleSessionEndRequest(callback);
  } else {
    throw new Error('Invalid intent');
  }
}

function onSessionEnded(sessionEndedRequest, session) {
  console.log(`onSessionEnded requestId=${sessionEndedRequest.requestId}, ` +
    `sessionId=${session.sessionId}`);
}

/* Main handler */

exports.handler = (event, context, callback) => {
  try {
    console.log('event.session.application.applicationId=' +
      `${event.session.application.applicationId}`);

    if (event.session.new) {
      onSessionStarted({ requestId: event.request.requestId }, event.session);
    }

    if (event.request.type === 'LaunchRequest') {
      onLaunch(event.request, event.session, (sessionAttributes,
          speechletResponse) => {
        callback(null, buildResponse(sessionAttributes, speechletResponse));
      });
    } else if (event.request.type === 'IntentRequest') {
      onIntent(event.request, event.session, (sessionAttributes,
          speechletResponse) => {
        callback(null, buildResponse(sessionAttributes, speechletResponse));
      });
    } else if (event.request.type === 'SessionEndedRequest') {
      onSessionEnded(event.request, event.session);
      callback();
    }
  } catch (err) {
    callback(err);
  }
};

var recipes = [
  {
    "name":"boiled water",
    "ingredients":[
      {
        "name":"water",
        "measure":"cups",
        "quantity":3
      }
    ],
    "steps":[
      "pour your water into a moderately-sized pot",
      "put the put on your stove",
      "adjust your stove burner to the highest heat setting",
      "wait for the water in the pot to start bubbling"
    ]
  }
];
