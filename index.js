'use strict';

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
  return {
    outputSpeech: {
      type: 'PlainText',
      text: output,
    },
    card: {
      type: 'Simple',
      title: `SessionSpeechlet - ${title}`,
      content: `SessionSpeechlet - ${output}`,
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

/* Behavior control */

// Welcome user to Recipe Helper and prompt for ingredients
function getWelcomeResponse(callback) {
 const sessionAttributes = {};
 const cardTitle = 'Hello...';
 const speechOutput = "Hello... And welcome to Recipe Helper. Let me know the first ingredient we have to work with by saying something like, I have milk. You can list your ingredients by asking, what ingredients do I have? You can find a recipe by saying, that's it.";
 const repromptText = 'List your first ingredient by saying something like, I have milk';
 const shouldEndSession = false;

 callback(sessionAttributes, buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

// Thank user for using Recipe Helper and ask them to come back soon
function handleSessionEndRequest(callback) {
  const cardTitle = 'See you next time...';
  const speechOutput = 'Thanks for using Recipe Helper. Be sure to cook something again soon';
  const shouldEndSession = true;

  callback({}, buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession));
}

// Add ingredient to ingredients attribute
function addIngredientsAttribute(session, ingredient) {
  if (!session.attributes) {
    session.attributes = {};
  }
  if (!session.attributes.ingredients) {
    session.attributes.ingredients = "";
  }

  let ingredients = session.attributes.ingredients;
  ingredients += ingredients === "" ? ingredient : `::${ingredient}`;
  session.attributes.ingredients = ingredients;
  return session.attributes;
}

// Get and save ingredients from user, or prompt for them if required
function setIngredientsInSession(intent, session, callback) {
  const cardTitle = intent.name;
  let ingredientSlot = intent.slots.Ingredient;
  let repromptText = '';
  let sessionAttributes = {};
  const shouldEndSession = false;
  let speechOutput = '';

  if (ingredientSlot) {
    const ingredient = ingredientSlot.value;
    sessionAttributes = addIngredientsAttribute(session, ingredient);
    speechOutput = `You have ${ingredient}`;
    repromptText = 'You can list your ingredients by asking, what ingredients do I have?';
  } else {
    speechOutput = "I don't know the first ingredient you have. Try telling me again?";
    repromptText = "I don't know the first ingredient you have. You can tell me by saying something like, I have milk";
  }

  callback(sessionAttributes, buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

// Tell user what ingredients they've provided, or prompt for them if required
function getIngredientsFromSession(intent, session, callback) {
  let ingredients;
  let list;
  const repromptText = null;
  const sessionAttributes = session.attributes;
  let shouldEndSession = false;
  let speechOutput = '';

  if (sessionAttributes) {
    ingredients = sessionAttributes.ingredients.split('::');
    if (ingredients.length > 1) {
      list = ingredients.slice(0, -1).join(', ');
      if (ingredients.length > 2) {
        list += ',';
      }
      list += ' and ' + ingredients.slice(-1);
    } else {
      list = ingredients[0];
    }
  }

  if (list) {
    speechOutput = `You have ${list}.`;
  } else {
    speechOutput = "I don't know the first ingredient you have. You can tell me by saying something like, I have milk";
  }

  callback(sessionAttributes, buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));
}

// Search through ingredients and find an appropriate recipe
function findRecipe(intent, session, callback) {
  let ingredients;
  const repromptText = null;
  const sessionAttributes = session.attributes;
  let shouldEndSession = false;
  let speechOutput = '';

  if (sessionAttributes) {
    ingredients = sessionAttributes.ingredients.split('::');
  }

  if (ingredients) {
    let recipe = matchRecipe(ingredients);
    if (recipe) {
      sessionAttributes.recipe = recipe;
      speechOutput = `Oh boy have I got the recipe for you. Shall we try, ${recipe}? To start, say, let's go`;
    } else {
      speechOutput = "Sorry, I couldn't find anything... Try getting some more ingredients?";
    }
  } else {
    speechOutput = "I don't know the first ingredient you have. You can tell me by saying something like, I have milk";
  }

  callback(sessionAttributes, buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));
}

// Try to match ingredients to a recipe
function matchRecipe(ingredients) {
  for (var i in recipes) {
    let recipe = recipes[i];
    let requiredIngredients = recipe.ingredients;
    let requiredIngredientsCount = requiredIngredients.length;
    let foundIngredientsCount = 0;
    for (var j in requiredIngredients) {
      let requiredIngredient = requiredIngredients[j];
      for (var k in ingredients) {
        let ingredient = ingredients[k];
        if (requiredIngredient.name.toLowerCase().indexOf(ingredient.toLowerCase()) > -1) {
          foundIngredientsCount++;
          break;
        }
      }
    }
    if (requiredIngredientsCount <= foundIngredientsCount) {
      return recipe.name;
    }
  }
}

// Start listing recipe instructions
function startRecipe(intent, session, callback) {
  let recipe;
  const repromptText = null;
  const sessionAttributes = session.attributes;
  let shouldEndSession = false;
  let speechOutput = '';

  if (sessionAttributes) {
    recipe = sessionAttributes.recipe;
    for (var i in recipes) {
      if (recipe == recipes[i].name) {
        recipe = recipes[i];
      }
    }
  }

  if (recipe) {
    let ingredientIndex = 0;
    sessionAttributes.ingredientIndex = ingredientIndex;
    let ingredient = recipe.ingredients[ingredientIndex];

    speechOutput = `I'll now list the ingredients and quantities you'll need. First up is ${ingredient.quantity} ${ingredient.measure} of ${ingredient.name}. `;
    if (ingredientIndex + 1 == recipe.ingredients.length) {
      speechOutput += 'To get started with the recipe, say continue';
    } else {
      speechOutput += 'To hear the next ingredient, say continue';
    }
  } else {
    speechOutput = "You don't have a recipe selected. To find a recipe, say, that's it";
  }

  callback(sessionAttributes, buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));
}

// List next recipe instruction
function continueRecipe(intent, session, callback) {
  let recipe;
  const repromptText = null;
  const sessionAttributes = session.attributes;
  let shouldEndSession = false;
  let speechOutput = '';

  if (sessionAttributes) {
    recipe = sessionAttributes.recipe;
    for (var i in recipes) {
      if (recipe == recipes[i].name) {
        recipe = recipes[i];
      }
    }
  }

  if (recipe) {
    let ingredientIndex = sessionAttributes.ingredientIndex;
    let ingredient = recipe.ingredients[ingredientIndex];

    if (ingredientIndex + 1 != recipe.ingredients.length) {
      ingredientIndex++;
      sessionAttributes.ingredientIndex = ingredientIndex;
      speechOutput = `Next you'll need ${ingredient.quantity} ${ingredient.measure} of ${ingredient.name}. `;
      if (ingredientIndex + 1 == recipe.ingredients.length) {
        speechOutput += 'To get started with the recipe, say continue';
      }
    } else {
      let stepIndex = sessionAttributes.stepIndex;
      if (stepIndex === undefined) {
        stepIndex = 0;
      }
      let step = recipe.steps[stepIndex];

      if (stepIndex === 0) {
        speechOutput = "I'll now list the steps you'll need to take. To start off, ";
      }
      speechOutput += `${step}. `;
      if (stepIndex + 1 == recipe.steps.length) {
        speechOutput += "After that, you're all done!";
        shouldEndSession = true;
      } else if (stepIndex === 0) {
        speechOutput += 'To hear the next step, say continue';
      }
      stepIndex++;
      sessionAttributes.stepIndex = stepIndex;
    }
  } else {
    speechOutput = "You don't have a recipe selected. To find a recipe, say, that's it";
  }

  callback(sessionAttributes, buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));
}

/* Events */

function onSessionStarted(sessionStartedRequest, session) {
  console.log(`onSessionStarted requestId=${sessionStartedRequest.requestId}, sessionId=${session.sessionId}`);
}

function onLaunch(launchRequest, session, callback) {
  console.log(`onLaunch requestId=${launchRequest.requestId}, sessionId=${session.sessionId}`);
  getWelcomeResponse(callback);
}

function onIntent(intentRequest, session, callback) {
  console.log(`onIntent requestId=${intentRequest.requestId}, sessionId=${session.sessionId}`);

  const intent = intentRequest.intent;
  const intentName = intentRequest.intent.name;

  if (intentName === 'MyIngredientsAreIntent') {
    setIngredientsInSession(intent, session, callback);
  } else if (intentName === 'WhatAreMyIngredientsIntent') {
    getIngredientsFromSession(intent, session, callback);
  } else if (intentName === 'FindRecipeIntent') {
    findRecipe(intent, session, callback);
  } else if (intentName === 'StartRecipeIntent') {
    startRecipe(intent, session, callback);
  } else if (intentName === 'ContinueRecipeIntent') {
    continueRecipe(intent, session, callback);
  } else if (intentName === 'AMAZON.StopIntent') {
    handleSessionEndRequest(callback);
  } else {
    throw new Error('Invalid intent');
  }
}

function onSessionEnded(sessionEndedRequest, session) {
  console.log(`onSessionEnded requestId=${sessionEndedRequest.requestId}, sessionId=${session.sessionId}`);
}

/* Main handler */

exports.handler = (event, context, callback) => {
  try {
    console.log(`event.session.application.applicationId=${event.session.application.applicationId}`);

    if (event.session.new) {
      onSessionStarted({ requestId: event.request.requestId }, event.session);
    }

    if (event.request.type === 'LaunchRequest') {
      onLaunch(event.request, event.session, (sessionAttributes, speechletResponse) => {
        callback(null, buildResponse(sessionAttributes, speechletResponse));
      });
    } else if (event.request.type === 'IntentRequest') {
      onIntent(event.request, event.session, (sessionAttributes, speechletResponse) => {
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
      "put water in pot",
      "put pot on stove",
      "turn stove on high",
      "wait for water to bubble"
    ]
  }
];
