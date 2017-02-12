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
    'your ingredients by asking, what ingredients do I have? Remove the ' +
    "last ingredient by saying, I don't have that. Find a recipe by saying, " +
    "that's it. Have me repeat my last response by saying, repeat that";
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

// Remove provided ingredient from ingredients attribute
function removeIngredientsFromSession(intent, session, callback) {
  let sessionAttributes = session.attributes;
  const cardTitle = 'Removing ingredient';
  let speechOutput = '';
  const repromptText = null;
  const shouldEndSession = false;

  let ingredients = getIngredientsAttribute(sessionAttributes);
  if (ingredients.length > 0) {
    ingredients = ingredients.slice(0, -1).join('::');
    speechOutput = 'I removed the last ingredient';
    sessionAttributes.ingredients = ingredients;
  } else {
    speechOutput = "I don't know the first ingredient you have. Tell me by " +
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
  } else if (intentName === 'MyIngredientsAreNotIntent') {
    removeIngredientsFromSession(intent, session, callback);
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
    "name":"bacon cheeseburgers",
    "ingredients":[
      {
        "name":"onion",
        "measure":"tablespoons",
        "quantity":2
      },
      {
        "name":"ketchup",
        "measure":"tablespoons",
        "quantity":2
      },
      {
        "name":"garlic",
        "measure":"clove",
        "quantity":1
      },
      {
        "name":"sugar",
        "measure":"teaspoon",
        "quantity":1
      },
      {
        "name":"worcestershire sauce",
        "measure":"teaspoon",
        "quantity":1
      },
      {
        "name":"steak sauce",
        "measure":"teaspoon",
        "quantity":1
      },
      {
        "name":"cider vinegar",
        "measure":"teaspoons",
        "quantity":0.25
      },
      {
        "name":"ground beef",
        "measure":"pound",
        "quantity":1
      },
      {
        "name":"sharp cheddar cheese",
        "measure":"slices",
        "quantity":4
      },
      {
        "name":"hamburger buns",
        "measure":"",
        "quantity":4
      },
      {
        "name":"bacon",
        "measure":"strips",
        "quantity":8
      }
    ],
    "steps":[
      "chop the onions and mince the garlic",
      "in a large bowl, combine the first seven ingredients",
      "crumble beef over mixture and mix well",
      "shape into four patties",
      "grill burgers, covered, over medium heat or broil 3 inches from the heat for 4-7 minutes on each side or until a thermometer reads 160 degrees and juices run clear",
      "top with cheese",
      "grill 1 minute longer or until cheese is melted",
      "serve on buns with bacon and toppings of your choice"
    ]
  },
  {
    "name":"chicken lo mein",
    "ingredients":[
      {
        "name":"lo mein noodles",
        "measure":"ounces",
        "quantity":8
      },
      {
        "name":"chicken bouillon cubes",
        "measure":"",
        "quantity":3
      },
      {
        "name":"chicken breasts",
        "measure":"",
        "quantity":2
      },
      {
        "name":"olive oil",
        "measure":"tablespoons",
        "quantity":2
      },
      {
        "name":"sesame oil",
        "measure":"tablespoons",
        "quantity":2
      },
      {
        "name":"onion",
        "measure":"",
        "quantity":1
      },
      {
        "name":"garlic",
        "measure":"clove",
        "quantity":1
      },
      {
        "name":"celery",
        "measure":"rib",
        "quantity":1
      },
      {
        "name":"cabbage",
        "measure":"cups",
        "quantity":2
      },
      {
        "name":"bok choy",
        "measure":"stalks",
        "quantity":2
      },
      {
        "name":"carrot",
        "measure":"",
        "quantity":1
      },
      {
        "name":"green pea",
        "measure":"cups",
        "quantity":0.25
      },
      {
        "name":"cornstarch",
        "measure":"tablespoon",
        "quantity":1
      },
      {
        "name":"light soy sauce",
        "measure":"cups",
        "quantity":0.25
      }
    ],
    "steps":[
      "chop the onion, mince the garlic, thinly slice the celery, thinly slice the cabbage, slice the bok choy, shred the carrot",
      "boil lo mein noodles in water adding bouillon cubes until al dente",
      "drain well reserving liquid",
      "cut chicken breasts into small shredded pieces",
      "sprinkle with salt to taste",
      "in a large skillet or wok heat olive oil and saute chicken until done",
      "remove, set aside",
      "add 2 tablespoons sesame oil to skillet or wok and saute onion, garlic, celery, cabbage, bok choy, carrot and peas until crispy tender (approximately 5 minutes) adding more olive oil if needed",
      "dissolve cornstarch in cold water",
      "add cornstarch liquid and one-half of reserved broth",
      "stir in lo mein noodles and chicken",
      "add remaining broth liquid",
      "add soy sauce and toss",
      "on low heat cook just until noodles are nice and darken"
    ]
  },
  {
    "name":"chocolate chip cookies",
    "ingredients":[
      {
        "name":"butter",
        "measure":"cup",
        "quantity":1
      },
      {
        "name":"sugar",
        "measure":"cup",
        "quantity":1
      },
      {
        "name":"brown sugar",
        "measure":"cup",
        "quantity":1
      },
      {
        "name":"eggs",
        "measure":"",
        "quantity":2
      },
      {
        "name":"vanilla extract",
        "measure":"teaspoons",
        "quantity":2
      },
      {
        "name":"flour",
        "measure":"cups",
        "quantity":3
      },
      {
        "name":"baking soda",
        "measure":"teaspoon",
        "quantity":1
      },
      {
        "name":"salt",
        "measure":"teaspoons",
        "quantity":0.5
      },
      {
        "name":"chocolate chips",
        "measure":"cups",
        "quantity":2
      },
      {
        "name":"walnuts",
        "measure":"cup",
        "quantity":1
      }
    ],
    "steps":[
      "preheat oven to 350 degrees F",
      "soften the butter",
      "chop the walnuts",
      "cream together the butter, white sugar, and brown sugar until smooth",
      "beat in the eggs one at a time, then stir in the vanilla",
      "dissolve baking soda in hot water",
      "add to batter along with salt",
      "stir in flour, chocolate chips, and nuts",
      "drop by large spoonfuls onto ungreased pans",
      "bake for about 10 minutes in the preheated oven, or until edges are nicely browned"
    ]
  },
  {
    "name":"apple pie",
    "ingredients":[
      {
        "name":"sugar",
        "measure":"cups",
        "quantity":0.5
      },
      {
        "name":"flour",
        "measure":"cups",
        "quantity":0.25
      },
      {
        "name":"cinnamon",
        "measure":"teaspoons",
        "quantity":0.5
      },
      {
        "name":"nutmeg",
        "measure":"teaspoons",
        "quantity":0.5
      },
      {
        "name":"salt",
        "measure":"teaspoons",
        "quantity":0.125
      },
      {
        "name":"apples",
        "measure":"",
        "quantity":8
      },
      {
        "name":"butter",
        "measure":"tablespoons",
        "quantity":2
      },
      {
        "name":"pie crust",
        "measure":"",
        "quantity":1
      }
    ],
    "steps":[
      "heat oven to 425 degrees F, then prepare pie crust",
      "mix sugar, flour, cinnamon, nutmeg and salt in large bowl",
      "stir in apples, then line pie plate with crust",
      "dot with butter, and trim overhanging edge of crust one half inch from rim of plate",
      "roll other round of crust, then fold into fourths and cut slits so steam can escape",
      "unfold top crust over filling, and trim overhanging edge 1 inch from rim of plate",
      "fold and roll top edge under lower edge, while pressing on rim to seal",
      "flute as desired, then cover edge with 3 inch strip of aluminum foil to prevent excessive browning",
      "remove foil during last 15 minutes of baking"
    ]
  },
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
      "put water in pot",
      "put pot on stove",
      "turn stove on high",
      "wait for water to bubble"
    ]
  },
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
      "put the pot on your stove",
      "adjust your stove burner to the highest heat setting",
      "wait for the water in the pot to start bubbling"
    ]
  },
  {
    "name":"coke and rum",
    "ingredients":[
      {
        "name":"coke",
        "measure":"cups",
        "quantity":4
      },
      {
        "name":"rum",
        "measure":"cup",
        "quantity":1
      }
    ],
    "steps":[
      "pour your rum into a pitcher",
      "pour your coke into the same pitcher",
      "profit"
    ]
  },
  {
    "name":"grilled cheese",
    "ingredients":[
      {
        "name":"bread",
        "measure":"pieces",
        "quantity":2
      },
      {
        "name":"cheese",
        "measure":"slices",
        "quantity":2
      },
      {
        "name":"butter",
        "measure":"slices",
        "quantity":2
      }
    ],
    "steps":[
      "Butter the bottom side of your first slice of bread, and put your slices of cheese on top",
      "Butter the top side of your second slice of bread, and put it on top of the cheese",
      "Put the sandwich in a pan on your stove, with it set to medium",
      "Cook until bread is golden-brown, then flip it and repeat",
      "Make sure the cheese is melted, and remove your newly grilled cheese"
    ]
  }
];
