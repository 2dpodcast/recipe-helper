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
  const speechOutput = 'Thanks for using Recipe Helper. Please come again ' +
    'soon';
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
          if (!foundMatch) {
            let names = requiredIngredient.altNames;
            if (names) {
              names = names.split('::');
            } else {
              names = [];
            }
            names.push(requiredIngredient.name);
            for (const name of names) {
              if (name.toLowerCase() === ingredient.toLowerCase()) {
                foundIngredientsCount++;
                foundMatch = true;
              }
            }
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
        "altNames":"apple",
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
      "Heat your oven to 425 degrees fahrenheit, and then prepare the pie crust",
      "Mix the sugar, flour, cinnamon, nutmeg and salt into a large bowl",
      "Stir in the apples, and then line a pie plate with the pie crust",
      "Dot the crust with butter, and trim the overhanging edge to one half of an inch from the rim of the plate",
      "Roll the other round of crust, and then fold it into fourths",
      "Cut slits in the new crust so that steam can escape",
      "Unfold the top crust over filling, and trim the overhanging edge to one inch from the rim of the plate",
      "Fold and roll the top edge underneath the lower edge, while pressing on the rim in order to seal it",
      "Flute as desired, and then cover the edge with a three-inch strip of aluminum foil, to prevent excessive browning",
      "Remove the foil during the last fifteen minutes of baking"
    ]
  },
  {
    "name":"bacon cheeseburgers",
    "ingredients":[
      {
        "name":"onions",
        "altNames":"onion",
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
        "altNames":"garlic clove::garlic cloves",
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
        "name":"cheddar cheese",
        "measure":"slices",
        "quantity":4
      },
      {
        "name":"hamburger buns",
        "altNames":"humburger bun::bun",
        "measure":"",
        "quantity":4
      },
      {
        "name":"bacon",
        "altNames":"bacon strip::bacon strips",
        "measure":"strips",
        "quantity":8
      }
    ],
    "steps":[
      "Chop your onions and mince your garlic",
      "In a large bowl, combine the loose ingredients",
      "Crumble the beef over the mixture and mix it well",
      "Shape the mixture into four uniform patties",
      "Grill the patties, covered, over medium heat, or broil three inches from the heat for four to seven minutes on each side, or until a thermometer reads 160 degrees and juices run clear",
      "Top the patties with cheese",
      "Grill the patties for one minute longer, or until the cheese is melted",
      "Serve the patties on your hamburger buns with bacon and toppings of your choice"
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
      "Pour your water into a moderately-sized pot",
      "Put the pot on your stove",
      "Adjust your stove burner to the highest heat setting",
      "Wait for the water in the pot to start bubbling"
    ]
  },
  {
    "name":"chicken lo mein",
    "ingredients":[
      {
        "name":"lo mein noodles",
        "altNames":"lo mein",
        "measure":"ounces",
        "quantity":8
      },
      {
        "name":"chicken bouillon",
        "measure":"cubes",
        "quantity":3
      },
      {
        "name":"chicken breasts",
        "altNames":"chicken breast",
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
        "altNames":"onions",
        "measure":"",
        "quantity":1
      },
      {
        "name":"garlic",
        "altNames":"garlic clove::garlic cloves",
        "measure":"clove",
        "quantity":1
      },
      {
        "name":"celery",
        "measure":"rib",
        "quantity":1
      },
      {
        "name":"cabbages",
        "altNames":"cabbage",
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
        "altNames":"carrots",
        "measure":"",
        "quantity":1
      },
      {
        "name":"green peas",
        "altNames":"green pea::pea::peas",
        "measure":"cups",
        "quantity":0.25
      },
      {
        "name":"corn starch",
        "altNames":"cornstarch",
        "measure":"tablespoon",
        "quantity":1
      },
      {
        "name":"light soy sauce",
        "altNames":"soy sauce",
        "measure":"cups",
        "quantity":0.25
      }
    ],
    "steps":[
      "Chop the onion, and mince the garlic",
      "Thinly slice the celery and cabbage",
      "Slice the bok choy, and shred the carrot",
      "Boil the lo mein noodles in water, while adding bouillon cubes until al dente",
      "Drain the well, making sure to save the liquid",
      "Cut the chicken breasts into small pieces, then sprinkle with salt",
      "In a large skillet or wok, heat the olive oil, and saute the chicken until done",
      "Remove and set the chicken aside",
      "Add two tablespoons of sesame oil to the skillet or wok",
      "Saute the onion, garlic, celery, cabbage, bok choy, carrot, and peas for about five minutes, until crispy tender. Add more olive oil if needed",
      "Dissolve the cornstarch in cold water, then add it to the mixture along with half of the broth you saved",
      "Stir in the lo mein noodles and chicken, then add the remaining broth",
      "Add soy sauce and toss the mixture",
      "Cook the noodles on low heat until they are moderately dark"
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
        "altNames":"egg",
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
        "altNames":"chocolate chip",
        "measure":"cups",
        "quantity":2
      },
      {
        "name":"walnuts",
        "altNames":"walnut",
        "measure":"cup",
        "quantity":1
      }
    ],
    "steps":[
      "Preheat year oven to 350 degrees fahrenheit",
      "Soften the butter, and chop the walnuts",
      "Mix the butter and both sugars until smooth and creamy",
      "Beat in the eggs one at a time, and then stir in the vanilla",
      "Dissolve the baking soda in hot water, and add it to the batter along with the salt",
      "Stir in the flour, chocolate chips, and nuts",
      "Drop large spoonfuls of the mixture onto ungreased pans",
      "Bake in the oven for about ten minutes, or until edges are nicely browned"
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
      "Put the sandwich in a pan on your stove, with the heat set to medium",
      "Cook until the bread is golden-brown, then flip it and repeat",
      "Make sure the cheese is melted, and remove your newly grilled cheese"
    ]
  },
  {
    "name":"killer oven-baked french toast",
    "ingredients":[
      {
        "name":"eggs",
        "altNames":"egg",
        "measure":"",
        "quantity":2
      },
      {
        "name":"milk",
        "measure":"cups",
        "quantity":0.5
      },
      {
        "name":"vanilla extract",
        "measure":"little bit, not too much",
        "quantity":1
      },
      {
        "name":"salt",
        "measure":"little bit",
        "quantity":1
      },
      {
        "name":"cinnamon",
        "measure":"little bit",
        "quantity":1
      },
      {
        "name":"bread",
        "measure":"loaf",
        "quantity":1
      }
    ],
    "steps":[
      "Preheat the oven to four hundred degrees fahrenheit",
      "Break the eggs. Kind of hold them in your hand for a bit",
      "Add milk. You can substitute soy milk if you don't have real milk",
      "Add vanilla extract. You can substitute maple syrup if you don't have any",
      "Add salt and the magic ingredient, cinnamon, for that sweet taste",
      "Add other stuff in there as you get better at it",
      "Beat it real hard. As hard as you can. A lot of people go wrong because they're not beating it hard enough",
      "Slice your bread into manageable slices",
      "Make sure all of your bread is completely submerged in your batter that you made, so that it absorbs it quite well",
      "Evenly place bread on cookie tray, with enough space for it to breathe while it's cooking",
      "Put it in the oven",
      "Use a toaster oven if your actual oven isn't working. You may have to squeeze the bread a bit to fit them all on there",
      "Wait about twenty minutes for the most delicious french toast that you can imagine",
      "Take the bread out of the oven and enjoy"
    ]
  },
  {
    "name":"pancakes",
    "ingredients":[
      {
        "name":"flour",
        "measure":"cup",
        "quantity":1
      },
      {
        "name":"sugar",
        "measure":"tablespoons",
        "quantity":2
      },
      {
        "name":"baking powder",
        "measure":"teaspoons",
        "quantity":2
      },
      {
        "name":"salt",
        "measure":"teaspoon",
        "quantity":1
      },
      {
        "name":"egg",
        "altNames":"eggs",
        "measure":"",
        "quantity":1
      },
      {
        "name":"milk",
        "measure":"cup",
        "quantity":1
      },
      {
        "name":"vegetable oil",
        "measure":"tablespoons",
        "quantity":2
      }
    ],
    "steps":[
      "Prepare the egg by beating it in a bowl",
      "Mix your flour, sugar, baking powder, and salt into a large bowl",
      "Make a well in the center of the mixture, then mix in the milk, egg, and oil, until smooth",
      "Lightly oil a griddle or frying pan, then warm it at medium-high heat",
      "For each pancake, pour the about a forth of a cup of the batter onto the heated surface",
      "Cook until the bottom is brown, and flip it over to brown the other side"
    ]
  },
  {
    "name":"rum and coke",
    "ingredients":[
      {
        "name":"rum",
        "measure":"cup",
        "quantity":1
      },
      {
        "name":"coke",
        "altNames":"cola::coca-cola",
        "measure":"cups",
        "quantity":4
      }
    ],
    "steps":[
      "Pour your rum into your favorite appropriately-sized container",
      "Pour your coke into the same container"
    ]
  }
];
